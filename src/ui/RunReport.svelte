<script lang="ts">
/**
 * The end-of-run report (L-029) — the *final* face of the ledger, and the
 * natural first screen of the game: you arrive at the rig and read the last
 * trainee's account before you reset it.
 *
 * Itemised, scrollable, never aggregated. The total is shown but it is never
 * the only thing shown, because a total teaches nothing (docs/design/tone.md).
 * The voice is condescending institutional politeness: the rig is not angry, it
 * is disappointed, patiently, and it has written everything down.
 *
 * Ways out: RESET SIMULATOR re-racks the same exercise; RESUME closes the folder,
 * twists the stop back out and lets you keep driving — the rig never yanks
 * control (L-038), and that holds after a *success* too: a finished exercise is
 * a site you may keep driving around. SCHEDULE goes back to the list, and NEXT
 * EXERCISE appears only where one has been earned.
 *
 * **It has an outcome now.** Until missions arrived the folder had exactly one
 * thing to say and it was always bad — the ledger's only verdict is a bill.
 * Three states cross the top of it instead: still running, complete, failed.
 * The failure loop's third beat could not previously say *yes*, and the whole
 * of that change is the band under the title and the split times beside it.
 *
 * It also carries **the state of the machine in words**, which the dash used to
 * carry on a strip under the panel. That was the panel captioning its own lamp;
 * here it is a line in a document, which is what it always was. The dash tells
 * you *that* something is wrong and *which instrument* knows why. The folder is
 * the only surface in the cab allowed to finish the sentence.
 *
 * Architecture rule 3: reads a snapshot, reports two intents up.
 */
import { chassisConditions, masterLine } from "../cockpit/annunciator.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { exerciseById, nextExercise } from "../world/exercises.ts";
import { clockOf } from "./format.ts";

const {
  snapshot,
  estopped,
  onReset,
  onResume,
  onSchedule,
  onNext,
}: {
  snapshot: Snapshot | undefined;
  /** The stop is a cockpit control rather than a simulated quantity, so it is
   *  handed in rather than read off the snapshot. */
  estopped: boolean;
  onReset: () => void;
  onResume: () => void;
  /** Back to the schedule. */
  onSchedule: () => void;
  /** Take the next exercise down the ladder. */
  onNext: (id: string) => void;
} = $props();

const goal = $derived(snapshot?.goal);
const exercise = $derived(goal ? exerciseById(goal.exercise) : undefined);
const upNext = $derived(
  goal?.outcome === "success" && exercise ? nextExercise(exercise.id) : undefined,
);

/** Frozen at the outcome, still running before it. Same clock as the overlay. */
const elapsed = $derived(
  goal && goal.settled >= 0 ? goal.settled / 60 : (snapshot?.simSeconds ?? 0),
);

/** The single worst thing the machine has to say, named. */
const state = $derived(
  masterLine(
    chassisConditions(snapshot, estopped),
    snapshot?.stages ?? [],
    "SYSTEMS NOMINAL",
  ),
);

const lines = $derived(snapshot?.damage ?? []);
const bill = $derived(snapshot?.bill ?? 0);
const citizen = $derived(lines.some((d) => d.category === "citizen asset"));

const yen = (n: number) => `−¥${n.toLocaleString("en-US")}`;

/**
 * The rig's closing remark. Register: unimpressed, never cruel, never a quip.
 *
 * It reads the objective **before** the bill now, and that ordering is the
 * point: an exercise is passed or not passed first, and expensively or cheaply
 * second. The old lines survive underneath for the open site and for a run
 * still in progress, where there is nothing but the bill to talk about.
 */
const verdict = $derived.by(() => {
  if (citizen)
    return "A person was involved. This session is recorded as a failure. Please reflect.";
  if (goal?.outcome === "success") {
    if (bill === 0)
      return "Every marker reached and nothing charged. The exercise finds no fault. It will not say so twice.";
    if (bill < 3000)
      return "Every marker reached. The damage above is what it cost you to do it, and it was avoidable.";
    return "The objective was met. So was a good deal of the site. Reaching a marker is not the only thing being assessed.";
  }
  if (goal && goal.total > 0 && goal.count > 0 && goal.outcome === "running")
    return `${goal.count} of ${goal.total} markers reached. The exercise remains open, as does the account.`;
  if (bill === 0)
    return "No chargeable damage. The exercise notes that you also accomplished nothing.";
  if (bill < 3000)
    return "Within tolerances a supervisor might overlook. They will not.";
  if (bill < 12000)
    return "A costly session. The equipment is, at least, insured. The confidence is not.";
  return "Extensive. The instructor has been notified. Consider a lighter machine.";
});

function why(line: (typeof lines)[number]): string {
  if (line.bypassed.length > 0) return `${line.bypassed.join(", ")} bypassed`;
  if (line.driving.length > 0) return `${line.driving.join(" → ")} driving`;
  return "no module driving";
}
</script>

<div class="scrim">
  <div class="folder" role="dialog" aria-label="damage assessment">
    <div class="head">
      <div class="stamp">L.A.B.O.R. TRAINING SYSTEM</div>
      <div class="title">DAMAGE ASSESSMENT &mdash; EXERCISE DEBRIEF</div>
    </div>

    <!-- What the panel is showing right now, spelled out. The colour is the
         lamp's; the words are the folder's. -->
    <div class="state" data-cond={state.condition}>{state.text}</div>

    <!-- The exercise, and how far through it you are. Above the ledger, because
         it is the question that was asked; the ledger is what it cost. -->
    {#if goal && exercise}
      <div class="outcome" data-outcome={goal.outcome}>
        {#if goal.outcome === "success"}
          EXERCISE COMPLETE
        {:else if goal.outcome === "failed"}
          EXERCISE FAILED
        {:else}
          EXERCISE IN PROGRESS
        {/if}
      </div>
      <div class="task">
        <div class="row1">
          <span class="what">{exercise.id} &middot; {exercise.name}</span>
          <span class="clock">{clockOf(elapsed)}</span>
        </div>
        <div class="row2">{exercise.objective}</div>
        {#if goal.total > 0}
          <!-- Split times, in route order. A marker you never reached says so
               with a dash rather than by being absent from a list, which is the
               same reason a bypassed module still gets a stage on the rack. -->
          <div class="splits">
            {#each goal.reached as at, i (i)}
              <span class="split" class:lit={at >= 0}>
                <span class="n">{i + 1}</span>
                <span class="t">{at >= 0 ? clockOf(at / 60) : "—"}</span>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if citizen}
      <div class="fail">CITIZEN PROPERTY INVOLVED &middot; EXERCISE FAILED</div>
    {/if}

    <div class="lines">
      {#if lines.length === 0}
        <div class="empty">No damage on record. The folder is empty.</div>
      {:else}
        {#each lines as line, i (i)}
          <div class="line" class:citizen={line.category === "citizen asset"}>
            <div class="row1">
              <span class="what">{line.category} ({line.label}) {line.state}</span>
              <span class="yen">{yen(line.yen)}</span>
            </div>
            <div class="row2">
              {line.speed.toFixed(1)} m/s &middot; {line.energy.toFixed(0)} J of
              {line.toughness.toFixed(0)} &middot; {why(line)}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="total">
      <span>TOTAL ASSESSED</span>
      <span class="sum">{yen(bill)}</span>
    </div>
    <div class="verdict">{verdict}</div>

    <!-- Two rows, and the second one only where it has anything to offer. The
         machine is always handed back first: RESUME is on the left of the top
         row on every outcome, including a completed one. A finished exercise is
         still a site, and the rig does not confiscate it. -->
    <div class="actions">
      <button class="resume" onclick={onResume}>RESUME</button>
      <button class="reset" onclick={onReset}>RESET SIMULATOR</button>
    </div>
    <div class="actions second">
      <button class="schedule" onclick={onSchedule}>SCHEDULE</button>
      {#if upNext}
        <button class="next" onclick={() => onNext(upNext.id)}>
          NEXT &middot; {upNext.id}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: rgba(6, 8, 9, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 14px;
  }
  .folder {
    width: min(360px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: #14171a;
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 4px #0d1012, 0 20px 50px rgba(0, 0, 0, 0.7);
    font: 10px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #c6d0cb;
    letter-spacing: 0.05em;
  }
  .head {
    padding: 9px 12px;
    background: #23282a;
    border-bottom: 2px solid #0d1012;
  }
  .stamp {
    font-size: 8px;
    letter-spacing: 0.28em;
    color: #6d7a76;
  }
  .title {
    margin-top: 2px;
    font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.1em;
    color: #efe6cf;
  }
  /* The old dash strip, in its proper home. Same three colours as the master
     lamp, and no blinking: a document does not flash at you. */
  .state {
    padding: 4px 12px;
    font-size: 9px;
    letter-spacing: 0.18em;
    background: #191d20;
    color: #6a8f7a;
    border-bottom: 1px solid #0d1012;
  }
  .state[data-cond="2"] {
    background: #a8760c;
    color: #fff3d6;
  }
  .state[data-cond="3"] {
    background: #b81c0c;
    color: #ffe6e0;
  }
  .fail {
    padding: 5px 12px;
    background: #b81c0c;
    color: #ffe6e0;
    font-size: 9px;
    letter-spacing: 0.14em;
  }

  /* The outcome band. Same shape as the machine-state line above it and a
     different subject: that one is the machine's opinion of itself, this one is
     the rig's opinion of the exercise. Neither flashes — a document does not. */
  .outcome {
    padding: 4px 12px;
    font-size: 9px;
    letter-spacing: 0.2em;
    background: #191d20;
    color: #9aa6a1;
    border-bottom: 1px solid #0d1012;
  }
  .outcome[data-outcome="success"] {
    background: #1d4c3f;
    color: #a9f2dd;
  }
  .outcome[data-outcome="failed"] {
    background: #5d1d15;
    color: #ffc9bf;
  }
  .task {
    padding: 5px 12px;
    background: #14171a;
    border-bottom: 1px solid #23282a;
  }
  .task .row2 {
    color: #9aa6a1;
  }
  .clock {
    color: #e8b53a;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .splits {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .split {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 1px 5px;
    font-size: 8px;
    background: #191d20;
    border: 1px solid #2c3336;
    color: #48524f;
  }
  .split.lit {
    background: #1d4c3f;
    border-color: #2f6d5c;
    color: #a9f2dd;
  }
  .split .n {
    color: #6d7a76;
    letter-spacing: 0.14em;
  }
  .split.lit .n {
    color: #6fe3c4;
  }
  .split .t {
    font-variant-numeric: tabular-nums;
  }
  .lines {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  .empty {
    padding: 18px 12px;
    color: #6d7a76;
    text-align: center;
  }
  .line {
    padding: 5px 12px;
    border-top: 1px solid #23282a;
    border-left: 3px solid #3a4240;
  }
  .line.citizen {
    border-left-color: #e0503c;
  }
  .row1 {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .yen {
    color: #e8b53a;
    white-space: nowrap;
  }
  .row2 {
    font-size: 8px;
    color: #78827f;
  }
  .total {
    display: flex;
    justify-content: space-between;
    padding: 7px 12px;
    background: #23282a;
    border-top: 2px solid #0d1012;
    letter-spacing: 0.14em;
  }
  .sum {
    color: #e0503c;
    font-weight: 700;
  }
  .verdict {
    padding: 8px 12px;
    font-size: 9px;
    color: #9aa6a1;
    background: #191d20;
  }
  .actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    background: #14171a;
  }
  .actions button {
    flex: 1;
    font: inherit;
    letter-spacing: 0.12em;
    padding: 9px 0;
    border: 1px solid #0d1012;
    cursor: pointer;
  }
  .actions.second {
    padding-top: 0;
  }
  .resume,
  .schedule {
    background: #23282a;
    color: #c6d0cb;
  }
  .reset {
    background: #e8b53a;
    color: #14171a;
    font-weight: 700;
  }
  /* The only green thing in the folder, and it is only ever here after the
     exercise was actually completed. */
  .next {
    background: #2f6d5c;
    color: #eafff8;
    font-weight: 700;
  }
</style>
