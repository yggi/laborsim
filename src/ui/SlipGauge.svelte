<script lang="ts">
/**
 * Slip, per track, centre-zero.
 *
 * **Slip is rung 1's teaching quantity** (`MEMORY.md` § 4.1) — commanded track
 * speed minus the speed the ground is actually going past — and until now it was
 * on the debug telemetry line and in a single annunciator lamp. Every rung-1
 * failure is legible in it: spinning on a grade, skating through a turn, clawing
 * air when beached. It has earned a face on the panel.
 *
 * Centre-zero because slip is signed and the sign is the diagnosis: positive is
 * the track outrunning the ground (spinning up), negative is the ground
 * outrunning the track (being pushed, or dragged by the other side). A bar that
 * showed magnitude only would throw away half of what it knows.
 *
 * Two bars rather than one number, because you read this at a glance with your
 * eyes on the ground, and the *difference* between the sides is the thing.
 *
 * Architecture rule 3: reads a snapshot.
 */
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot, size = 54 }: { snapshot: Snapshot | undefined; size?: number } =
  $props();

/** Full scale each way, m/s. Beyond this the machine is not driving, it is ice. */
const SPAN = 1.6;

const tracks = $derived([
  { id: "L", slip: snapshot?.machine.left.slip ?? 0 },
  { id: "R", slip: snapshot?.machine.right.slip ?? 0 },
]);

/** Half-width of the bar as a percentage, and which side of centre it grows. */
const extent = (slip: number) => (Math.min(Math.abs(slip), SPAN) / SPAN) * 50;

const worst = $derived(
  Math.max(Math.abs(tracks[0]?.slip ?? 0), Math.abs(tracks[1]?.slip ?? 0)),
);
</script>

<div class="slip" style="width: {size}px">
  <div class="face">
    <div class="head">SLIP</div>
    {#each tracks as track (track.id)}
      <div class="row">
        <span class="cap">{track.id}</span>
        <span class="track" role="img" aria-label="{track.id} slip {track.slip.toFixed(2)} m/s">
          <span class="centre"></span>
          <span
            class="fill"
            class:hot={Math.abs(track.slip) > 0.4}
            style="width: {extent(track.slip)}%; {track.slip < 0
              ? `right: 50%`
              : `left: 50%`}"
          ></span>
        </span>
      </div>
    {/each}
  </div>
  <div class="read">{worst.toFixed(1)}</div>
  <div class="label">m/s</div>
</div>

<style>
  .slip {
    flex: none;
    text-align: center;
    font: 7px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    color: #2a2418;
  }
  /* Same white bezel and dark face as the needle gauges beside it. */
  .face {
    background: #e9e4d6;
    border: 1px solid #b7b0a0;
    border-radius: 4px;
    padding: 4px 4px 5px;
  }
  .head {
    font-size: 6px;
    color: #4a4230;
    margin-bottom: 2px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: 2px;
  }
  .cap {
    width: 5px;
    flex: none;
    font-size: 6px;
    color: #4a4230;
  }
  .track {
    flex: 1;
    position: relative;
    height: 8px;
    background: #16181a;
    border: 1px solid #8f887a;
    overflow: hidden;
  }
  .centre {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background: #6a6252;
  }
  .fill {
    position: absolute;
    top: 1px;
    bottom: 1px;
    background: #6fe3c4;
    transition:
      width 0.1s linear,
      left 0.1s linear,
      right 0.1s linear;
  }
  /* Past the point where the lamp calls it slipping, it changes colour rather
     than just getting longer — that is the reading you take peripherally. */
  .fill.hot {
    background: #e0503c;
  }
  .read {
    margin-top: 1px;
    font-weight: 700;
    font-size: 8px;
    color: #efe6cf;
    background: #2a2418;
    border-radius: 2px;
    padding: 1px 0;
    font-variant-numeric: tabular-nums;
  }
  .label {
    margin-top: 1px;
    color: #4a4230;
  }
</style>
