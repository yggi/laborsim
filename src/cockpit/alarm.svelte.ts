/**
 * How worried the machine is, and how much of that the pilot has pressed.
 *
 * `annunciator.ts` is the arithmetic — which conditions a snapshot implies, and
 * which of them is worst. This is the part that has to *remember* something:
 * the acknowledgement, which is not on the snapshot and cannot be, because it is
 * a thing the operator did rather than a thing the machine is doing.
 *
 * It lives beside the panel rather than on it because it has three consumers —
 * the master lamp, the horn, and the beacon behind them (L-046). A machine whose
 * light and noise disagreed about its own condition would be two instruments
 * wired to two facts, so they are wired to one and the panel is handed the
 * answer rather than working it out again.
 *
 * Architecture rule 3: it reads a snapshot and holds one number of its own.
 */

import type { Condition } from "../control/bus.ts";
import { NOMINAL } from "../control/bus.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { type Annunciation, chassisConditions, worst } from "./annunciator.ts";

/**
 * What an acknowledgement is still worth once the machine's condition has moved.
 *
 * **A condition clearing winds the acknowledgement back down**, which re-arms
 * both the flash and the horn for next time. Without that an operator who
 * silenced an ALARM would never hear the next WARN — it is lower, so it would
 * arrive already acknowledged — and the panel would be quietly deaf to
 * everything short of the thing it had already told you about.
 *
 * It is a fold rather than a derivation: `min(acked, master)` over *time*, not
 * over the current pair, which is why it needs a memory at all.
 */
export const stillAcked = (acked: Condition, master: Condition): Condition =>
  master < acked ? master : acked;

export interface Alarm {
  /** The chassis's own conditions, in the order the panel lights them. */
  readonly lamps: readonly Annunciation[];
  /** The worst of everything — the chassis's lamps and every fitted module's. */
  readonly master: Condition;
  /** How much of it the pilot has pressed. */
  readonly acked: Condition;
  /** What is still shouting: the master, or NOMINAL once it has been pressed. */
  readonly unacked: Condition;
  ack(): void;
  /**
   * Apply `stillAcked` to where the machine is now. Driven by one `$effect` in
   * the shell rather than by one in here, so that everything in this file can be
   * stepped by hand from a test — an `$effect` outside a component is an orphan
   * and throws, and a concern you have to mount a cab to check is the shape this
   * module was extracted to get away from.
   */
  settle(): void;
}

/** Wire the panel's alarm state to a snapshot and the stop. */
export function createAlarm(
  snapshot: () => Snapshot | undefined,
  estopped: () => boolean,
): Alarm {
  let acked = $state<Condition>(NOMINAL);
  const lamps = $derived(chassisConditions(snapshot(), estopped()));
  const master = $derived(
    worst([
      ...lamps.map((a) => a.condition),
      ...(snapshot()?.stages ?? []).map((s) => s.condition),
    ]),
  );

  return {
    get lamps() {
      return lamps;
    },
    get master() {
      return master;
    },
    get acked() {
      return acked;
    },
    get unacked() {
      return master > acked ? master : NOMINAL;
    },
    ack() {
      acked = master;
    },
    settle() {
      const next = stillAcked(acked, master);
      if (next !== acked) acked = next;
    },
  };
}
