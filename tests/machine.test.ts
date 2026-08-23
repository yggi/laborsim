/**
 * Rung 1 behaviour. "Drivable on a phone" is not testable in CI, so these
 * stand in for it: a scripted input trace, run headless, asserting the
 * behaviours the design actually depends on.
 *
 * Note what is *not* asserted — nothing here checks that it feels good. These
 * catch a physics change that breaks the machine, not one that makes it dull.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { Module, TrackCommand, Verb } from "../src/control/bus.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { makeRampTerrain } from "../src/world/terrain.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

/** A module that holds one command forever, standing in for held levers. */
function fixedLevers(left: number, right: number, verb: Verb = "SET"): Module {
  const command: TrackCommand = { left, right };
  return {
    id: "PILOT",
    label: "PILOT",
    considers: "the levers, and nothing else",
    verb,
    enabled: true,
    intent: () => command,
  };
}

function drive(left: number, right: number, steps: number, seed = 20260823) {
  const world = createWorld({ seed, modules: [fixedLevers(left, right)] });
  // Let it settle onto the ground before commanding anything.
  for (let i = 0; i < 30; i++) world.step();
  const start = world.snapshot();
  for (let i = 0; i < steps; i++) world.step();
  const end = world.snapshot();
  world.free();
  return { start, end };
}

const distance = (a: Snapshotish, b: Snapshotish) => {
  const dx = b.machine.pose.position[0] - a.machine.pose.position[0];
  const dz = b.machine.pose.position[2] - a.machine.pose.position[2];
  return Math.sqrt(dx * dx + dz * dz);
};
type Snapshotish = ReturnType<ReturnType<typeof createWorld>["snapshot"]>;

describe("the machine sits on the ground", () => {
  it("settles instead of falling through or launching", () => {
    const { end } = drive(0, 0, 120);
    expect(end.machine.pose.position[1]).toBeGreaterThan(-1);
    expect(end.machine.pose.position[1]).toBeLessThan(3);
    expect(end.machine.speed).toBeLessThan(0.2);
  });

  it("has both tracks in contact on the graded pad", () => {
    const { end } = drive(0, 0, 120);
    expect(end.machine.left.contacts).toBeGreaterThan(3);
    expect(end.machine.right.contacts).toBeGreaterThan(3);
  });
});

describe("tank steering", () => {
  it("drives forward when both levers match", () => {
    const { start, end } = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    expect(distance(start, end)).toBeGreaterThan(3);
  });

  it("turns on the spot when the levers oppose", () => {
    const { start, end } = drive(MAX_TRACK_SPEED, -MAX_TRACK_SPEED, 180);
    const yawed = Math.abs(
      end.machine.pose.rotation[1] - start.machine.pose.rotation[1],
    );
    expect(yawed).toBeGreaterThan(0.05);
    // A neutral turn goes nowhere much — that is what makes it a neutral turn.
    expect(distance(start, end)).toBeLessThan(3);
  });

  // These pin the *direction*, which the tests above did not, so the machine
  // shipped once with mirrored steering: the left lever drove the right track.
  // Symmetric geometry made it invisible in every screenshot.
  //
  // Forward is +Z, up is +Y, and `forward = up × right`, so right is −X and
  // left is +X. Rotation about +Y by a positive angle carries +Z toward +X,
  // which is the machine's left. So a right turn is a *negative* quaternion y.
  it("turns right when the left track outruns the right", () => {
    const { end } = drive(MAX_TRACK_SPEED, -MAX_TRACK_SPEED, 180);
    expect(end.machine.pose.rotation[1]).toBeLessThan(0);
  });

  it("turns left when the right track outruns the left", () => {
    const { end } = drive(-MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    expect(end.machine.pose.rotation[1]).toBeGreaterThan(0);
  });

  it("curves right when only the left track drives", () => {
    const { end } = drive(MAX_TRACK_SPEED, 0, 180);
    expect(end.machine.pose.rotation[1]).toBeLessThan(0);
  });

  it("drives up +Z, not sideways or backwards, with both levers forward", () => {
    const { start, end } = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    const dz = end.machine.pose.position[2] - start.machine.pose.position[2];
    const dx = end.machine.pose.position[0] - start.machine.pose.position[0];
    expect(dz).toBeGreaterThan(3);
    expect(Math.abs(dx)).toBeLessThan(Math.abs(dz) / 2);
  });

  it("curves when one track outruns the other", () => {
    const straight = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    const curved = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED * 0.4, 180);
    const yawStraight = Math.abs(straight.end.machine.pose.rotation[1]);
    const yawCurved = Math.abs(curved.end.machine.pose.rotation[1]);
    expect(yawCurved).toBeGreaterThan(yawStraight);
  });
});

describe("slip is real and reported", () => {
  it("is near zero when rolling freely on the flat", () => {
    const { end } = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 240);
    expect(Math.abs(end.machine.left.slip)).toBeLessThan(0.6);
  });

  it("is large when a track is commanded but cannot bite", () => {
    // Full command from rest: the drivetrain outruns the ground for a moment.
    const world = createWorld({
      modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
    });
    for (let i = 0; i < 30; i++) world.step();
    let peak = 0;
    for (let i = 0; i < 40; i++) {
      world.step();
      peak = Math.max(peak, Math.abs(world.snapshot().machine.left.slip));
    }
    world.free();
    expect(peak).toBeGreaterThan(0.1);
  });
});

describe("grades, and where traction runs out", () => {
  /** Drive at the ramp from the flat and report where it got to. */
  function climb(degrees: number, seconds: number) {
    const world = createWorld({
      terrain: makeRampTerrain(degrees, 5),
      modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
    });
    for (let i = 0; i < 60; i++) world.step();
    const start = world.snapshot();
    for (let i = 0; i < seconds * 60; i++) world.step();
    const end = world.snapshot();
    world.free();
    return {
      gained: end.machine.pose.position[1] - start.machine.pose.position[1],
      end,
    };
  }

  // The model's limit is atan(MU) — about 43.5 degrees for MU = 0.95. That is
  // not tuned to feel right, it is what a friction cone does, and these tests
  // pin it so a change to the model has to be deliberate.
  it("climbs a gentle grade without effort", () => {
    const { gained, end } = climb(10, 20);
    expect(gained).toBeGreaterThan(5);
    expect(end.machine.left.traction).toBeLessThan(0.6);
  });

  it("climbs a hard grade, using nearly all its grip", () => {
    const { gained, end } = climb(40, 20);
    expect(gained).toBeGreaterThan(15);
    expect(end.machine.left.traction).toBeGreaterThan(0.8);
  });

  it("cannot climb past the friction limit, and ends up back down", () => {
    const gentle = climb(15, 20).gained;
    const impossible = climb(55, 20).gained;
    expect(impossible).toBeLessThan(gentle);
  });

  it("reports full slip when the tracks lose the ground entirely", () => {
    // Beyond the limit the machine rears, tips over backwards and slides down.
    // With no sample touching, the tracks are turning against nothing at all.
    const { end } = climb(55, 20);
    if (end.machine.left.contacts === 0) {
      expect(Math.abs(end.machine.left.slip)).toBeCloseTo(MAX_TRACK_SPEED, 1);
    }
  });
});

describe("the rack is a pipeline", () => {
  it("halts with an empty rack rather than doing something undefined", () => {
    const world = createWorld({ modules: [] });
    for (let i = 0; i < 90; i++) world.step();
    const snap = world.snapshot();
    world.free();
    expect(snap.stages).toEqual([]);
    expect(snap.machine.left.commanded).toBe(0);
  });

  it("reports every stage, so no module can drop out silently", () => {
    const world = createWorld({
      modules: [
        fixedLevers(1, 1),
        { ...fixedLevers(0, 0), enabled: false, id: "OFF", label: "OFF" },
      ],
    });
    world.step();
    const snap = world.snapshot();
    world.free();
    expect(snap.stages.map((s) => s.label)).toEqual(["PILOT", "OFF"]);
    // A disabled module is a pass-through, not a hole: the signal survives it.
    expect(snap.stages[1]?.output.left).toBe(1);
    expect(snap.stages[1]?.enabled).toBe(false);
  });
});

describe("verbs", () => {
  /** Run one step and read the command that reached the terminal. */
  function terminal(modules: Module[]): TrackCommand {
    const world = createWorld({ modules });
    world.step();
    const last = world.snapshot().stages.at(-1);
    world.free();
    return last?.output ?? { left: 0, right: 0 };
  }

  it("SET ignores what arrived — this is plain suppression", () => {
    const out = terminal([fixedLevers(2, 2), fixedLevers(-1, -1, "SET")]);
    expect(out).toEqual({ left: -1, right: -1 });
  });

  it("CAP holds the downstream module under what arrived", () => {
    const out = terminal([fixedLevers(0.5, 0.5), fixedLevers(2, 2, "CAP")]);
    expect(out).toEqual({ left: 0.5, right: 0.5 });
  });

  it("CAP at zero is a dead-man's throttle", () => {
    // Levers parked above a CAP module stop the machine whatever is driving.
    const out = terminal([fixedLevers(0, 0), fixedLevers(2, 2, "CAP")]);
    expect(out).toEqual({ left: 0, right: 0 });
  });

  it("CAP keeps the downstream module's own sign", () => {
    const out = terminal([fixedLevers(1, 1), fixedLevers(-2, -2, "CAP")]);
    expect(out).toEqual({ left: -1, right: -1 });
  });

  it("ADD trims what arrived", () => {
    const out = terminal([fixedLevers(1, 1), fixedLevers(0.5, -0.5, "ADD")]);
    expect(out).toEqual({ left: 1.5, right: 0.5 });
  });

  it("AMP reads its intent as a gain", () => {
    const out = terminal([fixedLevers(2, 2), fixedLevers(0.25, 0.5, "AMP")]);
    expect(out).toEqual({ left: 0.5, right: 1 });
  });

  it("order is the machine: the same pair, swapped, behaves differently", () => {
    const governed = terminal([fixedLevers(0.5, 0.5), fixedLevers(2, 2, "CAP")]);
    const trimmed = terminal([fixedLevers(2, 2, "SET"), fixedLevers(0.5, 0.5, "ADD")]);
    expect(governed).not.toEqual(trimmed);
  });
});

describe("determinism holds with the machine driving", () => {
  it("gives an identical fingerprint for an identical trace", () => {
    const run = () => {
      const world = createWorld({ modules: [fixedLevers(MAX_TRACK_SPEED, 0.3)] });
      for (let i = 0; i < 240; i++) world.step();
      const fp = world.fingerprint();
      world.free();
      return fp;
    };
    expect(run()).toBe(run());
  });
});
