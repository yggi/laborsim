/**
 * The rig's side of a session: what is being asked of you, and where you are in
 * being asked it.
 *
 * It is `ui/` and not `cockpit/` because every one of these is the *training
 * system's*, not the machine's (`doc/MEMORY.md` § 11). Which exercise is on the
 * rig, whether anybody has sat down, whether the folder is open in front of you
 * — a Labor has none of that, and none of it costs glass.
 *
 * The **cab** is deliberately not in here. Re-racking parks the levers, closes
 * the cabinet and puts you back in the seat, and those belong to the shell that
 * owns them: `reRack` says the exercise starts again, and the shell says what
 * that does to the machine. They are two things that happen in one press.
 */

import type { Outcome } from "../core/snapshot.ts";
import { type Exercise, exerciseById, FIRST_EXERCISE } from "../world/exercises.ts";

export interface Session {
  /** What is on the rig. Changing it is what rebuilds the world. */
  readonly exercise: Exercise;
  /** What is selected on the schedule, which is not yet what is on the rig. */
  readonly picked: string;
  /** The schedule is up, and nothing is being driven. */
  readonly briefing: boolean;
  /** The folder is open in front of you. */
  readonly report: boolean;
  /** Bumped by every re-rack; the shell's run effect reads it. */
  readonly runId: number;
  pick(id: string): void;
  /**
   * Sit down and start. Always a fresh run, even for the exercise already
   * loaded: BEGIN means begin, and handing somebody a half-driven site because
   * they happened to re-pick the same row would be the rig losing track of what
   * a run is.
   */
  begin(next?: Exercise): void;
  /** Re-rack the exercise: fresh world, fresh site, everything at rest. */
  reRack(): void;
  /** Back to the schedule, with the current exercise selected on it. */
  schedule(): void;
  /**
   * Leave the schedule without changing what is on the rig — BACK, which only
   * exists once there is a run behind it to go back to.
   */
  dismiss(): void;
  /** Open the folder, and close it. Neither touches the drive. */
  openReport(): void;
  closeReport(): void;
  /**
   * Auto-open the debrief the moment the exercise settles — either way.
   *
   * It used to watch the damage list for a citizen, which was the only ending
   * there was. Now there are two and they are one fact on the snapshot, so this
   * watches the fact: a citizen still opens the folder, because a failed
   * exercise is exactly what a citizen produces, and finishing opens it too.
   *
   * **Opening the folder is not stopping the machine.** Nothing here touches the
   * drive: the levers keep carrying what they were carrying and the sim keeps
   * stepping behind the scrim, the same bargain the chase camera makes. A rig
   * that yanked control at the finish line would be a rig deciding when you are
   * done with the site (L-038).
   *
   * Driven by one `$effect` in the shell rather than one in here — an `$effect`
   * outside a component is an orphan and throws, and this file exists to be
   * steppable without mounting a cab.
   */
  settle(outcome: Outcome | undefined): void;
}

export function createSession(): Session {
  let exercise = $state<Exercise>(FIRST_EXERCISE);
  let picked = $state(FIRST_EXERCISE.id);
  let briefing = $state(true);
  let report = $state(false);
  let runId = $state(0);
  /** So the report auto-opens once when the exercise settles, not every frame. */
  let outcomeSeen = false;

  /** Named rather than reached through `this`, which a passed method loses. */
  function reRack() {
    report = false;
    outcomeSeen = false;
    runId++;
  }

  return {
    get exercise() {
      return exercise;
    },
    get picked() {
      return picked;
    },
    get briefing() {
      return briefing;
    },
    get report() {
      return report;
    },
    get runId() {
      return runId;
    },
    pick(id) {
      picked = id;
    },
    begin(next = exerciseById(picked) ?? FIRST_EXERCISE) {
      exercise = next;
      picked = next.id;
      briefing = false;
      reRack();
    },
    reRack,
    schedule() {
      picked = exercise.id;
      briefing = true;
      report = false;
    },
    dismiss() {
      briefing = false;
    },
    openReport() {
      report = true;
    },
    closeReport() {
      report = false;
    },
    settle(outcome) {
      if (!outcome || outcome === "running" || outcomeSeen) return;
      outcomeSeen = true;
      report = true;
    },
  };
}
