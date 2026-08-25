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

/**
 * Track plates, and the distance between two of them.
 *
 * Oversized on purpose: chunky plates read as *tracks* at a glance and at a
 * distance, and fewer fatter ones beat many thin ones for legibility. That was
 * a drawing decision until the machine got a voice, and now it is also an
 * audible one — **the chain clanks once per plate**, so the rate you hear is
 * `commanded / GROUSER_PITCH`, which is exactly the rate you watch the belt
 * turn at. One fact: change it and the sound and the picture move together.
 */
export const GROUSERS = 11;
export const GROUSER_PITCH = TRACK.length / GROUSERS;

/**
 * Gravity, m/s². The world's, not the machine's — it lives here because three
 * places need the same number: the physics world, the track model's normal
 * load, and the accelerometer that tells the cab how hard it is being shaken.
 */
export const G = 9.81;

/**
 * Which side of the machine is which, in body space.
 *
 * The machine's forward is +Z and its up is +Y, and in a right-handed frame
 * `forward = up × right`. Solving that gives **right = −X, left = +X** — check
 * it against three.js if it looks backwards: a camera's forward is −Z, up +Y,
 * right +X, and `(0,1,0) × (1,0,0) = (0,0,−1)` ✓.
 *
 * These exist as named constants because getting them the wrong way round
 * silently mirrors the steering, which is invisible on a symmetric hull. It
 * shipped that way once.
 */
export const LEFT_X = GAUGE / 2;
export const RIGHT_X = -GAUGE / 2;

/** Belly clearance above the bottom of the tracks. This is what beaches you. */
export const CLEARANCE = 0.42;

export const MASS = 6200;

/** Top track speed, m/s. About 8 km/h — a working speed, not a driving one. */
export const MAX_TRACK_SPEED = 2.2;

/**
 * How close the machine has to get before the rig calls a marker reached, m.
 *
 * Generous, and it has to be: a marker is a stake in the ground, not a docking
 * port, and a rung-one machine steered by two levers cannot be asked for
 * precision it does not have. Precision is a rung-two subject.
 *
 * It lives here rather than with the goal tracker because **two things measure
 * it and they must not disagree**: the rig decides a pin is reached, and NAV-1
 * decides a pin is behind it and moves on (`modules/autonav.ts`, `ARRIVED`).
 * Let NAV-1's radius exceed this one and an autopilot would sail past a pin the
 * rig never credited — an exercise that cannot be completed by the only thing
 * built to complete it. `tests/mission.test.ts` pins the inequality.
 */
export const PIN_REACH = 8;

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
