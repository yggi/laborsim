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
import { createAlarm } from "../src/cockpit/alarm.svelte.ts";
import type { Module } from "../src/control/bus.ts";
import { type Hands, restingHands } from "../src/control/hands.ts";
import {
  type Act,
  type Command,
  createTracer,
  type Look,
  setupOf,
  type Trace,
} from "../src/control/trace.ts";
import { makeClock, STEP_SECONDS } from "../src/core/clock.ts";
import { SNAPSHOT_HZ, type Snapshot } from "../src/core/snapshot.ts";
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
  issue: (act: Act) => void,
  world: SimWorld,
) => void;

/**
 * Drive a fresh world with a script, writing down everything the script did.
 *
 * `look` stands in for a viewport: `tracer.watch` is fed at `SNAPSHOT_HZ` the
 * way `platform/run.ts` feeds it from `viewport.angles()`, because a head is
 * observed rather than commanded and there is no renderer in plain Node.
 */
function record(
  exercise: Exercise,
  ticks: number,
  script: Script,
  look?: (tick: number) => Look,
) {
  const hands = restingHands();
  hands.seated = true;
  const rack: Module[] = [createPilot(hands)];
  const world = createWorld({ exercise, modules: rack });
  rack.push(...fitRungOne(world));

  const tracer = createTracer(setupOf(exercise.id, world.snapshot().seed, rack));
  const frame = { world, clock: makeClock(), hands, rack, operator: tracer };

  const every = Math.round(60 / SNAPSHOT_HZ);
  for (let tick = 1; tick <= ticks; tick++) {
    script(tick, hands, tracer.issue, world);
    advance(frame, STEP_SECONDS);
    if (look && tick % every === 0) tracer.watch(tick, look(tick));
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
  if (tick === 90)
    issue({ kind: "rack", command: { kind: "enable", id: "NAV", on: true } });
  if (tick === 240)
    issue({ kind: "rack", command: { kind: "verb", id: "NAV", verb: "ADD" } });
  if (tick === 420)
    issue({ kind: "rack", command: { kind: "order", id: "NAV", to: 0 } });
  if (tick === 540)
    issue({
      kind: "rack",
      command: { kind: "param", id: "TILT", param: "pitch", value: 3 },
    });
  // The guard comes out before the cluster is reached, or the 3° limit above
  // leaves the machine crawling and it never gets there.
  if (tick === 900)
    issue({ kind: "rack", command: { kind: "enable", id: "TILT", on: false } });
  // And NAV goes out *during* the rampage, so the ledger's blame column changes
  // mid-run rather than describing one rack for the whole recording — which is
  // what makes the round-trip claim about blame worth making. It is inert by
  // then (above the pilot, with a `SET` below it), so this changes what the
  // ledger says about the machine without changing what the machine does.
  if (tick === 1700)
    issue({ kind: "rack", command: { kind: "enable", id: "NAV", on: false } });

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
const without = (from: Trace, drop: (command: Command) => boolean): Trace => ({
  ...from,
  commands: from.commands.filter((i) => !drop(i)),
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
    const kinds = trace.commands.map((i) =>
      i.kind === "rack" ? i.command.kind : i.kind,
    );
    expect([...new Set(kinds)].sort()).toEqual([
      "enable",
      "levers",
      "order",
      "param",
      "verb",
    ]);
    // Change-points, not samples. Thirty seconds of driving is not 1,800 of
    // anything, or the "trace" is a recording of the frame rate.
    expect(trace.commands.length).toBeLessThan(TICKS / 4);
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
    expect(quiet.trace.commands).toEqual([]);
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
      expect(cut.commands.length).toBeLessThan(trace.commands.length);
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
      commands: trace.commands.map((i) =>
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

/**
 * The other half of a recording, and the half that must never matter.
 *
 * `commands` is what reached the machine; `attention` is what the operator saw,
 * heard and did about it. The rig reviews the second — whether you sounded the
 * horn before moving off, whether you acknowledged the alarm or drove on with it
 * blaring, where you were looking when you hit something — and none of it may
 * touch the physics.
 *
 * That is guaranteed structurally, because `createPlayback` is handed
 * `readonly Command[]` and is never given the other channel. What a test can
 * still catch is the recording being *wrong about which channel a thing is on*,
 * which is what the fingerprint comparison below is for.
 */
describe("and carries what the operator saw and did", () => {
  /** The same drive, once with a busy operator and once with a still one. */
  const WATCHING: Script = (tick, hands, issue, world) => {
    RECKLESS(tick, hands, issue, world);
    hands.horn = tick > 300 && tick < 420;
    hands.view = tick > 1200 && tick < 1320 ? "chase" : "cab";
    if (tick === 600) issue({ kind: "ack" });
    // The latch on its own. `createEstop` emits this *and* an `enable` command
    // per slot, and `tests/cab.test.ts` is where that pairing is checked — here
    // the claim is only that the tracer files the latch under attention, so it
    // is issued bare rather than dragging the fuses (and the commands they
    // would add) into a comparison that is about attention alone.
    if (tick === 700) issue({ kind: "estop", engaged: true });
    if (tick === 760) issue({ kind: "estop", engaged: false });
    if (tick === 1000) issue({ kind: "pod", id: "NAV", x: 40, y: 120 });
    if (tick === 1005) issue({ kind: "pod", id: "NAV", x: 44, y: 128 });
  };

  /** A glance: swept over half a second, then let go and sprung back. */
  const GLANCE = (tick: number): Look => {
    if (tick < 600) return { pan: 0, tilt: 0 };
    if (tick < 630) return { pan: (tick - 600) * 0.04, tilt: 0 };
    // 1e-3 rad is where `scene.ts` snaps the spring to exactly zero.
    const decayed = 1.2 * 0.9 ** (tick - 630);
    return { pan: decayed < 1e-3 ? 0 : decayed, tilt: 0 };
  };

  const SHORT = 1500;

  it("changes nothing about the machine, which is the whole guarantee", () => {
    const busy = record(DEFAULT_EXERCISE, SHORT, WATCHING, GLANCE);
    const still = record(DEFAULT_EXERCISE, SHORT, RECKLESS);
    // The still run is not silent — `RECKLESS` opens the cabinet, and a posture
    // is attention too. What matters is that the busy one did a great deal more
    // with its eyes, its thumb and its instruments…
    expect(busy.trace.attention.length).toBeGreaterThan(
      still.trace.attention.length + 10,
    );
    // …and that none of it reached the machine: the same commands, tick for
    // tick, and the same world down to the bit. Not trivially equal — the same
    // comparison against another seed fails, which the suite above proves.
    expect(busy.trace.commands).toEqual(still.trace.commands);
    expect(busy.world.fingerprint()).toBe(still.world.fingerprint());
    busy.world.free();
    still.world.free();
  });

  it("carries every one of them, and the horn as a press", () => {
    const busy = record(DEFAULT_EXERCISE, SHORT, WATCHING, GLANCE);
    const kinds = new Set(busy.trace.attention.map((a) => a.kind));
    expect([...kinds].sort()).toEqual([
      "ack",
      "estop",
      "horn",
      "look",
      "pod",
      "posture",
      "view",
    ]);
    // The horn is a press: down at one tick and up at another, never a state
    // sampled sixty times a second (`doc/design/cab/sound.md`).
    expect(busy.trace.attention.filter((a) => a.kind === "horn")).toEqual([
      { tick: 301, kind: "horn", down: true },
      { tick: 420, kind: "horn", down: false },
    ]);
    // And a drag coalesces: two pod placements five ticks apart are two acts,
    // but two in the *same* drain are one.
    expect(busy.trace.attention.filter((a) => a.kind === "pod")).toHaveLength(2);
    busy.world.free();
  });

  it("records the head in radians, and stops when it settles", () => {
    const busy = record(DEFAULT_EXERCISE, SHORT, WATCHING, GLANCE);
    const look = busy.trace.attention.filter((a) => a.kind === "look");
    expect(look.length).toBeGreaterThan(4);
    // Angles, not pixels. `viewport.head()` is the glass height through a
    // tangent, so a trace in pixels would replay on the wrong screen — the
    // whole pan range is ±1.5 rad and nothing here may exceed it.
    for (const a of look) expect(Math.abs(a.pan)).toBeLessThanOrEqual(1.5);
    // The sweep rises, then the spring brings it back to **exactly** zero…
    const peak = Math.max(...look.map((a) => a.pan));
    expect(peak).toBeGreaterThan(0.5);
    expect(look.at(-1)?.pan).toBe(0);
    // …after which a cab nobody is sweeping costs nothing at all. The last
    // entry is the one that reached zero, not one of a hundred saying so.
    const settled = look.at(-1)?.tick as number;
    expect(
      busy.trace.attention.filter((a) => a.kind === "look" && a.tick > settled),
    ).toHaveLength(0);
    busy.world.free();
  });

  it("replays the annunciator from the snapshots and the ACK ticks", () => {
    // The acknowledgement is the one bit of the panel the operator creates:
    // `alarm.svelte.ts` derives the lamps, the master and the unacked condition
    // from the snapshot and remembers only what was pressed. So a snapshot
    // stream plus the recorded ticks is enough to say what the master lamp was
    // doing — which is what makes recording the press, and never the condition,
    // the right call.
    const busy = record(DEFAULT_EXERCISE, SHORT, WATCHING, GLANCE);
    const acks = busy.trace.attention
      .filter((a) => a.kind === "ack")
      .map((a) => a.tick);
    expect(acks).toEqual([600]);

    let shown: Snapshot | undefined;
    const alarm = createAlarm(
      () => shown,
      () => false,
    );
    const seen: number[] = [];
    replay(busy.trace, {
      ...FITTED,
      onFrame: (snapshot) => {
        shown = snapshot;
        if (acks.includes(snapshot.tick)) alarm.ack();
        alarm.settle();
        seen.push(alarm.unacked);
      },
    }).world.free();
    // It ran, it saw the machine's condition rise, and the acknowledgement it
    // was told about is the only reason any of it reads NOMINAL again.
    expect(seen).toHaveLength(SHORT);
    expect(Math.max(...seen)).toBeGreaterThan(0);
    busy.world.free();
  });
});
