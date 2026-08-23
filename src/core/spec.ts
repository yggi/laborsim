/**
 * The machine's physical dimensions, in metres and kilograms.
 *
 * One fact, one place: the sim builds colliders from these and the renderer
 * builds meshes from them. Three of the four concept-3 defects came from
 * keeping one fact in two places, so the hull is described exactly once.
 */

export const HULL = { length: 3.6, width: 2.3, height: 1.15 };
export const TRACK = { length: 3.4, width: 0.55, height: 0.5 };

/** Track centre-to-centre. Wider gauge, harder to tip, slower to turn. */
export const GAUGE = 1.78;

/** Belly clearance above the bottom of the tracks. This is what beaches you. */
export const CLEARANCE = 0.42;

export const MASS = 6200;

/** Top track speed, m/s. About 8 km/h — a working speed, not a driving one. */
export const MAX_TRACK_SPEED = 2.2;

/** Height of the cab box sitting on the hull, and where it sits along it. */
export const CAB = {
  width: 1.1,
  height: 0.9,
  depth: 0.9,
  y: TRACK.height + CLEARANCE + HULL.height + 0.45,
  z: HULL.length * 0.18,
};

/**
 * Where the operator's eyes are, relative to the machine origin.
 *
 * Inside the cab box, not inside the hull: seated low enough that the hood
 * fills the bottom of the windscreen. You should always see a piece of your own
 * machine — it is what makes this a cab rather than a floating camera, and the
 * hood is the reference you judge the ground against.
 */
export const EYE = {
  x: 0,
  y: CAB.y + 0.06,
  z: CAB.z,
};
