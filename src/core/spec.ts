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

/**
 * The running gear's springs, in metres. **One bogie per contact sample.**
 *
 * Both numbers are dimensions rather than gains — they are what a spec sheet
 * quotes about an undercarriage, and they are here for the same reason the hull
 * is: the sim builds the springs from them, and what the machine *sounds* like
 * over a rut is a rendering of what they do (`audio/voices.ts`).
 *
 * `sag` is the half that is easy to get wrong. It is how far the machine's own
 * weight compresses one bogie **standing still**, and it is what sets the spring
 * rate: the rate is not a number anybody picked, it is
 * `weight ÷ bogies ÷ sag`. Choosing the sag rather than the rate is how a real
 * machine is specified, and it has a consequence worth the trouble — at rest the
 * wheel sits exactly at the bottom of the track, so the machine parked on a pad
 * sits precisely where it did before it had any suspension at all.
 *
 * Travel is small on purpose. This is a six-tonne work machine on a
 * bogie-sprung undercarriage, not a rally car: it takes the edge off a rut and
 * it runs out, and running out is the interesting part.
 */
export const SUSPENSION = {
  /** Full droop to the bump stop, one bogie. */
  travel: 0.16,
  /** How much of that travel the machine's own weight uses, standing still. */
  sag: 0.072,
};

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
