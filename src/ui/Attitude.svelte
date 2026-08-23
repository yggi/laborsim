<script lang="ts">
/**
 * ATT-0 — heading and attitude in one head, and the only instrument that
 * ships with the bare chassis.
 *
 * It is one instrument rather than two because the pilot reads it as one
 * question: *which way am I pointing, and how level am I?* A compass and an
 * inclinometer side by side would cost twice the glass to answer that, and
 * glass is the currency (docs/design/cockpit.md).
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

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

const R = 52;
const DEG = 180 / Math.PI;

/** Heading in degrees, clockwise from +Z, which the pins call north. */
const heading = $derived.by(() => {
  const q = snapshot?.machine.pose.rotation;
  if (!q) return 0;
  const [x, y, z, w] = q;
  const fx = 2 * (x * z + w * y);
  const fz = 1 - 2 * (x * x + y * y);
  const a = Math.atan2(fx, fz) * DEG;
  return (a + 360) % 360;
});

const pitch = $derived((snapshot?.machine.pitch ?? 0) * DEG);
const roll = $derived((snapshot?.machine.roll ?? 0) * DEG);

/** Metres of horizon travel per degree of pitch. Enough to see, not to read. */
const PITCH_SCALE = 1.15;

const CARDINALS = [
  { at: 0, text: "N" },
  { at: 90, text: "E" },
  { at: 180, text: "S" },
  { at: 270, text: "W" },
];

const whole = (n: number) => (n < 0 ? "−" : "+") + Math.abs(n).toFixed(0);
</script>

<div class="head">
  <div class="label">ATT-0 &middot; KIBA WORKS</div>
  <svg viewBox="0 0 {R * 2} {R * 2}" role="img" aria-label="heading and attitude">
    <defs>
      <clipPath id="att0-ball"><circle cx={R} cy={R} r={R * 0.62} /></clipPath>
    </defs>

    <!-- The attitude ball. The horizon stays level with the world and the
         machine tips around it, which is the way round that tells you what
         *you* are doing. -->
    <g clip-path="url(#att0-ball)">
      <rect class="sky" x="0" y="0" width={R * 2} height={R * 2} />
      <g transform="rotate({-roll} {R} {R}) translate(0 {pitch * PITCH_SCALE})">
        <rect class="ground" x={-R} y={R} width={R * 4} height={R * 3} />
        <line class="horizon" x1={-R} y1={R} x2={R * 3} y2={R} />
        {#each [-20, -10, 10, 20] as rung (rung)}
          <line
            class="rung"
            x1={R - 9}
            y1={R - rung * PITCH_SCALE}
            x2={R + 9}
            y2={R - rung * PITCH_SCALE}
          />
        {/each}
      </g>
      <!-- Fixed aircraft mark: this is the machine, and it does not move. -->
      <path class="mark" d="M{R - 13} {R} h8 M{R + 5} {R} h8 M{R} {R - 2} v4" />
    </g>
    <circle class="ring" cx={R} cy={R} r={R * 0.62} />

    <!-- The compass card turns; the lubber line at the top does not. -->
    <g transform="rotate({-heading} {R} {R})">
      {#each CARDINALS as c (c.text)}
        <text
          class="card"
          x={R}
          y={R - R * 0.78}
          transform="rotate({c.at} {R} {R})"
          text-anchor="middle"
          dominant-baseline="middle">{c.text}</text
        >
      {/each}
      {#each [45, 135, 225, 315] as tick (tick)}
        <line
          class="tick"
          x1={R}
          y1={R - R * 0.94}
          x2={R}
          y2={R - R * 0.84}
          transform="rotate({tick} {R} {R})"
        />
      {/each}
    </g>
    <path class="lubber" d="M{R - 4} 3 L{R + 4} 3 L{R} 10 Z" />
    <circle class="ring outer" cx={R} cy={R} r={R - 1} />
  </svg>
  <div class="foot">
    <span>HDG {heading.toFixed(0).padStart(3, "0")}</span>
    <span>P{whole(pitch)} R{whole(roll)}</span>
  </div>
</div>

<style>
  .head {
    width: 116px;
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
    font: 8px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.1em;
    color: #6d7a76;
  }
  .label {
    padding: 3px 6px;
    background: #23282a;
  }
  .foot {
    display: flex;
    justify-content: space-between;
    padding: 3px 6px;
    background: #23282a;
    color: #c6d0cb;
  }
  svg {
    display: block;
    width: 116px;
    height: 116px;
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
    stroke: #3c4a46;
    stroke-width: 1;
  }
  .outer {
    stroke: #2a3431;
  }
  .card {
    fill: #c6d0cb;
    font-size: 9px;
    letter-spacing: 0;
  }
  .tick {
    stroke: #3c4a46;
    stroke-width: 1;
  }
  .lubber {
    fill: #6fe3c4;
  }
</style>
