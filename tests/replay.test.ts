/**
 * L-032's done-when: **replaying a recorded run yields the same damage events
 * in the same order.**
 *
 * `determinism.test.ts` next door proves the half that was already true — the
 * same world stepped the same number of times is the same world, bit for bit.
 * It proves it about a run *nobody drove*, which is the easy case: with no input
 * there is nothing to reproduce but the physics. This file is the other half,
 * and the reason the card existed. A run with two thumbs on it, a rack that gets
 * rewired halfway through and a site that gets broken has to come back the same,
 * from a trace and a seed and nothing else.
 *
 * ## What is actually being asserted
 *
 * Three claims, and each has a way to fail:
 *
 * 1. the recording is **sufficient** — the same trace produces the same ledger
 * 2. it is **necessary** — take any part of it away and the answer changes
 * 3. the drive **happened** — a ledger of nothing matches a ledger of nothing,
 *    so the scenario is proved before it is trusted (`doc/META.md`)
 *
 * The second is what stops this suite being decoration. Damage here is largely a
 * function of the seed, and a replay that read none of the trace would reproduce
 * a great deal of it by accident. So the second describe block removes one thing
 * at a time — the levers, each of the four rack commands, the *timing* of those
 * commands, the seed, the order the rail was fitted in — and requires each
 * removal to change the answer.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { fitRungOne } from "../src/build/rung-one.ts";
import type { Module } from "../src/control/bus.ts";
import { type Hands, restingHands } from "../src/control/hands.ts";
import {
  createTracer,
  type Input,
  type RackCommand,
  setupOf,
  type Trace,
} from "../src/control/trace.ts";
import { makeClock, STEP_SECONDS } from "../src/core/clock.ts";
import { bearing } from "../src/core/vec.ts";
import { createPilot } from "../src/modules/pilot.ts";
import { advance } from "../src/platform/frame.ts";
import { replay } from "../src/platform/replay.ts";
import type { DamageEvent } from "../src/sim/damage.ts";
import { createWorld, initPhysics, type SimWorld } from "../src/sim/world.ts";
import { DEFAULT_EXERCISE, type Exercise } from "../src/world/exercises.ts";

/** The rung-one machine, both times. A replay of other kit is another machine. */
const FITTED = { pilot: createPilot, fit: fitRungOne };

/**
 * A scripted operator: what the hands are doing, and what they press, per tick.
 *
 * The third caller of `advance` after the game and the bench, and the shape
 * `doc/BOARD.md` L-075 is asking for — a trace *is* a script, and this is the
 * same idea pointing the other way.
 *
 * It is handed the world, because an operator can see out of the window and a
 * scripted one has to see something. **Nothing it sees reaches the recording**:
 * what gets written down is where the levers ended up, not why. That is the
 * difference between a trace and a program, and it is why a replay needs no
 * world to consult and no script to re-run.
 */
type Script = (
  tick: number,
  hands: Hands,
  issue: (command: RackCommand) => void,
  world: SimWorld,
) => void;

/** Drive a fresh world with a script, writing down everything the script did. */
function record(exercise: Exercise, ticks: number, script: Script) {
  const hands = restingHands();
  hands.seated = true;
  const rack: Module[] = [createPilot(hands)];
  const world = createWorld({ exercise, modules: rack });
  rack.push(...fitRungOne(world));

  const tracer = createTracer(setupOf(exercise.id, world.snapshot().seed, rack));
  const frame = { world, clock: makeClock(), hands, rack, operator: tracer };

  for (let tick = 1; tick <= ticks; tick++) {
    script(tick, hands, tracer.issue, world);
    advance(frame, STEP_SECONDS);
  }
  return { trace: tracer.trace(), world };
}

/**
 * Somebody who drives at the nearest expensive thing, and keeps going.
 *
 * A twelve-year-old found the fun in seconds by driving at the material, and a
 * scripted driver went ten minutes without touching anything (`doc/NOTES.md`) —
 * so this one aims, and re-aims once it is on top of what it aimed at.
 *
 * Every kind of `Input` appears, and each rack command is chosen to change what
 * reaches the tracks rather than to look thorough: NAV below the pilot under
 * `CAP` is the acceptance scenario, `ADD` is a different machine, NAV moved
 * *above* the pilot is inert because a `SET` below it wins, a pitch limit of 3°
 * is a guard that will not leave you alone, and switching that guard off is the
 * bypass it was fitted to prevent.
 */
const RECKLESS: Script = (tick, hands, issue, world) => {
  if (tick === 90) issue({ kind: "enable", id: "NAV", on: true });
  if (tick === 240) issue({ kind: "verb", id: "NAV", verb: "ADD" });
  if (tick === 420) issue({ kind: "order", id: "NAV", to: 0 });
  if (tick === 540) issue({ kind: "param", id: "TILT", param: "pitch", value: 3 });
  // The guard comes out before the cluster is reached, or the 3° limit above
  // leaves the machine crawling and it never gets there.
  if (tick === 900) issue({ kind: "enable", id: "TILT", on: false });
  // And NAV goes out *during* the rampage, so the ledger's blame column changes
  // mid-run rather than describing one rack for the whole recording — which is
  // what makes the round-trip claim about blame worth making. It is inert by
  // then (above the pilot, with a `SET` below it), so this changes what the
  // ledger says about the machine without changing what the machine does.
  if (tick === 1700) issue({ kind: "enable", id: "NAV", on: false });

  const at = world.machine.body.translation();
  // Anything intact and not already under the tracks. Re-picked every tick, so
  // a thing that has been driven over stops being the thing being driven at.
  let target = { x: 0, z: 0 };
  let nearest = Infinity;
  world.props.forEach((prop, index) => {
    const range = Math.hypot(prop.x - at.x, prop.z - at.z);
    // `undefined` is a prop the ledger does not know, which cannot happen here
    // and would mean "aim at it" if it did — a wreck reads 0 and is skipped.
    if (range < 4 || range >= nearest) return;
    if ((world.ledger.integrityOf(index) ?? 1) <= 0) return;
    nearest = range;
    target = { x: prop.x, z: prop.z };
  });

  // Steering is differential: the target off to the right is the left track
  // given more of it. Both levers stay down — nothing here ever slows.
  const { right } = bearing(
    world.machine.body.rotation(),
    target.x - at.x,
    target.z - at.z,
  );
  const off = Math.max(-1, Math.min(1, (right / (nearest || 1)) * 1.5));
  // **Quantized, or every tick is a change-point** and the trace degenerates
  // into a per-tick sample of a float, which is the one shape it must not be.
  const turn = Math.round(off * 4) / 4;
  hands.leverL = Math.max(-1, Math.min(1, 1 + turn));
  hands.leverR = Math.max(-1, Math.min(1, 1 - turn));
  hands.headDown = tick > 420 && tick < 540;
};

/** Long enough to cross the site, reach the first cluster and drive through
 *  it: the first line lands around tick 1,640 and they keep coming. */
const TICKS = 2400;

/**
 * Recorded **once**. Every assertion below is against the same run, because
 * recording it is the expensive half and re-recording it would only prove the
 * thing `determinism.test.ts` already proves.
 */
let trace: Trace;
let print: string;
let ledger: readonly DamageEvent[];
let ticks: number;
let bill: number;
let distance: number;

beforeAll(async () => {
  await initPhysics();
  const live = record(DEFAULT_EXERCISE, TICKS, RECKLESS);
  const shot = live.world.snapshot();
  trace = live.trace;
  print = live.world.fingerprint();
  ledger = live.world.ledger.events.map((line) => ({ ...line }));
  ticks = live.world.tick;
  bill = shot.bill;
  distance = shot.distance;
  live.world.free();
}, 60_000);

/** Replay a trace, read one thing off it, and give the world back. */
function back<T>(from: Trace, read: (world: SimWorld) => T): T {
  const { world } = replay(from, FITTED);
  const answer = read(world);
  world.free();
  return answer;
}

/** A trace with some part of it removed, to prove that part mattered. */
const without = (from: Trace, drop: (input: Input) => boolean): Trace => ({
  ...from,
  inputs: from.inputs.filter((i) => !drop(i)),
});

describe("a recorded run replays exactly", () => {
  it("is a run worth replaying in the first place", () => {
    // Prove the scenario happened before trusting that it did: a ledger of
    // nothing matches a ledger of nothing, and this file would be green while
    // proving no more than the suite next door already does.
    expect(ledger.length).toBeGreaterThan(0);
    expect(bill).toBeGreaterThan(0);
    expect(distance).toBeGreaterThan(30);
    // And every kind of thing that can be done to a machine is on the trace.
    const kinds = trace.inputs.map((i) =>
      i.kind === "rack" ? i.command.kind : i.kind,
    );
    expect([...new Set(kinds)].sort()).toEqual([
      "enable",
      "levers",
      "order",
      "param",
      "posture",
      "verb",
    ]);
    // Change-points, not samples. Thirty seconds of driving is not 1,800 of
    // anything, or the "trace" is a recording of the frame rate.
    expect(trace.inputs.length).toBeLessThan(TICKS / 4);
  });

  it("yields the same damage events, in the same order", () => {
    expect(back(trace, (w) => w.ledger.events.map((line) => ({ ...line })))).toEqual(
      ledger,
    );
    expect(back(trace, (w) => w.tick)).toBe(ticks);
  });

  it("yields the same physics, bit for bit", () => {
    // Stronger than the ledger and not a substitute for it: a run can end in
    // the same place having broken different things on the way, and it can
    // break the same things having ended somewhere else.
    expect(back(trace, (w) => w.fingerprint())).toBe(print);
    expect(back(trace, (w) => w.snapshot().bill)).toBe(bill);
  });

  it("carries the rack, so the ledger's blame survives the round trip", () => {
    // `DamageEvent.driving` and `.bypassed` are the stages that were in and out
    // of circuit when a thing broke. They are the ledger's *why* column, and
    // they are the reason rack state had to be on the trace at all.
    const blame = (lines: readonly DamageEvent[]) =>
      lines.map((e) => `${e.tick}|${e.driving.join("+")}|${e.bypassed.join("+")}`);
    expect(back(trace, (w) => blame(w.ledger.events))).toEqual(blame(ledger));
    // …and the rewiring is visible in it, rather than the whole run having been
    // driven by one unchanging rack — which would make the claim above free.
    const racks = new Set(blame(ledger).map((b) => b.split("|").slice(1).join("|")));
    expect(racks.size).toBeGreaterThan(1);
  });

  it("replays a run nobody touched, which is the empty trace", () => {
    const quiet = record(DEFAULT_EXERCISE, 120, () => {});
    const truth = quiet.world.fingerprint();
    quiet.world.free();
    expect(quiet.trace.inputs).toEqual([]);
    expect(back(quiet.trace, (w) => w.fingerprint())).toBe(truth);
  });
});

describe("and diverges when the recording is wrong", () => {
  it("diverges when the levers are dropped", () => {
    expect(
      back(
        without(trace, (i) => i.kind === "levers"),
        (w) => w.fingerprint(),
      ),
    ).not.toBe(print);
  });

  it("diverges when any one of the four rack commands is dropped", () => {
    for (const kind of ["enable", "verb", "order", "param"] as const) {
      const cut = without(trace, (i) => i.kind === "rack" && i.command.kind === kind);
      expect(cut.inputs.length).toBeLessThan(trace.inputs.length);
      expect(
        back(cut, (w) => w.fingerprint()),
        `dropping every ${kind} command changed nothing`,
      ).not.toBe(print);
    }
  });

  it("diverges when the commands land one tick late", () => {
    // The tick is not decoration. A trace that recorded *what* was pressed and
    // not *when* would pass every assertion above and be useless to the ledger.
    const late: Trace = {
      ...trace,
      inputs: trace.inputs.map((i) =>
        i.kind === "rack" ? { ...i, tick: i.tick + 1 } : i,
      ),
    };
    expect(back(late, (w) => w.fingerprint())).not.toBe(print);
  });

  it("diverges from another seed, so the trace is not doing all the work", () => {
    const elsewhere: Trace = {
      ...trace,
      setup: { ...trace.setup, seed: trace.setup.seed + 1 },
    };
    expect(back(elsewhere, (w) => w.fingerprint())).not.toBe(print);
  });

  it("diverges when the rail was fitted in another order", () => {
    // `Setup` is not a formality either: the same commands against a rack that
    // started stacked differently are a different machine.
    const restacked: Trace = {
      ...trace,
      setup: { ...trace.setup, rack: [...trace.setup.rack].reverse() },
    };
    expect(back(restacked, (w) => w.fingerprint())).not.toBe(print);
  });
});
