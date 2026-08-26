/**
 * A hand-built `Snapshot`, built the one way that cannot be wrong.
 *
 * Three places construct snapshots by hand and none of them is the sim: the
 * cockpit bench poses the panel, the listening bench poses the machine's voice,
 * and the tests pose whatever the case under test needs. Each of them grew its
 * own kit — its own `track()`, its own stage builder, its own literal for
 * *standing on the ground* — and the cost was paid twice in one week: adding
 * `suspension` and then `goal` to the snapshot meant teaching all three, from
 * scratch, in three commits that did not know about each other.
 *
 * Worse than the tax was the drift. `contacts: 0` with a traction reading
 * "described a machine that does not exist", so one kit was fixed to make it
 * unrepresentable — and the other two were not. The listening bench duly grew a
 * scene with a track in mid-air at 45% spring compression, feeding a bogie
 * voice off a spring that nothing was standing on.
 *
 * So: one kit, and the invariants live in it rather than in a comment asking
 * three callers to remember. `tests/architecture.test.ts` fails if a fourth
 * appears — the repo's own answer to a rule nothing enforces (`doc/META.md`).
 *
 * This is *not* the sim. Nothing here simulates; it states a pose. The sim's
 * snapshots come from `sim/world.ts` and agree with these by construction,
 * because both satisfy the same type and this file refuses to build the states
 * the sim cannot reach.
 */

import {
  CHASSIS,
  type Condition,
  NOMINAL,
  type Stage,
  type Verb,
} from "../control/bus.ts";
import type { DamageEvent } from "../sim/damage.ts";
import type { SimEvent } from "./events.ts";
import type {
  Goal,
  MachineState,
  PropPose,
  Shake,
  Snapshot,
  Suspension,
  TrackState,
  Waypoint,
} from "./snapshot.ts";
import { NO_EXERCISE } from "./snapshot.ts";
import { G } from "./spec.ts";

/**
 * Standing on the springs: the static sag, and nothing moving.
 *
 * A damper only dissipates while a wheel is travelling, so a parked machine is
 * silent there — and the sim agrees to the last decimal (`sim/tracked.ts`).
 */
export const SETTLED: Suspension = Object.freeze({
  compression: 0.45,
  damping: 0,
  bottomed: 0,
});

/** Hanging in the air. Nothing under the wheel, so the spring is at full droop. */
export const HANGING: Suspension = Object.freeze({
  compression: 0,
  damping: 0,
  bottomed: 0,
});

/** Standing on the ground: an accelerometer reads 1 g up and nothing else. */
export const STANDING: Shake = Object.freeze({ surge: 0, heave: G, sway: 0, jerk: 0 });

/**
 * A track doing one thing, and never a track that cannot exist.
 *
 * Two invariants, enforced here because a comment asking three callers to
 * remember them is how the drift happened:
 *
 * 1. **No contact, no traction reading.** `traction` is the fraction of the
 *    friction cone in use, and a track in the air has no cone — so it is `null`
 *    rather than `0`, which is the reading a *parked* track gives. Every
 *    consumer has to decide what to show for nothing measured (`doc/MEMORY.md`
 *    § 4.1), and it cannot decide if the fixture lies to it.
 * 2. **No contact, no compression.** A spring with nothing under it is at full
 *    droop. Inheriting the parked sag put a hanging track at 45% compression on
 *    the listening bench, which is a reading the sim can never produce.
 *
 * `surface` is derived rather than defaulted: surface speed *is* commanded
 * minus slip, and a fixture that states all three independently can state a
 * fourth thing the drivetrain has no way of doing.
 *
 * The bare default is a machine **parked with the weight on it**, so `traction`
 * is 0: a track pushing nothing spends none of its friction cone. The two kits
 * disagreed about this — one defaulted to 0.2, which is a dial reading somebody
 * wanted to see rather than a state a stationary machine is in — and unifying
 * on the loose one made `idle` measurably louder on the listening bench.
 */
export function track(over: Partial<TrackState> = {}): TrackState {
  const contacts = over.contacts ?? 6;
  const airborne = contacts === 0;
  const commanded = over.commanded ?? 0;
  const slip = over.slip ?? 0;
  return {
    traction: airborne ? null : (over.traction ?? 0),
    suspension: airborne ? HANGING : (over.suspension ?? SETTLED),
    ...over,
    contacts,
    commanded,
    slip,
    surface: over.surface ?? commanded - slip,
    // After the spread, so an `over` that names them cannot reintroduce the
    // state this function exists to refuse.
    ...(airborne ? { traction: null, suspension: HANGING } : {}),
  };
}

/** A track parked on level ground with the weight on it. */
export const PARKED: TrackState = Object.freeze(track());

/** A track hanging over an edge, running away with nothing to push against. */
export const AIRBORNE: TrackState = Object.freeze(track({ contacts: 0 }));

export interface StageSpec {
  readonly id: string;
  readonly maker: string;
  /** Defaults to the id: a slot is named by what it is unless it says otherwise. */
  readonly label?: string;
  readonly verb?: Verb;
  readonly enabled?: boolean;
  readonly idle?: boolean;
  readonly condition?: Condition;
  readonly safety?: boolean;
  readonly readout?: Record<string, number>;
  readonly output?: { left: number; right: number };
}

/** One slot on the rail. */
export function stage(spec: StageSpec): Stage {
  return {
    id: spec.id,
    label: spec.label ?? spec.id,
    maker: spec.maker,
    verb: spec.verb ?? "SET",
    enabled: spec.enabled ?? true,
    idle: spec.idle ?? false,
    output: spec.output ?? { left: 0, right: 0 },
    readout: spec.readout,
    condition: spec.condition ?? NOMINAL,
    safety: spec.safety ?? false,
  };
}

/**
 * The chassis slot, in a named maker's voice.
 *
 * Its `id` is `CHASSIS` rather than a string, because the annunciator finds the
 * pilot by that constant and a bench that spells it differently is a bench
 * testing something else.
 */
export const chassis = (maker: string, over: Partial<StageSpec> = {}): Stage =>
  stage({ id: CHASSIS, label: "PILOT", maker, ...over });

export interface SnapshotSpec {
  readonly tick?: number;
  readonly simSeconds?: number;
  readonly seed?: number;
  readonly distance?: number;
  readonly left?: TrackState;
  readonly right?: TrackState;
  /** Both tracks at once, when a pose is not about the difference between them. */
  readonly tracks?: TrackState;
  /** Defaults to the mean surface speed, which is what a speedometer reads. */
  readonly speed?: number;
  readonly pitch?: number;
  readonly roll?: number;
  readonly shake?: Shake;
  readonly stages?: readonly Stage[];
  readonly props?: readonly PropPose[];
  readonly route?: readonly Waypoint[];
  readonly goal?: Goal;
  readonly damage?: readonly DamageEvent[];
  readonly bill?: number;
  readonly events?: readonly SimEvent[];
}

/**
 * A whole snapshot, with the emptiest honest value for everything unstated.
 *
 * A snapshot is a large record and any one bench reads a handful of its fields.
 * Rather than fake the rest convincingly, the defaults are *nothing happening*:
 * no props, no route, no damage, no bill, no exercise. A route on the listening
 * bench would be a detail nobody can hear pretending to matter.
 */
export function snapshot(spec: SnapshotSpec = {}): Snapshot {
  const left = spec.left ?? spec.tracks ?? PARKED;
  const right = spec.right ?? spec.tracks ?? PARKED;
  const machine: MachineState = {
    pose: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
    left,
    right,
    speed: spec.speed ?? Math.max(0, (left.surface + right.surface) / 2),
    pitch: spec.pitch ?? 0,
    roll: spec.roll ?? 0,
    shake: spec.shake ?? STANDING,
  };
  return {
    tick: spec.tick ?? 0,
    simSeconds: spec.simSeconds ?? 0,
    seed: spec.seed ?? 0,
    distance: spec.distance ?? 0,
    machine,
    stages: spec.stages ?? [],
    props: spec.props ?? [],
    // Nothing hand-built has ever been driven into anything, so a fixture has
    // no wreckage. It is on the type rather than optional because a snapshot
    // always answers the question, and a `?.` in the renderer's hot loop is a
    // worse trade than an empty array.
    debris: [],
    route: spec.route ?? [],
    goal: spec.goal ?? NO_EXERCISE,
    damage: spec.damage ?? [],
    bill: spec.bill ?? 0,
    events: spec.events ?? [],
  };
}
