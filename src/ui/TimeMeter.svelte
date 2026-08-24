<script lang="ts">
/**
 * Running time — HH:MM:SS on drums, in the window where the hour meter was.
 *
 * An hour meter is the right *object* for a machine that gets hired by the
 * hour, but a training exercise is measured in minutes, and four digits and a
 * red tenths wheel cannot show a minute. So: the same drums, the same window,
 * three fields and two colons. It still only goes up, which is the thing that
 * makes it a drum rather than a clock.
 *
 * It sits in the identity cluster rather than with the driving instruments,
 * because it is a fact about the exercise rather than about the ground.
 *
 * Architecture rule 3: reads a snapshot.
 */
import Odometer from "../cockpit/Odometer.svelte";
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const seconds = $derived(Math.max(0, snapshot?.simSeconds ?? 0));
const hh = $derived(Math.floor(seconds / 3600));
const mm = $derived(Math.floor((seconds % 3600) / 60));
const ss = $derived(Math.floor(seconds % 60));
</script>

<div class="window" role="img" aria-label="running time">
  <Odometer value={hh} digits={2} height={15} label="hours" />
  <span class="colon">:</span>
  <Odometer value={mm} digits={2} height={15} hideLeading={false} label="minutes" />
  <span class="colon">:</span>
  <!-- The seconds wheel is the only one moving at rest, and it is what tells
       you the exercise is running while the machine is not. -->
  <Odometer
    value={ss}
    rate={1}
    digits={2}
    height={15}
    hideLeading={false}
    label="seconds"
  />
</div>

<style>
  /* A window cut in the panel with the drums behind it: recessed, so the top
     and bottom of each digit falls into shadow as the wheel curves away. */
  .window {
    display: flex;
    align-items: center;
    gap: 1px;
    padding: 3px 4px;
    background: linear-gradient(180deg, #0a0b0c, #2c2f31 38% 62%, #0a0b0c);
    border: 1px solid #6e7376;
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
    color: #ece7db;
  }
  .colon {
    font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #9aa3a5;
    padding-bottom: 1px;
  }
</style>
