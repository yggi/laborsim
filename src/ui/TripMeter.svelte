<script lang="ts">
/**
 * The odometer — ground covered this run, in kilometres, on drums.
 *
 * A total that only ever goes up, which is exactly what a drum is for and
 * exactly what neither of the other two display primitives can be: seven
 * segments show a reading that can fall, a matrix shows a message. Mileage is
 * the one number on a machine that is a *record* rather than a state, and it
 * has never been shown any other way.
 *
 * The last wheel turns every ten metres, so at working speed there is always
 * something moving in the corner of your eye — and standing still it stops,
 * which is its own quiet reading.
 *
 * Architecture rule 3: reads a snapshot. The distance is integrated in the sim,
 * not derived here, so a recording carries its own mileage.
 */
import Odometer from "../cockpit/Odometer.svelte";
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const km = $derived(Math.max(0, (snapshot?.distance ?? 0) / 1000));
/** Units per second, for the blur on the fast wheels: m/s into km/s. */
const rate = $derived(Math.abs(snapshot?.machine.speed ?? 0) / 1000);
</script>

<div class="window" role="img" aria-label="distance travelled">
  <Odometer value={km} rate={rate} digits={3} decimals={2} height={15} label="km" />
</div>

<style>
  /* Same window as the running-time drums beside it: one supplier, one part
     bin, two readings. */
  .window {
    display: flex;
    align-items: center;
    padding: 3px 5px;
    background: linear-gradient(180deg, #0a0b0c, #2c2f31 38% 62%, #0a0b0c);
    border: 1px solid #6e7376;
    border-radius: 2px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
    /* The trip wheels are the older part: cream digits, not white. */
    --mfg-odo-color: #e6dfcb;
  }
</style>
