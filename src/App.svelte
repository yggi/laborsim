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

import { BEAM, PILLAR } from "./cockpit/cage.ts";
import { styleOf } from "./cockpit/makers.ts";
import { ACTIVE, type Condition, type Module, NOMINAL } from "./control/bus.ts";
import { makeClock } from "./core/clock.ts";
import { SNAPSHOT_HZ, type Snapshot } from "./core/snapshot.ts";
import { MAX_TRACK_SPEED } from "./core/spec.ts";
import { type Autonav, createAutonav } from "./modules/autonav.ts";
import { createTiltGuard } from "./modules/tiltguard.ts";
import { type CameraMode, createViewport } from "./render/scene.ts";
import { createWorld, initPhysics } from "./sim/world.ts";
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

/**
 * The pilot is a rack entry like any other, and can be reordered like one.
 *
 * It is also **the chassis component**: it brings the dashboard, the cage and
 * the glass, and it costs nothing, which is why it has no cell on the dash. You
 * do not need a lamp to tell you the levers are fitted
 * (`docs/design/components.md`).
 */
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
  // Hands on the levers is active; hands off is nominal. It never warns —
  // KIBA does not believe the operator is a fault condition.
  condition: (): Condition => (leverL !== 0 || leverR !== 0 ? ACTIVE : NOMINAL),
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

/** Measured off the dash, so levers and toasts sit clear of a panel whose
 *  height changes as components are fitted and cells appear. */
let dashHeight = $state(96);

let setViewMode: (m: CameraMode) => void = () => {};
let recentreView: () => void = () => {};

/** Dropping your eyes to the cabinet is turning your head: the view comes back
 *  to forward with it, rather than being left over your shoulder. */
function toggleRack() {
  rackOpen = !rackOpen;
  recentreView();
}

/**
 * A notice in a **manufacturer's** voice.
 *
 * L.A.B.O.R. certifies and bills, and the damage ledger speaks in its register.
 * A manufacturer sells and warns, and this is the first channel where one speaks
 * for itself. Keeping them visually distinct matters: a warranty notice is not
 * a verdict, and the player has to be able to tell whose opinion they are
 * reading (`docs/design/training-frame.md`).
 */
interface Notice {
  readonly id: number;
  readonly maker: string;
  readonly head: string;
  readonly body: string;
}
let notices = $state<Notice[]>([]);
let noticeId = 0;
/** How long a manufacturer gets to lecture you before it fades, ms. */
const NOTICE_LINGER = 8000;

function notify(maker: string, head: string, body: string) {
  const id = noticeId++;
  notices = [...notices, { id, maker, head, body }];
  setTimeout(() => {
    notices = notices.filter((n) => n.id !== id);
  }, NOTICE_LINGER);
}

/**
 * Toggle a component from its dashboard cell.
 *
 * Popping the hood: switching off **safety** kit is a deliberate act, so the
 * maker says so and the run report will remember. The guard against firing this
 * on an emergency stop is the `estop` check — an E-stop disables every module in
 * the rack, and nobody's warranty is void because you hit the big red button.
 */
function toggleModule(id: string) {
  const mod = rack.find((m) => m.id === id);
  if (!mod) return;
  const bypassing = mod.enabled && mod.safety === true && !estop;
  mod.enabled = !mod.enabled;
  if (bypassing) {
    const [head, body] = styleOf(mod.maker).voice.warranty;
    notify(mod.maker, head, body);
  }
  rackVersion++;
}

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
function setEstop(next: boolean) {
  if (next === estop) return;
  estop = next;
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

/**
 * The stop is also the way out of the exercise.
 *
 * There is no menu button, because a training rig does not have one: you stop
 * the machine, and *then* somebody comes and talks to you about it. So the
 * mushroom latches the drive dead and opens the folder in the same press, and
 * RESUME is what twists it back out — the same gesture in reverse, and the only
 * way to release it, which is exactly the ceremony a real stop demands.
 *
 * Pressing it again while the folder is open does nothing new: the stop is
 * already in, and a latched stop is not a toggle.
 */
function hitEstop() {
  setEstop(true);
  report = true;
}

/** Close the folder and hand the machine back. Twists the stop out if the stop
 *  is what opened it; a folder opened by a citizen leaves the drive as it was. */
function resumeRun() {
  report = false;
  setEstop(false);
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

/**
 * "Keep your eyes on the road", in the chassis maker's own words.
 *
 * The cage is KIBA's structure, so the nag is KIBA's voice — and it is the
 * first thing to consume `voice.tips`, which has been populated for all three
 * makers and read by nothing (`docs/design/components.md`).
 *
 * It fires when a long look comes back to centre, and then not again for a
 * while: a reminder you get every time you glance is one you learn to ignore,
 * and the point is the opposite of that.
 */
const NAG_AFTER = 0.6;
const NAG_COOLDOWN_MS = 45_000;
let lookedAway = false;
/** Not `0`: a wall clock a minute into the session is already past any
 *  cooldown measured from zero, and the *first* nag is the one that teaches
 *  you the view comes back on its own. It was silent for 45 s once. */
let lastNag = Number.NEGATIVE_INFINITY;
let tipIndex = 0;

function mindTheRoad(offsetX: number) {
  const away = Math.abs(offsetX) > innerWidth * NAG_AFTER;
  if (away) {
    lookedAway = true;
    return;
  }
  if (!lookedAway || Math.abs(offsetX) > 24) return;
  lookedAway = false;
  const now = performance.now();
  if (now - lastNag < NAG_COOLDOWN_MS) return;
  lastNag = now;
  const { wordmark, voice } = styleOf(pilot.maker);
  const tip = voice.tips[tipIndex % voice.tips.length];
  tipIndex++;
  if (tip) notify(pilot.maker, wordmark, tip);
}

/** Pod placements on the glass — draggable, and remembered per session. They
 *  start down the right, clear of the camera control at the very top.
 *
 *  ATT-0 is no longer among them: heading and attitude moved to the dash, so a
 *  bare chassis now starts with **clear glass** and the first component you fit
 *  is the first view you lose. */
/** The widest instrument currently fitted, measured in the browser. It only
 *  decides how the first frame looks: an arm settles a pod that does not fit. */
const POD_W = 124;
const rightX = (typeof window === "undefined" ? 390 : innerWidth) - PILLAR - POD_W;
let navPos = $state({ x: rightX, y: BEAM + 24 });
let tiltPos = $state({ x: rightX, y: BEAM + 198 });

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
    recentreView = viewport.recentre;

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
      // Eyes down at the cabinet is a posture, not a camera mode: while the
      // rack is open you cannot look around, the same way you cannot reach the
      // levers. The strip of windscreen shows you what is ahead and nothing
      // else — which is the whole cost of reading while the machine is moving.
      if (!rackOpen) viewport.look(e.clientX - prev.x, e.clientY - prev.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    // `:root`, not the shell: the sweep is written imperatively every frame and
    // the shell's `style` attribute belongs to Svelte, which would overwrite it
    // the next time the dash changes height.
    const root = document.documentElement;

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

      // The cab sweeps with the head. **One DOM write a frame, on one element**,
      // and the compositor moves the cage, the pods, the levers and the dash
      // between them — per-instrument reactivity at 60 Hz is the shape
      // architecture rule 3 exists to prevent (`docs/design/components.md`).
      const head = viewport.head();
      root.style.setProperty("--look-x", `${head.x}px`);
      root.style.setProperty("--look-y", `${head.y}px`);
      mindTheRoad(head.x);
    };
    frame = requestAnimationFrame(tick);

    cleanup = () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      root.style.removeProperty("--look-x");
      root.style.removeProperty("--look-y");
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

<!-- `display: contents`, so it lays nothing out — it exists to publish the
     measured dash height to everything that has to sit clear of it. -->
<div
  class="shell"
  style="--dash-h: {dashHeight}px; --cage-pillar: {PILLAR}px; --cage-beam: {BEAM}px"
>
  <!-- Looking down at the rack slides the whole viewport up: a strip of glass
       stays visible at the top, and the machine keeps running while you read. -->
  <div class="viewport" class:down={rackOpen}>
    <canvas bind:this={canvas}></canvas>
    <!-- The cage. Not a vignette and not a windscreen: a welded frame you are
         sitting inside, with pillars at the corners of your vision and a header
         beam overhead. It is the cheapest way to make the glass read as an
         *opening* rather than as the edge of a screen — and it is the chassis
         maker's structure, so it belongs to KIBA the way the dash does. -->
    {#if mode === "cab"}
      <div class="cage" aria-hidden="true">
        <div class="beam"></div>
        <div class="pillar left"></div>
        <div class="pillar right"></div>
        <div class="gusset left"></div>
        <div class="gusset right"></div>
      </div>
    {/if}
    <div class="cabframe" class:cab={mode === "cab"}></div>
  </div>

  {#if showDebug}
    <Telemetry snapshot={latest} showChain={!rackOpen} />
  {/if}

  <!-- The live voice: the rig narrating as it happens, in the same register as
       the end-of-run report. Stacks, then fades; a citizen latches. Manufacturer
       notices ride the same channel in their own colours — a warranty notice is
       not a verdict, and you must be able to tell whose opinion you are reading. -->
  {#if !rackOpen}
    <Toasts snapshot={latest} {notices} />
  {/if}

  <!-- The levers go with the glass. Looking down at the rack puts your hands in
       the cabinet, not on the controls — the same bargain as the chase view,
       made with a different part of the body. The bus keeps carrying whatever
       they were last set to and the machine keeps doing it; you simply cannot
       reach them while you are reading (docs/design/cockpit.md). -->
  {#if mode === "cab" && !rackOpen}
    <div class="levers left">
      <Lever label="L TRACK" value={leverL} onchange={(v) => (leverL = v)} />
    </div>
    <div class="levers right">
      <Lever label="R TRACK" value={leverR} onchange={(v) => (leverR = v)} />
    </div>
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
    Fitted pods, draggable on the glass by their titlebars (L-008). Each one is a
    piece of view you gave up; the budget that prices that is L-025, and this is
    the pile it will price. They must stay wholly on the glass and clear of each
    other — the Draggable refuses a drop that breaks either rule.

    A pod is optional and its maker decides whether one exists at all. NAV-1 is a
    capability component and pays in glass; TILT-GUARD is a safety component and
    pays in capability instead, so its gauges are here by choice rather than as
    the price of fitting it.
  -->
  {#if mode === "cab" && !rackOpen}
    {#if nav}
      <Draggable
        title="NAV-1"
        bottomKeepOut={dashHeight + 12}
        bind:x={navPos.x}
        bind:y={navPos.y}
      >
        <NavRadar snapshot={latest} waypoints={route} onselect={(i) => nav?.setTarget(i)} />
      </Draggable>
    {/if}
    {#if fitted("TILT")}
      <Draggable
        title="TILT-GUARD"
        bottomKeepOut={dashHeight + 12}
        bind:x={tiltPos.x}
        bind:y={tiltPos.y}
      >
        <TiltGauges snapshot={latest} />
      </Draggable>
    {/if}
  {/if}

  <!--
    The deck: the dash and the rack as one physical object, because they are one.
    The dash is the seam — the only thing visible in both postures — so it does
    not fade out and back in, it *travels*: the bottom of your view when you are
    driving, the top of it when you have dropped your eyes to the cabinet.

    Present in the cab; in chase you are outside the machine and there is nothing
    to look down at.
  -->
  {#if mode === "cab"}
    <div class="deck" class:up={rackOpen}>
      <DashPanel
        snapshot={latest}
        {rackOpen}
        estopped={estop}
        bind:height={dashHeight}
        onOpenRack={toggleRack}
        onEstop={hitEstop}
        onToggleModule={toggleModule}
      />
      {#if rackOpen}
        {#key rackVersion}
          <Rack
            modules={rack}
            snapshot={latest}
            onchange={() => rackVersion++}
            debug={showDebug}
          />
        {/key}
      {/if}
    </div>
  {/if}

  {#if report}
    <RunReport
      snapshot={latest}
      estopped={estop}
      onReset={resetSim}
      onResume={resumeRun}
    />
  {/if}
</div>

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
    transform: translateY(-74dvh);
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  /* -- the cage --------------------------------------------------------- */
  .cage {
    position: absolute;
    inset: 0;
    pointer-events: none;
    /* Above the canvas, below everything bolted to the cab. */
    z-index: 1;
    /* The cab is one rigid object and the head turns inside it, so the frame
       sweeps exactly as the pods and the dash do (L-050). `translate` rather
       than `transform`, so it composes with the skew on the pillars below and
       is never dragged into somebody else's transition. */
    translate: var(--look-x, 0px) var(--look-y, 0px);
  }
  /* Painted steel, lit from above-left like every other surface in here. */
  .cage .beam,
  .cage .pillar {
    position: absolute;
    background:
      linear-gradient(160deg, rgba(255, 255, 255, 0.2), transparent 38%),
      linear-gradient(180deg, #4c5356 0%, #333a3d 55%, #1e2427 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 4px 14px rgba(0, 0, 0, 0.7);
  }
  /* Bolt heads along the pillars, at a spacing you would actually weld to. */
  .cage .pillar::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 50% 50%, #6a7375 0 1.6px, transparent 2px);
    background-repeat: repeat-y;
    background-position: 50% 34px;
    background-size: 100% 58px;
    opacity: 0.75;
  }
  /* The header beam. Low enough to be present, not so low it is a letterbox. */
  .cage .beam {
    left: 0;
    right: 0;
    top: 0;
    /* One fact, one place: the frame you can see and the frame a pod's arm is
       measured against are the same numbers (`src/cockpit/cage.ts`). */
    height: var(--cage-beam);
    border-bottom: 1px solid #0a0d0e;
  }
  /* The pillars lean in toward the roof, the way a cab's actually do. */
  .cage .pillar {
    top: 0;
    bottom: 0;
    width: var(--cage-pillar);
    border-right: 1px solid #0a0d0e;
  }
  .cage .pillar.left {
    left: 0;
    transform-origin: bottom left;
    transform: skewX(3deg);
  }
  .cage .pillar.right {
    right: 0;
    border-right: none;
    border-left: 1px solid #0a0d0e;
    transform-origin: bottom right;
    transform: skewX(-3deg);
  }
  /* Welded gussets where the pillar meets the beam. */
  .cage .gusset {
    position: absolute;
    top: var(--cage-beam);
    width: 30px;
    height: 30px;
    background: linear-gradient(160deg, #262b2e, #151a1d);
  }
  .cage .gusset.left {
    left: 15px;
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }
  .cage .gusset.right {
    right: 15px;
    clip-path: polygon(0 0, 100% 0, 100% 100%);
  }

  /* The viewport is a window, not a screen. */
  .cabframe {
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow:
      inset 0 0 0 6px #0d1012,
      inset 0 0 120px rgba(0, 0, 0, 0.5);
  }
  /* Inside the cab it is darker at the edges, because you are inside a box. */
  /* Lighter than it was: the cage does the framing now, and two things
     darkening the same edges read as fog rather than as structure. */
  .cabframe.cab {
    box-shadow:
      inset 0 0 0 6px #0d1012,
      inset 0 0 120px rgba(0, 0, 0, 0.55);
  }

  /* Lays nothing out; it only publishes `--dash-h` to everything that has to
     sit clear of a panel whose height changes as components are fitted. */
  .shell {
    display: contents;
  }

  /* The dash and the rack as one object, anchored to the top of the glass and
     translated down out of the way. Closed, only the dash shows, at the bottom.
     Open, the whole deck rides up: the dash lands under the strip of windscreen
     and the rack fills what is left. The height changes with it so the rack
     stops at the bottom of the screen rather than running off it. */
  .deck {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    /* **dvh, never vh.** `100vh` is the *large* viewport — the height the page
       would have with the browser chrome hidden — so on a real phone this
       translated the deck a URL bar too far down and put the alarm row, the
       strip and the latch below the glass. `dvh` tracks what is actually
       visible. Caught on a device; no desktop viewport reproduces it. */
    height: 100dvh;
    z-index: 2;
    display: flex;
    flex-direction: column;
    transform: translateY(calc(100dvh - var(--dash-h)));
    transition: transform 0.28s ease;
    /* The deck travels between postures on `transform`, with a transition. The
       sweep is a *separate* property on purpose: a value rewritten every frame
       must never be fed through a 0.28s ease, or the dash lags behind the cage
       it is welded to. */
    translate: var(--look-x, 0px) var(--look-y, 0px);
  }
  .deck.up {
    height: 74dvh;
    transform: translateY(26dvh);
  }
  @media (prefers-reduced-motion: reduce) {
    .deck {
      transition: none;
    }
  }

  /* Bottom corners, because that is where thumbs are — but above the dash,
     which owns the very bottom of the glass. */
  .levers {
    position: fixed;
    bottom: calc(var(--dash-h) + 14px);
    z-index: 3;
    /* Bolted to the cab like everything else: look away and your hands go out
       of shot. You cannot find a touchscreen lever by feel, which is the cost
       of a glance and the reason the view comes back on its own. */
    translate: var(--look-x, 0px) var(--look-y, 0px);
  }
  .levers.left {
    left: 14px;
  }
  .levers.right {
    right: 14px;
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
