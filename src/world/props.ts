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

export type PropKind = "cone" | "pole" | "pipes" | "barrier" | "rock";

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
};

/** Nothing spawns inside this radius: it is the graded pad you start on. */
const CLEAR_RADIUS = 17;

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
      roll < 0.3
        ? "cone"
        : roll < 0.5
          ? "pole"
          : roll < 0.68
            ? "pipes"
            : roll < 0.82
              ? "barrier"
              : "rock";

    // Most furniture sits near a work area rather than scattered evenly — a
    // site reads as *worked* when things cluster, and as litter when they do
    // not. Rocks are the exception: they are landscape, not equipment.
    let x = 0;
    let z = 0;
    const clustered = kind !== "rock" && rng.next() < 0.75;
    for (let attempt = 0; attempt < 12; attempt++) {
      if (clustered) {
        const centre = centres[Math.floor(rng.next() * centres.length)] ?? [0, 0];
        x = (centre[0] as number) + rng.range(-9, 9);
        z = (centre[1] as number) + rng.range(-9, 9);
      } else {
        x = rng.range(-reach, reach);
        z = rng.range(-reach, reach);
      }
      if (Math.sqrt(x * x + z * z) > CLEAR_RADIUS) break;
    }

    const scale = kind === "rock" ? rng.range(0.7, 2.1) : rng.range(0.9, 1.15);
    props.push({
      kind,
      x,
      z,
      // Rocks sit part-buried; everything else stands on the surface.
      y: sampleTerrain(terrain, x, z) - (kind === "rock" ? 0.35 * scale : 0),
      ...(() => {
        const q = randomYawQuat(rng);
        return { yawY: q.y, yawW: q.w };
      })(),
      scale,
    });
  }
  return props;
}
