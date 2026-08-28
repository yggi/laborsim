/**
 * One turn of the loop: what a frame *is*, in one place.
 *
 * Feed it the wall clock since the last frame; it clamps that, asks the fixed
 * clock how many steps are owed, gives each step its input, steps the world,
 * takes one snapshot and hands it to whoever is drawing and whoever is
 * listening. That sequence — and the order of it — is the whole of a frame, and
 * it is the same sequence for the game, the profiling bench, a replay and a
 * test.
 *
 * ## Why it is a module and not a comment
 *
 * It was written twice on purpose. `platform/run.ts` had it, `probe/profile.ts`
 * had a copy, and the copy said so out loud: the game's loop owns
 * `requestAnimationFrame`, the pointer handlers and the `:root` writes, and
 * "exposes no seam to time the halves of a frame separately or to end on a tick
 * count". Both of those are true of `createRun` and neither is true of a frame,
 * so the honest fix was never to widen the loop — it was to notice that the loop
 * is two things wearing one name. What advances a frame, and when to stop, is
 * the caller's. What a frame does is this.
 *
 * The copy had already drifted before anyone extracted it. `doc/LOG.md`'s L-080
 * entry records the bench omitting `audio.render()` for the whole of its life,
 * so every `cpu` figure it had ever published was for a frame the game does not
 * run — and the guard against that was a test scanning both files for a literal
 * `0.25` and for four call names in order. That test is gone; the rule it was
 * approximating is now structural, and `tests/architecture.test.ts` says instead
 * that `world.step(` appears in exactly one file under `src/`.
 *
 * ## The hooks are how a bench times a frame without owning one
 *
 * `owed`, `render` and `sound` are called at exactly the three boundaries the
 * profiler stamps, so the spans it publishes are the same spans it published
 * when it had its own loop — a measured claim that did not need to move
 * (`doc/design/code/mobile-budget.md`). The game passes two of them and ignores
 * the third; a headless replay passes none.
 *
 * Architecture rule 3: nothing here imports a renderer. Drawing and sounding
 * arrive as callbacks, which is why this can run in plain Node.
 */

import type { Module } from "../control/bus.ts";
import type { Hands } from "../control/hands.ts";
import type { Operator } from "../control/trace.ts";
import { type Clock, MAX_FRAME_SECONDS } from "../core/clock.ts";
import type { Snapshot } from "../core/snapshot.ts";
import type { SimWorld } from "../sim/world.ts";

export interface Frame {
  readonly world: SimWorld;
  /** Fixed-step accumulator. One per run; never shared between worlds. */
  readonly clock: Clock;
  /**
   * What the operator is doing. Read by a live run and written by a replay —
   * either way the pilot module reads it from here, sixty times a second.
   */
  readonly hands: Hands;
  /** The rail, mutated in place by whatever commands this tick carries. */
  readonly rack: Module[];
  /** Who is working the controls. The cab, a recording, or nobody. */
  readonly operator: Operator;
  /**
   * How many fixed steps this frame owes, before any of them has run.
   *
   * The bench's `beforeSim` mark, and its `steps` column. Called every frame,
   * including the ones that owe nothing.
   */
  owed?(steps: number): void;
  /** The frame's one snapshot, at 60 Hz. Not the 10 Hz value an instrument reads. */
  render?(snapshot: Snapshot): void;
  /**
   * The same value, after the draw call.
   *
   * Audio is a renderer, not a reader: it takes the 60 Hz snapshot the scene
   * takes, not the 10 Hz one the instruments read. An impact heard 100 ms after
   * you watched it land is heard as a second event.
   */
  sound?(snapshot: Snapshot): void;
}

export interface Turn {
  /** Fixed steps run. Zero is a frame that owed none, which is not a stall. */
  readonly steps: number;
  readonly snapshot: Snapshot;
}

/**
 * Advance one frame.
 *
 * @param elapsedSeconds wall clock since the previous frame, unclamped — the
 *   ceiling is `MAX_FRAME_SECONDS` and applying it is this function's job, so a
 *   caller that wants the true interval for a `frame` column still has it.
 */
export function advance(frame: Frame, elapsedSeconds: number): Turn {
  const { world, hands, rack, operator } = frame;
  const elapsed = Math.min(elapsedSeconds, MAX_FRAME_SECONDS);

  // Held while the schedule is open: the site is built and standing there, and
  // the exercise has not started. Time is fed to the clock rather than to a
  // flag, so nothing downstream needs to know there is such a thing as a menu —
  // a paused frame is simply a frame that owed no steps.
  const { steps } = frame.clock.advance(hands.seated ? elapsed : 0);
  frame.owed?.(steps);

  for (let i = 0; i < steps; i++) {
    // **The tick a step produces, not the one it starts from.** `world.tick` is
    // N here and N+1 after, and the sim stamps its events after the increment —
    // so an input and the damage it caused carry the same number, which is the
    // join the ledger's attribution column is going to need.
    operator.at(world.tick + 1, hands, rack);
    world.step();
  }

  const snapshot = world.snapshot();
  frame.render?.(snapshot);
  frame.sound?.(snapshot);
  return { steps, snapshot };
}
