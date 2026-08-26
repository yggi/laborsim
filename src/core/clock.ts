/**
 * Architecture rule 2: the sim advances in fixed steps, decoupled from frame
 * rate. Rendering interpolates; it never drives.
 *
 * See docs/design/code/architecture-rules.md.
 */

/** Seconds per simulation step. 60 Hz. Do not vary this at runtime. */
export const STEP_SECONDS = 1 / 60;

/**
 * Upper bound on catch-up steps per frame. A tab that was backgrounded for a
 * minute must not try to simulate a minute in one frame — it drops the time
 * instead, visibly, rather than freezing the machine while it grinds.
 */
const MAX_STEPS_PER_FRAME = 5;

export interface Clock {
  /**
   * Feed wall-clock time; returns how many fixed steps to run now, and how far
   * between steps the renderer should interpolate.
   */
  advance(elapsedSeconds: number): { steps: number; alpha: number };
  /** Total fixed steps taken. This is sim time, and the replay's clock. */
  readonly tick: number;
}

export function makeClock(): Clock {
  let accumulator = 0;
  let tick = 0;
  return {
    advance(elapsedSeconds: number) {
      accumulator += elapsedSeconds;
      let steps = 0;
      while (accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
        accumulator -= STEP_SECONDS;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0; // drop the backlog
      tick += steps;
      return { steps, alpha: accumulator / STEP_SECONDS };
    },
    get tick() {
      return tick;
    },
  };
}
