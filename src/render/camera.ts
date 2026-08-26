/**
 * Where the cab camera points, and — the part that is easy to lose — which way
 * up it is.
 *
 * The eye is bolted to the hull, so the *whole* frame rides the machine: pitch,
 * yaw **and roll**. `lookAt` cannot express that. It takes an up vector and
 * produces the orientation with no roll about the view axis relative to it, so
 * feeding it world up keeps the horizon dead level while the machine leans.
 * That is a chase camera's honesty, not a cab's — you are strapped into the
 * thing, and when it leans, the world leans.
 *
 * So the orientation is *composed* rather than aimed:
 *
 *     world  ←  hull  ←  head yaw  ←  head pitch  ←  camera convention
 *
 * Signs are derived, never tried (META: derive signs, never flip them to see).
 * Body axes are forward +Z, up +Y, right −X (`core/spec.ts`); a three.js camera
 * looks down its own −Z with +Y up. Following camera-local (0,0,−1) through,
 * right to left:
 *
 * - `Ry(π)` turns the camera round to look along body forward, +Z.
 * - `Rx(−tilt)` carries +Z to `(0, sin tilt, cos tilt)` — positive tilt is up.
 * - `Ry(−pan)` carries that to `(−sin pan · cos tilt, sin tilt,
 *   cos pan · cos tilt)` — positive pan swings toward −X, the machine's right.
 * - the hull quaternion then takes the whole frame into the world, roll and all.
 */

import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);

/** Camera looks down −Z; the machine looks down +Z. One half turn apart. */
const FACE_FORWARD = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);

// Scratch. This runs every frame; allocating quaternions in it does not.
const yaw = new THREE.Quaternion();
const pitch = new THREE.Quaternion();

/**
 * @param hull  the machine's world rotation
 * @param pan   head yaw in the cab, radians, positive to the machine's right
 * @param tilt  head pitch in the cab, radians, positive up
 * @param out   written in place and returned
 */
export function cabCameraRotation(
  hull: THREE.Quaternion,
  pan: number,
  tilt: number,
  out: THREE.Quaternion,
): THREE.Quaternion {
  return out
    .copy(hull)
    .multiply(yaw.setFromAxisAngle(UP, -pan))
    .multiply(pitch.setFromAxisAngle(RIGHT, -tilt))
    .multiply(FACE_FORWARD);
}

/**
 * The pinhole's focal length, in CSS pixels — the one number that converts a
 * look angle into a distance on the glass.
 *
 * It lives here because it belongs to the camera. The cab furniture is DOM and
 * knows nothing about field of view; the renderer knows nothing about the DOM.
 * This is the seam, and it is one line of trigonometry rather than a shared
 * assumption in two files.
 */
export function focalPixels(fovDegrees: number, heightPx: number): number {
  return heightPx / 2 / Math.tan((fovDegrees * Math.PI) / 360);
}

/**
 * Where everything bolted to the cab has moved to on screen, in CSS pixels,
 * when the pilot's head is at (`pan`, `tilt`).
 *
 * The cab does not move; **you** do. So the sign is the mirror of the look:
 * turn your head to the machine's right and the pillar, the pod and the dash
 * all sweep left across your field of view.
 *
 * `tan`, not the angle itself. A rigid object rotating past a pinhole projects
 * to `f·tan θ`, which is exact at the centre of the glass — where the pods sit
 * and where the eye actually is during a glance — and increasingly generous
 * towards the edges. That error is the price of the whole cab being one flat
 * translate instead of a second 3D renderer (`doc/design/cab/components.md`).
 */
export function cabOffset(pan: number, tilt: number, focalPx: number) {
  return { x: -focalPx * Math.tan(pan), y: focalPx * Math.tan(tilt) };
}
