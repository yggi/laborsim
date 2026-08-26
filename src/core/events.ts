/**
 * The event channel — the discrete half of the snapshot boundary.
 *
 * A snapshot answers *what is the machine doing*. It is a state, sampled, and
 * everything continuous belongs in it. But some things are not states: a cone
 * being struck happens at one tick and is over. Before this existed, the only
 * record of anything discrete was the ledger's ever-growing list, and every
 * consumer that wanted to *react* to a new line had to diff that list against a
 * high-water mark it kept itself — plus a hack to notice a RESET, because the
 * list getting shorter was the only clue.
 *
 * Two consumers already did that (the live voice and the debrief), the audio
 * engine is the third, and the beacon (L-046) and machine damage (L-038) are
 * queued behind it. So the diff moves here, once: the sim stamps every discrete
 * happening with a monotonic `seq`, and a consumer keeps one number.
 *
 * **The channel is the notification; the ledger is the record.** The ring holds
 * only the recent past, because nothing consuming it cares about anything else —
 * a thump you did not play 30 seconds ago is not a thump you play now. Anything
 * that needs the whole run reads `snapshot.damage`, which is still complete.
 *
 * Architecture rule 3: everything here is a plain value. No behaviour crosses.
 */

import type { DamageEvent } from "../sim/damage.ts";
import type { PropKind } from "../world/props.ts";

interface Stamped {
  /**
   * Monotonic within a run, from 1. A consumer keeps the last one it saw; that
   * is the entire subscription protocol, and it is idempotent — reading the
   * same snapshot twice yields the events once.
   */
  readonly seq: number;
  readonly tick: number;
}

/**
 * Something on the site was hit.
 *
 * Emitted for **every** impact the sim measures, not only the ones the ledger
 * bills for. That distinction is the reason this type exists: `assessDamage`
 * has always computed the joules delivered into each prop each step and thrown
 * the number away unless it crossed a pricing threshold, so re-hitting a
 * written-off cone was — as far as anything downstream could tell — silent.
 * It is not silent. It just was not worth money.
 *
 * Inherits one limitation from the measurement, documented at `impactOf`: a
 * body that was *already moving* is not counted as hit again. Grinding along a
 * barrier you are already pushing therefore emits nothing.
 */
export interface ImpactEvent extends Stamped {
  readonly kind: "impact";
  /** Index into the world's prop list. */
  readonly prop: number;
  /** What was hit. Carried so a consumer can react to the material without
   *  holding the world's prop list — a voice for a cone is not a voice for a
   *  pipe stack. */
  readonly what: PropKind;
  /** Joules delivered into it this step. */
  readonly joules: number;
  readonly at: readonly [number, number, number];
}

/**
 * The machine itself took a hit — it ran into something solid, or it landed.
 *
 * Measured the same way as everything else: kinetic energy the hull lost in one
 * step. The threshold is a **speed** rather than an energy, because the energy a
 * legitimate hard brake sheds depends on how fast you were going and the speed
 * it can shed in one step does not — the track model caps its own impulses at
 * `mu · N · dt`, so there is a hard ceiling on how much the drivetrain alone can
 * take off you between two ticks. Anything past that ceiling was the world.
 *
 * Nothing prices this yet. Machine damage is L-038, and when it lands it wants
 * exactly this number.
 */
export interface HullEvent extends Stamped {
  readonly kind: "hull";
  /** Joules the hull lost in one step. */
  readonly joules: number;
  /** Speed lost in that step, m/s. The thing the threshold is set in. */
  readonly jolt: number;
}

/**
 * The ledger wrote a line: something crossed from nudged to damaged, or from
 * damaged to written off. Carries the line itself, so a consumer never has to
 * go looking for it.
 */
export interface LedgerEvent extends Stamped {
  readonly kind: "ledger";
  readonly line: DamageEvent;
}

/**
 * A marker was reached. The first thing on this channel that is *good news*.
 *
 * It is an event and not a state for the usual reason — arriving happens at one
 * tick and is over — but also for a sharper one: the goal state on the snapshot
 * is sampled at 10 Hz by readers, and at 2.2 m/s a machine crosses the whole
 * reach radius in seven seconds, so a state alone could not tell a cue *when*
 * it happened to within a frame. `doc/design/cab/sound.md` is the consumer.
 */
export interface WaypointEvent extends Stamped {
  readonly kind: "waypoint";
  /** Index into the route. */
  readonly pin: number;
  /** Pins reached including this one, and how many there are. */
  readonly count: number;
  readonly total: number;
}

/**
 * The exercise settled: every marker reached, or a citizen involved.
 *
 * Emitted once per run. It is the **successful stop-condition** the loop never
 * had — the ledger could only ever say how badly it went — and it is the thing
 * three surfaces hang off: the debrief opens, the overlay stops counting, and
 * the rig says something.
 */
export interface OutcomeEvent extends Stamped {
  readonly kind: "outcome";
  readonly outcome: "success" | "failed";
  /** Pins reached at the moment it settled, of how many. */
  readonly count: number;
  readonly total: number;
}

export type SimEvent =
  | ImpactEvent
  | HullEvent
  | LedgerEvent
  | WaypointEvent
  | OutcomeEvent;

/** An event as the sim emits it. The recorder stamps the rest. */
export type Emission =
  | Omit<ImpactEvent, "seq" | "tick">
  | Omit<HullEvent, "seq" | "tick">
  | Omit<LedgerEvent, "seq" | "tick">
  | Omit<WaypointEvent, "seq" | "tick">
  | Omit<OutcomeEvent, "seq" | "tick">;

/**
 * How many recent events the channel holds.
 *
 * Generous rather than tuned, because it is bounded by something better than a
 * number: impacts are naturally rate-limited by the at-rest guard in
 * `impactOf`, so a prop emits once when it is struck and then stays quiet until
 * it settles again. Ploughing through a line of cones is a dozen events, not a
 * dozen per step. A consumer reading once a frame cannot outrun this.
 */
const CAPACITY = 128;

export interface Recorder {
  /** The recent past, oldest first. */
  readonly events: readonly SimEvent[];
  emit(tick: number, event: Emission): void;
  /** A value the UI can hold, rather than the live ring. Empty is free. */
  publish(): readonly SimEvent[];
}

const NONE: readonly SimEvent[] = Object.freeze([]);

export function createRecorder(): Recorder {
  const ring: SimEvent[] = [];
  let seq = 0;

  return {
    get events() {
      return ring;
    },
    emit(tick, event) {
      seq++;
      ring.push({ ...event, seq, tick } as SimEvent);
      if (ring.length > CAPACITY) ring.splice(0, ring.length - CAPACITY);
    },
    publish() {
      // The ring drops from the front, so handing it out by reference would
      // hand out something that changes under the holder. `damage` can be
      // passed live because it only ever grows; this cannot.
      return ring.length === 0 ? NONE : ring.slice();
    },
  };
}

/**
 * The part of a snapshot a reader needs. Structural rather than an import of
 * `Snapshot`, which would make the two modules import each other.
 */
export interface EventSource {
  readonly tick: number;
  readonly events: readonly SimEvent[];
}

export interface Read {
  /** Everything that has happened since the last call, oldest first. */
  readonly events: readonly SimEvent[];
  /**
   * The run went backwards — a RESET, or a replay scrubbed. Anything a consumer
   * has accumulated *about this run* is stale and should go: toasts on screen,
   * a voice still ringing, a beacon still turning.
   */
  readonly rewound: boolean;
}

export interface EventReader {
  /**
   * **One reader per consumer**: it advances its own position, so a second call
   * on the same snapshot returns nothing.
   */
  take(source: EventSource | undefined): Read;
}

const QUIET: Read = Object.freeze({ events: NONE, rewound: false });

/**
 * A subscription to the channel.
 *
 * It owns the one rule nobody should have to reimplement: **if the run went
 * backwards, forget everything.** A RESET builds a fresh world whose ticks and
 * sequence start again from zero, and so will scrubbing a replay. The old
 * version of this rule lived inside the live voice, phrased as "the damage list
 * got shorter" — true only of that one list, and only of that one cause.
 */
export function createEventReader(): EventReader {
  let lastSeq = 0;
  let lastTick = 0;

  return {
    take(source) {
      if (!source) return QUIET;
      const rewound = source.tick < lastTick;
      if (rewound) lastSeq = 0;
      lastTick = source.tick;

      const fresh = source.events.filter((e) => e.seq > lastSeq);
      const newest = fresh[fresh.length - 1];
      if (newest) lastSeq = newest.seq;
      if (!rewound && fresh.length === 0) return QUIET;
      return { events: fresh.length === 0 ? NONE : fresh, rewound };
    },
  };
}
