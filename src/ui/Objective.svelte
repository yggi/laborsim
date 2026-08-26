<script lang="ts">
/**
 * The rig's own strip: what it asked for, how much of it has happened, and how
 * long you have been at it.
 *
 * **It is not an instrument and it does not cost glass.** The panel budget
 * (`docs/design/cab/cockpit.md`) prices things a *manufacturer* bolted into your
 * cab; this is the training system's overlay, on the same surface the debrief
 * and the live voice already use. If it were fitted kit it would have a maker
 * and a faceplate, and the machine would have to know what a marker is — which
 * it does not, and must not: the whole route is furniture as far as the machine
 * is concerned. Keeping the objective off the dash is what keeps that true.
 *
 * The clock stops when the exercise settles, because a time that kept running
 * after you finished would be the rig measuring the wrong thing.
 *
 * Architecture rule 3: reads a snapshot, sends nothing.
 */
import type { Snapshot } from "../core/snapshot.ts";
import { exerciseById } from "../world/exercises.ts";
import { clockOf } from "./format.ts";

const {
  snapshot,
  hidden = false,
}: { snapshot: Snapshot | undefined; hidden?: boolean } = $props();

const goal = $derived(snapshot?.goal);
const exercise = $derived(goal ? exerciseById(goal.exercise) : undefined);

/** Sim seconds on the clock: live while running, frozen at the outcome. */
const elapsed = $derived.by(() => {
  if (!snapshot || !goal) return 0;
  return goal.settled >= 0 ? goal.settled / 60 : snapshot.simSeconds;
});
</script>

{#if goal && exercise}
  <div class="objective" class:hidden data-outcome={goal.outcome}>
    <div class="head">
      <span class="id">{exercise.id}</span>
      <span class="name">{exercise.name}</span>
      <span class="clock">{clockOf(elapsed)}</span>
    </div>
    <div class="task">
      {#if goal.outcome === "success"}
        EXERCISE COMPLETE
      {:else if goal.outcome === "failed"}
        EXERCISE FAILED
      {:else}
        {exercise.objective}
      {/if}
    </div>
    {#if goal.total > 0}
      <!-- One lamp per marker, in route order. A fraction tells you how many;
           the lamps tell you which, which is the half that is worth looking at
           when three are lit and the fourth is behind a hill. -->
      <div class="pins" aria-label="markers reached {goal.count} of {goal.total}">
        {#each goal.reached as at, i (i)}
          <span class="pin" class:lit={at >= 0}>{i + 1}</span>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* Top-left, clear of the rig's camera and volume controls at the right. It
     rides with nothing: the cab sweeps when you look around and this does not,
     because it is not in the cab. */
  .objective {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 10px);
    left: 12px;
    z-index: 4;
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    border-left: 3px solid #6d7a76;
    box-shadow: 0 0 0 3px #0d1012;
    padding: 5px 9px 6px;
    font: 9px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    color: #c6d0cb;
    pointer-events: none;
    max-width: min(220px, calc(100vw - 130px));
  }
  .objective.hidden {
    display: none;
  }
  .objective[data-outcome="success"] {
    border-left-color: #6fe3c4;
  }
  .objective[data-outcome="failed"] {
    border-left-color: #e0503c;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 8px;
    color: #6d7a76;
    letter-spacing: 0.16em;
  }
  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .clock {
    color: #9aa6a1;
    font-variant-numeric: tabular-nums;
  }
  .task {
    margin-top: 2px;
    letter-spacing: 0.1em;
  }
  [data-outcome="success"] .task {
    color: #6fe3c4;
  }
  [data-outcome="failed"] .task {
    color: #ff9a8a;
  }
  .pins {
    display: flex;
    gap: 3px;
    margin-top: 4px;
  }
  /* Stencilled numbers on a dead lamp, and a lit one. The same idiom as the
     annunciator, because it is the same idea and the player has already met it. */
  .pin {
    width: 13px;
    height: 11px;
    display: grid;
    place-items: center;
    font-size: 7px;
    background: #191d20;
    border: 1px solid #2c3336;
    color: #48524f;
  }
  .pin.lit {
    background: #1d4c3f;
    border-color: #2f6d5c;
    color: #a9f2dd;
  }
</style>
