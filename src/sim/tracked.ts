/**
 * Rung 1 — the tracked platform.
 *
 * Rapier has no anisotropic collider friction, and its built-in vehicle
 * controller models *wheels* with suspension. Neither fits a track, so the
 * friction model is ours. That is not a workaround: a black box that produced
 * correct-looking motion would be a layer the player cannot open, which
 * principle 5 forbids. The friction model *is* the teaching layer.
 *
 * How it works, per fixed step:
 *
 *   - The hull and both track blocks are real colliders with friction 0, so
 *     Rapier supplies normal support and collisions but no horizontal force.
 *   - Each track is sampled at SAMPLES_PER_TRACK points along its contact
 *     length. Each sample casts a short ray down.
 *   - Every sample in contact gets an equal share of the machine's weight, and
 *     an impulse capped by mu * N * dt, applied at the contact point.
 *
 * Everything interesting falls out rather than being scripted: fewer samples in
 * contact means less traction, so high-centring the belly on a ridge leaves the
 * tracks clawing air. Turning needs lateral slip, so it skids. A grade steeper
 * than friction allows slides you back down.
 *
 * There is exactly one tuned constant here (MU). Every other number is a
 * dimension or a mass.
 */

import type { RigidBody, World } from "@dimforge/rapier3d-deterministic-compat";
import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import type { TrackState } from "../core/snapshot.ts";
import {
  CLEARANCE,
  G,
  HULL,
  LEFT_X,
  MASS,
  MAX_TRACK_SPEED,
  RIGHT_X,
  TRACK,
} from "../core/spec.ts";
import {
  clamp,
  cross,
  dot,
  normalize,
  reject,
  rotate,
  type Vec3,
  vec,
} from "../core/vec.ts";

/* -- tuning. Dimensions live in core/spec.ts, one fact one place. -------- */

/** How fast a track can change speed. The drivetrain is not instant. */
const TRACK_ACCEL = 2.6;

/**
 * Track-on-ground friction. The one tuned number in this file.
 *
 * Exported because the climb limit falls straight out of it — `atan(MU)`, 43.5°
 * — and an exercise that grades its ground has to be checkable against the
 * angle the machine can actually take. `tests/mission.test.ts` holds the first
 * site to below it and the last one above it, which is the whole of what
 * "gentler slopes" means as an assertion rather than as an adjective.
 */
export const MU = 0.95;

const SAMPLES_PER_TRACK: number = 6;
/** How far above the track bottom a sample ray starts, and how far it reaches. */
const PROBE_UP = 0.25;
const PROBE_DOWN = 0.35;

/* ----------------------------------------------------------------------- */

interface TrackAccumulator {
  contacts: number;
  surfaceSum: number;
  tractionSum: number;
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
  // comes from the model — that is the whole teaching layer. But an upright
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
      out.push(vec(x, 0, (t - 0.5) * TRACK.length));
    }
    return out;
  }
  const offsets = { left: sampleOffsets(LEFT_X), right: sampleOffsets(RIGHT_X) };

  function applyTrack(
    offsetsForSide: Vec3[],
    commandedSpeed: number,
    dt: number,
    totalContacts: number,
  ): TrackAccumulator {
    const acc: TrackAccumulator = { contacts: 0, surfaceSum: 0, tractionSum: 0 };
    if (totalContacts === 0) return acc;

    const q = body.rotation();
    const origin = body.translation();
    const massShare = MASS / totalContacts;
    const maxImpulse = MU * massShare * G * dt;

    for (const offset of offsetsForSide) {
      const local = rotate(q, offset);
      const point = vec(origin.x + local.x, origin.y + local.y, origin.z + local.z);
      const hit = probe(world, body, point);
      if (!hit) continue;

      acc.contacts++;

      const forward = normalize(reject(rotate(q, vec(0, 0, 1)), hit.normal));
      // forward x normal, not normal x forward: the latter points LEFT.
      const right = normalize(cross(forward, hit.normal));

      const v = pointVelocity(body, hit.point);
      const along = dot(v, forward);
      const lateral = dot(v, right);

      // Impulse that would exactly null the slip for this sample's mass share,
      // then capped by what the ground can actually hold. The cap is where
      // slipping comes from, and it is the whole lesson of rung 1.
      let impulseLong = massShare * (commandedSpeed - along);
      let impulseLat = massShare * -lateral;

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
      body.applyImpulseAtPoint(impulse, hit.point, true);
      acc.surfaceSum += along;
    }
    return acc;
  }

  function countContacts(): number {
    let n = 0;
    const q = body.rotation();
    const origin = body.translation();
    for (const list of [offsets.left, offsets.right]) {
      for (const offset of list) {
        const local = rotate(q, offset);
        const point = vec(origin.x + local.x, origin.y + local.y, origin.z + local.z);
        if (probe(world, body, point)) n++;
      }
    }
    return n;
  }

  return {
    body,
    drive(left, right, dt) {
      speedL = slew(speedL, clamp(left, -MAX_TRACK_SPEED, MAX_TRACK_SPEED), dt);
      speedR = slew(speedR, clamp(right, -MAX_TRACK_SPEED, MAX_TRACK_SPEED), dt);

      // Weight is shared across every sample touching ground, both tracks
      // together — which is what makes losing contact on one side cost you
      // traction on the other.
      const total = countContacts();
      const accL = applyTrack(offsets.left, speedL, dt, total);
      const accR = applyTrack(offsets.right, speedR, dt, total);

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
  return { commanded: 0, surface: 0, slip: 0, contacts: 0, traction: null };
}

function summarize(commanded: number, acc: TrackAccumulator): TrackState {
  // No sample down means no friction cone to be a fraction of. Reporting 0 here
  // said "using none of your grip", which is what a parked machine reports —
  // and the two are opposite conditions. `null` is the honest answer, and it
  // makes every reader decide what to show rather than accidentally show a zero.
  if (acc.contacts === 0) {
    return { commanded, surface: 0, slip: commanded, contacts: 0, traction: null };
  }
  const surface = acc.surfaceSum / acc.contacts;
  return {
    commanded,
    surface,
    slip: commanded - surface,
    contacts: acc.contacts,
    traction: acc.tractionSum / acc.contacts,
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
}

/**
 * Contact is *measured*, never scheduled. The concept-3 probe scheduled foot
 * contact by gait phase, and the handover flags that as the thing that made
 * ground-adaption failures decorative rather than diagnosable.
 */
function probe(world: World, body: RigidBody, at: Vec3): Probe | null {
  const ray = new RAPIER.Ray(
    { x: at.x, y: at.y + PROBE_UP, z: at.z },
    { x: 0, y: -1, z: 0 },
  );
  const hit = world.castRayAndGetNormal(
    ray,
    PROBE_UP + PROBE_DOWN,
    true,
    undefined,
    undefined,
    undefined,
    body,
  );
  if (!hit) return null;
  const toi = hit.timeOfImpact;
  return {
    point: vec(at.x, at.y + PROBE_UP - toi, at.z),
    normal: vec(hit.normal.x, hit.normal.y, hit.normal.z),
  };
}
