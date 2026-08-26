<script lang="ts">
/**
 * The exercise list and the briefing — the rig before you get in.
 *
 * It is one surface and not two on purpose. A menu that only lists things and a
 * screen that only describes one are the same document in a real training
 * system: a schedule with today's job circled. So the list is the menu, the
 * selected row expands into the briefing, and the button at the bottom is the
 * only way into a cab.
 *
 * The register is the debrief's, because it is the same institution talking —
 * L.A.B.O.R., procedural and faintly disappointed in advance
 * (`doc/design/rig/training-frame.md`). It is a **paper form**, not a title screen:
 * no art, no logo bigger than a stamp, and nothing that reads as a game asking
 * you to choose a level.
 *
 * It also earns something the browser makes us want anyway: a page may not make
 * noise before somebody has touched it, and BEGIN is a touch. The rig starting
 * to talk before you have sat down would be the rig being rude, so the gesture
 * that starts the exercise is the gesture that wakes the sound.
 *
 * Architecture rule 3: it reads a catalogue of plain data and reports one
 * intent. It never sees the sim.
 */
import { EXERCISES, type Exercise } from "../world/exercises.ts";

const {
  selected,
  onselect,
  onbegin,
  oncancel,
}: {
  selected: string;
  onselect: (exercise: Exercise) => void;
  onbegin: () => void;
  /** Only offered when there is a run to go back to. */
  oncancel?: () => void;
} = $props();

const current = $derived(EXERCISES.find((e) => e.id === selected) ?? EXERCISES[0]);
</script>

<div class="scrim">
  <div class="form" role="dialog" aria-label="exercise schedule">
    <div class="head">
      <div class="stamp">L.A.B.O.R. TRAINING SYSTEM</div>
      <div class="title">OPERATOR SCHEDULE &mdash; SELECT EXERCISE</div>
    </div>

    <div class="list">
      {#each EXERCISES as exercise (exercise.id)}
        <button
          class="row"
          class:on={exercise.id === selected}
          onclick={() => onselect(exercise)}
        >
          <span class="id">{exercise.id}</span>
          <span class="name">{exercise.name}</span>
          <!-- What it is going to ask for, in one glance: how many markers, and
               how rough the ground is. Both are real numbers off the exercise
               rather than a difficulty rating, which would be the rig having an
               opinion instead of a specification. -->
          <span class="spec">
            {exercise.route.count === 0 ? "—" : `${exercise.route.count} PIN`}
            &middot; {Math.round(exercise.relief * 100)}% RELIEF
          </span>
        </button>
      {/each}
    </div>

    {#if current}
      <div class="brief">{current.brief}</div>
      <div class="task">
        <span class="label">OBJECTIVE</span>
        <span class="value">{current.objective}</span>
      </div>
    {/if}

    <div class="actions">
      {#if oncancel}
        <button class="back" onclick={oncancel}>BACK</button>
      {/if}
      <button class="begin" onclick={onbegin}>BEGIN EXERCISE</button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 11;
    background: rgba(6, 8, 9, 0.86);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 14px;
  }
  .form {
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

  .list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  /* A line on a schedule: number, name, and what it is going to cost you. The
     selected one is ticked in the margin, not highlighted like a button. */
  .row {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0 8px;
    text-align: left;
    font: inherit;
    letter-spacing: inherit;
    color: inherit;
    background: none;
    border: none;
    border-top: 1px solid #23282a;
    border-left: 3px solid transparent;
    padding: 5px 12px;
    cursor: pointer;
  }
  .row.on {
    border-left-color: #e8b53a;
    background: #191d20;
  }
  .id {
    color: #6d7a76;
    letter-spacing: 0.14em;
  }
  .row.on .id {
    color: #e8b53a;
  }
  .name {
    letter-spacing: 0.12em;
  }
  .spec {
    grid-column: 2;
    font-size: 8px;
    color: #78827f;
    letter-spacing: 0.1em;
  }

  .brief {
    padding: 9px 12px;
    font-size: 9px;
    color: #9aa6a1;
    background: #191d20;
    border-top: 2px solid #0d1012;
  }
  .task {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 12px;
    background: #23282a;
    letter-spacing: 0.14em;
    font-size: 9px;
  }
  .task .label {
    color: #6d7a76;
  }
  .task .value {
    color: #efe6cf;
  }

  .actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
  }
  .actions button {
    flex: 1;
    font: inherit;
    letter-spacing: 0.12em;
    padding: 9px 0;
    border: 1px solid #0d1012;
    cursor: pointer;
  }
  .back {
    flex: 0 0 30%;
    background: #23282a;
    color: #c6d0cb;
  }
  .begin {
    background: #e8b53a;
    color: #14171a;
    font-weight: 700;
  }
</style>
