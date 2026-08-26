/**
 * The event channel. Three parts, and the third is the one that matters:
 *
 *   - the recorder and the reader as arithmetic — sequence, capacity, and the
 *     rewind rule that used to live inside the live voice;
 *   - the sim actually emitting, because a channel nothing publishes on is a
 *     type declaration;
 *   - and the two claims the channel exists to make, each tested from **both**
 *     sides: an impact is announced even when nobody is billed for it, and the
 *     hull speaks only when the world hit it rather than when you drove.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { Module } from "../src/control/bus.ts";
import {
  createEventReader,
  createRecorder,
  type EventSource,
  type SimEvent,
} from "../src/core/events.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { EXERCISES } from "../src/world/exercises.ts";
import { isBreakable, PROP_SPEC } from "../src/world/props.ts";
import { makeRampTerrain } from "../src/world/terrain.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

const hull = (joules: number) => ({ kind: "hull" as const, joules, jolt: 2 });

/** A rack entry whose command the test can change mid-run. */
function lever(): { module: Module; set(v: number): void } {
  let command = 0;
  return {
    module: {
      id: "PILOT",
      label: "PILOT",
      maker: "TEST",
      considers: "the test",
      verb: "SET",
      enabled: true,
      intent: () => ({ left: command, right: command }),
    },
    set(v) {
      command = v;
    },
  };
}

/**
 * Point the machine at a prop, `gap` metres short of it, and hand back the
 * index. Placing it by hand rather than driving there from the pad is the same
 * trick `damage.test.ts` uses: the drive is a minute of sim time that proves
 * nothing the test is about.
 *
 * The teleport itself lands the machine from 5 cm up, which is a real fall and
 * shows up on the channel as a hull jolt. Five centimetres *is* five
 * centimetres: the body's origin is the bottom of the tracks, and that is where
 * a machine sitting on its springs is (`sim/tracked.ts`). It used to read
 * `TRACK.height + CLEARANCE + 0.05`, a metre of fall wearing a teleport's
 * clothes — invisible while the belts were rigid boxes and a bounce once they
 * were not.
 */
function aimAt(
  world: ReturnType<typeof createWorld>,
  kind: string,
  gap: number,
): number {
  const index = world.props.findIndex((p) => p.kind === kind);
  const target = world.props[index];
  if (!target) return -1;
  const range = Math.hypot(target.x, target.z);
  const ux = target.x / range;
  const uz = target.z / range;
  const bearing = Math.atan2(ux, uz);
  world.machine.body.setTranslation(
    { x: target.x - ux * gap, y: 0.05, z: target.z - uz * gap },
    true,
  );
  world.machine.body.setRotation(
    { x: 0, y: Math.sin(bearing / 2), z: 0, w: Math.cos(bearing / 2) },
    true,
  );
  return index;
}

describe("the recorder", () => {
  it("stamps a monotonic sequence, so a reader needs one number", () => {
    const recorder = createRecorder();
    recorder.emit(3, hull(10));
    recorder.emit(9, hull(20));
    expect(recorder.events.map((e) => e.seq)).toEqual([1, 2]);
    expect(recorder.events.map((e) => e.tick)).toEqual([3, 9]);
  });

  it("keeps only the recent past, and keeps the *recent* end of it", () => {
    const recorder = createRecorder();
    for (let i = 1; i <= 400; i++) recorder.emit(i, hull(i));
    const seqs = recorder.events.map((e) => e.seq);
    expect(seqs.length).toBeLessThanOrEqual(128);
    // The channel is a notification, not a record: it drops the oldest, never
    // the newest. Dropping from the wrong end would be silently inaudible.
    expect(seqs[seqs.length - 1]).toBe(400);
  });

  it("publishes a value rather than the ring it is still writing into", () => {
    const recorder = createRecorder();
    recorder.emit(1, hull(10));
    const held = recorder.publish();
    recorder.emit(2, hull(20));
    // `damage` can be handed out live because it only ever grows. This cannot:
    // the ring drops from the front, so a holder would watch its copy change.
    expect(held).toHaveLength(1);
  });
});

describe("the reader", () => {
  const source = (tick: number, events: readonly SimEvent[]): EventSource => ({
    tick,
    events,
  });

  it("delivers each event exactly once", () => {
    const recorder = createRecorder();
    const reader = createEventReader();
    recorder.emit(1, hull(10));

    expect(reader.take(source(1, recorder.publish())).events).toHaveLength(1);
    // Re-reading the same snapshot is what a consumer polling at 60 Hz does on
    // 59 of every 60 frames. It has to be silent, or every thump plays sixty
    // times.
    expect(reader.take(source(1, recorder.publish())).events).toHaveLength(0);

    recorder.emit(2, hull(20));
    const second = reader.take(source(2, recorder.publish()));
    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.seq).toBe(2);
  });

  it("gives two consumers the same events, independently", () => {
    const recorder = createRecorder();
    const a = createEventReader();
    const b = createEventReader();
    recorder.emit(1, hull(10));
    expect(a.take(source(1, recorder.publish())).events).toHaveLength(1);
    expect(b.take(source(1, recorder.publish())).events).toHaveLength(1);
  });

  it("reports a rewind, and starts the new run from the beginning", () => {
    const first = createRecorder();
    const reader = createEventReader();
    first.emit(500, hull(10));
    expect(reader.take(source(500, first.publish())).rewound).toBe(false);

    // A RESET builds a fresh world: ticks and sequence both start again. The
    // rule this replaces was "the damage list got shorter", which was true of
    // one list and one cause.
    const second = createRecorder();
    second.emit(1, hull(10));
    const read = reader.take(source(1, second.publish()));
    expect(read.rewound).toBe(true);
    // And the new run's first event is not swallowed as one already seen.
    expect(read.events).toHaveLength(1);
  });

  it("says nothing about a run that has not started", () => {
    expect(createEventReader().take(undefined).events).toHaveLength(0);
  });
});

describe("the sim publishes on it", () => {
  it.each(EXERCISES.slice(0, 3))(
    "stays silent on $id, which nobody has touched",
    (exercise) => {
      // The other side of every threshold in here: a channel that chatters on
      // an untouched site is one a consumer learns to ignore.
      //
      // **This used to be flat ground, deliberately**, and said so: the
      // generated site emitted one impact at tick 109 — a marker pole falling
      // over on its own, unbilled and, until the channel existed, invisible.
      // That was L-057, and it was the first thing the channel ever found. The
      // site plan and the footing test closed it, so the test can now run on
      // the ground the game is actually played on, which is what it was always
      // supposed to assert.
      const world = createWorld({ exercise });
      for (let i = 0; i < 900; i++) {
        world.step();
        expect(world.snapshot().events).toHaveLength(0);
      }
      world.free();
    },
    60_000,
  );

  it("announces an impact nobody is billed for", () => {
    // The claim the type exists to make. `assessDamage` has always measured the
    // joules delivered into every prop every step and thrown the number away
    // unless it crossed a pricing threshold — so a hit that scuffed nothing, or
    // a hit on something already written off, reached no consumer at all.
    //
    // Creeping into a pipe stack is the case with the widest margin: its
    // settling floor is 15.9 J and its first ledger line is at 104 J, so a
    // 0.6 m/s nudge lands squarely between them. Measured: one impact of
    // 32.5 J, no line.
    //
    // Re-measured when the site plan moved the furniture (L-057). It used to be
    // 0.4 m/s, and at 0.4 the machine now arrives *leaning* rather than
    // shoving: energy goes into the stack a little at a time, no single step
    // clears the floor, and nothing is announced at all. That is the at-rest
    // guard working, not a defect — but it is a reminder that this scenario is
    // measured rather than reasoned, and the number is re-read when the ground
    // under it changes.
    const control = lever();
    const world = createWorld({
      terrain: makeRampTerrain(0),
      modules: [control.module],
    });
    const index = aimAt(world, "pipes", 4.6);
    expect(index).toBeGreaterThanOrEqual(0);

    control.set(0.6);
    for (let i = 0; i < 700; i++) world.step();

    const snap = world.snapshot();
    const impacts = snap.events.filter((e) => e.kind === "impact");
    // At least one, rather than exactly one: the machine keeps creeping into
    // the stack, so how many separate nudges that becomes is an accident of
    // how the pipes rock and settle. What the test is about is that they are
    // announced and none of them is billed.
    expect(impacts.length).toBeGreaterThan(0);
    for (const hit of impacts) {
      expect(hit.kind === "impact" && hit.prop).toBe(index);
      expect(hit.kind === "impact" && hit.material).toBe(PROP_SPEC.pipes.material);
      expect(hit.kind === "impact" && hit.joules).toBeGreaterThan(0);
    }
    // And the whole point of the test: nothing was billed for it.
    expect(snap.events.filter((e) => e.kind === "ledger")).toHaveLength(0);
    expect(world.ledger.total).toBe(0);
    world.free();
  }, 30_000);

  it("puts every ledger line on the channel, once, after its impact", () => {
    const control = lever();
    const world = createWorld({
      terrain: makeRampTerrain(0),
      modules: [control.module],
    });
    const kind = world.props.find((p) => isBreakable(p.kind))?.kind;
    expect(kind).toBeDefined();
    if (!kind) return;
    expect(aimAt(world, kind, 6)).toBeGreaterThanOrEqual(0);
    control.set(MAX_TRACK_SPEED);

    // Drained every step, so nothing can be lost to the ring's capacity and
    // the count below means what it says.
    const reader = createEventReader();
    const seen: SimEvent[] = [];
    for (let i = 0; i < 600; i++) {
      world.step();
      seen.push(...reader.take(world.snapshot()).events);
    }

    expect(world.ledger.events.length).toBeGreaterThan(0);
    // Every line the ledger wrote reached the channel, and none of them twice.
    expect(seen.filter((e) => e.kind === "ledger")).toHaveLength(
      world.ledger.events.length,
    );
    // The line is the consequence of a hit, so the hit is announced first.
    const firstImpact = seen.findIndex((e) => e.kind === "impact");
    const firstLine = seen.findIndex((e) => e.kind === "ledger");
    expect(firstImpact).toBeGreaterThanOrEqual(0);
    expect(firstImpact).toBeLessThan(firstLine);
    world.free();
  }, 30_000);
});

describe("the hull speaks only when it was hit", () => {
  it("says nothing while the machine is merely driving — or braking hard", () => {
    // The threshold's whole justification: the track model caps its own
    // impulses at mu·N·dt, so the drivetrain cannot take more than about
    // 0.16 m/s off you in one step however hard you slam it into reverse. If
    // this fires, the number is measuring the drivetrain and not the world.
    const control = lever();
    const world = createWorld({
      terrain: makeRampTerrain(0),
      modules: [control.module],
    });

    control.set(MAX_TRACK_SPEED);
    for (let i = 0; i < 200; i++) world.step();
    expect(world.machine.speed()).toBeGreaterThan(1);

    control.set(-MAX_TRACK_SPEED);
    for (let i = 0; i < 200; i++) world.step();

    expect(world.snapshot().events.filter((e) => e.kind === "hull")).toHaveLength(0);
    world.free();
  }, 30_000);

  it("speaks when the machine lands", () => {
    const world = createWorld({ terrain: makeRampTerrain(0) });
    for (let i = 0; i < 10; i++) world.step();
    expect(world.snapshot().events).toHaveLength(0);

    // Lifted two and a half metres and let go. Nothing in the sim can do this
    // to the hull yet — L-023's benches and trenches are what will.
    world.machine.body.setTranslation({ x: 0, y: 2.4, z: 0 }, true);
    world.machine.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    for (let i = 0; i < 120; i++) world.step();

    const jolts = world.snapshot().events.filter((e) => e.kind === "hull");
    // **A landing is no longer one step, because the machine has springs.**
    // It used to arrive at 6.9 m/s and lose all of it against a rigid belt, in
    // a single tick. Now the bogies take it over three: measured at 1.57, 2.58
    // and 1.84 m/s on consecutive ticks, which is 139 kJ of the 146 kJ the fall
    // put in. So the test asks what it always meant — the machine spoke, it
    // spoke about the whole fall, and it spoke about *one* landing rather than
    // three scattered events.
    expect(jolts.length).toBeGreaterThan(0);
    const energy = jolts.reduce(
      (sum, e) => sum + (e.kind === "hull" ? e.joules : 0),
      0,
    );
    expect(energy).toBeGreaterThan(100_000);
    const first = jolts[0]?.tick ?? 0;
    const last = jolts[jolts.length - 1]?.tick ?? 0;
    expect(last - first).toBeLessThanOrEqual(6);
    expect(
      Math.max(...jolts.map((e) => (e.kind === "hull" ? e.jolt : 0))),
    ).toBeGreaterThan(2);
    world.free();
  }, 30_000);
});
