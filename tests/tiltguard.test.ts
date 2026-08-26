/**
 * TILT-GUARD is a safety component, so what it must never do matters as much
 * as what it does. In particular: it must not turn a reversing machine around.
 * That is the bug `AMP` was chosen to make impossible, and a test that only
 * asserted "output got smaller" would not have noticed it.
 *
 * Quaternions here are built by hand from half-angle sines and cosines. That is
 * fine in a test — the ban in rule 2 is on transcendentals reaching sim state,
 * and these are inputs a physics engine would have produced anyway.
 */

import { describe, expect, it } from "vitest";
import { fitRungOne } from "../src/build/rung-one.ts";
import type { Module } from "../src/control/bus.ts";
import { ALARM, NOMINAL, runRack, WARN } from "../src/control/bus.ts";
import { MAX_TRACK_SPEED, RIGHT_X } from "../src/core/spec.ts";
import type { Quat } from "../src/core/vec.ts";
import { createTiltGuard } from "../src/modules/tiltguard.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { makeRampTerrain } from "../src/world/terrain.ts";

const LEVEL: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** Rotation about an axis, degrees. */
function about(axis: "x" | "z", degrees: number): Quat {
  const half = (degrees * Math.PI) / 360;
  const s = Math.sin(half);
  return { x: axis === "x" ? s : 0, y: 0, z: axis === "z" ? s : 0, w: Math.cos(half) };
}

/** Nose-up pitch. A positive rotation about +X lifts +Z, which is forward. */
const pitched = (degrees: number) => about("x", degrees);
/** Lean. Sign is checked against `RIGHT_X` in its own test below. */
const rolled = (degrees: number) => about("z", degrees);

function guardAt(pose: Quat, options = {}) {
  return createTiltGuard(() => pose, options);
}

const driver = (left: number, right: number): Module => ({
  id: "TEST",
  label: "TEST",
  maker: "TEST",
  considers: "the test",
  verb: "SET",
  enabled: true,
  intent: () => ({ left, right }),
});

describe("TILT-GUARD", () => {
  it("has nothing to say on level ground", () => {
    expect(guardAt(LEVEL).intent()).toBeNull();
  });

  it("still has nothing to say well inside its limits", () => {
    // 25° limit, easing from 60% of it — 10° is comfortably below.
    expect(guardAt(pitched(10)).intent()).toBeNull();
  });

  it("winds the drivetrain down as the limit approaches", () => {
    const easing = guardAt(pitched(20)).intent();
    expect(easing).not.toBeNull();
    expect(easing?.left).toBeGreaterThan(0);
    expect(easing?.left).toBeLessThan(1);
  });

  it("reaches zero at the limit and stays there past it", () => {
    expect(guardAt(pitched(25)).intent()?.left).toBeCloseTo(0, 6);
    expect(guardAt(pitched(40)).intent()?.left).toBe(0);
  });

  it("is symmetric: nose-down is as bad as nose-up", () => {
    expect(guardAt(pitched(-20)).intent()?.left).toBeCloseTo(
      guardAt(pitched(20)).intent()?.left ?? -1,
      6,
    );
  });

  it("watches roll on its own, tighter limit", () => {
    // Default limits are 25° pitch, 18° roll: 20° is fine for one and past
    // the other. A single combined limit would not be able to tell them apart.
    expect(guardAt(rolled(20)).intent()?.left).toBe(0);
    expect(guardAt(pitched(20)).intent()?.left).toBeGreaterThan(0);
  });

  it("reads roll the same way round as the machine is built", () => {
    // Leaning towards the machine's own right must read as +roll, not −roll.
    // A sign flip here is invisible on a symmetric hull — the same class of
    // bug that shipped mirrored steering once.
    const rightIsNegativeX = RIGHT_X < 0;
    expect(rightIsNegativeX).toBe(true);
    // A positive rotation about +Z lifts +X, which is the machine's LEFT, so
    // the right side goes down and the readout is positive.
    expect(guardAt(rolled(10)).readout?.()?.roll).toBeGreaterThan(0);
    expect(guardAt(rolled(-10)).readout?.()?.roll).toBeLessThan(0);
  });

  it("obeys the sliders", () => {
    const guard = guardAt(pitched(30));
    expect(guard.intent()?.left).toBe(0);
    guard.pitchLimit = 45;
    expect(guard.intent()?.left).toBeGreaterThan(0);
  });

  it("clamps the sliders to what the faceplate offers", () => {
    const guard = guardAt(LEVEL);
    const pitch = guard.params?.[0];
    pitch?.set(900);
    expect(guard.pitchLimit).toBe(45);
    pitch?.set(-5);
    expect(guard.pitchLimit).toBe(5);
  });

  describe("in the rack", () => {
    it("scales the command without turning it around", () => {
      // The whole reason the default verb is AMP. Under CAP a positive intent
      // would be clamped into a reversing signal's range and come out FORWARD,
      // which is a safety module causing the crash it exists to prevent.
      const guard = guardAt(pitched(21));
      const reversing = runRack([driver(-MAX_TRACK_SPEED, -MAX_TRACK_SPEED), guard]);
      expect(reversing.command.left).toBeLessThan(0);
      expect(reversing.command.left).toBeGreaterThan(-MAX_TRACK_SPEED);
    });

    it("stops the machine at the limit whichever way it was going", () => {
      for (const direction of [1, -1]) {
        const command = runRack([
          driver(direction * MAX_TRACK_SPEED, direction * MAX_TRACK_SPEED),
          guardAt(pitched(30)),
        ]).command;
        expect(command.left).toBeCloseTo(0, 6);
        expect(command.right).toBeCloseTo(0, 6);
      }
    });

    it("guards only what is above it — order is the machine", () => {
      // Below the driver it limits the driver. Above it, the driver's SET
      // overwrites it entirely and the guard does nothing at all.
      const above = runRack([guardAt(pitched(30)), driver(MAX_TRACK_SPEED, 0)]);
      expect(above.command.left).toBe(MAX_TRACK_SPEED);
    });

    it("passes the signal through untouched when bypassed", () => {
      const bypassed = guardAt(pitched(30), { enabled: false });
      const command = runRack([driver(MAX_TRACK_SPEED, 0), bypassed]).command;
      expect(command.left).toBe(MAX_TRACK_SPEED);
    });
  });
});

/**
 * Moving a guard **above** the thing it guards turns it into a warning light.
 *
 * Nothing implements this. It falls out of the rack being a pipeline: TILT-GUARD
 * multiplies whatever reached it, and above the pilot what reaches it is HALT —
 * so it scales zero, and the driver's SET below it overwrites the result. The
 * drivetrain never feels it. Its `condition` is published either way, so the
 * dash still lights, the cell still goes amber, and the strip still names it.
 *
 * That is a third mode — guard, bypass, advise — bought with no new machinery,
 * no new verb and no new setting. *Ordering* buys it, which is the argument for
 * the pipeline in one test (META: a reframing that dissolves several questions
 * at once is probably right).
 */
describe("ordering turns the guard into an advisor", () => {
  it("has no authority above the driver, and still reports", () => {
    const guard = guardAt(pitched(40), { pitch: 20 });
    const pilot = driver(1.5, 1.5);

    // Below the driver it is a guard, and it takes the drive away.
    const guarding = runRack([pilot, guard]);
    expect(guarding.command.left).toBeLessThan(1.5);

    // Above it: same module, same tilt, full drive at the terminal.
    const advising = runRack([guard, pilot]);
    expect(advising.command.left).toBeCloseTo(1.5, 6);

    // And it has not gone quiet — it still tells the dash what it thinks.
    expect(advising.stages.find((s) => s.id === "TILT")?.condition).toBe(ALARM);
  });
});

await initPhysics();

describe("the condition is a state, not a flicker", () => {
  /**
   * The audio's panel voice fires a knock on **every rising condition**, with
   * no rate limit of any kind (`audio/engine.ts`). That is safe only for as
   * long as a condition is a thing that settles rather than a thing that
   * chatters — a module whose condition flapped at frame rate would put sixty
   * broadband transients a second onto the mix and hold the master limiter
   * down, which reads as everything else going quiet.
   *
   * Measured, driving the real machine at full speed for thirty seconds: on the
   * open site it rises **once**, and on a ramp at the guard's own ease
   * threshold — 0.6 of a 25° pitch limit, so about 14.5° — it also rises once.
   * It is damped by its own doing: the guard winds the machine down, which
   * reduces the tilt, which is negative feedback; and the sprung running gear
   * had already taken the knocks out of the hull's attitude (L-062).
   *
   * So the guard in the audio needs no hysteresis, and this is the assertion
   * that keeps that true. If it ever fails, the fix is here and not there.
   */
  it("does not chatter across its own threshold while driving", async () => {
    const rack: Module[] = [];
    const world = createWorld({
      modules: rack,
      terrain: makeRampTerrain(14.5, 8),
    });
    rack.push(
      {
        id: "PILOT",
        label: "PILOT",
        maker: "KIBA WORKS",
        considers: "the test",
        verb: "SET",
        enabled: true,
        intent: () => ({ left: MAX_TRACK_SPEED, right: MAX_TRACK_SPEED }),
      },
      ...fitRungOne(world),
    );

    let rises = 0;
    let last = NOMINAL;
    for (let i = 0; i < 1800; i++) {
      world.step();
      const guard = runRack(rack).stages.find((s) => s.id === "TILT");
      if (!guard) continue;
      if (guard.condition > last && guard.condition >= WARN) rises++;
      last = guard.condition;
    }
    // A handful over thirty seconds is a condition; sixty a second is a rasp.
    expect(rises, "the tilt condition is chattering").toBeLessThan(10);
    world.free();
  }, 60_000);
});
