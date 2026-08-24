<script lang="ts">
/**
 * The base case: a **1-cell**. A round indicator/button combo with an
 * old-school stuck-on embossed label.
 *
 * This is what a component gets on the dash when its maker had no further
 * opinion — one lens that is both the activity light and the disable toggle,
 * and a strip of label tape somebody squeezed out by hand when they fitted it.
 *
 * Bolted on, and it looks it: its own bracket, its own screws, sitting on
 * whatever panel the vehicle came with. The dash belongs to the chassis maker;
 * everything else in the row is an addition to somebody else's property
 * (`docs/design/components.md`).
 *
 * Architecture rule 3: reads a stage off a snapshot, reports intent up.
 */
import type { CellProps } from "../cell.ts";

const { stage, style, onToggle }: CellProps = $props();

/** The lens shows the condition. `data-lit` is the substrate's lamp contract. */
const lit = $derived(stage.enabled ? stage.condition : 0);
const word = $derived(stage.enabled ? style.lexicon.on : style.lexicon.off);
</script>

<div
  class="cell mfg-proud"
  style="--mfg-plate: {style.plate}; --mfg-bezel: {style.bezel}; --mfg-face: {style
    .face}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
>
  <div class="bracket">
    <span class="mfg-screw"></span>
    <span class="mfg-screw"></span>
  </div>

  <button
    class="lens mfg-lamp"
    data-lit={lit}
    onclick={onToggle}
    aria-label="enable {stage.label}"
    aria-pressed={stage.enabled}
  >
    <span class="collar"></span>
  </button>

  <div class="legend">
    <span class="mfg-emboss">{stage.label}</span>
    <span class="state">{word}</span>
  </div>
</div>

<style>
  .cell {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 7px 4px 4px;
    border-radius: 2px;
    background: var(--mfg-plate);
    border: 1px solid var(--mfg-ink);
  }
  /* The bracket it was bolted on with. Two screws through somebody else's
     sheet metal, which is exactly what fitting an accessory looks like. */
  .bracket {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-self: stretch;
    padding: 1px 0;
  }
  .lens {
    position: relative;
    flex: none;
    width: 22px;
    height: 22px;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
  }
  /* A chromed collar round the lens, the way a panel-mount indicator has. */
  .collar {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid #6a7375;
    background: linear-gradient(160deg, #565f61, #23292b);
    z-index: -1;
  }
  .legend {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .state {
    font-size: 6px;
    letter-spacing: 0.16em;
    color: color-mix(in srgb, var(--mfg-face) 55%, transparent);
  }
</style>
