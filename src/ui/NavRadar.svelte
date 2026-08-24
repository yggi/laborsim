<script lang="ts">
/**
 * NAV-1's instrument, and it is **mandatory**: fit the component, fit its
 * glass. Components ship instruments and the player places them
 * (docs/design/cockpit.md), so this is the first thing on the machine that
 * costs you view in exchange for capability.
 *
 * Deliberately **not a map**. No terrain, no contours, no obstacles — a
 * radar-style plot of the route and where you are on it, because that is
 * exactly what NAV-1 knows. An instrument that showed the ground would be
 * lying about the module behind it, and the honesty of that blindness is
 * the whole lesson of the module.
 *
 * Architecture rule 3: reads a snapshot and a static route, reports taps
 * upward. It never touches the sim.
 */
import { styleOf } from "../cockpit/makers.ts";
import type { Snapshot } from "../core/snapshot.ts";

/** TOWA built this, so it looks like TOWA built it. */
const house = styleOf("TOWA DENKI");

const {
  snapshot,
  waypoints,
  onselect,
}: {
  snapshot: Snapshot | undefined;
  waypoints: readonly { x: number; z: number }[];
  onselect: (index: number) => void;
} = $props();

/** Metres from edge to edge of the scope. */
const SPAN = 190;
const R = 62;

const nav = $derived(snapshot?.stages.find((s) => s.id === "NAV"));
const target = $derived(nav?.readout?.target ?? 0);
const live = $derived(nav?.enabled === true && nav?.idle === false);

/** World position → scope position, rotated so the machine's nose is up. */
function plot(x: number, z: number) {
  const pose = snapshot?.machine.pose;
  if (!pose) return { px: 0, py: 0, range: 0 };
  const [mx, , mz] = pose.position;
  const [qx, qy, qz, qw] = pose.rotation;
  // Machine forward in world, from the quaternion.
  const fx = 2 * (qx * qz + qw * qy);
  const fz = 1 - 2 * (qx * qx + qy * qy);
  const len = Math.hypot(fx, fz) || 1;
  const ux = fx / len;
  const uz = fz / len;
  const dx = x - mx;
  const dz = z - mz;
  // Rotate into machine frame: ahead is up the scope, right is +X on screen.
  const ahead = dx * ux + dz * uz;
  const side = dx * uz - dz * ux;
  const k = (R * 2) / SPAN;
  return { px: R + side * k, py: R - ahead * k, range: Math.hypot(dx, dz) };
}
</script>

<div
  class="scope"
  class:live
  style="--mfg-plate: {house.plate}; --mfg-bezel: {house.bezel}; --mfg-face: {house.face}; --mfg-accent: {house.accent}"
>
  <svg viewBox="0 0 {R * 2} {R * 2}" role="img" aria-label="navigation route">
    <circle class="ring" cx={R} cy={R} r={R - 1} />
    <circle class="ring faint" cx={R} cy={R} r={(R - 1) * 0.62} />
    <circle class="ring faint" cx={R} cy={R} r={(R - 1) * 0.31} />
    <line class="ring faint" x1={R} y1="2" x2={R} y2={R * 2 - 2} />
    <line class="ring faint" x1="2" y1={R} x2={R * 2 - 2} y2={R} />

    <!-- The route, in order. NAV-1 walks it as a ring. -->
    {#if waypoints.length > 1}
      <polygon
        class="route"
        points={waypoints.map((w) => { const p = plot(w.x, w.z); return `${p.px},${p.py}`; }).join(" ")}
      />
    {/if}

    {#each waypoints as pin, i (i)}
      {@const p = plot(pin.x, pin.z)}
      <g
        class="pin"
        class:active={i === target}
        role="button"
        tabindex="0"
        aria-label="waypoint {i + 1}"
        onclick={() => onselect(i)}
        onkeydown={(e) => e.key === "Enter" && onselect(i)}
      >
        <circle cx={p.px} cy={p.py} r="7" fill="transparent" />
        <rect x={p.px - 3} y={p.py - 3} width="6" height="6" />
        {#if i === target}
          <rect class="lock" x={p.px - 6} y={p.py - 6} width="12" height="12" />
        {/if}
      </g>
    {/each}

    <!-- Own ship, always centre, always nose-up. -->
    <polygon class="self" points="{R},{R - 5} {R + 4},{R + 4} {R - 4},{R + 4}" />
  </svg>
  <div class="foot">
    {#if waypoints.length}
      PIN {target + 1}/{waypoints.length} &middot; {plot(
        waypoints[target]?.x ?? 0,
        waypoints[target]?.z ?? 0,
      ).range.toFixed(0)} m
    {:else}
      NO ROUTE
    {/if}
  </div>
</div>

<style>
  /* Positioned by the instrument column, not by itself — an instrument is
     fitted into the glass it was given (docs/design/cockpit.md). */
  /* TOWA's pod: injection-moulded, rounded, faintly backlit, and with no
     visible fixings anywhere. It does not want you thinking about how it is
     attached — which is the opposite of everything else in this cab. */
  .scope {
    width: 116px;
    border-radius: 7px;
    overflow: hidden;
    background:
      radial-gradient(
        120% 80% at 50% 0%,
        color-mix(in srgb, var(--mfg-accent) 10%, transparent),
        transparent 70%
      ),
      var(--mfg-plate);
    border: 1px solid var(--mfg-ink);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      0 0 0 2px #0b1114,
      0 3px 7px rgba(0, 0, 0, 0.55);
    font: 8px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.1em;
    color: color-mix(in srgb, var(--mfg-face) 60%, transparent);
  }
  .foot {
    padding: 3px 6px;
    background: #23282a;
  }
  .foot {
    color: #c6d0cb;
    text-align: right;
  }
  svg {
    display: block;
    width: 116px;
    height: 116px;
  }
  .ring {
    fill: none;
    stroke: #3c4a46;
    stroke-width: 1;
  }
  .faint {
    stroke: #2a3431;
  }
  .route {
    fill: none;
    stroke: #3f5a52;
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .pin rect {
    fill: #6d7a76;
  }
  .pin.active rect {
    fill: #f0a830;
  }
  .pin .lock {
    fill: none;
    stroke: #f0a830;
    stroke-width: 1;
  }
  .self {
    fill: #6fe3c4;
  }
  /* Dark until the module is actually driving — an instrument for a bypassed
     component must not look live. */
  .scope:not(.live) svg {
    opacity: 0.4;
  }
</style>
