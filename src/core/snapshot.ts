/**
 * Architecture rule 3: state crosses from sim to UI in one direction, through
 * an explicit snapshot. Commands cross back as discrete queued inputs, never as
 * shared mutable state.
 *
 * An instrument is a view of a recording. That is not a metaphor — it is why
 * the same instrument code can drive a live cockpit and a replay.
 *
 * See docs/design/architecture-rules.md.
 */

/** A plain, structurally-cloneable pose. No three.js types cross this line. */
export interface BodyPose {
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
}

/**
 * Everything one track is doing. `slip` is rung 1's teaching quantity: the
 * difference between the speed the track is turning at and the speed the
 * ground is actually going past. Every rung-1 failure is legible in it —
 * spinning on a grade, skating through a turn, clawing air when beached.
 */
export interface TrackState {
  /** Track surface speed the drivetrain is delivering, m/s. */
  readonly commanded: number;
  /** Mean ground speed under the contacting samples, m/s. */
  readonly surface: number;
  /** commanded − surface. Non-zero means the track is sliding. */
  readonly slip: number;
  /** Samples touching ground, of 6. Zero means this track is doing nothing. */
  readonly contacts: number;
  /** Fraction of available traction being used, 0–1. At 1 you are sliding. */
  readonly traction: number;
}

export interface MachineState {
  readonly pose: BodyPose;
  readonly left: TrackState;
  readonly right: TrackState;
  /** Hull speed over ground, m/s. */
  readonly speed: number;
  /** Radians. Derived for display only — see the note below. */
  readonly pitch: number;
  readonly roll: number;
}

export interface Snapshot {
  readonly tick: number;
  readonly simSeconds: number;
  readonly machine: MachineState;
  /** Who owns the actuator bus right now, and who wanted it and lost. */
  readonly busOwner: string | null;
  readonly suppressed: readonly string[];
}

/**
 * Rate at which the UI reads snapshots. Far below the sim's 60 Hz, by design.
 */
export const SNAPSHOT_HZ = 10;

/**
 * Pitch and roll use `Math.asin`/`atan2`, which are not bit-portable across JS
 * engines. That is safe *here* and nowhere else: these are derived read-only
 * for display and never feed back into sim state, so they cannot cause two
 * machines to diverge. The ban in rule 2 is on transcendentals that close a
 * loop back into the simulation.
 */
export function attitudeOf(q: BodyPose["rotation"]): { pitch: number; roll: number } {
  const [x, y, z, w] = q;
  const sinPitch = 2 * (w * x - y * z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
  const roll = Math.atan2(2 * (w * z + x * y), 1 - 2 * (x * x + z * z));
  return { pitch, roll };
}
