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

export function generateWaypoints(terrain: Terrain, count = 5): Pin[] {
  const rng = makeRng(terrain.seed ^ 0x2b17);
  const pins: Pin[] = [];
  const radius = Math.min(terrain.extent / 2 - 22, 74);
  // Even angular spacing with jitter: a ring the machine has to work around,
  // rather than a clump it can shortcut.
  for (let i = 0; i < count; i++) {
    const turn = (i / count + rng.range(-0.06, 0.06)) * Math.PI * 2;
    const r = radius * rng.range(0.62, 1);
    const x = Math.cos(turn) * r;
    const z = Math.sin(turn) * r;
    pins.push({ x, z, y: sampleTerrain(terrain, x, z) });
  }
  return pins;
}
