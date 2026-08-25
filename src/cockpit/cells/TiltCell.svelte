<script lang="ts">
/**
 * HANSA REGELTECHNIK does not fit an indicator. It fits a
 * **Sicherheitsbenachrichtigungsleuchte nach DIN 4711-3b** — a safety
 * notification lamp for mobile and stationary power machinery — and it would
 * thank you to use the full designation.
 *
 * Functionally it is *less* than the base case: same job, no toggle, no
 * readout. A certified guard is not switched off from a dashboard; you open the
 * rack, which costs you the glass, and the warranty notice arrives in German.
 *
 * Physically it is not a flush pushbutton at all — it is a **ribbed dome
 * beacon** on a machined base, the kind bolted to the top of a press. It stands
 * proud of the panel where everything else is let into it, and that is exactly
 * the clash: HANSA is not being scruffy, it is being *correct to a different
 * standard*, and the different standard is taller than yours.
 *
 * The rule is that every indicator carries its component's name, and that a
 * maker may style the plate. This is HANSA's override: a heavy-bordered safety
 * plate with the standard number set under the name, which the standard
 * requires and nobody else does.
 *
 * Architecture rule 3: reads a stage off a snapshot. No intent leaves it.
 */
import type { CellProps } from "../contract.ts";

const { stage, style }: CellProps = $props();

const bypassed = $derived(!stage.enabled);
/**
 * A bypassed guard reads as a standing caution, never as a dark lamp — that is
 * the whole point of it not going quiet. Otherwise: lit while it is doing its
 * job, amber while it is taking authority, red at zero drive.
 */
const lit = $derived(bypassed ? 2 : Math.max(1, stage.condition));
</script>

<div
  class="cell"
  style="--mfg-plate: {style.plate}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
>
  <div class="beacon">
    <span
      class="dome mfg-lamp"
      data-lit={lit}
      role="img"
      aria-label="{stage.label} {bypassed ? style.lexicon.bypassed : style.lexicon.on}"
    ></span>
    <span class="base">
      <span class="mfg-screw mfg-screw-hex"></span>
      <span class="mfg-screw mfg-screw-hex"></span>
    </span>
  </div>

  <!-- The plate never changes. It is engraved metal — it cannot know what the
       guard is doing, and a label that rewrites itself is a screen pretending to
       be a machine. The lens carries the state; the strip carries the sentence. -->
  <span class="mfg-legend din">
    <svg class="warn" viewBox="0 0 12 11" aria-hidden="true">
      <path d="M6 0.8 L11.4 10.2 H0.6 Z" />
      <path d="M6 4 V7.2" />
      <circle cx="6" cy="8.6" r="0.6" />
    </svg>
    {stage.label}
  </span>
</div>

<style>
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  /* Surface-mounted, not let in: the dome sits on a base that sits on the
     panel, so it is the one thing on the dash with a shadow under it. */
  .beacon {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .dome {
    width: 24px;
    height: 21px;
    border-radius: 50% 50% 40% 40%;
    /* Fresnel ribbing, the way a real beacon lens is moulded. */
    background-image: repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.17) 0 1px,
      transparent 1px 3px
    );
    position: relative;
    z-index: 1;
  }
  .base {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 30px;
    height: 7px;
    padding: 0 2px;
    border-radius: 1px;
    background: linear-gradient(180deg, #3c4244, #16191a);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.22),
      0 2px 3px rgba(0, 0, 0, 0.55);
  }
  .base .mfg-screw {
    width: 3px;
    height: 3px;
  }
  /* HANSA's override of the panel convention: a heavy safety border and a
     warning mark cut into the plate beside the name. Same rule as everyone —
     an indicator carries its component's name — in a house dialect. */
  .din {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-color: #14110c;
    border-width: 2px;
  }
  .warn {
    width: 8px;
    height: 8px;
    flex: none;
    fill: none;
    stroke: #14110c;
    stroke-width: 1.1;
    stroke-linejoin: round;
  }
  .warn circle {
    fill: #14110c;
    stroke: none;
  }
</style>
