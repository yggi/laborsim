<script lang="ts">
/**
 * ATT-0 — heading and attitude in one head, and the centre of the chassis
 * maker's instrument cluster.
 *
 * It is one instrument rather than two because the pilot reads it as one
 * question: *which way am I pointing, and how level am I?*
 *
 * **It lives on the dash, not on the glass** (decided 2026-08-24). It is not a
 * component's pod — it is part of what the vehicle came with, like the speedo,
 * and the chassis maker built it into the panel. The consequence is the point:
 * the bare KIBA cage now starts with **completely clear glass**, so the first
 * component you fit is the first view you lose. It also replaced the incline
 * bubble, which was reading the same two quantities with less to say.
 *
 * Aircraft practice, because it is the tradition that solved this: the attitude
 * indicator is the biggest instrument and it sits in the middle, with everything
 * else arranged around it.
 *
 * Nothing here is a limit and nothing here is advice — the ring shows where
 * north is and the ball shows where the horizon is. TILT-GUARD is the module
 * with an opinion, and it has its own gauges.
 *
 * Architecture rule 3: reads a snapshot. `atan2` is fine in an instrument —
 * the ban in rule 2 is on transcendentals that close a loop back into the sim,
 * and nothing here ever reaches it.
 */

import type { Snapshot } from "../core/snapshot.ts";
import Seg from "./Seg.svelte";

const { snapshot, size = 62 }: { snapshot: Snapshot | undefined; size?: number } =
  $props();

const DEG = 180 / Math.PI;

/** Heading in degrees, clockwise from +Z, which the pins call north. */
const heading = $derived.by(() => {
  const q = snapshot?.machine.pose.rotation;
  if (!q) return 0;
  const [x, y, z, w] = q;
  const fx = 2 * (x * z + w * y);
  const fz = 1 - 2 * (x * x + y * y);
  // deterministic-exempt: display only, never read back into the sim.
  const a = Math.atan2(fx, fz) * DEG;
  return (a + 360) % 360;
});

const pitch = $derived((snapshot?.machine.pitch ?? 0) * DEG);
const roll = $derived((snapshot?.machine.roll ?? 0) * DEG);

/** Units of horizon travel per degree of pitch. Enough to see, not to read. */
const PITCH_SCALE = 1.05;

const CARDINALS = [
  { at: 0, text: "N" },
  { at: 90, text: "E" },
  { at: 180, text: "S" },
  { at: 270, text: "W" },
];
</script>

<div class="att" style="width: {size}px">
  <svg viewBox="0 0 100 100" role="img" aria-label="heading and attitude">
    <defs>
      <clipPath id="att0-ball"><circle cx="50" cy="50" r="27" /></clipPath>
      <!-- The inside of a hole, lit from above. See `Gauge.svelte`. -->
      <linearGradient id="mfg-rim-att" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0, 0, 0, 0.8)" />
        <stop offset="0.55" stop-color="rgba(0, 0, 0, 0.15)" />
        <stop offset="1" stop-color="rgba(255, 255, 255, 0.4)" />
      </linearGradient>
    </defs>

    <circle class="dial" cx="50" cy="50" r="40" />

    <!-- The attitude ball. The horizon stays level with the world and the
         machine tips around it, which is the way round that tells you what
         *you* are doing. -->
    <g clip-path="url(#att0-ball)">
      <rect class="sky" x="0" y="0" width="100" height="100" />
      <g transform="rotate({-roll} 50 50) translate(0 {pitch * PITCH_SCALE})">
        <rect class="ground" x="-50" y="50" width="200" height="150" />
        <line class="horizon" x1="-50" y1="50" x2="150" y2="50" />
        {#each [-20, -10, 10, 20] as rung (rung)}
          <line
            class="rung"
            x1="42"
            y1={50 - rung * PITCH_SCALE}
            x2="58"
            y2={50 - rung * PITCH_SCALE}
          />
        {/each}
      </g>
      <!-- Fixed machine mark: this is you, and it does not move. -->
      <path class="mark" d="M39 50 h7 M54 50 h7 M50 48 v4" />
    </g>
    <circle class="ring" cx="50" cy="50" r="27" />

    <!-- The compass card turns; the lubber line at the top does not. -->
    <g transform="rotate({-heading} 50 50)">
      {#each CARDINALS as c (c.text)}
        <text
          class="card"
          x="50"
          y="16"
          transform="rotate({c.at} 50 50)"
          text-anchor="middle"
          dominant-baseline="middle">{c.text}</text
        >
      {/each}
      {#each [45, 135, 225, 315] as tick (tick)}
        <line class="tick" x1="50" y1="11" x2="50" y2="16" transform="rotate({tick} 50 50)" />
      {/each}
    </g>
    <!-- The lubber line, and the ring of the hole. Both go on last: the card
         turns underneath them and neither ever moves. The mark used to sit at
         radius 42, out on a bezel that no longer exists, so it has come inside
         the glass where an index mark belongs. -->
    <path class="lubber" d="M46.5 10.5 L53.5 10.5 L50 16 Z" />
    <circle class="rim" cx="50" cy="50" r="40" />
  </svg>
  <!-- Wrap *after* rounding: 359.6° rounds to 360, and a compass never reads
       360. It reads 000, the same as every real one. -->
  <Seg value={(Math.round(heading) % 360).toFixed(0).padStart(3, "0")} />
</div>

<style>
  .att {
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
  /* The lip of the cutout it is set into. See `Gauge.svelte`. */
  .rim {
    fill: none;
    stroke: url(#mfg-rim-att);
    stroke-width: 2.6;
  }
  .sky {
    fill: #1d2b33;
  }
  .ground {
    fill: #4a4327;
  }
  .horizon {
    stroke: #c6d0cb;
    stroke-width: 1;
  }
  .rung {
    stroke: #8e9a97;
    stroke-width: 0.7;
  }
  .mark {
    stroke: #e8b53a;
    stroke-width: 1.6;
    fill: none;
  }
  .ring {
    fill: none;
    stroke: #6c7a76;
    stroke-width: 1.2;
  }
  .card {
    fill: #c9c3b4;
    font-size: 9px;
    letter-spacing: 0;
  }
  .tick {
    stroke: #8b8577;
    stroke-width: 1.2;
  }
  .lubber {
    fill: #e8b53a;
  }
</style>
