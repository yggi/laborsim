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
import DashPanel from "./ui/DashPanel.svelte";
import Draggable from "./ui/Draggable.svelte";
import Lever from "./ui/Lever.svelte";
import NavRadar from "./ui/NavRadar.svelte";
import Rack from "./ui/Rack.svelte";
import RunReport from "./ui/RunReport.svelte";
import Telemetry from "./ui/Telemetry.svelte";
import TiltGauges from "./ui/TiltGauges.svelte";
import Toasts from "./ui/Toasts.svelte";

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

/** Bumping this re-racks the exercise: the sim effect rebuilds from scratch. */
let runId = $state(0);
let report = $state(false);
let estop = $state(false);
/** Enabled-state of each module before the E-stop, so release can restore it. */
let preEstop: Record<string, boolean> = {};
/** So the report auto-opens once on a citizen, not every frame. */
let citizenSeen = false;

let setViewMode: (m: CameraMode) => void = () => {};

function setView(next: CameraMode) {
  mode = next;
  setViewMode(mode);
}

/**
 * Emergency stop. Kills the drive by disabling every module — the terminal
 * falls to HALT whatever was driving — and parks the levers. Releasing restores
 * exactly the enable-state you had, because a safety control that quietly
 * rewired your rack would be its own hazard.
 */
function toggleEstop() {
  estop = !estop;
  if (estop) {
    preEstop = {};
    for (const mod of rack) {
      preEstop[mod.id] = mod.enabled;
      mod.enabled = false;
    }
    leverL = 0;
    leverR = 0;
  } else {
    for (const mod of rack) mod.enabled = preEstop[mod.id] ?? true;
  }
  rackVersion++;
}

/** The rig re-racks the exercise. Fresh world, fresh site, everything at rest. */
function resetSim() {
  report = false;
  estop = false;
  leverL = 0;
  leverR = 0;
  rackOpen = false;
  mode = "cab";
  citizenSeen = false;
  runId++;
}

/** Is a module with this id in the rack? Its instrument is fitted if so. */
const fitted = (id: string) => latest?.stages.some((s) => s.id === id) === true;

/** Instrument placements on the glass — draggable, and remembered per session.
 *  They start down the right, clear of the camera control at the very top. */
const rightX = typeof window === "undefined" ? 280 : innerWidth - 124;
let attPos = $state({ x: rightX, y: 50 });
let navPos = $state({ x: rightX, y: 224 });
let tiltPos = $state({ x: rightX, y: 398 });

// Auto-open the debrief the moment a citizen is involved: it is categorical
// failure, and the rig does not let that scroll past.
$effect(() => {
  if (latest?.damage.some((d) => d.category === "citizen asset") && !citizenSeen) {
    citizenSeen = true;
    report = true;
  }
});

$effect(() => {
  // Reading runId here makes RESET SIMULATOR rebuild the whole world: the effect
  // re-runs, cleaning up the old sim and building a new one.
  runId;
  let frame = 0;
  let disposed = false;
  let cleanup = () => {};

  void initPhysics().then(() => {
    if (disposed) return;

    // Re-racking must not duplicate modules: mutate the rack back to just the
    // pilot in place (its identity is held by the world we are about to build),
    // then re-add the components below.
    rack.splice(0, rack.length, pilot);

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

<!-- The live voice: the rig narrating as it happens, in the same register as
     the end-of-run report. Stacks, then fades; a citizen latches. -->
{#if !rackOpen}
  <Toasts snapshot={latest} />
{/if}

{#if mode === "cab"}
  <div class="levers left"><Lever label="L TRACK" value={leverL} onchange={(v) => (leverL = v)} /></div>
  <div class="levers right"><Lever label="R TRACK" value={leverR} onchange={(v) => (leverR = v)} /></div>
{:else}
  <div class="handsoff">HANDS OFF THE WHEEL &mdash; the machine is still running</div>
{/if}

<!-- The camera is a fixed control, top-right: choosing the view is a thing you
     do with the equipment, and in chase it is the only equipment you keep. -->
<div class="camera item">
  {#each ["cab", "chase"] as const as option (option)}
    <button class:on={mode === option} onclick={() => setView(option)}>
      {option === "cab" ? "CAB" : "CHASE"}
    </button>
  {/each}
</div>

<!--
  Fitted instruments, draggable on the glass by their titlebars (L-008). Each
  one is a piece of view you gave up; the budget that prices that is L-025, and
  this is the pile it will price. They must stay wholly on the glass and clear
  of each other — the Draggable refuses a drop that breaks either rule.
-->
{#if mode === "cab" && !rackOpen}
  <Draggable title="ATT-0" bind:x={attPos.x} bind:y={attPos.y}>
    <Attitude snapshot={latest} />
  </Draggable>
  <!-- NAV-1 ships this and it is mandatory: fit the component, fit its glass. -->
  {#if nav}
    <Draggable title="NAV-1" bind:x={navPos.x} bind:y={navPos.y}>
      <NavRadar snapshot={latest} waypoints={route} onselect={(i) => nav?.setTarget(i)} />
    </Draggable>
  {/if}
  {#if fitted("TILT")}
    <Draggable title="TILT-GUARD" bind:x={tiltPos.x} bind:y={tiltPos.y}>
      <TiltGauges snapshot={latest} />
    </Draggable>
  {/if}
{/if}

<!-- The dash: the machine's live status panel and the closed face of the rack.
     Its latch opens the rack; its E-stop kills the drive; its master alarm
     opens the debrief. Present in the cab; in chase you are outside it. -->
{#if mode === "cab"}
  <DashPanel
    snapshot={latest}
    {rackOpen}
    estopped={estop}
    onOpenRack={() => (rackOpen = !rackOpen)}
    onEstop={toggleEstop}
    onReport={() => (report = true)}
  />
{/if}

{#if rackOpen}
  {#key rackVersion}
    <Rack
      modules={rack}
      snapshot={latest}
      onchange={() => rackVersion++}
      onclose={() => (rackOpen = false)}
      debug={showDebug}
    />
  {/key}
{/if}

{#if report}
  <RunReport snapshot={latest} onReset={resetSim} onResume={() => (report = false)} />
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

  /* Bottom corners, because that is where thumbs are — but above the dash,
     which owns the very bottom of the glass. */
  .levers {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom) + 124px);
    z-index: 3;
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

  .item {
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
  }
  /* Fixed control, top-right, above the draggable instruments. */
  .camera {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 10px);
    right: 12px;
    z-index: 5;
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
</style>
