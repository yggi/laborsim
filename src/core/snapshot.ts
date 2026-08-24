import type { Stage } from "../control/bus.ts";
import type { DamageEvent } from "../sim/damage.ts";

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

/**
 * Where a piece of site furniture has ended up. Only sent for props that are
 * actually moving — a site standing still costs nothing to transmit.
 */
export interface PropPose {
  readonly index: number;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
}

export interface Snapshot {
  readonly tick: number;
  readonly simSeconds: number;
  /**
   * The seed this world was generated from.
   *
   * It belongs here because a recording that cannot rebuild its own world is
   * not a recording (rule 2 — the seed is part of the recorded scenario), and
   * it arrived because of a much better reason than that: **the machine's
   * serial number is the exercise number.** The rig generates the site and
   * stamps the dataplate in the same breath, so the number riveted to the panel
   * in front of the operator *is* the world they are about to be tested on.
   */
  readonly seed: number;
  readonly machine: MachineState;
  /**
   * The rack, stage by stage, from the top of the rail to the terminal.
   *
   * Not "who won" — under a pipeline nobody wins, everyone shapes. Showing the
   * value at each stage is a stronger answer to the attribution rule than
   * naming an owner, and it is the multi-layer inspectability pillar landing
   * where it matters most.
   */
  readonly stages: readonly Stage[];
  /** Props that moved this step. Empty on an undisturbed site. */
  readonly props: readonly PropPose[];
  /** The ledger so far, oldest line first. */
  readonly damage: readonly DamageEvent[];
  /** Total billed, yen. */
  readonly bill: number;
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
  // deterministic-exempt: display only, never read back into the sim.
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
  // deterministic-exempt: display only, never read back into the sim.
  const roll = Math.atan2(2 * (w * z + x * y), 1 - 2 * (x * x + z * z));
  return { pitch, roll };
}
