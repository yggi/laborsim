/**
 * What the operator is doing, for everything that runs outside the reactive graph.
 *
 * `Controls` is the way a *command* crosses back — discrete, one call per press.
 * This is the other half of the same problem and the continuous one: the render
 * loop runs in a `requestAnimationFrame` callback, the rack runs inside it, and
 * neither is a reactive scope. Every value they need from the cab has to cross
 * that line somehow, and — exactly as with `Controls` before it — each one had
 * been crossing by its own private route:
 *
 * - the schedule's hold was **mirrored** into a plain variable by an effect,
 * - the unacknowledged master was mirrored by a second effect, whose comment
 *   observed that it was "the same shape, and the same reason" as the first,
 * - the horn was **read raw** from inside `rAF` — the untracked read the other
 *   two comments describe as the bug they exist to avoid,
 * - the rack-open posture was read raw from inside a pointer handler,
 * - and the two levers were read raw by the pilot module's `intent`, which
 *   `runRack` calls from inside `world.step()`, sixty times a second, on the
 *   hottest path in the application.
 *
 * Three mechanisms for one idea, and the deepest instance had never been
 * noticed because it crossed inside a module callback rather than in the loop
 * body. So: **one object, written by one effect, read by everything downstream.**
 * Adding a sixth value is a field, and there is no longer a choice to get wrong.
 *
 * ## Why these five things are one thing
 *
 * They look unrelated — a clock hold, a lamp, a horn, a posture, two levers —
 * and they are not. Every one of them is *something the operator is currently
 * doing, or has not yet done*: they have not pressed BEGIN, they have not
 * acknowledged the master, they are leaning on the horn, they have the cabinet
 * open, their thumbs are where they left them. The snapshot is what the machine
 * did; this is what the hands did, which is the distinction `audio/engine.ts`
 * already draws for the two fields it takes.
 *
 * ## It is deliberately not reactive
 *
 * Nothing here is a rune, and nothing may become one. A reader outside the
 * graph must be able to read a plain field and get the current value without
 * establishing a dependency it cannot own — that is the entire point. The one
 * effect that writes it is the only place the two worlds touch.
 */

import type { Condition } from "./bus.ts";
import { NOMINAL } from "./bus.ts";

export interface Hands {
  /** Left track lever, −1…1. What you leave it at is what the machine keeps at. */
  leverL: number;
  /** Right track lever, −1…1. */
  leverR: number;
  /** A hand on the horn. Not on the recording: nothing on the site can hear it. */
  horn: boolean;
  /**
   * The master condition the pilot has **not** pressed, and `NOMINAL` while the
   * debrief is open — a horn blaring under somebody explaining what you just
   * did is the rig talking over itself.
   */
  alarm: Condition;
  /**
   * In the seat, rather than reading the schedule. The clock only advances when
   * this is true: a run whose elapsed time started before the operator had
   * touched anything would be a clock measuring reading speed.
   */
  seated: boolean;
  /**
   * Eyes down at the cabinet. A posture, not a camera mode — while the rack is
   * open you cannot look around, the same way you cannot reach the levers.
   */
  headDown: boolean;
}

/**
 * Nobody touching anything: at the schedule, levers parked, nothing to say.
 *
 * Also the honest value for a replay, whenever there is one — a recording has
 * hands on the levers but nobody's hand on the horn (`audio/engine.ts`).
 */
export const AT_REST: Readonly<Hands> = Object.freeze({
  leverL: 0,
  leverR: 0,
  horn: false,
  alarm: NOMINAL,
  seated: false,
  headDown: false,
});

/** A mutable set of hands at rest, for the one effect that keeps them current. */
export const restingHands = (): Hands => ({ ...AT_REST });
