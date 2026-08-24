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

import type { Module } from "./control/bus.ts";
import { makeClock } from "./core/clock.ts";
import { SNAPSHOT_HZ, type Snapshot } from "./core/snapshot.ts";
import { MAX_TRACK_SPEED } from "./core/spec.ts";
import { type Autonav, createAutonav } from "./modules/autonav.ts";
import { createTiltGuard } from "./modules/tiltguard.ts";
import { type CameraMode, createViewport } from "./render/scene.ts";
import { createWorld, initPhysics } from "./sim/world.ts";
import Attitude from "./ui/Attitude.svelte";
import Ledger from "./ui/Ledger.svelte";
import Lever from "./ui/Lever.svelte";
import NavRadar from "./ui/NavRadar.svelte";
import Rack from "./ui/Rack.svelte";
import Telemetry from "./ui/Telemetry.svelte";
import TiltGauges from "./ui/TiltGauges.svelte";

let canvas: HTMLCanvasElement;
let latest = $state<Snapshot | undefined>(undefined);
let mode = $state<CameraMode>("cab");
let leverL = $state(0);
let leverR = $state(0);

/** The pilot is a rack entry like any other, and can be reordered like one. */
const pilot: Module = {
  id: "PILOT",
  label: "PILOT",
  maker: "KIBA WORKS",
  considers: "your two thumbs",
  verb: "SET",
  enabled: true,
  intent: () => ({
    left: leverL * MAX_TRACK_SPEED,
    right: leverR * MAX_TRACK_SPEED,
  }),
};

/**
 * The rack, mutated in place. `runRack` walks this array every step, so
 * reordering a slot takes effect on the next tick — which is exactly the live
 * rewiring that LOTO hot-patching (BOARD L-026) will one day price.
 */
const rack: Module[] = $state([pilot]);
let rackOpen = $state(false);
let nav = $state<Autonav | undefined>(undefined);
let route = $state<readonly { x: number; z: number }[]>([]);
let rackVersion = $state(0);
/** Numeric telemetry is debug now that the meters carry the live reading. */
let showDebug = $state(true);

let setViewMode: (m: CameraMode) => void = () => {};

function setView(next: CameraMode) {
  mode = next;
  setViewMode(mode);
}

/** Is a module with this id in the rack? Its instrument is fitted if so. */
const fitted = (id: string) => latest?.stages.some((s) => s.id === id) === true;

$effect(() => {
  let frame = 0;
  let disposed = false;
  let cleanup = () => {};

  void initPhysics().then(() => {
    if (disposed) return;

    const world = createWorld({ modules: rack });
    // NAV needs the pose of the machine it is driving, so it is built once the
    // world exists and pushed onto the rail below the pilot.
    route = world.waypoints;
    const autonav = createAutonav(
      world.waypoints,
      () => {
        const t = world.machine.body.translation();
        return { x: t.x, z: t.z, rotation: world.machine.body.rotation() };
      },
      { verb: "CAP", enabled: false },
    );
    nav = autonav;
    rack.push(autonav);

    // TILT-GUARD sits at the bottom of the rail, below everything: it is the
    // last thing between the rack and the tracks, which is where a safety
    // component belongs and also where it is most annoying. Move it up and it
    // guards only what is above it — that is the ordering lesson, in one slot.
    // It ships **enabled**, because safety kit does. Finding out that the thing
    // stopping you halfway up a grade is your own machine being careful — and
    // then finding its LED — is the best first lesson rung 1 has to offer.
    rack.push(createTiltGuard(() => world.machine.body.rotation()));
    const viewport = createViewport(
      canvas,
      world.terrain,
      world.props,
      world.waypoints,
    );
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

<!-- Looking down at the rack slides the whole viewport up: a strip of glass
     stays visible at the top, and the machine keeps running while you read. -->
<div class="viewport" class:down={rackOpen}>
  <canvas bind:this={canvas}></canvas>
  <div class="cabframe" class:cab={mode === "cab"}></div>
</div>

{#if showDebug}
  <Telemetry snapshot={latest} showChain={!rackOpen} />
{/if}

<!-- The rig keeps the account whether you are watching or not. It shows in
     the chase view too: that is the view you were in when it happened. -->
{#if !rackOpen}
  <Ledger snapshot={latest} />
{/if}

{#if mode === "cab"}
  <div class="levers left"><Lever label="L TRACK" value={leverL} onchange={(v) => (leverL = v)} /></div>
  <div class="levers right"><Lever label="R TRACK" value={leverR} onchange={(v) => (leverR = v)} /></div>
{:else}
  <div class="handsoff">HANDS OFF THE WHEEL &mdash; the machine is still running</div>
{/if}

<!--
  The instrument column. Everything fitted to the glass lives here, in the
  order it was fitted: the chassis head first, then whatever the rack brought
  with it. Each one is a piece of view you gave up (docs/design/cockpit.md) —
  the budget that prices that is L-025, and this is the pile it will price.

  The camera is an item in the same column, not a chrome button: choosing the
  view is a thing you do with the equipment, and in the chase view it is the
  only piece of equipment you still have.
-->
<div class="column">
  <div class="item camera">
    {#each ["cab", "chase"] as const as option (option)}
      <button class:on={mode === option} onclick={() => setView(option)}>
        {option === "cab" ? "CAB" : "CHASE"}
      </button>
    {/each}
  </div>

  {#if mode === "cab" && !rackOpen}
    <Attitude snapshot={latest} />
    <!-- NAV-1 ships this and it is mandatory: fit the component, fit its glass. -->
    {#if nav}
      <NavRadar snapshot={latest} waypoints={route} onselect={(i) => nav?.setTarget(i)} />
    {/if}
    {#if fitted("TILT")}
      <TiltGauges snapshot={latest} />
    {/if}
  {/if}
</div>

<!-- The cover over the control panel, at the seam it opens. Lifting it is the
     same bargain as the chase view: you get the rack, you lose the glass. -->
<button class="cover" class:open={rackOpen} onclick={() => (rackOpen = !rackOpen)}>
  <span class="chev">{rackOpen ? "▼" : "▲"}</span>
  {rackOpen ? "CLOSE COVER" : "CONTROL PANEL"}
</button>

{#if rackOpen}
  {#key rackVersion}
    <Rack modules={rack} snapshot={latest} onchange={() => rackVersion++} debug={showDebug} />
  {/key}
{/if}

<style>
  /* width/height must be explicit: an abs-positioned <canvas> with width:auto
     lays out at its INTRINSIC (drawing-buffer) size, not the inset box. This
     cost the concept-3 probe a debugging round — see
     docs/design/prototype-findings.md. */
  .viewport {
    position: fixed;
    inset: 0;
    transition: transform 0.28s ease;
  }
  .viewport.down {
    transform: translateY(-74vh);
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  /* The viewport is a window, not a screen. */
  .cabframe {
    position: absolute;
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
    /* Clear of the panel cover, which is where your hands would be. */
    bottom: calc(env(safe-area-inset-bottom) + 62px);
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

  /* The fitted glass, stacked down the right. */
  .column {
    position: fixed;
    right: 12px;
    top: calc(env(safe-area-inset-top) + 10px);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .item {
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
  }
  .camera {
    display: flex;
  }
  .camera button {
    font: 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.14em;
    color: #6d7a76;
    background: transparent;
    border: none;
    border-left: 1px solid #333a3b;
    padding: 8px 10px;
  }
  .camera button:first-child {
    border-left: none;
  }
  .camera button.on {
    color: #14171a;
    background: #6fe3c4;
  }

  /* Anchored on `bottom` in both states so it travels to the seam the rack
     opens at (top: 26vh → 74vh of cover travel) instead of jumping there. */
  .cover {
    position: fixed;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    width: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font: 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.14em;
    color: #c6d0cb;
    background: #23282a;
    border: 1px solid #0d1012;
    border-bottom-width: 3px;
    padding: 9px 12px;
    transition: bottom 0.28s ease;
    z-index: 1;
  }
  .cover.open {
    bottom: 74vh;
    color: #14171a;
    background: #e8b53a;
    border-color: #b8891f;
  }
  .cover .chev {
    color: #6d7a76;
  }
  .cover.open .chev {
    color: #14171a;
  }
</style>
