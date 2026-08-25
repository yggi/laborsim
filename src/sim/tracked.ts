/**
 * Rung 1 — the tracked platform.
 *
 * Rapier has no anisotropic collider friction, and its built-in vehicle
 * controller models *wheels* with suspension. Neither fits a track, so the
 * running gear is ours. That is not a workaround: a black box that produced
 * correct-looking motion would be a layer the player cannot open, which
 * principle 5 forbids. The model *is* the teaching layer.
 *
 * How it works, per fixed step:
 *
 *   - Each track is sampled at SAMPLES_PER_TRACK points along its contact
 *     length, and **each sample is a bogie**: a wheel on its own spring and
 *     damper, hanging off the track frame. Every one of them casts a ray down
 *     the machine's own up-axis and measures how far away the ground is.
 *   - The springs are what hold the machine up. The track blocks do not touch
 *     the ground at all (BELT_GROUP), so nothing is resting on a rigid box —
 *     put one corner in a rut and only that corner's springs let go.
 *   - What a bogie's spring is carrying is the **normal load** at that contact,
 *     so the friction it can deliver is capped at `mu · N · dt`. The cap is
 *     physics; the impulse it *seeks* is the one that would null its patch's
 *     slip, sized against the effective mass at that point and shared out
 *     between every bogie pushing at once.
 *
 * Everything interesting falls out rather than being scripted: fewer bogies in
 * contact means less traction, so high-centring the belly on a ridge leaves the
 * tracks clawing air. Turning needs lateral slip, so it skids. A grade steeper
 * than friction allows slides you back down. Braking hard pitches the nose
 * down, and the front bogies take the load they have transferred — which used
 * to be impossible to express, because weight was shared out equally by
 * arithmetic rather than measured off a spring.
 *
 * There are two tuned constants here, MU and ZETA, and both are quantities an
 * engineer would name and a spec sheet would quote — a friction coefficient and
 * a damping ratio. Everything else is a dimension, a mass, or derived from
 * them: the spring rate is the machine's own weight divided by the sag it is
 * specified to sit at, and the climb limit is still `atan(MU)`.
 */

import type {
  RigidBody,
  SdpMatrix3,
  World,
} from "@dimforge/rapier3d-deterministic-compat";
import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import type { Suspension, TrackState } from "../core/snapshot.ts";
import {
  CLEARANCE,
  G,
  HULL,
  LEFT_X,
  MASS,
  MAX_TRACK_SPEED,
  RIGHT_X,
  SUSPENSION,
  TRACK,
} from "../core/spec.ts";
import {
  clamp,
  cross,
  dot,
  normalize,
  type Quat,
  reject,
  rotate,
  sub,
  type Vec3,
  vec,
} from "../core/vec.ts";

/* -- tuning. Dimensions live in core/spec.ts, one fact one place. -------- */

/** How fast a track can change speed. The drivetrain is not instant. */
const TRACK_ACCEL = 2.6;

/** Track-on-ground friction. The one tuned number in this file. */
const MU = 0.95;

const SAMPLES_PER_TRACK: number = 6;
/** Every sample on both tracks is a bogie, and they share the machine. */
const BOGIES = SAMPLES_PER_TRACK * 2;

/* -- the springs --------------------------------------------------------- */

/**
 * Where a bogie hangs from, in body space: the top of the track frame.
 *
 * Rays start here rather than at the bottom of the track, because the bottom of
 * the track is where the *wheel* is and the wheel is the thing that moves. The
 * rail does not.
 */
const RAIL = TRACK.height;

/**
 * The spring's free length — rail to wheel with nothing on it.
 *
 * One sag past the track bottom, which is what makes the machine's parked ride
 * height come out exactly where it was before any of this existed: press the
 * springs down by their static sag and the wheel is at the bottom of the track,
 * where the belt is drawn. Nothing in `render/` had to move.
 */
const FREE = RAIL + SUSPENSION.sag;

/**
 * Newtons per metre, one bogie — **derived, not chosen**.
 *
 * A suspension is specified by the ride height it settles at, not by its rate:
 * say how far the machine's own weight squashes one bogie and the rate is
 * arithmetic. Doing it the other way round would be a gain to tune, and a gain
 * you cannot name physically is the thing this file has always refused.
 */
const SPRING = (MASS * G) / BOGIES / SUSPENSION.sag;

/**
 * Damping ratio of one bogie — the second of this file's two tuned numbers.
 *
 * Below 1 the suspension is under-damped and rings after a hit, which is what a
 * work machine does and what makes a rut a *knock* rather than a squash. Near 1
 * it would swallow the ground entirely, and the ground is the thing this exists
 * to let you feel. From it the damping coefficient follows the textbook way,
 * `2ζ√(k·m)`, which is why there is no second number to tune here either.
 */
const ZETA = 0.45;
const DAMPER = 2 * ZETA * Math.sqrt(SPRING * (MASS / BOGIES));

/**
 * How much stiffer the stop at the end of the travel is than the spring.
 *
 * Rubber, not steel: a bump stop is a hard progressive spring rather than a
 * wall, so bottoming out is a thing you feel arriving instead of a collision.
 */
const BUMP_STOP = 9;

/**
 * The most a bogie may be asked to answer for, however bad the reading.
 *
 * A ray that starts inside something — the machine climbing onto a barrier —
 * reports the ground at zero distance, which is a fully compressed spring on
 * the rubber and, uncapped, an impulse that would fire the machine off the
 * site. The cap makes a bad reading merely firm.
 */
const MAX_SQUASH = SUSPENSION.travel * 1.5;

/* -- who touches the ground ---------------------------------------------- */

/**
 * The belts do not ride on the ground; the springs do.
 *
 * Rapier collision groups, as `(membership << 16) | filter`. The terrain is
 * given a layer of its own and the track blocks filter it out, which is the one
 * line that makes the suspension real: leave them colliding and the machine
 * rests on two rigid boxes, the springs never move, and every bogie under a
 * track reads the same ground — the rut disappears into the box that spans it.
 *
 * They still collide with everything *else*, which is the reason it is a group
 * rather than a sensor: a track shoves a cone, climbs a barrier, and beaches on
 * the hull, exactly as before.
 */
export const GROUND_GROUP = 0x0002_ffff;
const BELT_GROUP = 0x0001_fffd;

/* ----------------------------------------------------------------------- */

interface TrackAccumulator {
  contacts: number;
  surfaceSum: number;
  tractionSum: number;
  squashSum: number;
  powerSum: number;
  bottomed: number;
}

/**
 * One wheel on one spring, as measured this step.
 *
 * Everything is gathered before anything is applied, so the friction half reads
 * the velocity the machine arrived with rather than the one the spring beside
 * it has just changed. Two passes over a struct is cheaper than an ordering bug
 * nobody can see.
 */
interface Bogie {
  /** Where its wheel is touching, world. */
  readonly point: Vec3;
  readonly normal: Vec3;
  /** Velocity of the machine at that contact, before any impulse this step. */
  readonly velocity: Vec3;
  /** Newtons the spring and its damper are holding. Never negative. */
  readonly load: number;
  /** Metres compressed from free length. */
  readonly squash: number;
  /** How fast it is compressing, m/s. Signed: negative is extending. */
  readonly rate: number;
  /** Past the end of the travel, on the rubber. */
  readonly bottomed: boolean;
}

const HANGING: Suspension = { compression: 0, damping: 0, bottomed: 0 };

/**
 * The machine as everything under it sees it, once per step.
 *
 * Gathered rather than asked for twelve times: the pose, the mass properties,
 * and how many bogies are sharing the work.
 */
interface Ground {
  /** The machine's own up and forward, in world space. */
  readonly up: Vec3;
  readonly nose: Vec3;
  readonly com: Vec3;
  readonly inverseInertia: SdpMatrix3;
  /** Bogies touching, **both tracks together**. */
  readonly contacts: number;
}

const count = (bogies: readonly (Bogie | null)[]): number =>
  bogies.reduce((n, b) => (b ? n + 1 : n), 0);

/**
 * **How much of the machine you get for a push at one point, in one direction.**
 *
 * A bogie pushes at ground level and the machine's centre of mass is 1.3 m
 * above it, so some of every push goes into turning the machine rather than
 * moving it — that is why hard braking pitches the nose down. The textbook
 * effective mass says how much:
 *
 *     1/m_eff = 1/m + (r × d)ᵀ · I⁻¹ · (r × d)
 *
 * This is not an optimisation or a nicety. The model used to spend an equal
 * share of the machine's mass at each contact, which ignores the second term
 * entirely — and the second term is **larger than the first** here
 * (`m·h²/I ≈ 2`). Every friction impulse therefore over-corrected by a factor
 * of three, and each over-correction rolled the machine into an equal and
 * opposite slip for the next step. Nothing showed, because the belts were
 * rigid boxes lying on the ground and the ground would not let them roll. Put
 * the machine on springs and it appears immediately: a two-step limit cycle,
 * ±0.14 rad/s of roll, for ever, with both tracks reporting 100% of their grip
 * in use while parked on a level pad.
 *
 * `I⁻¹` is Rapier's, in world space, read once a step. Arithmetic only: the
 * value crosses into a replay, so it has to mean the same on two engines.
 */
function effectiveMass(inverseInertia: SdpMatrix3, arm: Vec3, dir: Vec3): number {
  const w = cross(arm, dir);
  const iw = vec(
    inverseInertia.m11 * w.x + inverseInertia.m12 * w.y + inverseInertia.m13 * w.z,
    inverseInertia.m12 * w.x + inverseInertia.m22 * w.y + inverseInertia.m23 * w.z,
    inverseInertia.m13 * w.x + inverseInertia.m23 * w.y + inverseInertia.m33 * w.z,
  );
  return 1 / (1 / MASS + dot(w, iw));
}

export interface TrackedMachine {
  readonly body: RigidBody;
  /** Advance the machine one fixed step. Call before `world.step()`. */
  drive(left: number, right: number, dt: number): void;
  readonly left: TrackState;
  readonly right: TrackState;
  /** Hull speed over ground, m/s. */
  speed(): number;
}

export function spawnTrackedMachine(world: World, at: Vec3): TrackedMachine {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(at.x, at.y, at.z)
      // A tracked machine does not spin freely; without damping the skid-steer
      // impulses ring. This is drivetrain and ground drag, not a stability aid.
      .setLinearDamping(0.06)
      .setAngularDamping(0.55),
  );

  const trackY = TRACK.height / 2;
  const hullY = TRACK.height + CLEARANCE + HULL.height / 2;

  // The hull carries real friction; the tracks do not.
  //
  // Track colliders stay at 0 so every horizontal force on an upright machine
  // comes from the model — that is the whole teaching layer, and it now goes
  // further: the belts do not touch the ground at all, so the *vertical* force
  // comes from the model too, one spring at a time. But an upright
  // machine never touches the ground with its hull (0.42 m of belly clearance),
  // so hull friction is inert during normal driving and only bites when the
  // machine is on its back or bellied on a ridge. Without it a flipped wreck
  // skates across the site like it is on ice, which reads as broken rather than
  // as broken-down. `Max` combine takes the hull's friction against the
  // friction-0 ground, the same trick the props use.
  const hull = RAPIER.ColliderDesc.cuboid(
    HULL.width / 2,
    HULL.height / 2,
    HULL.length / 2,
  )
    .setTranslation(0, hullY, 0)
    .setFriction(0.85)
    .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
    .setRestitution(0)
    .setDensity(0);
  world.createCollider(hull, body);

  for (const x of [LEFT_X, RIGHT_X]) {
    const track = RAPIER.ColliderDesc.cuboid(
      TRACK.width / 2,
      TRACK.height / 2,
      TRACK.length / 2,
    )
      .setTranslation(x, trackY, 0)
      .setFriction(0)
      .setRestitution(0)
      // The belts pass through the ground and ride on their springs instead.
      // Everything else — props, and whatever the site puts in the way — they
      // still hit. See BELT_GROUP.
      .setCollisionGroups(BELT_GROUP)
      .setDensity(0);
    world.createCollider(track, body);
  }

  body.setAdditionalMass(MASS, true);

  /** Actual track surface speed, slewed toward the command. */
  let speedL = 0;
  let speedR = 0;
  let stateL = idleTrack();
  let stateR = idleTrack();

  function sampleOffsets(x: number): Vec3[] {
    const out: Vec3[] = [];
    for (let i = 0; i < SAMPLES_PER_TRACK; i++) {
      const t = SAMPLES_PER_TRACK === 1 ? 0.5 : i / (SAMPLES_PER_TRACK - 1);
      // The rail, not the track bottom: this is where the spring hangs from.
      out.push(vec(x, RAIL, (t - 0.5) * TRACK.length));
    }
    return out;
  }
  const offsets = [...sampleOffsets(LEFT_X), ...sampleOffsets(RIGHT_X)];

  /**
   * Where each bogie's travel was last step.
   *
   * `NaN` means it was hanging. A wheel that has just found the ground has no
   * travel to difference against, and inventing one would hand its damper a
   * step change to answer to — which is a bogie coming down over a kerb being
   * loudly damped for arriving.
   */
  const travelled = new Float64Array(BOGIES).fill(Number.NaN);

  /**
   * Look for the ground under one bogie and work out what its spring is doing.
   *
   * The ray goes down the **machine's own** up-axis rather than the world's,
   * because that is the direction a strut actually travels in. On the flat the
   * two are the same; on a grade they are not, and using the world's would mean
   * a suspension that compressed less the steeper the hill got.
   */
  function measure(
    index: number,
    q: Quat,
    origin: Vec3,
    up: Vec3,
    dt: number,
  ): Bogie | null {
    const offset = offsets[index] as Vec3;
    const local = rotate(q, offset);
    const from = vec(origin.x + local.x, origin.y + local.y, origin.z + local.z);
    const hit = probe(world, body, from, vec(-up.x, -up.y, -up.z), FREE);
    // Nothing within a spring's length of the rail: the wheel is hanging.
    if (!hit) {
      travelled[index] = Number.NaN;
      return null;
    }

    const velocity = pointVelocity(body, hit.point);
    const squash = Math.min(FREE - hit.distance, MAX_SQUASH);

    /**
     * **The damper answers to the travel, not to the hull.**
     *
     * How fast the spring is closing, differenced off its own last reading —
     * which is what a travel sensor on the strut measures, and it is not the
     * same quantity as the hull's vertical velocity. The difference is the
     * whole point: drive at a rut and the *ground* comes up to meet a wheel
     * that is going along at a constant height, so the strut closes fast while
     * the hull has barely begun to move. Project the hull's velocity instead
     * and the machine cannot feel the ground until it has already ridden over
     * it.
     *
     * It also makes standing still read exactly zero, where projecting the
     * hull's velocity left the damper permanently carrying 6% of the weight —
     * an artefact of where in the step the sample was taken, arriving as a
     * parked machine reporting 122 W of damper power for ever.
     */
    const previous = travelled[index] as number;
    const rate = Number.isNaN(previous) ? 0 : (squash - previous) / dt;
    travelled[index] = squash;
    const bottomed = squash > SUSPENSION.travel;
    const spring = bottomed
      ? SPRING * (SUSPENSION.travel + BUMP_STOP * (squash - SUSPENSION.travel))
      : SPRING * squash;
    return {
      point: hit.point,
      normal: hit.normal,
      velocity,
      // A spring pushes. It never pulls the machine down onto the ground, which
      // is what a damper on a fast rebound would otherwise do.
      load: Math.max(0, spring + DAMPER * rate),
      squash,
      rate,
      bottomed,
    };
  }

  /**
   * One side: hold the machine up, then drive it along.
   *
   * The order on the page is the order of the argument. What the springs are
   * carrying is the normal load, and the normal load is what the friction cone
   * is a cone *of* — so the weight is measured before it is spent, rather than
   * shared out by dividing the machine by the number of samples that happened
   * to be touching.
   */
  function applySide(
    bogies: readonly (Bogie | null)[],
    commandedSpeed: number,
    ground: Ground,
    dt: number,
  ): TrackAccumulator {
    const { nose, up, com, inverseInertia, contacts: sharing } = ground;
    const acc: TrackAccumulator = {
      contacts: 0,
      surfaceSum: 0,
      tractionSum: 0,
      squashSum: 0,
      powerSum: 0,
      bottomed: 0,
    };

    for (const bogie of bogies) {
      if (!bogie) continue;
      acc.contacts++;
      acc.squashSum += bogie.squash;
      if (bogie.bottomed) acc.bottomed++;
      // What the damper is turning into heat: `c · v²`, the honest quantity
      // behind the knock you hear over a rut (`audio/voices.ts`).
      acc.powerSum += DAMPER * bogie.rate * bogie.rate;

      /**
       * The strut, along the machine's up-axis and applied at the contact —
       * which is what makes one bogie finding a rock roll the machine instead
       * of merely lifting it.
       *
       * A **force**, where the friction below is an impulse, and the
       * difference is not pedantry. Rapier integrates a force in the same
       * breath as gravity, so a machine standing still has its weight exactly
       * cancelled and reports a velocity of zero. Applied as an impulse the
       * two land half a step apart: the machine sat perfectly still at a
       * reported 0.061 m/s for ever, which is a stationary machine clocking
       * 3.7 metres a minute onto its own odometer.
       */
      body.addForceAtPoint(
        { x: up.x * bogie.load, y: up.y * bogie.load, z: up.z * bogie.load },
        bogie.point,
        true,
      );

      const forward = normalize(reject(nose, bogie.normal));
      // forward x normal, not normal x forward: the latter points LEFT.
      const right = normalize(cross(forward, bogie.normal));

      const along = dot(bogie.velocity, forward);
      const lateral = dot(bogie.velocity, right);

      // What the ground can hold here: the load this bogie's own spring is
      // carrying, times mu. Equal shares of the machine's weight used to stand
      // in for this; now a nose-down machine really does put more of itself on
      // its front bogies, and they really do have more grip for it.
      const maxImpulse = MU * bogie.load * dt;

      // The impulse that would null this patch's slip — sized against the mass
      // a push *here* can actually shift, and divided between every bogie
      // pushing at once, because twelve of them each correcting the whole
      // machine is twelve times the correction the machine needed.
      const arm = sub(bogie.point, com);
      let impulseLong =
        (effectiveMass(inverseInertia, arm, forward) / sharing) *
        (commandedSpeed - along);
      let impulseLat = (effectiveMass(inverseInertia, arm, right) / sharing) * -lateral;

      const wanted = Math.sqrt(impulseLong * impulseLong + impulseLat * impulseLat);
      if (wanted > maxImpulse && wanted > 1e-9) {
        const k = maxImpulse / wanted;
        impulseLong *= k;
        impulseLat *= k;
        acc.tractionSum += 1;
      } else if (maxImpulse > 1e-9) {
        acc.tractionSum += wanted / maxImpulse;
      }

      const impulse = {
        x: forward.x * impulseLong + right.x * impulseLat,
        y: forward.y * impulseLong + right.y * impulseLat,
        z: forward.z * impulseLong + right.z * impulseLat,
      };
      body.applyImpulseAtPoint(impulse, bogie.point, true);
      acc.surfaceSum += along;
    }
    return acc;
  }

  return {
    body,
    drive(left, right, dt) {
      speedL = slew(speedL, clamp(left, -MAX_TRACK_SPEED, MAX_TRACK_SPEED), dt);
      speedR = slew(speedR, clamp(right, -MAX_TRACK_SPEED, MAX_TRACK_SPEED), dt);

      // Last step's spring forces, spent. Rapier holds a force until it is
      // told otherwise, and twelve of them left standing would be a machine
      // that pushes itself up harder every step it is not driven.
      body.resetForces(true);
      body.resetTorques(true);

      const q = body.rotation();
      const origin = body.translation();
      const up = rotate(q, vec(0, 1, 0));

      // Measure all twelve before applying anything: a bogie's friction reads
      // the velocity the machine arrived with, not the one the spring next to
      // it has already changed.
      const bogies = offsets.map((_, i) => measure(i, q, origin, up, dt));
      const bogiesL = bogies.slice(0, SAMPLES_PER_TRACK);
      const bogiesR = bogies.slice(SAMPLES_PER_TRACK);

      // Both tracks together, which is what makes losing contact on one side
      // cost the other: everyone still down divides the same correction.
      const ground: Ground = {
        up,
        nose: rotate(q, vec(0, 0, 1)),
        com: body.worldCom(),
        inverseInertia: body.effectiveWorldInvInertia(),
        contacts: count(bogiesL) + count(bogiesR),
      };

      const accL = applySide(bogiesL, speedL, ground, dt);
      const accR = applySide(bogiesR, speedR, ground, dt);

      stateL = summarize(speedL, accL);
      stateR = summarize(speedR, accR);
    },
    get left() {
      return stateL;
    },
    get right() {
      return stateR;
    },
    speed() {
      const v = body.linvel();
      return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    },
  };
}

function slew(current: number, target: number, dt: number): number {
  const limit = TRACK_ACCEL * dt;
  return current + clamp(target - current, -limit, limit);
}

function idleTrack(): TrackState {
  return {
    commanded: 0,
    surface: 0,
    slip: 0,
    contacts: 0,
    traction: null,
    suspension: HANGING,
  };
}

function summarize(commanded: number, acc: TrackAccumulator): TrackState {
  // The mean is taken over the whole side rather than over the bogies that
  // found ground: a wheel hanging in a hollow is genuinely at zero compression,
  // and averaging it away would report a machine with one side in the air as
  // sitting normally on the other.
  const suspension: Suspension = {
    compression: acc.squashSum / SAMPLES_PER_TRACK / SUSPENSION.travel,
    damping: acc.powerSum,
    bottomed: acc.bottomed,
  };
  // No sample down means no friction cone to be a fraction of. Reporting 0 here
  // said "using none of your grip", which is what a parked machine reports —
  // and the two are opposite conditions. `null` is the honest answer, and it
  // makes every reader decide what to show rather than accidentally show a zero.
  if (acc.contacts === 0) {
    return {
      commanded,
      surface: 0,
      slip: commanded,
      contacts: 0,
      traction: null,
      suspension,
    };
  }
  const surface = acc.surfaceSum / acc.contacts;
  return {
    commanded,
    surface,
    slip: commanded - surface,
    contacts: acc.contacts,
    traction: acc.tractionSum / acc.contacts,
    suspension,
  };
}

/** Velocity of the point of the body currently at `world`. */
function pointVelocity(body: RigidBody, world: Vec3): Vec3 {
  const c = body.worldCom();
  const v = body.linvel();
  const w = body.angvel();
  const r = vec(world.x - c.x, world.y - c.y, world.z - c.z);
  const rot = cross(vec(w.x, w.y, w.z), r);
  return vec(v.x + rot.x, v.y + rot.y, v.z + rot.z);
}

interface Probe {
  point: Vec3;
  normal: Vec3;
  /** How far down the ray the ground was, metres. */
  distance: number;
}

/**
 * Contact is *measured*, never scheduled. The concept-3 probe scheduled foot
 * contact by gait phase, and the handover flags that as the thing that made
 * ground-adaption failures decorative rather than diagnosable.
 *
 * `direction` is a unit vector and `reach` is how far the ray looks — one
 * spring's free length, so "no hit" means "this wheel is hanging" rather than
 * "the ground is a bit far away".
 */
function probe(
  world: World,
  body: RigidBody,
  from: Vec3,
  direction: Vec3,
  reach: number,
): Probe | null {
  const ray = new RAPIER.Ray(from, direction);
  const hit = world.castRayAndGetNormal(
    ray,
    reach,
    true,
    undefined,
    undefined,
    undefined,
    body,
  );
  if (!hit) return null;
  const toi = hit.timeOfImpact;
  return {
    point: vec(
      from.x + direction.x * toi,
      from.y + direction.y * toi,
      from.z + direction.z * toi,
    ),
    normal: vec(hit.normal.x, hit.normal.y, hit.normal.z),
    distance: toi,
  };
}
