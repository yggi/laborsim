/**
 * Goal track-keeping — whether the exercise is going well, badly, or is over.
 *
 * The failure loop has always had a third beat and the damage ledger was it: a
 * verdict, always a negative one. This is the other half. It answers *did you
 * do the thing*, and it is the first thing in the codebase that can say yes.
 *
 * Deliberately small, and deliberately not clever:
 *
 * - **A pin is reached when the machine gets within `PIN_REACH` of it.** No
 *   ordering, because the operator is not obliged to take the route the survey
 *   drew — NAV-1 walks it in order and a pair of levers does not have to.
 * - **A reached pin stays reached.** Driving away does not un-reach it, which
 *   would be a mechanic nobody asked for and a state nobody could see.
 * - **The outcome is terminal.** Once it settles it never moves again, so the
 *   debrief cannot open twice and a run cannot be un-failed by finishing. A
 *   citizen struck after the last marker is still a failed exercise; it is just
 *   a failed exercise that finished.
 *
 * Architecture rule 1: no renderer, no DOM. Rule 2: the range test is a squared
 * comparison — multiplication and subtraction, which are bit-portable, and no
 * `sqrt` where none is needed.
 */

import type { Goal, Outcome, Waypoint } from "../core/snapshot.ts";
import { PIN_REACH } from "../core/spec.ts";

/** What the tracker tells the world to put on the channel this step. */
export interface GoalStep {
  /** Pins reached on this step, in route order. Nearly always empty. */
  readonly reached: readonly number[];
  /** Set on the one step the outcome settles. */
  readonly settled?: "success" | "failed";
}

const NOTHING: GoalStep = Object.freeze({ reached: Object.freeze([]) });

export interface GoalTracker {
  /**
   * A value the UI can hold. Replaced rather than mutated whenever anything
   * changes, so a consumer that kept last frame's copy still has last frame's
   * truth — the array inside it would otherwise change under the holder, which
   * is the trap `Recorder.publish` documents for the event ring.
   */
  readonly state: Goal;
  /** Advance one step. `failed` is the ledger's citizen flag, passed in. */
  step(tick: number, x: number, z: number, failed: boolean): GoalStep;
}

export function createGoal(
  exercise: string,
  waypoints: readonly Waypoint[],
  reach = PIN_REACH,
): GoalTracker {
  const total = waypoints.length;
  const reached = new Array<number>(total).fill(-1);
  let count = 0;
  let outcome: Outcome = "running";
  let settled = -1;

  const value = (): Goal => ({
    exercise,
    reached: reached.slice(),
    count,
    total,
    outcome,
    settled,
  });

  let state = value();

  return {
    get state() {
      return state;
    },
    step(tick, x, z, failed) {
      if (outcome !== "running") return NOTHING;

      const hit: number[] = [];
      for (let i = 0; i < total; i++) {
        if (reached[i] !== -1) continue;
        const pin = waypoints[i];
        if (!pin) continue;
        const dx = pin.x - x;
        const dz = pin.z - z;
        if (dx * dx + dz * dz > reach * reach) continue;
        reached[i] = tick;
        count++;
        hit.push(i);
      }

      // Failure first: a citizen involved is categorical, and an exercise that
      // completed on the same step it hurt somebody did not go well.
      // `total > 0` guards the open site — a sandbox has no markers, so it can
      // never be complete, which is exactly what a sandbox is.
      const done: Outcome = failed
        ? "failed"
        : total > 0 && count === total
          ? "success"
          : "running";

      if (done === "running") {
        if (hit.length === 0) return NOTHING;
        state = value();
        return { reached: hit };
      }

      outcome = done;
      settled = tick;
      state = value();
      return { reached: hit, settled: done };
    },
  };
}
