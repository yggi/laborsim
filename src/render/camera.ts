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
