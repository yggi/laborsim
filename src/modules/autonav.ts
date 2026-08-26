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
import type { Waypoint } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import { bearing, clamp, type Quat } from "../core/vec.ts";

/**
 * How close counts as arrived. Generous: it is not a precision instrument.
 *
 * Exported because it has to stay **at or below** the rig's own `PIN_REACH`
 * (`core/spec.ts`): NAV-1 giving up on a pin before the rig credits it would
 * make an exercise no autopilot can finish. The two numbers are separate on
 * purpose — one is a module's opinion about its own route, the other is the
 * training system's about your objective, and NAV-1 knows nothing about
 * exercises. `tests/mission.test.ts` holds the inequality.
 */
export const ARRIVED = 6;

/** How hard it leans on the differential to correct heading. */
const STEER_GAIN = 1.35;

export type { Waypoint };

export interface NavPose {
  readonly x: number;
  readonly z: number;
  readonly rotation: Quat;
}

export interface Autonav extends Module {
  /**
   * Index of the pin it is currently heading for. Readable, because tests and
   * instruments ask; settable only through the `target` param below, which is
   * the one surface the cockpit can reach.
   */
  readonly target: number;
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
    maker: "TOWA DENKI",
    considers: "bearing and distance to the pin. Nothing else.",
    verb: options.verb ?? "SET",
    enabled: options.enabled ?? false,
    get target() {
      return target;
    },
    waypoints,
    /**
     * Which pin it is heading for, as a **declared setting** rather than as a
     * method somebody in the cockpit has to know to call.
     *
     * It was the one control on the machine reachable only by holding the live
     * module: the route scope was handed an `Autonav` so it could call
     * `setTarget`, which meant the instrument could not be driven from a
     * recording and the application shell had to keep a typed reference to a
     * component it otherwise knows nothing about. A pin is a bounded number
     * with a name and a unit, which is exactly what a `Param` is — so it is
     * one, and both the faceplate and the scope reach it the same way.
     *
     * **One-based**, because it is a label on a route and nobody standing at a
     * machine counts pins from zero. The readout stays zero-based: that is an
     * index into an array, and it crosses to instruments that use it as one.
     */
    params: [
      {
        id: "target",
        label: "TARGET",
        unit: "PIN",
        min: 1,
        max: Math.max(1, waypoints.length),
        step: 1,
        get: () => target + 1,
        set(value: number) {
          const index = Math.round(value) - 1;
          if (index >= 0 && index < waypoints.length) target = index;
        },
      },
    ],
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

      // Heading error without trigonometry: the unit vector to the pin, taken
      // into the machine's frame. `ahead` is how much of the pin is in front —
      // signed, bounded, and exactly what a differential drive needs — and
      // `right` is which side it is on.
      //
      // The sign lives in `bearing`, not here, because it was written out twice
      // and the route scope's copy had it backwards (`core/vec.ts`).
      const { ahead, right } = bearing(here.rotation, dx / range, dz / range);

      // Slow for big heading errors so it turns rather than arcing wide. This
      // is the only concession it makes to anything, and it is about its own
      // heading, not about the world.
      //
      // Turning right needs the left track to outrun the right, so a pin on the
      // right is a positive `steer`.
      const drive = MAX_TRACK_SPEED * clamp(ahead, 0.18, 1);
      const steer = clamp(right * STEER_GAIN, -1, 1) * MAX_TRACK_SPEED;

      return {
        left: clamp(drive + steer, -MAX_TRACK_SPEED, MAX_TRACK_SPEED),
        right: clamp(drive - steer, -MAX_TRACK_SPEED, MAX_TRACK_SPEED),
      };
    },
  };
}
