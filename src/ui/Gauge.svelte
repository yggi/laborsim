<script lang="ts">
/**
 * An analog needle gauge, white-bezel industrial style — the kind bolted to a
 * plant control panel, a round dial in a square frame with a swept scale.
 *
 * It is dumb on purpose: it takes a fraction 0..1 and points at it. What the
 * fraction *means* is the caller's problem, which keeps this reusable across
 * speed, grip, pressure, whatever the dash decides to show. `label` is the
 * accessible name only — what the dial *measures* is engraved on a plate the
 * dash mounts under it, because on a panel a label is a separate object. A `danger` band
 * paints the top of the sweep red so a gauge in the red reads at a glance.
 *
 * Architecture rule 3: pure presentation, no snapshot, no sim.
 */
import Seg from "../cockpit/Seg.svelte";

const {
  label,
  frac,
  display,
  mask = "888",
  danger = 0.85,
  size = 58,
}: {
  label: string;
  /** 0..1; clamped. Where the needle points. */
  frac: number;
  /** The number under the dial. Bare — its unit is engraved on the plate. */
  display: string;
  /** The readout window, as every segment lit. See `Seg`. */
  mask?: string;
  /** Fraction at which the red band begins. 1 = no red. */
  danger?: number;
  size?: number;
} = $props();

/** The scale sweeps 270°, from lower-left to lower-right, like every real one. */
const A0 = -225;
const A1 = 45;
const clamped = $derived(Math.max(0, Math.min(1, frac)));
const angle = $derived(A0 + clamped * (A1 - A0));

/** Point on the dial at fraction f, radius r, in a 100x100 viewBox. */
function at(f: number, r: number) {
  const a = ((A0 + f * (A1 - A0)) * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

/** SVG arc path from fraction a to b at radius r. */
function arc(a: number, b: number, r: number) {
  const p = at(a, r);
  const q = at(b, r);
  const large = (b - a) * (A1 - A0) > 180 ? 1 : 0;
  return `M ${p.x} ${p.y} A ${r} ${r} 0 ${large} 1 ${q.x} ${q.y}`;
}

const ticks = [0, 0.25, 0.5, 0.75, 1];
</script>

<div class="gauge" style="width: {size}px">
  <svg viewBox="0 0 100 100" role="img" aria-label="{label} {display}">
    <defs>
      <!-- Brushed metal: a diagonal sweep with the light coming from the same
           corner it comes from everywhere else on this panel. -->
      <linearGradient id="mfg-brushed-gauge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d6d9da" />
        <stop offset="0.42" stop-color="#b4b9bb" />
        <stop offset="1" stop-color="#8f9497" />
      </linearGradient>
    </defs>
    <!-- White square bezel with a screw in each corner. -->
    <rect class="bezel" x="2" y="2" width="96" height="96" rx="7" />
    {#each [[10, 10], [90, 10], [10, 90], [90, 90]] as const as [cx, cy] (cx + "," + cy)}
      <circle class="screw" {cx} {cy} r="2.4" />
    {/each}
    <circle class="dial" cx="50" cy="50" r="40" />

    <path class="scale" d={arc(0, 1, 33)} />
    {#if danger < 1}
      <path class="redband" d={arc(danger, 1, 33)} />
    {/if}
    {#each ticks as t (t)}
      {@const a = at(t, 33)}
      {@const b = at(t, 27)}
      <line class="tick" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
    {/each}

    <!-- Needle and hub. -->
    <g transform="rotate({angle} 50 50)">
      <line class="needle" x1="50" y1="50" x2="83" y2="50" />
      <line class="tail" x1="50" y1="50" x2="42" y2="50" />
    </g>
    <circle class="hub" cx="50" cy="50" r="5" />
  </svg>
  <Seg value={display} {mask} />
</div>

<style>
  .gauge {
    flex: none;
    text-align: center;
    font: 7px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    color: #2a2418;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  /* Brushed silver, lit from above-left. Instrument bezels are pressed metal;
     the cream ones read as plastic, which is a different decade. */
  .bezel {
    fill: url(#mfg-brushed-gauge);
    stroke: #6e7376;
    stroke-width: 1;
  }
  .screw {
    fill: #767b7e;
  }
  .dial {
    fill: #16181a;
  }
  .scale {
    fill: none;
    stroke: #c9c3b4;
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  .redband {
    fill: none;
    stroke: #d3402f;
    stroke-width: 2.6;
    stroke-linecap: butt;
  }
  .tick {
    stroke: #c9c3b4;
    stroke-width: 1.4;
  }
  .needle {
    stroke: #e8b53a;
    stroke-width: 2.6;
    stroke-linecap: round;
    transition: transform 0.12s linear;
  }
  .tail {
    stroke: #6a6252;
    stroke-width: 2.6;
    stroke-linecap: round;
  }
  .hub {
    fill: #d8d2c2;
    stroke: #16181a;
    stroke-width: 1;
  }
</style>
