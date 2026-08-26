/**
 * The site: whether it stands up, and whether it comes apart.
 *
 * Two cards' worth of claims, and they are here together because they are the
 * same subject seen twice — a prop is a **part list over materials**
 * (`world/props.ts`), and that one declaration decides both where it can be put
 * down and what it turns into when it is written off.
 *
 * The measurements quoted below were taken on the default seed and are re-taken
 * by these tests. Where a number is a *census* rather than a bound, the
 * assertion is deliberately looser than the reading: the point is to catch the
 * site going back to lying down, not to freeze a layout.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { Module } from "../src/control/bus.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { EXERCISES } from "../src/world/exercises.ts";
import { deliverable, MATERIAL } from "../src/world/materials.ts";
import {
  DOMINANT,
  isBreakable,
  KIND,
  PROP_KINDS,
  PROP_SPEC,
  pieceExtent,
  standsOn,
  tipGradient,
  volumeOf,
} from "../src/world/props.ts";
import { makeRampTerrain } from "../src/world/terrain.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

const fullAhead: Module = {
  id: "PILOT",
  label: "PILOT",
  maker: "TEST",
  considers: "the test",
  verb: "SET",
  enabled: true,
  intent: () => ({ left: MAX_TRACK_SPEED, right: MAX_TRACK_SPEED }),
};

/**
 * How far a body has tilted, as a **gradient** — and compared against the
 * gradient that thing goes over at, never against a fixed angle.
 *
 * The first version of this census used a flat 30°, and duly reported every
 * pallet on a slope as having fallen over. A pallet is 1.2 m across and 0.15 m
 * tall: it cannot fall over. `tipGradient` is already the number that says so,
 * and using it here means the instrument and the placement rule are the same
 * rule, so neither can drift away from the other.
 */
function tiltOf(rotation: readonly [number, number, number, number]): number {
  const [rx, , rz] = rotation;
  const cos = 1 - 2 * (rx * rx + rz * rz);
  return cos <= 0 ? Number.POSITIVE_INFINITY : Math.sqrt(1 - cos * cos) / cos;
}

/** Breakables lying on their sides after `createWorld`'s settle steps. */
function census(exercise: (typeof EXERCISES)[number]): {
  flat: number;
  total: number;
  props: number;
} {
  const world = createWorld({ exercise });
  const poses = world.poses();
  let flat = 0;
  let total = 0;
  for (const [i, prop] of world.props.entries()) {
    if (!isBreakable(prop.kind)) continue;
    const pose = poses[i];
    if (!pose) continue;
    total++;
    if (tiltOf(pose.rotation) > tipGradient(prop.kind)) flat++;
  }
  const props = world.props.length;
  world.free();
  return { flat, total, props };
}

describe("the site stands up", () => {
  /**
   * The card's own measurement, and the reason it existed. Taken before this
   * work on the default seed: **46 of 102 breakables flat**, including
   * seventeen of eighteen marker poles, sixteen of twenty-two barriers and ten
   * of forty-five cones — all of it inside the 120 settle steps, where nothing
   * could see it. After: **1 of 117**.
   *
   * **The bound is across all three exercises, not per exercise, and that is
   * the assertion doing its job rather than being lazy.** The fix has two
   * halves and they were A/B'd against each other, on E-03:
   *
   * | | flat | props placed |
   * |---|---|---|
   * | neither | 44 of 115 | 130 |
   * | graded pads only | 8 of 114 | 130 |
   * | footing test only | 13 of 89 | **110** |
   * | both | **1 of 117** | 130 |
   *
   * Each needs the other. The pads do most of the standing up; the footing test
   * on its own is nearly as good *and drops twenty props*, because without
   * graded ground there is nowhere left for it to say yes. Together they place
   * everything the exercise asked for and it all stays up.
   *
   * A per-exercise bound loose enough for E-01 — which is 22 props, so one
   * straggler is five per cent of it — could not tell "both" from "pads only"
   * at all. The pooled ratio can: 2.5% against 7.7%. The prop count is the
   * other half of the same guard, and it is what catches losing the pads.
   */
  it("leaves the site standing, and places what the exercise asked for", () => {
    let flat = 0;
    let total = 0;
    for (const exercise of EXERCISES.slice(0, 3)) {
      const tally = census(exercise);
      flat += tally.flat;
      total += tally.total;
      // Nothing may be dropped for want of footing: the pads are what stop the
      // placement test from running out of ground.
      expect(tally.props, exercise.id).toBeGreaterThanOrEqual(exercise.props - 2);
      // …and no single exercise may quietly be the bad one.
      expect(tally.flat / tally.total, exercise.id).toBeLessThan(0.12);
    }
    expect(total).toBeGreaterThan(150);
    expect(flat / total).toBeLessThan(0.05);
  }, 60_000);

  it("refuses ground a thing cannot stand on", () => {
    // The rule, on ground with a known slope rather than on whatever the noise
    // produced. A marker pole is 3 m on a 0.16 m base — a limit of about 6° —
    // and a pallet is 1.2 m across and 0.15 m tall, so nothing sensible can
    // tip it. The same hillside has to answer differently for the two.
    const steep = makeRampTerrain(20, 0);
    expect(standsOn(steep, 0, 40, "pole", 1)).toBe(false);
    expect(standsOn(steep, 0, 40, "pallet", 1)).toBe(true);
    // And flat ground holds anything.
    const flat = makeRampTerrain(0);
    expect(standsOn(flat, 0, 40, "pole", 1)).toBe(true);
  });

  it("hands the ground and the furniture the same work areas", () => {
    // They used to disagree: the terrain graded one pad at the origin and
    // `generateProps` rolled six centres of its own, so furniture clustered on
    // ground nothing had flattened. A pad is furnished or it is the datum.
    const world = createWorld();
    const furnished = world.terrain.pads.filter((p) => p.furnished);
    expect(furnished.length).toBeGreaterThan(3);
    // Every furnished pad has kit on it, which is the whole claim.
    for (const pad of furnished) {
      const near = world.props.filter((p) => Math.hypot(p.x - pad.x, p.z - pad.z) < 14);
      expect(near.length).toBeGreaterThan(2);
    }
    // …and the datum has none, because you start there.
    const onPad = world.props.filter((p) => Math.hypot(p.x, p.z) < 15);
    expect(onPad).toHaveLength(0);
    world.free();
  }, 30_000);
});

describe("a prop is a part list over materials", () => {
  it("derives a toughness nothing can be accidentally immune to", () => {
    // The scar: a cone was once rated 22 J, which is more than a 6.2 t machine
    // at 2.2 m/s can put into 6 kg — it was **indestructible by any means the
    // game has**, and nothing said so. Toughness is now a fraction of exactly
    // that ceiling, so the mistake is not expressible.
    for (const kind of PROP_KINDS) {
      const { mass, toughness } = PROP_SPEC[kind];
      if (mass === undefined || toughness === undefined) continue;
      const ceiling = deliverable(mass);
      expect(toughness).toBe(MATERIAL[DOMINANT[kind]].tough * ceiling);
      // Everything on site can be written off at full speed — except the one
      // thing that is meant not to be, and it says so in the table.
      if (MATERIAL[DOMINANT[kind]].tough <= 1) {
        expect(toughness).toBeLessThan(ceiling);
      }
    }
    // The deliberate exception, named: ballast does not break, it moves.
    expect(MATERIAL.ballast.tough).toBeGreaterThan(1);
    expect(PROP_SPEC.sandbags.toughness).toBeGreaterThan(
      deliverable(KIND.sandbags.mass ?? 0),
    );
  });

  it("keeps the collider box honest against the pieces it stands in for", () => {
    // The box is declared, not derived, because it is a **proxy**: a marker
    // pole's flag reaches 0.6 m sideways and being hit by a flag would be a bug
    // you could see. So the guard is a factor either way — a deliberate
    // simplification passes, a transposed or forgotten number does not.
    //
    // It earned its keep the moment it ran, on two things that had shipped: a
    // pipe stack drawn end to end inside a box that said side by side, and a
    // cable drum whose box had X and Z the wrong way round. Neither was
    // visible without measuring, and both are things you could have driven
    // through.
    for (const kind of PROP_KINDS) {
      const spec = KIND[kind];
      const solid = spec.pieces.filter((p) => p.solid !== false);
      expect(solid.length).toBeGreaterThan(0);
      const reach = [0, 0, 0];
      for (const piece of solid) {
        const extent = pieceExtent(piece);
        for (let axis = 0; axis < 3; axis++) {
          const at = piece.at[axis] as number;
          // Sideways: how far out from the middle. Upright: how tall the thing
          // is, halved — the box stands on the ground and reaches up twice its
          // half-height, so those are the two numbers to compare.
          const bound =
            axis === 1
              ? (at + (extent[axis] as number)) / 2
              : Math.abs(at) + (extent[axis] as number);
          if (bound > (reach[axis] as number)) reach[axis] = bound;
        }
      }
      for (let axis = 0; axis < 3; axis++) {
        const declared = spec.box[axis] as number;
        const bound = reach[axis] as number;
        expect(declared, `${kind} axis ${axis} too small`).toBeGreaterThan(bound / 4);
        expect(declared, `${kind} axis ${axis} too big`).toBeLessThan(bound * 2.5);
      }
    }
  });

  it("names a dominant material by bulk, not by declaration order", () => {
    // A barrier is a plastic plank on two steel legs and it rings as plastic; a
    // floodlight is mostly its steel mast and head. Neither says so anywhere.
    expect(DOMINANT.barrier).toBe("plastic");
    expect(DOMINANT.pipes).toBe("tube");
    expect(DOMINANT.block).toBe("concrete");
    expect(DOMINANT.pallet).toBe("timber");
    // And it really is by volume: swap the check to "first piece" and the
    // barrier is the only one that changes, which is why it is asserted.
    const barrier = KIND.barrier.pieces;
    const plank = volumeOf(barrier[0] as (typeof barrier)[number]);
    const legs = barrier.slice(1).reduce((sum, piece) => sum + volumeOf(piece), 0);
    expect(plank).toBeGreaterThan(legs);
  });
});

/** Point the machine at a prop, `gap` metres short, and let go. */
function aim(
  world: ReturnType<typeof createWorld>,
  target: { x: number; z: number },
  gap: number,
): void {
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
}

describe("nothing on the site is inert", () => {
  /**
   * Drive full ahead into one of each kind and see what the ledger says.
   *
   * The strongest guard there is against the scar this repo has already worn
   * once — a cone rated at 22 J, which was more than the machine could put into
   * 6 kg, and was therefore **indestructible by any means the game has** with
   * nothing anywhere saying so. Deriving toughness stops a rating being wrong.
   * Only driving into the thing stops the *shape* being wrong, and it caught a
   * concrete block that absorbed exactly zero joules from a full-speed hit
   * because the machine drove over it.
   *
   * Measured, at `MAX_TRACK_SPEED` from nine metres, on flat ground:
   *
   * | | rated | absorbed | outcome |
   * |---|---|---|---|
   * | cone | 6 J | 13 J | destroyed |
   * | pole | 32 J | 64 J | destroyed |
   * | pipe stack | 346 J | 396 J | destroyed |
   * | barrier | 43 J | 73 J | destroyed |
   * | scooter | 138 J | 154 J | destroyed |
   * | fuel drum | 240 J | 324 J | destroyed |
   * | pallet | 27 J | 113 J | destroyed |
   * | crate | 136 J | 376 J | destroyed |
   * | concrete block | 217 J | 439 J | destroyed |
   * | floodlight | 90 J | 141 J | destroyed |
   * | precast panel | 610 J | 502 J | **damaged** |
   * | cable drum | 494 J | 268 J | **damaged** |
   * | ballast bags | 929 J | 523 J | **damaged** |
   *
   * The last three are the rule working rather than failing: **a heavy body
   * gets pushed rather than struck**, so the fraction of the theoretical
   * ceiling that actually reaches it falls with its mass, and a 900 kg precast
   * panel that cracks instead of shattering is the right answer. The ballast is
   * the deliberate one — it is rated above what the machine can deliver, on
   * purpose, so that "everything here breaks" is a claim the site falsifies.
   *
   * So the assertion is **that every kind is reached**, not that every kind
   * dies.
   */
  it.each(PROP_KINDS.filter((kind) => isBreakable(kind)))(
    "lets a full-speed hit reach a %s",
    (kind) => {
      const world = createWorld({
        terrain: makeRampTerrain(0),
        modules: [fullAhead],
      });
      const index = world.props.findIndex((prop) => prop.kind === kind);
      const target = world.props[index];
      expect(target, `no ${kind} on the test site`).toBeDefined();
      if (!target) return;
      aim(world, target, 9);
      for (let i = 0; i < 900; i++) world.step();
      const absorbed = world.ledger.absorbedBy(index);
      expect(absorbed, `${kind} absorbed nothing at all`).toBeGreaterThan(0);
      // …and it reached at least the *damaged* threshold, so the hit is a line
      // in the ledger rather than a nudge nobody is told about.
      expect(world.ledger.events.some((line) => line.prop === index)).toBe(true);
      world.free();
    },
    60_000,
  );
});

describe("a written-off thing comes apart", () => {
  /** Which pieces of which prop were seen loose at any point in the run. */
  let seen: Record<number, Set<number>> = {};

  /** Drive full ahead into the first breakable and write it off. */
  function wreck(): ReturnType<typeof createWorld> {
    seen = {};
    const world = createWorld({
      terrain: makeRampTerrain(0),
      modules: [fullAhead],
    });
    const index = world.props.findIndex((p) => isBreakable(p.kind));
    const target = world.props[index];
    if (!target) throw new Error("nothing breakable on the test site");
    aim(world, target, 6);
    // Collected **as it happens.** The first version stepped 600 and then
    // looked, by which time the pieces had long since come to rest and dropped
    // off the snapshot — which reports only what is awake. It read one piece of
    // two and looked like an off-by-one in the spawner.
    for (let i = 0; i < 600; i++) {
      world.step();
      for (const shard of world.snapshot().debris) {
        const already = seen[shard.prop] ?? new Set<number>();
        seen[shard.prop] = already;
        already.add(shard.piece);
      }
    }
    return world;
  }

  it("turns one box into the solids its part list says it is made of", () => {
    const world = wreck();
    const written = world.ledger.events.filter((e) => e.state === "destroyed");
    expect(written.length).toBeGreaterThan(0);
    const line = written[0];
    if (!line) return;

    // Every piece the part list declares was loose at some point, addressed by
    // prop and piece. An off-by-one here would draw the wrong mesh in the right
    // place, which is exactly the sort of thing that ships.
    const pieces = seen[line.prop] ?? new Set<number>();
    expect(pieces.size).toBe(KIND[line.kind].pieces.length);
    for (const piece of pieces) {
      expect(piece).toBeLessThan(KIND[line.kind].pieces.length);
    }
    // And the thing itself is gone from the prop poses — it is not both a box
    // and its own pieces.
    expect(world.snapshot().props.some((p) => p.index === line.prop)).toBe(false);
    world.free();
  }, 60_000);

  it("throws the same pieces the same way twice", () => {
    // Rule 2, on the newest thing that could break it: the scatter is drawn
    // from the ledger line's own `seq`, which is on the recording. Verified by
    // planting the fault — seeding it from anything not on the recording (or
    // from `Math.random`) makes these two runs differ on the first shard.
    const a = wreck();
    const b = wreck();
    for (let i = 0; i < 120; i++) {
      a.step();
      b.step();
    }
    const left = a.snapshot().debris;
    const right = b.snapshot().debris;
    expect(left.length).toBeGreaterThan(0);
    expect(right).toEqual(left);
    expect(a.fingerprint()).toBe(b.fingerprint());
    a.free();
    b.free();
  }, 60_000);

  it("never bills for the wreckage", () => {
    // Debris is landscape. It is not in the prop list, so `assessDamage` cannot
    // see it — a pipe rolling downhill and slamming into a boulder is free, and
    // that is the existing rule *hitting the wreck again is free* rather than a
    // new one.
    const world = wreck();
    const before = world.ledger.total;
    const lines = world.ledger.events.length;
    for (let i = 0; i < 400; i++) world.step();
    // The machine has stopped against the wreck; nothing new is charged for
    // pieces bouncing off each other.
    const fresh = world.ledger.events.slice(lines);
    for (const line of fresh) expect(line.category).not.toBe("landscape");
    expect(world.ledger.total).toBeGreaterThanOrEqual(before);
    world.free();
  }, 60_000);
});
