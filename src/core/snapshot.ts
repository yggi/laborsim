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
  readonly id: string;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
}

/**
 * Everything the presentation layer is allowed to know, as of one sim tick.
 * Nothing here is live: it is a value, taken at a moment, safe to hold.
 */
export interface Snapshot {
  readonly tick: number;
  readonly simSeconds: number;
  readonly bodies: readonly BodyPose[];
}

/** Rate at which the UI reads snapshots. Far below the sim's 60 Hz, by design. */
export const SNAPSHOT_HZ = 10;
