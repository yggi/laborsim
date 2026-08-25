<script lang="ts">
/**
 * An analog needle gauge, white-bezel industrial style — the kind bolted to a
 * plant control panel, a round dial in a square frame with a swept scale.
 *
 * It is dumb on purpose: it takes a fraction 0..1 and points at it. What the
 * fraction *means* is the caller's problem, which keeps this reusable across
 * speed, grip, pressure, whatever the dash decides to show. `label` is the
 * accessible name only — what the dial *measures* is named by whatever mounts
 * it. A `danger` band paints the top of the sweep red so a gauge in the red
 * reads at a glance.
 *
 * **It draws a face, not an instrument.** The white square bezel and its four
 * screws used to be here, which meant a dial could only ever be mounted alone.
 * A cluster is one plate with holes cut in it, so the bezel belongs to the
 * thing doing the mounting (`NavUnit.svelte`) and what is left here is the dial
 * and the ring of the hole it is set into.
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
      <!-- The inside of a hole, lit from above: the upper wall falls into
           shadow and the lower one catches the light. Same direction as every
           inset on this panel, because there is only one lamp in this cab. -->
      <linearGradient id="mfg-rim-gauge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0, 0, 0, 0.8)" />
        <stop offset="0.55" stop-color="rgba(0, 0, 0, 0.15)" />
        <stop offset="1" stop-color="rgba(255, 255, 255, 0.4)" />
      </linearGradient>
    </defs>
    <circle class="dial" cx="50" cy="50" r="40" />
    <circle class="rim" cx="50" cy="50" r="40" />

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
  .dial {
    fill: #16181a;
  }
  /* Straddles the dial's edge, so half the ring is glass and half is plate —
     which is what the lip of a cutout looks like. */
  .rim {
    fill: none;
    stroke: url(#mfg-rim-gauge);
    stroke-width: 2.6;
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
