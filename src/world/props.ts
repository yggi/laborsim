/**
 * Site furniture.
 *
 * These are **world data, not decoration.** They live here rather than in the
 * renderer for three reasons: they need to be deterministic from the seed, the
 * sim gives them real colliders so you can actually hit them, and the damage
 * ledger will need to name and price each one. A cone painted on by the
 * renderer could never be `site fixture (cone) damaged −¥400`.
 *
 * Sizes are shared with the renderer from this file — one fact, one place.
 */

import { makeRng, randomYawQuat } from "../core/rng.ts";
import { sampleTerrain, type Terrain } from "./terrain.ts";

export type PropKind = "cone" | "pole" | "pipes" | "barrier" | "rock" | "scooter";

/**
 * What the rig calls this when it bills you for it.
 *
 * `landscape` is the category that **cannot be billed**, and it earns its place
 * by being the honest answer: you can drive into a boulder all day and nobody
 * sends an invoice. It also stops the ledger from being a list of everything
 * you touched, which would teach nothing.
 */
export type PropCategory = "site fixture" | "citizen asset" | "landscape";

/**
 * Mass, price and toughness — the three numbers that decide what an impact
 * means. One fact, one place: the sim builds bodies from these, the ledger
 * prices from these, and the renderer draws to match.
 *
 * `toughness` is in **joules**: how much kinetic energy this thing can absorb
 * before it is written off. That is a quantity the player can be shown, which
 * is the whole reason damage is measured in energy rather than in hit points.
 *
 * The numbers are not free. A heavy machine hitting a light object cannot put
 * more than about **½·m·v²** into it — the object simply leaves at roughly the
 * machine's speed — so a 6 kg cone can absorb at most 15 J from a 6.2 t machine
 * at its 2.2 m/s top speed, however hard that sounds. Rating a cone at 22 J
 * made it *indestructible*, which is a sentence worth remembering. Every
 * toughness below is a fraction of what the drivetrain can actually deliver
 * into that mass, so a full-speed hit writes the thing off and a crawl scuffs
 * it. The choice the player has is not how hard to hit it; it is whether to be
 * anywhere near it.
 */
export interface PropSpec {
  readonly label: string;
  readonly category: PropCategory;
  /** Kilograms. `undefined` means it never moves — landscape. */
  readonly mass?: number;
  /** Yen, if anyone is going to be billed for it. */
  readonly price?: number;
  /** Joules absorbed before it is written off. */
  readonly toughness?: number;
}

export const PROP_SPEC: Record<PropKind, PropSpec> = {
  cone: { label: "cone", category: "site fixture", mass: 6, price: 400, toughness: 5 },
  pole: {
    label: "marker pole",
    category: "site fixture",
    mass: 24,
    price: 1200,
    toughness: 32,
  },
  pipes: {
    label: "pipe stack",
    category: "site fixture",
    mass: 260,
    price: 2600,
    toughness: 340,
  },
  barrier: {
    label: "barrier",
    category: "site fixture",
    mass: 42,
    price: 900,
    toughness: 50,
  },
  // The canonical ledger line, and the one that is not the site's property.
  scooter: {
    label: "scooter",
    category: "citizen asset",
    mass: 95,
    price: 3000,
    toughness: 140,
  },
  // No mass, no price: it is the ground, and the ground is not an asset.
  rock: { label: "boulder", category: "landscape" },
};

/** Everything that can be knocked over, and therefore billed for. */
export const isBreakable = (kind: PropKind): boolean =>
  PROP_SPEC[kind].mass !== undefined;

export interface Prop {
  readonly kind: PropKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Heading as a half-angle quaternion about Y. Not an angle: see rng.ts. */
  readonly yawY: number;
  readonly yawW: number;
  /** Uniform size multiplier. Rocks vary; the rest are stock parts. */
  readonly scale: number;
}

/** Collider half-extents, in metres, before `scale`. Renderer draws to match. */
export const PROP_BOX: Record<PropKind, readonly [number, number, number]> = {
  cone: [0.34, 0.5, 0.34],
  pole: [0.3, 1.5, 0.08],
  pipes: [1.3, 0.6, 0.9],
  barrier: [1.2, 0.6, 0.12],
  rock: [1, 0.7, 1],
  scooter: [0.28, 0.55, 0.85],
};

/** Nothing spawns inside this radius: it is the graded pad you start on. */
const CLEAR_RADIUS = 17;

/** Metres of daylight demanded between two pieces of furniture. */
const SEPARATION = 0.4;

function crowded(
  placed: readonly Prop[],
  x: number,
  z: number,
  radius: number,
): boolean {
  for (const other of placed) {
    const [ox, , oz] = PROP_BOX[other.kind];
    const gap = radius + Math.max(ox, oz) * other.scale + SEPARATION;
    const dx = x - other.x;
    const dz = z - other.z;
    if (dx * dx + dz * dz < gap * gap) return true;
  }
  return false;
}

export function generateProps(terrain: Terrain, count = 130): Prop[] {
  // Own generator, own seed offset, so adding a prop cannot shift the terrain.
  const rng = makeRng(terrain.seed ^ 0x5f37);
  const props: Prop[] = [];
  const reach = terrain.extent / 2 - 12;

  // A handful of work areas to gather furniture around.
  const centres: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    let cx = 0;
    let cz = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      cx = rng.range(-reach, reach);
      cz = rng.range(-reach, reach);
      if (Math.sqrt(cx * cx + cz * cz) > CLEAR_RADIUS + 12) break;
    }
    centres.push([cx, cz]);
  }

  for (let i = 0; i < count; i++) {
    const roll = rng.next();
    const kind: PropKind =
      roll < 0.29
        ? "cone"
        : roll < 0.48
          ? "pole"
          : roll < 0.65
            ? "pipes"
            : roll < 0.79
              ? "barrier"
              : roll < 0.83
                ? // Rare on purpose. A scooter is the one thing on site that
                  // belongs to a person, and the ledger says so.
                  "scooter"
                : "rock";

    const scale = kind === "rock" ? rng.range(0.7, 2.1) : rng.range(0.9, 1.15);
    const [hx, , hz] = PROP_BOX[kind];
    const radius = Math.max(hx, hz) * scale;

    // Most furniture sits near a work area rather than scattered evenly — a
    // site reads as *worked* when things cluster, and as litter when they do
    // not. Rocks are the exception: they are landscape, not equipment.
    let x = 0;
    let z = 0;
    const clustered = kind !== "rock" && rng.next() < 0.75;
    for (let attempt = 0; attempt < 16; attempt++) {
      if (clustered) {
        const centre = centres[Math.floor(rng.next() * centres.length)] ?? [0, 0];
        x = (centre[0] as number) + rng.range(-9, 9);
        z = (centre[1] as number) + rng.range(-9, 9);
      } else {
        x = rng.range(-reach, reach);
        z = rng.range(-reach, reach);
      }
      if (Math.sqrt(x * x + z * z) <= CLEAR_RADIUS) continue;
      // **Nothing spawns inside anything else.** These are dynamic bodies now,
      // and two barriers born overlapping are shoved apart hard enough to
      // destroy each other — the site billed itself ¥55,690 before the machine
      // had moved. Separation at spawn is the fix; settling is the belt.
      if (!crowded(props, x, z, radius)) break;
    }

    props.push({
      kind,
      x,
      z,
      // Rocks sit part-buried; everything else stands on the surface, a hair
      // above it so it settles down onto the ground rather than being pushed
      // out of it.
      y: sampleTerrain(terrain, x, z) + (kind === "rock" ? -0.35 * scale : 0.03),
      ...(() => {
        const q = randomYawQuat(rng);
        return { yawY: q.y, yawW: q.w };
      })(),
      scale,
    });
  }
  return props;
}
