/**
 * The site plan — where the work areas are, before there is any ground.
 *
 * This is the missing first step, and L-057 is what happens without it. The
 * generator used to run in the wrong order: terrain was made from noise, and
 * then `generateProps` rolled six work-area centres of its own and dropped
 * furniture on whatever the noise happened to be doing there. The ground and the
 * furniture disagreed about where the work was, and the furniture lost — by step
 * 120 of the settle loop, seventeen of eighteen marker poles were lying down.
 *
 * So the plan comes first. A `Pad` is a graded working area: flat out to
 * `inner`, back to natural ground by `outer`, and the same list is handed to
 * **both** the terrain (which grades itself around it) and the prop generator
 * (which gathers kit on it). One fact, one place, and the ground now knows what
 * it is for.
 *
 * The pads sit in the same annulus the route's markers do, offset from the
 * markers themselves — near enough that driving between two pins takes you past
 * a work area, far enough that a marker is never buried in one. That is L-039's
 * second clause: *work areas want to be somewhere a driver actually goes, not
 * scattered where nothing leads.*
 *
 * Architecture rule 2: arithmetic and `sqrt` only.
 */

import { makeRng } from "../core/rng.ts";
import type { RouteSpec } from "./waypoints.ts";

export interface Pad {
  readonly x: number;
  readonly z: number;
  /** Graded dead flat out to here, metres. */
  readonly inner: number;
  /** Back to the natural ground by here. */
  readonly outer: number;
  /** The height it is graded to. */
  readonly target: number;
  /**
   * Whether the prop generator gathers furniture here.
   *
   * The start pad is not furnished — it is the graded pad you begin on, and a
   * machine that starts inside a pile of barriers has been failed before it
   * moves.
   */
  readonly furnished: boolean;
}

/**
 * The pad the machine starts on: flat, at datum zero, and never furnished.
 *
 * **The start pad is the datum.** Every other pad is graded to its own ground —
 * a bench cut into the hillside — but this one defines what zero means, which is
 * why its target is 0 rather than the noise's value at the origin. It is also
 * why the whole site's geometry is unchanged at the centre by this work.
 */
export const DATUM: Pad = {
  x: 0,
  z: 0,
  inner: 13,
  outer: 34,
  target: 0,
  furnished: false,
};

/** A work area's flat, and its blend-out. Both smaller than the datum's. */
const PAD_INNER = 11;
const PAD_OUTER = 21;

/** Two pads closer than this fight over the same ground. */
const PAD_SEPARATION = 34;

/** How near a work area may be to a marker, and how far. */
const OFF_PIN_MIN = 13;
const OFF_PIN_MAX = 42;

/**
 * Where the route's markers land, as positions only.
 *
 * Split out of `generateWaypoints` so the site plan can be built **before** the
 * terrain that the pins' heights are read off. The rng stream is unchanged, so
 * the pins themselves land exactly where they always did.
 */
export function routePoints(
  seed: number,
  route: RouteSpec,
  extent: number,
): Array<{ x: number; z: number }> {
  const { count, ahead } = route;
  const rng = makeRng(seed ^ 0x2b17);
  const outer = Math.min(extent / 2 - 22, route.far);
  const inner = Math.min(route.near, outer);

  // Rejection-sample an annulus instead of stepping an angle: placing pins with
  // cos/sin would put non-portable values into NAV-1's route, and a route is
  // sim state.
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
  return placed;
}

/**
 * Choose the work areas, and grade each to its own ground.
 *
 * `sample` is the raw noise height — the terrain before anything is graded into
 * it. Passing it in rather than importing it keeps this file free of the
 * generator, and keeps the dependency one way: terrain knows about pads, pads
 * know nothing about noise.
 */
export function sitePlan(
  seed: number,
  route: RouteSpec,
  extent: number,
  sample: (x: number, z: number) => number,
  count = 6,
): readonly Pad[] {
  // Its own stream, so adding a pad cannot shift the terrain, the props or the
  // route — the same discipline every other generator here keeps.
  const rng = makeRng(seed ^ 0x71c3);
  const pins = routePoints(seed, route, extent);
  const reach = Math.min(extent / 2 - 24, Math.max(route.far, 60));
  const near = Math.max(route.near - 6, DATUM.outer + PAD_OUTER * 0.5);

  const pads: Pad[] = [DATUM];
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const x = rng.range(-reach, reach);
      const z = rng.range(-reach, reach);
      const r = Math.sqrt(x * x + z * z);
      if (r < near || r > reach) continue;
      if (pads.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < PAD_SEPARATION ** 2)) {
        continue;
      }
      // Near the route, but never on top of a marker.
      if (pins.length > 0) {
        let best = Number.POSITIVE_INFINITY;
        for (const pin of pins) {
          const d = Math.sqrt((pin.x - x) ** 2 + (pin.z - z) ** 2);
          if (d < best) best = d;
        }
        if (best < OFF_PIN_MIN || best > OFF_PIN_MAX) continue;
      }
      pads.push({
        x,
        z,
        inner: PAD_INNER,
        outer: PAD_OUTER,
        target: sample(x, z),
        furnished: true,
      });
      break;
    }
  }
  return pads;
}

/** Smoothstep. Polynomial, so exactly reproducible. */
const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Blend a raw height toward each pad's target.
 *
 * The **datum is applied last** so it always wins near the origin: a work area
 * whose blend-out reaches into the starting pad ramps away rather than tilting
 * the ground the machine is parked on.
 */
export function padHeight(
  raw: number,
  x: number,
  z: number,
  pads: readonly Pad[],
): number {
  let h = raw;
  for (const pad of pads) {
    if (pad === DATUM || (pad.x === 0 && pad.z === 0)) continue;
    h = blend(h, pad, x, z);
  }
  const datum = pads.find((p) => p.x === 0 && p.z === 0) ?? DATUM;
  return blend(h, datum, x, z);
}

function blend(h: number, pad: Pad, x: number, z: number): number {
  const dx = x - pad.x;
  const dz = z - pad.z;
  const r = Math.sqrt(dx * dx + dz * dz);
  if (r <= pad.inner) return pad.target;
  if (r >= pad.outer) return h;
  const t = smooth((r - pad.inner) / (pad.outer - pad.inner));
  return pad.target + (h - pad.target) * t;
}
