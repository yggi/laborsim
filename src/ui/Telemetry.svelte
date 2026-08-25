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

const {
  snapshot,
  showChain = true,
}: { snapshot: Snapshot | undefined; showChain?: boolean } = $props();

const num = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

/** Amber past two-thirds of the friction cone, red once the track is sliding. */
function tractionClass(track: TrackState): string {
  // No ground reports `null`, not 0 — there is no cone to be a fraction of.
  if (track.traction === null) return "alert";
  if (track.traction > 0.95) return "alert";
  if (track.traction > 0.66) return "warn";
  return "ok";
}
</script>

{#if snapshot}
  {@const m = snapshot.machine}
  <div class="telemetry">
    <!-- Identity, speed, slip and grip are all on the panel now, in the
         chassis maker's own instruments. What is left here is the one thing
         the panel cannot show: the signal at every stage of the rack. -->
    {#each [["L", m.left], ["R", m.right]] as const as [side, track] (side)}
      <div class="row {tractionClass(track)}">
        {side} {num(track.commanded)} &middot; {track.contacts}/6
        {#if track.contacts === 0}&middot; NO CONTACT{/if}
      </div>
    {/each}
    <!--
      The chain, stage by stage. Under a pipeline there is no owner to name —
      so instead of "who won", show the signal at every stage. That is a
      stronger answer to the attribution rule and it is the inspectability
      pillar landing where it counts.
    -->
    <!-- The rack panel shows the same chain, editable. Two copies of one fact
         is the duplication that cost the probe three defects. -->
    {#if showChain}
    <div class="row bus">
      {#if snapshot.stages.length === 0}
        RACK EMPTY &mdash; TERMINAL AT HALT
      {:else}
        {#each snapshot.stages as stage (stage.id)}
          <span class:warn={stage.idle} class:off={!stage.enabled}>
            {stage.label}
            {#if !stage.enabled}[BYPASS]{:else if stage.idle}[IDLE]{:else}[{stage.verb}]{/if}
            {num(stage.output.left)}/{num(stage.output.right)}
          </span>
          <span class="arrow">&darr;</span>
        {/each}
        <span>TERMINAL</span>
      {/if}
    </div>
    {/if}
  </div>
{/if}

<style>
  .telemetry {
    position: fixed;
    /* Below the rig's objective strip, which owns the top-left corner now. The
       debug chain is the thing that moves, because the objective is something a
       player reads and this is something a developer reads. */
    top: calc(env(safe-area-inset-top) + 78px);
    left: 12px;
    font: 10px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    color: #c6d0cb;
    pointer-events: none;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
  .row {
    margin-top: 3px;
  }
  .bus {
    color: #6fe3c4;
    margin-top: 7px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.35;
  }
  .bus .arrow {
    color: #6d7a76;
  }
  .bus .off {
    color: #6d7a76;
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
