<script lang="ts">
/**
 * TOWA DENKI's cell — a small **digital status screen**, because of course it is.
 *
 * TOWA got rich on consumer radios and never lost the instinct: where KIBA
 * stamps a legend into steel and HANSA machines a bracket for it, TOWA ships a
 * backlit LCD in a moulded bezel that photographs well. It tells you the pin it
 * is heading for and how many there are, and it is genuinely useful and
 * genuinely narrow — which is the module underneath it, exactly.
 *
 * It keeps the toggle, because guidance is a capability and not a guard: this is
 * kit you are meant to switch off when you want to drive yourself, and TOWA has
 * no lawyers arguing otherwise.
 *
 * Architecture rule 3: reads a stage off a snapshot, reports intent up.
 */
import type { CellProps } from "../cell.ts";

const { stage, style, onToggle }: CellProps = $props();

const target = $derived(stage.readout?.target ?? 0);
const pins = $derived(stage.readout?.pins ?? 0);
const live = $derived(stage.enabled && !stage.idle);
const pad = (n: number) => n.toFixed(0).padStart(2, "0");
</script>

<div
  class="cell"
  style="--mfg-plate: {style.plate}; --mfg-bezel: {style.bezel}; --mfg-face: {style
    .face}; --mfg-accent: {style.accent}"
>
  <button
    class="screen"
    class:live
    onclick={onToggle}
    aria-label="enable {stage.label}"
    aria-pressed={stage.enabled}
  >
    <span class="brand">
      <svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
        <path d={style.mark} />
      </svg>
      {stage.label}
    </span>
    <span class="row">
      <span class="big">{stage.enabled ? pad(target + 1) : "--"}</span>
      <span class="of">/{pad(pins)}</span>
    </span>
    <span class="state">{stage.enabled ? style.lexicon.on : style.lexicon.off}</span>
  </button>
</div>

<style>
  /* Injection-moulded, not folded: soft corners, a moulded lip, no visible
     fixings at all. TOWA does not want you thinking about how it is attached. */
  .cell {
    padding: 3px;
    border-radius: 6px;
    background: linear-gradient(180deg, #2b3338, var(--mfg-plate));
    border: 1px solid var(--mfg-ink);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      0 2px 4px rgba(0, 0, 0, 0.55);
  }
  .screen {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1px;
    min-width: 74px;
    padding: 4px 6px 3px;
    border: 1px solid #0a1114;
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
    text-align: left;
    /* An unlit LCD: greenish glass with the segments faintly visible. */
    background: linear-gradient(180deg, #10181b, #0b1214);
    color: color-mix(in srgb, var(--mfg-accent) 34%, transparent);
  }
  .screen.live {
    background: linear-gradient(180deg, #16302c, #0d1f1c);
    color: var(--mfg-accent);
    box-shadow:
      inset 0 0 10px color-mix(in srgb, var(--mfg-accent) 22%, transparent),
      0 0 6px color-mix(in srgb, var(--mfg-accent) 30%, transparent);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 6px;
    letter-spacing: 0.18em;
    opacity: 0.85;
  }
  .mark {
    width: 8px;
    height: 8px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 1px;
  }
  /* Seven-segment-ish: wide, flat, and slightly too big for the box. */
  .big {
    font-size: 15px;
    line-height: 1;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
  }
  .of {
    font-size: 8px;
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
  }
  .state {
    font-size: 5.5px;
    letter-spacing: 0.2em;
    opacity: 0.8;
  }
</style>
