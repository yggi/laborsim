<script lang="ts">
/**
 * HANSA REGELTECHNIK's cell — a **2-cell** with a gauge, and **no toggle**.
 *
 * Two things it is not. It is not a shrunken copy of TILT-GUARD's glass gauges:
 * it shows how much authority the guard is currently taking, which is the one
 * thing you want peripherally. And it is not a hackjob — HANSA is *precise*
 * aftermarket. It arrives with a machined bracket, hex socket screws, a gasket
 * edge and a stamped standard number, and it clashes with the yellow panel it is
 * bolted to by being far too correct for it.
 *
 * There is no way to switch it off from here. That is the design: a certified
 * guard is bypassed by opening the rack and popping the hood, which costs you
 * the glass and voids the warranty in writing (`docs/design/components.md`).
 *
 * When it *has* been bypassed it does not go quiet — it says so, in German, for
 * as long as it takes you to put it back.
 *
 * Architecture rule 3: reads a stage off a snapshot. No intent leaves it.
 */
import type { CellProps } from "../cell.ts";

const { stage, style }: CellProps = $props();

/** How much drivetrain the guard is currently taking away, 0..1. */
const taken = $derived(1 - (stage.readout?.gain ?? 1));
const bypassed = $derived(!stage.enabled);
</script>

<div
  class="cell mfg-proud"
  class:bypassed
  style="--mfg-plate: {style.plate}; --mfg-bezel: {style.bezel}; --mfg-face: {style
    .face}; --mfg-accent: {style.accent}"
>
  <!-- A machined bracket: four hex sockets, and a gasket line inside them. -->
  <span class="mfg-screw mfg-screw-hex s1"></span>
  <span class="mfg-screw mfg-screw-hex s2"></span>
  <span class="mfg-screw mfg-screw-hex s3"></span>
  <span class="mfg-screw mfg-screw-hex s4"></span>

  <div class="field">
    <div class="top">
      <svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
        <path d={style.mark} />
      </svg>
      <span class="name">{stage.label}</span>
      <span class="state" data-cond={stage.condition}>
        {bypassed ? style.lexicon.bypassed : style.lexicon.on}
      </span>
    </div>

    <!-- Authority taken, as a bar. Not the limits — those are on the glass. -->
    <span class="mfg-meter" role="img" aria-label="{stage.label} authority taken">
      <span class="mfg-meter-fill" style="width: {Math.max(0, taken) * 100}%"></span>
    </span>

    <div class="silk">SG-2 · SIL 1 · 41-880</div>
  </div>
</div>

<style>
  .cell {
    position: relative;
    padding: 5px 8px;
    border-radius: 1px;
    background: var(--mfg-plate);
    /* Not a border — a machined edge with a gasket seated under it. */
    border: 1px solid var(--mfg-ink);
    outline: 1px solid color-mix(in srgb, var(--mfg-accent) 40%, transparent);
    outline-offset: -3px;
  }
  .s1,
  .s2,
  .s3,
  .s4 {
    position: absolute;
    width: 4px;
    height: 4px;
  }
  .s1 {
    left: 2px;
    top: 2px;
  }
  .s2 {
    right: 2px;
    top: 2px;
  }
  .s3 {
    left: 2px;
    bottom: 2px;
  }
  .s4 {
    right: 2px;
    bottom: 2px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 104px;
    padding: 0 3px;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .mark {
    width: 10px;
    height: 10px;
    flex: none;
    fill: none;
    stroke: var(--mfg-accent);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .name {
    font-size: 7px;
    letter-spacing: 0.12em;
    color: var(--mfg-face);
    white-space: nowrap;
  }
  .state {
    margin-left: auto;
    font-size: 6px;
    letter-spacing: 0.14em;
    padding: 1px 3px;
    border: 1px solid color-mix(in srgb, var(--mfg-accent) 50%, transparent);
    color: var(--mfg-accent);
    white-space: nowrap;
  }
  .state[data-cond="3"] {
    color: var(--mfg-alarm);
    border-color: var(--mfg-alarm);
  }
  .silk {
    font-size: 5.5px;
    letter-spacing: 0.16em;
    color: color-mix(in srgb, var(--mfg-face) 30%, transparent);
  }
  /* Bypassed is not quiet. Hatched like a de-energised circuit on a schematic,
     and it stays that way until the guard goes back in. */
  .cell.bypassed {
    background: repeating-linear-gradient(
      -45deg,
      var(--mfg-plate) 0 5px,
      color-mix(in srgb, var(--mfg-warn) 22%, var(--mfg-plate)) 5px 10px
    );
  }
  .cell.bypassed .state {
    color: var(--mfg-warn);
    border-color: var(--mfg-warn);
  }
</style>
