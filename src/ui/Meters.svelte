<script lang="ts">
/**
 * The hour-and-trip meter — one instrument, two drums, in the window where the
 * hour meter was.
 *
 * They were two separate parts and they are now one, because that is what the
 * combined unit actually is on a machine: a single housing bolted through the
 * panel with two reels behind one glass, hours over distance. Two housings cost
 * two bezels, two shadows and two legend plates for one idea — "how long, how
 * far" — and the panel has no estate to spend on that.
 *
 * Both readings only ever go up, which is the whole reason they are drums
 * rather than segments (`Odometer.svelte`). Hours run whether or not you are
 * moving; the last trip wheel turns every ten metres, so at working speed there
 * is always something ticking in the corner of your eye, and standing still it
 * stops — which is its own quiet reading.
 *
 * The unit marks are screened on the instrument's own face, not engraved on a
 * panel plate. That is not the inline labelling the panel bans: the plates name
 * *controls* and are made by whoever fitted them, while a gauge arrives from its
 * supplier with its units already on the dial.
 *
 * Architecture rule 3: reads a snapshot. Distance is integrated in the sim, so a
 * recording carries its own mileage.
 */
import Odometer from "../cockpit/Odometer.svelte";
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const seconds = $derived(Math.max(0, snapshot?.simSeconds ?? 0));
const hh = $derived(Math.floor(seconds / 3600));
const mm = $derived(Math.floor((seconds % 3600) / 60));
const ss = $derived(Math.floor(seconds % 60));

const km = $derived(Math.max(0, (snapshot?.distance ?? 0) / 1000));
/** Units per second, for the blur on the fast wheels: m/s into km/s. */
const rate = $derived(Math.abs(snapshot?.machine.speed ?? 0) / 1000);
</script>

<div class="unit">
  <div class="row">
    <span class="glass">
      <Odometer value={hh} digits={2} height={13} label="hours" />
      <span class="colon">:</span>
      <Odometer value={mm} digits={2} height={13} hideLeading={false} label="minutes" />
      <span class="colon">:</span>
      <!-- The seconds wheel is the only one moving at rest, and it is what tells
           you the exercise is running while the machine is not. -->
      <Odometer
        value={ss}
        rate={1}
        digits={2}
        height={13}
        hideLeading={false}
        label="seconds"
      />
    </span>
    <span class="mark">H</span>
  </div>

  <div class="row">
    <span class="glass trip">
      <Odometer value={km} rate={rate} digits={3} decimals={2} height={13} label="km" />
    </span>
    <span class="mark">KM</span>
  </div>
</div>

<style>
  /* The housing: a steel can bolted through the sheet, with the two windows cut
     in its face and the unit marks screened beside them. */
  .unit {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 3px;
    background: linear-gradient(180deg, #6a7174 0%, #4c5356 46%, #363c3e 100%);
    border: 1px solid #23282a;
    border-radius: 2px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      0 1px 2px rgba(0, 0, 0, 0.55);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  /* A window cut in the face with the drums behind it: recessed, so the top and
     bottom of each digit falls into shadow as the wheel curves away. */
  .glass {
    display: flex;
    align-items: center;
    gap: 1px;
    flex: 1;
    padding: 2px 4px;
    background: linear-gradient(180deg, #0a0b0c, #2c2f31 38% 62%, #0a0b0c);
    border: 1px solid #1b1f21;
    border-radius: 1px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
    color: #ece7db;
  }
  /* The trip wheels are the older part: cream digits, not white. */
  .trip {
    --mfg-odo-color: #e6dfcb;
  }
  .colon {
    font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #9aa3a5;
    padding-bottom: 1px;
  }
  /* Screened on the housing by the gauge's maker. Paint on steel, so it takes
     the light from above like everything else does. */
  .mark {
    flex: none;
    width: 13px;
    font-size: 6px;
    letter-spacing: 0.06em;
    text-align: center;
    color: #14181a;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
  }
</style>
