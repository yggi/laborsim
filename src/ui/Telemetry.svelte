<script lang="ts">
/**
 * Instrument early — the readout the player needs to diagnose a failure is
 * the readout the developer needs. Rounds were lost on the concept-3 probe
 * diagnosing from screenshots; a telemetry line settled it immediately.
 *
 * Architecture rule 3: this takes a snapshot as a prop and nothing else. It
 * does not subscribe to sim state, and it cannot tell whether it is reading
 * a live session or a replay. That is the point.
 */
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);
</script>

<div class="telemetry">
  {#if snapshot}
    <div>T {snapshot.simSeconds.toFixed(2)}s &middot; TICK {snapshot.tick}</div>
    {#each snapshot.bodies as body (body.id)}
      <div>
        BODY {body.id}
        &nbsp;X {fmt(body.position[0])}
        &nbsp;Y {fmt(body.position[1])}
        &nbsp;Z {fmt(body.position[2])}
      </div>
    {/each}
  {:else}
    <div>AWAITING SIM</div>
  {/if}
</div>

<style>
  .telemetry {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 10px);
    left: 12px;
    font: 10px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    color: #6fe3c4;
    pointer-events: none;
    white-space: pre;
  }
</style>
