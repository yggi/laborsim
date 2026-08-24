<script lang="ts">
/**
 * TOWA DENKI retrofits the panel standard too, and cannot resist a readout.
 *
 * Same lens, same engraved plate as everyone else — TOWA is selling into KIBA
 * cabs and knows better than to ship something that will not fit. What it adds
 * is a two-digit counter for the pin it is heading for: the smallest possible
 * amount of digital on a panel that has none, in a moulded surround that is a
 * shade too glossy for the sheet steel around it.
 *
 * It keeps its toggle, because guidance is a capability and not a guard. This
 * is kit you are *meant* to switch off when you want to drive yourself, and
 * TOWA has no lawyers arguing otherwise.
 *
 * Architecture rule 3: reads a stage off a snapshot, reports intent up.
 */
import type { CellProps } from "../cell.ts";
import Seg from "../Seg.svelte";

const { stage, style, onToggle }: CellProps = $props();

/**
 * Enabled and fine is a **lit** lamp, not a dark one — same rule as the rack.
 * A dark lens means "not running"; if a running component looked the same as a
 * switched-off one, the panel would be telling you nothing at a glance, which
 * is the only thing it is for.
 */
const lit = $derived(stage.enabled ? Math.max(1, stage.condition) : 0);
const target = $derived(stage.readout?.target ?? 0);
const pad = (n: number) => n.toFixed(0).padStart(2, "0");
</script>

<div
  class="cell"
  style="--mfg-plate: {style.plate}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
>
  <div class="mount">
    <button
      class="lamp mfg-lamp"
      data-lit={lit}
      onclick={onToggle}
      aria-label="enable {stage.label}"
      aria-pressed={stage.enabled}
    ></button>
    <Seg value={stage.enabled ? pad(target + 1) : ""} mask="88" />
  </div>
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
  .mount {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .lamp {
    width: 26px;
    height: 26px;
    flex: none;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
  }
</style>
