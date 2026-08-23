<script lang="ts">
/**
 * Instrument early — the readout the player needs to diagnose a failure is
 * the readout the developer needs. Rounds were lost on the concept-3 probe
 * diagnosing from screenshots; a telemetry line settled it immediately.
 *
 * Slip is rung 1's teaching quantity, so it is the thing shown biggest.
 *
 * Architecture rule 3: this takes a snapshot as a prop and nothing else. It
 * does not subscribe to sim state, and it cannot tell whether it is reading
 * a live session or a replay. That is the point.
 */
import type { Snapshot, TrackState } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const deg = (r: number) => `${(r >= 0 ? "+" : "") + ((r * 180) / Math.PI).toFixed(0)}°`;
const num = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

/** Amber past two-thirds of grip, red once the track is genuinely sliding. */
function tractionClass(track: TrackState): string {
  if (track.contacts === 0) return "alert";
  if (track.traction > 0.95) return "alert";
  if (track.traction > 0.66) return "warn";
  return "ok";
}
</script>

{#if snapshot}
  {@const m = snapshot.machine}
  <div class="telemetry">
    <div class="plate">
      <b>TYPE 3A / KIBA</b>
      <span>tracked platform &middot; 6.2 t</span>
    </div>
    <div class="row">
      SPD {m.speed.toFixed(2)} m/s &middot; PTCH {deg(m.pitch)} &middot; ROLL {deg(m.roll)}
    </div>
    {#each [["L", m.left], ["R", m.right]] as const as [side, track] (side)}
      <div class="row {tractionClass(track)}">
        {side} CMD {num(track.commanded)} &middot; SLIP {num(track.slip)} &middot; GRIP
        {(track.traction * 100).toFixed(0)}% &middot; GND {track.contacts}/6
        {#if track.contacts === 0}&middot; NO CONTACT{/if}
      </div>
    {/each}
    <div class="row bus">
      BUS &mdash; {snapshot.busOwner ?? "NO COMMAND LAYER"}
      {#if snapshot.suppressed.length}
        <span class="warn">&middot; SUPPRESSED: {snapshot.suppressed.join(", ")}</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .telemetry {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 10px);
    left: 12px;
    font: 10px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    color: #c6d0cb;
    pointer-events: none;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .plate b {
    display: block;
    font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.14em;
  }
  .plate span {
    color: #6d7a76;
  }
  .row {
    margin-top: 3px;
  }
  .bus {
    color: #6d7a76;
    margin-top: 7px;
  }
  .ok {
    color: #6fe3c4;
  }
  .warn {
    color: #f0a830;
  }
  .alert {
    color: #e0503c;
  }
</style>
