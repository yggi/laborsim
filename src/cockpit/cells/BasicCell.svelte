<script lang="ts">
/**
 * The base case, and the format every other cell retrofits: **one illuminated
 * pushbutton and one engraved plate under it.** Nothing else.
 *
 * This is what a KIBA machine looks like — a few labelled lights, and where a
 * component has a job for your thumb, a pair of buttons beside them. The label
 * is a *separate object*, screwed to the panel by whoever fitted the part. It
 * is never printed inside the button and never set beside it as running text,
 * because that is what a screen does and this is not one.
 *
 * The lens is the state. Dark means off, lit means running, amber and red mean
 * what they always mean. There is no word for it and there does not need to be:
 * you read a panel by colour and position, not by reading.
 *
 * Architecture rule 3: reads a stage off a snapshot, reports intent up.
 */
import type { CellProps } from "../contract.ts";

const { stage, style, controls }: CellProps = $props();

/**
 * Enabled and fine is a **lit** lamp, not a dark one — same rule as the rack.
 * A dark lens means "not running"; if a running component looked the same as a
 * switched-off one, the panel would be telling you nothing at a glance, which
 * is the only thing it is for.
 */
const lit = $derived(stage.enabled ? Math.max(1, stage.condition) : 0);
</script>

<div
  class="cell"
  style="--mfg-plate: {style.plate}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
>
  <button
    class="lamp mfg-lamp"
    data-lit={lit}
    onclick={controls.toggle}
    aria-label="enable {stage.label}"
    aria-pressed={stage.enabled}
  ></button>
  <span class="mfg-legend">{stage.label}</span>
</div>

<style>
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 2px 3px;
  }
  .lamp {
    width: 26px;
    height: 26px;
    flex: none;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
  }
  .lamp:active {
    /* A pushbutton goes *in*. Cheap, and it is the difference between a
       control you press and a rectangle that changes colour. */
    box-shadow:
      inset 0 3px 5px rgba(0, 0, 0, 0.6),
      0 0 0 rgba(0, 0, 0, 0);
  }
</style>
