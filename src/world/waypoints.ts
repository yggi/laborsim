/**
 * The route NAV-1 follows.
 *
 * World data like the props, and for the same reason: deterministic from the
 * seed, drawn by the renderer rather than invented by it, and something a
 * mission could later hand over instead of generating.
 *
 * Pins are placed on a rough ring around the pad. Nothing checks whether the
 * straight line between two pins is drivable — that is precisely what makes
 * following them a test of the machine rather than of the route.
 */

import { makeRng } from "../core/rng.ts";
import type { Waypoint } from "../modules/autonav.ts";
import { sampleTerrain, type Terrain } from "./terrain.ts";

export interface Pin extends Waypoint {
  /** Ground height at the pin, for drawing the marker. */
  readonly y: number;
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

export function generateWaypoints(terrain: Terrain, count = 5): Pin[] {
  const rng = makeRng(terrain.seed ^ 0x2b17);
  const outer = Math.min(terrain.extent / 2 - 22, 74);
  const inner = outer * 0.55;

  // Rejection-sample an annulus instead of stepping an angle: placing pins with
  // cos/sin would put non-portable values into NAV-1's route, and a route is
  // sim state. Sorting by pseudo-angle keeps the tour going one way round.
  const placed: Array<{ x: number; z: number }> = [];
  for (let attempt = 0; attempt < 4000 && placed.length < count; attempt++) {
    const x = rng.range(-outer, outer);
    const z = rng.range(-outer, outer);
    const r = Math.sqrt(x * x + z * z);
    if (r < inner || r > outer) continue;
    // Keep them spread: no pin too close to another. Compared squared, because
    // `Math.hypot` is not required to be correctly rounded either.
    const minGap = inner * 0.7;
    if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < minGap * minGap)) continue;
    placed.push({ x, z });
  }

  placed.sort((a, b) => pseudoAngle(a.x, a.z) - pseudoAngle(b.x, b.z));
  return placed.map((p) => ({ ...p, y: sampleTerrain(terrain, p.x, p.z) }));
}
