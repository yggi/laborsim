/**
 * The cab camera's frame. Not "does it look right" — that is a screenshot —
 * but the four claims the view direction and the horizon rest on, each with a
 * sign that would silently mirror or level the world if it were wrong.
 *
 * The roll case is the one this file exists for: `lookAt` with world up passes
 * every other assertion here and still leaves the horizon dead level.
 */

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { RIGHT_X } from "../src/core/spec.ts";
import { cabCameraRotation, cabOffset, focalPixels } from "../src/render/camera.ts";

const FORWARD = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);

/** Where the camera is looking, in world space. Cameras look down their −Z. */
function viewDirection(hull: THREE.Quaternion, pan = 0, tilt = 0): THREE.Vector3 {
  const q = cabCameraRotation(hull, pan, tilt, new THREE.Quaternion());
  return new THREE.Vector3(0, 0, -1).applyQuaternion(q);
}

/** Which way is up on the glass, in world space. */
function viewUp(hull: THREE.Quaternion, pan = 0, tilt = 0): THREE.Vector3 {
  const q = cabCameraRotation(hull, pan, tilt, new THREE.Quaternion());
  return new THREE.Vector3(0, 1, 0).applyQuaternion(q);
}

/** A hull rotated by `angle` about one of its *own* axes. */
function hullAbout(axis: THREE.Vector3, angle: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(axis, angle);
}

const level = new THREE.Quaternion();

describe("the cab camera", () => {
  it("looks down the machine's nose when the head is centred", () => {
    const view = viewDirection(level);
    expect(view.x).toBeCloseTo(0, 12);
    expect(view.y).toBeCloseTo(0, 12);
    expect(view.z).toBeCloseTo(1, 12);
    expect(viewUp(level).y).toBeCloseTo(1, 12);
  });

  it("pans and tilts in the machine's frame, not the world's", () => {
    // Body right is −X (core/spec.ts). A positive pan looks right, which is the
    // sign `look()` produces for a leftward drag — a mirror here is invisible
    // on a symmetric hull, which is exactly how it shipped once before.
    expect(viewDirection(level, 0.5).x).toBeLessThan(0);
    expect(viewDirection(level, -0.5).x).toBeGreaterThan(0);
    expect(viewDirection(level, 0, 0.3).y).toBeGreaterThan(0);
    expect(viewDirection(level, 0, -0.3).y).toBeLessThan(0);

    // Yawing the machine takes the head with it: pan is relative to the nose.
    const turned = hullAbout(UP, Math.PI / 2);
    const straight = viewDirection(turned);
    const panned = viewDirection(turned, 0.5);
    expect(straight.angleTo(panned)).toBeCloseTo(0.5, 12);
  });

  it("pitches with the hull — nose up is looking up", () => {
    // Rotation about body right (−X) by a positive angle lifts the nose:
    // it carries +Z toward +Y. The eye goes with it.
    const noseUp = hullAbout(new THREE.Vector3(-1, 0, 0), 0.35);
    expect(viewDirection(noseUp).y).toBeCloseTo(Math.sin(0.35), 12);
  });

  it("rolls with the hull, so the horizon tilts across the glass", () => {
    // A roll about body forward by a positive angle carries body up toward
    // −X — the machine's right — so the machine is leaning right.
    const angle = 0.4;
    const leaning = hullAbout(FORWARD, angle);

    const up = viewUp(leaning);
    // The horizon is level *relative to the cab* only if the cab's up is the
    // hull's up. This is the assertion a `lookAt(aim)` camera fails: it would
    // put world up (0,1,0) here and leave the horizon flat.
    const hullUp = UP.clone().applyQuaternion(leaning);
    expect(up.x).toBeCloseTo(hullUp.x, 12);
    expect(up.y).toBeCloseTo(hullUp.y, 12);
    expect(up.z).toBeCloseTo(hullUp.z, 12);

    // And it tilts by the whole roll, not some damped fraction of it, and in
    // the direction that puts the horizon *against* the lean: leaning right
    // carries the cab's up to the right too, so the world rolls the other way.
    expect(up.angleTo(UP)).toBeCloseTo(angle, 12);
    expect(Math.sign(up.x)).toBe(Math.sign(RIGHT_X));

    // Roll alone must not move where you are looking.
    expect(viewDirection(leaning).angleTo(FORWARD)).toBeCloseTo(0, 12);
  });

  it("keeps the head's own attitude on top of the hull's", () => {
    const leaning = hullAbout(FORWARD, 0.4);
    const centred = viewDirection(leaning);
    const looking = viewDirection(leaning, 0.6, 0.2);
    // The head still moves the full commanded amount inside a rolled cab.
    expect(centred.angleTo(looking)).toBeGreaterThan(0.5);
    // ...and the frame is still orthonormal after three multiplications.
    expect(looking.length()).toBeCloseTo(1, 12);
    expect(viewUp(leaning, 0.6, 0.2).dot(looking)).toBeCloseTo(0, 12);
  });
});

describe("the cab, seen from inside it", () => {
  /** The real camera and a phone: 58° vertical over 844 CSS pixels. */
  const f = focalPixels(58, 844);

  it("puts the glass a focal length away", () => {
    // A point one focal length ahead and half a screen up projects to the top
    // edge. That is what makes the number a projection rather than a gain.
    expect(f).toBeCloseTo(422 / Math.tan((58 * Math.PI) / 360), 9);
    expect(focalPixels(58, 0)).toBe(0);
  });

  it("does not move when the head does not", () => {
    expect(cabOffset(0, 0, f)).toEqual({ x: -0, y: 0 });
  });

  it("sweeps against the look, because the cab is what stayed still", () => {
    // Look to the machine's right (positive pan) and the pillar, the pod and
    // the dash all travel left. Getting this backwards is the bug that would
    // read as the cab being steered by the head rather than carrying it.
    expect(cabOffset(0.3, 0, f).x).toBeLessThan(0);
    expect(cabOffset(-0.3, 0, f).x).toBeGreaterThan(0);
    // Look up and the cab drops down the screen (CSS y grows downward).
    expect(cabOffset(0, 0.3, f).y).toBeGreaterThan(0);
    expect(cabOffset(0, -0.3, f).y).toBeLessThan(0);
  });

  it("moves the cab exactly as far as the world moves the other way", () => {
    // The test of 1:1: a pod at the centre of the glass and a landmark it was
    // sitting in front of must still coincide after the head turns. The
    // landmark's screen position is f·tan(θ) by the projection three.js uses.
    const pan = 0.22;
    expect(cabOffset(pan, 0, f).x).toBeCloseTo(-f * Math.tan(pan), 9);
  });

  it("takes the cab clean off the glass within a small part of the look range", () => {
    // 390 px of glass at this focal length is about 26° across, and the head
    // pans to 86°. So a glance loses you the instruments almost at once — which
    // is the cost the view recentring exists to pay back.
    const halfGlass = 195;
    const gone = Math.atan(halfGlass / f);
    expect(gone).toBeLessThan(0.26);
    expect(Math.abs(cabOffset(1.5, 0, f).x)).toBeGreaterThan(10 * halfGlass);
  });
});
