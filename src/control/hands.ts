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

/**
 * Where the operator is watching from.
 *
 * It is declared here rather than in `render/scene.ts` because it is a
 * **posture**, not a camera setting — the same class of thing as `headDown`.
 * Chase does not merely move the camera: it takes away the cage, the dash, the
 * pods and the levers, so it is "hands off the wheel" and the world does not
 * wait (`doc/design/cab/cockpit.md`). The renderer is one of its consumers, and
 * the last one to hear about it.
 */
export type View = "cab" | "chase";

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
  /**
   * In the cab, or outside it watching.
   *
   * **It crosses here because reading it anywhere else cost a run.** The camera
   * used to be a rune the shell handed to `Run.setView`, and the shell's
   * run-building effect read it plainly — so pressing CHASE joined the camera to
   * the list of things that rebuild the world, threw the site you were driving
   * away and handed you an identical untouched copy of it. The `untrack` that
   * fixed that was a note not to depend on a value the effect had no business
   * holding; this is the value not being there. `run.ts` reads the field and
   * points the viewport when it changes.
   *
   * A sixth field, and adding it was a field — which is what `Controls` and this
   * object were both built to make true.
   */
  view: View;
}

/**
 * Nobody touching anything: at the schedule, levers parked, in the seat.
 *
 * It was once described as "the honest value for a replay… a recording has hands
 * on the levers but nobody's hand on the horn". That is no longer true and the
 * correction is worth keeping: **the horn is on the recording**, because a rig
 * reviewing a session cares whether you sounded it before moving off even though
 * nothing on the site can hear it. What a replay gets is every one of these
 * fields except `alarm`, which the annunciator re-derives, and `seated`, which a
 * tick existing already says (`control/trace.ts`).
 */
export const AT_REST: Readonly<Hands> = Object.freeze({
  leverL: 0,
  leverR: 0,
  horn: false,
  alarm: NOMINAL,
  seated: false,
  headDown: false,
  view: "cab",
});

/** A mutable set of hands at rest, for the one effect that keeps them current. */
export const restingHands = (): Hands => ({ ...AT_REST });
