<script lang="ts">
/**
 * The hour meter — *Betriebsstundenzähler*, the little mechanical drum counter
 * that is on every piece of industrial plant ever built, because service
 * intervals and hire charges are both measured in engine hours.
 *
 * It reads `simSeconds`, so like every other gauge on this panel it is a real
 * simulated quantity and not decoration (`docs/design/cockpit.md`). It is also
 * the cheapest authenticity on the machine: nothing says *this is equipment
 * somebody hires by the hour* like a five-digit drum with a red tenths wheel.
 *
 * It sits well in the training frame, too — a rig logs hours, and the hours are
 * what L.A.B.O.R. is certifying you against.
 *
 * Architecture rule 3: reads a snapshot.
 */
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const hours = $derived((snapshot?.simSeconds ?? 0) / 3600);
/** Four whole digits and a tenth, as the drums actually read. */
const whole = $derived(Math.floor(hours).toFixed(0).padStart(4, "0").split(""));
const tenth = $derived(Math.floor((hours % 1) * 10).toFixed(0));
</script>

<div class="meter" role="img" aria-label="hour meter {hours.toFixed(1)} hours">
  <div class="drums">
    {#each whole as digit, i (i)}
      <span class="drum">{digit}</span>
    {/each}
    <span class="drum tenths">{tenth}</span>
  </div>
  <div class="label">HOURS</div>
</div>

<style>
  .meter {
    flex: none;
    text-align: center;
    font: 7px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    color: #2a2418;
  }
  /* A window cut in the panel with the drums behind it: recessed, so the top
     and bottom of each digit falls into shadow as the wheel curves away. */
  .drums {
    display: flex;
    gap: 1px;
    padding: 2px;
    background: #d8d2c2;
    border: 1px solid #8f887a;
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
  }
  .drum {
    width: 7px;
    padding: 2px 0;
    background: linear-gradient(180deg, #0a0b0c, #2c2f31 38% 62%, #0a0b0c);
    color: #ece7db;
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
  }
  /* The tenths wheel is white-on-red on every one of these ever made. */
  .tenths {
    background: linear-gradient(180deg, #5c1108, #b8331f 38% 62%, #5c1108);
  }
  .label {
    margin-top: 2px;
    color: #4a4230;
  }
</style>
