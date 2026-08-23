<script lang="ts">
/**
 * The application shell. Svelte owns the DOM; a plain module owns the
 * renderer and the loop (architecture rule 3). The only thing crossing from
 * sim to UI is a snapshot, and it crosses at SNAPSHOT_HZ, not 60.
 *
 * Note how little the chase camera costs to implement: hiding the levers
 * *is* "hands off the wheel". The bus keeps carrying whatever the levers were
 * last set to, the machine keeps doing it, and the player simply cannot
 * reach the controls. No pause, no auto-stop, no special case in the sim.
 */

import type { CommandSource } from "./control/bus.ts";
import { makeClock } from "./core/clock.ts";
import { SNAPSHOT_HZ, type Snapshot } from "./core/snapshot.ts";
import { MAX_TRACK_SPEED } from "./core/spec.ts";
import { type CameraMode, createViewport } from "./render/scene.ts";
import { createWorld, initPhysics } from "./sim/world.ts";
import Lever from "./ui/Lever.svelte";
import Telemetry from "./ui/Telemetry.svelte";

let canvas: HTMLCanvasElement;
let latest = $state<Snapshot | undefined>(undefined);
let mode = $state<CameraMode>("cab");
let leverL = $state(0);
let leverR = $state(0);

/** The pilot is a rack entry like any other. Today it is the only one. */
const pilot: CommandSource = {
  id: "PILOT",
  label: "PILOT",
  enabled: true,
  command: () => ({
    left: leverL * MAX_TRACK_SPEED,
    right: leverR * MAX_TRACK_SPEED,
  }),
};

let setViewMode: (m: CameraMode) => void = () => {};

function toggleView() {
  mode = mode === "cab" ? "chase" : "cab";
  setViewMode(mode);
}

$effect(() => {
  let frame = 0;
  let disposed = false;
  let cleanup = () => {};

  void initPhysics().then(() => {
    if (disposed) return;

    const world = createWorld({ sources: [pilot] });
    const viewport = createViewport(canvas, world.terrain);
    const clock = makeClock();
    setViewMode = viewport.setMode;

    const resize = () => viewport.resize(innerWidth, innerHeight);
    addEventListener("resize", resize);
    resize();

    const pointers = new Map<number, { x: number; y: number }>();
    const down = (e: PointerEvent) =>
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const up = (e: PointerEvent) => pointers.delete(e.pointerId);
    const drag = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      viewport.look(e.clientX - prev.x, e.clientY - prev.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    let last = performance.now();
    let sinceSnapshot = 0;
    let current = world.snapshot();

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = Math.min((now - last) / 1000, 0.25);
      last = now;

      const { steps } = clock.advance(elapsed);
      for (let i = 0; i < steps; i++) world.step();

      current = world.snapshot();
      // The UI reads a value at 10 Hz. It never watches the sim.
      sinceSnapshot += elapsed;
      if (sinceSnapshot >= 1 / SNAPSHOT_HZ) {
        sinceSnapshot = 0;
        latest = current;
      }
      viewport.render(current);
    };
    frame = requestAnimationFrame(tick);

    cleanup = () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      viewport.dispose();
      world.free();
    };
  });

  return () => {
    disposed = true;
    cleanup();
  };
});
</script>

<canvas bind:this={canvas}></canvas>

<div class="cabframe" class:cab={mode === "cab"}></div>

<Telemetry snapshot={latest} />

{#if mode === "cab"}
  <div class="levers left"><Lever label="L TRACK" value={leverL} onchange={(v) => (leverL = v)} /></div>
  <div class="levers right"><Lever label="R TRACK" value={leverR} onchange={(v) => (leverR = v)} /></div>
{:else}
  <div class="handsoff">HANDS OFF THE WHEEL &mdash; the machine is still running</div>
{/if}

<button class="view" onclick={toggleView}>{mode === "cab" ? "CHASE" : "CAB"}</button>

<style>
  /* width/height must be explicit: an abs-positioned <canvas> with width:auto
     lays out at its INTRINSIC (drawing-buffer) size, not the inset box. This
     cost the concept-3 probe a debugging round — see
     docs/design/prototype-findings.md. */
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  /* The viewport is a window, not a screen. */
  .cabframe {
    position: fixed;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 0 6px #0d1012, inset 0 0 120px rgba(0, 0, 0, 0.5);
  }
  .cabframe.cab {
    box-shadow: inset 0 0 0 6px #0d1012, inset 0 0 160px rgba(0, 0, 0, 0.72);
  }

  /* Bottom corners, because that is where thumbs are. */
  .levers {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom) + 16px);
  }
  .levers.left {
    left: 14px;
  }
  .levers.right {
    right: 14px;
  }

  .handsoff {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 26px);
    transform: translateX(-50%);
    font: 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.14em;
    color: #f0a830;
    border: 1px solid #f0a830;
    background: rgba(20, 23, 26, 0.85);
    padding: 7px 13px;
    white-space: nowrap;
    pointer-events: none;
  }

  .view {
    position: fixed;
    right: 14px;
    top: calc(env(safe-area-inset-top) + 12px);
    font: 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.14em;
    color: #c6d0cb;
    background: #23282a;
    border: 1px solid #0d1012;
    padding: 9px 12px;
  }
</style>
