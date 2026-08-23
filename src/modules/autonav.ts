/**
 * NAV-1 — the reference dumb module.
 *
 * It steers toward the pin. It considers the bearing and distance to that pin
 * and **nothing else**: not slope, not ground, not clearance, not what is in
 * the way. Driving a machine into a boulder it never looked at is this module
 * working correctly, and the point of it.
 *
 * That honesty is the design (principle 1). Every automation module gets a
 * short, true statement of what it considers, and visible blindness to the
 * rest — which is what lets a player learn its envelope by watching rather
 * than by reading a tooltip.
 *
 * Architecture rule 1: no renderer, no DOM. Rule 2: no `Math.atan2` — heading
 * error comes from a dot and a cross product, which are arithmetic and stay
 * bit-portable. A transcendental here would feed straight back into sim state.
 */

import type { Module, TrackCommand, Verb } from "../control/bus.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import { clamp, type Quat, rotate, vec } from "../core/vec.ts";

/** How close counts as arrived. Generous: it is not a precision instrument. */
const ARRIVED = 6;

/** How hard it leans on the differential to correct heading. */
const STEER_GAIN = 1.35;

export interface Waypoint {
  readonly x: number;
  readonly z: number;
}

export interface NavPose {
  readonly x: number;
  readonly z: number;
  readonly rotation: Quat;
}

export interface Autonav extends Module {
  /** Index of the pin it is currently heading for. */
  readonly target: number;
  /** Send it to a different pin. The pilot's one lever on the autopilot. */
  setTarget(index: number): void;
  readonly waypoints: readonly Waypoint[];
}

export function createAutonav(
  waypoints: readonly Waypoint[],
  pose: () => NavPose,
  options: { verb?: Verb; enabled?: boolean } = {},
): Autonav {
  let target = 0;

  return {
    id: "NAV",
    label: "NAV-1",
    considers: "bearing and distance to the pin. Nothing else.",
    verb: options.verb ?? "SET",
    enabled: options.enabled ?? false,
    get target() {
      return target;
    },
    setTarget(index: number) {
      if (index >= 0 && index < waypoints.length) target = index;
    },
    waypoints,
    readout: () => ({ target, pins: waypoints.length }),
    intent(): TrackCommand | null {
      if (waypoints.length === 0) return null;

      const here = pose();
      let dx = 0;
      let dz = 0;
      let range = 0;

      // Advance past any pins already reached. Bounded rather than recursive:
      // a ring of pins all inside ARRIVED would otherwise never terminate.
      for (let skipped = 0; skipped <= waypoints.length; skipped++) {
        const pin = waypoints[target];
        if (!pin) return null;
        dx = pin.x - here.x;
        dz = pin.z - here.z;
        range = Math.sqrt(dx * dx + dz * dz);
        if (range >= ARRIVED) break;
        target = (target + 1) % waypoints.length;
        if (skipped === waypoints.length) return null;
      }

      // Heading error without trigonometry: the machine's forward vector
      // against the unit vector to the pin. The dot gives how much of the pin
      // is ahead; the Y of the cross gives which side it is on — signed,
      // bounded, and exactly what a differential drive needs.
      //
      // Sign check, because a mirrored control shipped here once already:
      // forward +Z, pin to the machine's right (−X, see core/spec.ts) gives
      // cross(forward, toPin).y = −1. Turning right needs the left track to
      // outrun the right, i.e. a positive `steer` — so this is negated.
      const forward = rotate(here.rotation, vec(0, 0, 1));
      const toPin = { x: dx / range, y: 0, z: dz / range };
      const ahead = forward.x * toPin.x + forward.z * toPin.z;
      const side = -(forward.z * toPin.x - forward.x * toPin.z);

      // Slow for big heading errors so it turns rather than arcing wide. This
      // is the only concession it makes to anything, and it is about its own
      // heading, not about the world.
      const drive = MAX_TRACK_SPEED * clamp(ahead, 0.18, 1);
      const steer = clamp(side * STEER_GAIN, -1, 1) * MAX_TRACK_SPEED;

      return {
        left: clamp(drive + steer, -MAX_TRACK_SPEED, MAX_TRACK_SPEED),
        right: clamp(drive - steer, -MAX_TRACK_SPEED, MAX_TRACK_SPEED),
      };
    },
  };
}
