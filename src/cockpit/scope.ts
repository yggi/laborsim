/**
 * Where a world position lands on NAV-1's route scope.
 *
 * Split out of `pods/NavScope.svelte` because it shipped mirrored: the scope
 * drew every pin on the wrong side of the machine, so a route curving right
 * read as curving left and the pin NAV-1 was steering toward sat opposite the
 * way the machine was turning. The geometry could not fail a test while it
 * lived inside a component nothing mounts, and this is one of the two places
 * that had written the machine's right-hand axis out by hand
 * (`core/vec.ts`).
 *
 * Architecture rule 3: arithmetic over a snapshot's pose. It reads nothing and
 * holds nothing.
 */

import type { BodyPose } from "../core/snapshot.ts";
import { bearing } from "../core/vec.ts";

/** Metres from edge to edge of the scope. */
export const SPAN = 190;

/** Scope radius, in the SVG's own units — so the face is `R * 2` across. */
export const R = 62;

/** A plotted position: SVG coordinates, and the true range that produced them. */
export interface Blip {
  readonly px: number;
  readonly py: number;
  /** Metres, unscaled — the footer reads this, not the drawing. */
  readonly range: number;
}

/**
 * Plot `(x, z)` on a scope drawn **nose-up**, from a machine at `pose`.
 *
 * Ahead of the machine is up the face and the machine's right is to the right
 * of it, which is what a plan view of your own vehicle means: you are looking
 * down on it from above, not at a picture of it.
 */
export function plot(pose: BodyPose | undefined, x: number, z: number): Blip {
  if (!pose) return { px: 0, py: 0, range: 0 };
  const [mx, , mz] = pose.position;
  const [qx, qy, qz, qw] = pose.rotation;
  const dx = x - mx;
  const dz = z - mz;
  const { ahead, right } = bearing({ x: qx, y: qy, z: qz, w: qw }, dx, dz);
  const k = (R * 2) / SPAN;
  return { px: R + right * k, py: R - ahead * k, range: Math.sqrt(dx * dx + dz * dz) };
}
