<script lang="ts">
/**
 * TILT-GUARD's instrument, and mandatory the same way NAV-1's scope is: fit
 * the component, fit its glass.
 *
 * Two gauges, red–amber–green–amber–red, one per axis. The bands are not
 * decoration and not a mood: green is where the module is passing your command
 * through untouched, amber is where it has started winding you down, and red is
 * where it has taken the drivetrain to zero. Move the limit sliders on the
 * faceplate and the bands move with them, because they *are* the limits.
 *
 * So the instrument shows exactly what the module will do and nothing about
 * whether it is right to. Sitting nose-high in the red with no drive is the
 * gauge telling the truth.
 *
 * Architecture rule 3: reads a snapshot, and only the readout its module
 * published into it.
 */
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

/** Fraction of the limit at which the module starts easing. Mirrors EASE. */
const EASE = 0.6;
/** Full scale, in limits. The needle can leave the red, but not far. */
const SPAN = 1.45;

const stage = $derived(snapshot?.stages.find((s) => s.id === "TILT"));
const readout = $derived(stage?.readout);
const live = $derived(stage?.enabled === true);

/** Sines in, degrees out. Instruments may use transcendentals; the sim may not. */
const deg = (sine: number) =>
  (Math.asin(Math.max(-1, Math.min(1, sine))) * 180) / Math.PI;

/** Signed position on the gauge, −1..1 at the limits, clamped to the scale. */
function at(value: number, limit: number): number {
  if (!limit) return 0;
  const f = value / limit;
  return Math.max(-SPAN, Math.min(SPAN, f));
}

const axes = $derived([
  {
    id: "PITCH",
    value: readout?.pitch ?? 0,
    limit: readout?.pitchLimit ?? 0,
  },
  {
    id: "ROLL",
    value: readout?.roll ?? 0,
    limit: readout?.rollLimit ?? 0,
  },
]);

const gain = $derived(readout?.gain ?? 1);
/** Percent of the width from the left edge, for a value in gauge units. */
const pct = (u: number) => ((u + SPAN) / (2 * SPAN)) * 100;
</script>

<div class="gauges" class:live>
  <div class="label">
    <span>TILT-GUARD</span>
    <span class="gain" class:cut={gain < 1}>&times;{gain.toFixed(2)}</span>
  </div>

  {#each axes as axis (axis.id)}
    {@const u = at(axis.value, axis.limit)}
    <div class="gauge">
      <span class="name">{axis.id}</span>
      <span class="track">
        <!-- Bands, laid out from the module's own thresholds. -->
        <span class="band red" style="left: 0; width: {pct(-1)}%"></span>
        <span class="band amber" style="left: {pct(-1)}%; width: {pct(-EASE) - pct(-1)}%"
        ></span>
        <span class="band green" style="left: {pct(-EASE)}%; width: {pct(EASE) - pct(-EASE)}%"
        ></span>
        <span class="band amber" style="left: {pct(EASE)}%; width: {pct(1) - pct(EASE)}%"></span>
        <span class="band red" style="left: {pct(1)}%; width: {100 - pct(1)}%"></span>
        <span class="needle" style="left: {pct(u)}%"></span>
      </span>
      <span class="read">{deg(axis.value).toFixed(0)}/{deg(axis.limit).toFixed(0)}&deg;</span>
    </div>
  {/each}
</div>

<style>
  .gauges {
    width: 116px;
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
    font: 8px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.1em;
    color: #6d7a76;
    padding-bottom: 4px;
  }
  .label {
    display: flex;
    justify-content: space-between;
    padding: 3px 6px;
    background: #23282a;
    color: #f07b2a;
  }
  .gain {
    color: #6d7a76;
  }
  .gain.cut {
    color: #e0503c;
  }
  .gauge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 5px 0;
  }
  .name {
    width: 26px;
    flex: none;
    font-size: 7px;
  }
  .read {
    width: 30px;
    flex: none;
    text-align: right;
    font-size: 7px;
    color: #c6d0cb;
  }
  .track {
    flex: 1;
    position: relative;
    height: 9px;
    background: #0d1012;
    border: 1px solid #23282a;
    overflow: hidden;
  }
  .band {
    position: absolute;
    top: 0;
    bottom: 0;
  }
  .green {
    background: #2f6d55;
  }
  .amber {
    background: #7a5a1c;
  }
  .red {
    background: #6e2b22;
  }
  .needle {
    position: absolute;
    top: -1px;
    bottom: -1px;
    width: 2px;
    margin-left: -1px;
    background: #ffffff;
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.7);
    transition: left 0.08s linear;
  }
  /* A bypassed module must not have a live-looking instrument. */
  .gauges:not(.live) .gauge {
    opacity: 0.35;
  }
</style>
