/**
 * The route NAV-1 follows.
 *
 * World data like the props, and for the same reason: deterministic from the
 * seed, drawn by the renderer rather than invented by it, and handed over by an
 * exercise rather than assumed — which is what an `Exercise` now does
 * (`world/exercises.ts`). It is also the rig's objective: reach these.
 *
 * Pins are placed on a rough ring around the pad, or in a cone straight ahead of
 * it when the exercise asks. Nothing checks whether the straight line between
 * two pins is drivable — that is precisely what makes following them a test of
 * the machine rather than of the route.
 */

import { makeRng } from "../core/rng.ts";
import type { Waypoint } from "../core/snapshot.ts";
import { sampleTerrain, type Terrain } from "./terrain.ts";

export interface Pin extends Waypoint {
  /** Ground height at the pin, for drawing the marker. */
  readonly y: number;
}

/**
 * What route an exercise wants staked out. Held by `Exercise`, read here.
 */
export interface RouteSpec {
  /** How many pins. Zero is a site with no objective, which is the sandbox. */
  readonly count: number;
  /** Nearest and furthest a pin may be from the pad, metres. */
  readonly near: number;
  readonly far: number;
  /**
   * Keep the pins inside a cone about the machine's start heading (+Z): a
   * candidate is accepted only where `z > 0` and `|x| <= ahead * z`.
   *
   * This is the whole of "you can already see the flag". The first exercise
   * cannot open on a marker behind you, because a trainee who has not yet
   * discovered that the levers turn the machine has no way to find it — and a
   * first exercise you can fail by facing the wrong way teaches the wrong thing.
   * Omitted, the pins go on a full ring and finding them is part of it.
   */
  readonly ahead?: number;
}

/**
 * Monotone in the true bearing, but built from arithmetic only — the "diamond
 * angle". Used to put the pins into a sane going-round order without `atan2`,
 * which is not bit-portable and would reach sim state through NAV-1.
 */
function pseudoAngle(x: number, z: number): number {
  const p = x / (Math.abs(x) + Math.abs(z) + 1e-12);
  return z > 0 ? 3 - p : 1 + p;
}

/** The full ring the site was surveyed with before there were exercises. */
export const DEFAULT_ROUTE: RouteSpec = { count: 5, near: 40.7, far: 74 };

export function generateWaypoints(
  terrain: Terrain,
  route: RouteSpec = DEFAULT_ROUTE,
): Pin[] {
  const { count, ahead } = route;
  const rng = makeRng(terrain.seed ^ 0x2b17);
  const outer = Math.min(terrain.extent / 2 - 22, route.far);
  const inner = Math.min(route.near, outer);

  // Rejection-sample an annulus instead of stepping an angle: placing pins with
  // cos/sin would put non-portable values into NAV-1's route, and a route is
  // sim state. Sorting by pseudo-angle keeps the tour going one way round.
  const placed: Array<{ x: number; z: number }> = [];
  for (let attempt = 0; attempt < 4000 && placed.length < count; attempt++) {
    const x = rng.range(-outer, outer);
    const z = rng.range(-outer, outer);
    const r = Math.sqrt(x * x + z * z);
    if (r < inner || r > outer) continue;
    // Straight ahead, if the exercise asked for it. Arithmetic, so it stays as
    // portable as the rest of the placement.
    if (ahead !== undefined && (z <= 0 || Math.abs(x) > ahead * z)) continue;
    // Keep them spread: no pin too close to another. Compared squared, because
    // `Math.hypot` is not required to be correctly rounded either.
    const minGap = inner * 0.7;
    if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minGap * minGap)) continue;
    placed.push({ x, z });
  }

  placed.sort((a, b) => pseudoAngle(a.x, a.z) - pseudoAngle(b.x, b.z));
  return placed.map((p) => ({ ...p, y: sampleTerrain(terrain, p.x, p.z) }));
}
