<script lang="ts">
/**
 * The application shell. Svelte owns the DOM; a plain module owns the
 * renderer and the loop (architecture rule 3). The only thing crossing from
 * sim to UI is a snapshot, and it crosses at SNAPSHOT_HZ, not 60.
 *
 * That second clause was aspirational for a long time — the loop was a 155-line
 * effect in the middle of this file. It is `platform/run.ts` now, and what is
 * left here is the cab: what is fitted, what the operator is doing, what the
 * panel says about it, and one effect that says what a run is made of. Two
 * objects cross the seam and nothing else does — `hands` going down
 * (`control/hands.ts`) and a snapshot coming back.
 *
 * Note how little the chase camera costs to implement: hiding the levers
 * *is* "hands off the wheel". The bus keeps carrying whatever the levers were
 * last set to, the machine keeps doing it, and the player simply cannot
 * reach the controls. No pause, no auto-stop, no special case in the sim.
 */

import { type Audio, createLiveAudio } from "./audio/engine.ts";
import { type Annunciation, chassisConditions, worst } from "./cockpit/annunciator.ts";
import { BEAM, PILLAR } from "./cockpit/cage.ts";
import DashPanel from "./cockpit/DashPanel.svelte";
import Glass from "./cockpit/Glass.svelte";
import Lever from "./cockpit/Lever.svelte";
import Rack from "./cockpit/Rack.svelte";
import {
  ACTIVE,
  CHASSIS,
  type Condition,
  type Module,
  NOMINAL,
} from "./control/bus.ts";
import { createControls } from "./control/controls.ts";
import { restingHands } from "./control/hands.ts";
import type { Snapshot } from "./core/snapshot.ts";
import { MAX_TRACK_SPEED } from "./core/spec.ts";
import { styleOf } from "./makers/houses.ts";
import { createAutonav } from "./modules/autonav.ts";
import { createTiltGuard } from "./modules/tiltguard.ts";
import { createRun, type Run } from "./platform/run.ts";
import type { CameraMode } from "./render/scene.ts";
import Briefing from "./ui/Briefing.svelte";
import Objective from "./ui/Objective.svelte";
import RunReport from "./ui/RunReport.svelte";
import Telemetry from "./ui/Telemetry.svelte";
import Toasts from "./ui/Toasts.svelte";
import { type Exercise, exerciseById, FIRST_EXERCISE } from "./world/exercises.ts";

let canvas: HTMLCanvasElement;
let latest = $state<Snapshot | undefined>(undefined);
let mode = $state<CameraMode>("cab");
let leverL = $state(0);
let leverR = $state(0);

/**
 * The one place the reactive cab and the render loop touch.
 *
 * The loop, the rack it steps and the pointer handlers all run outside any
 * reactive scope, and everything they need from up here crosses through this
 * object — written by exactly one effect, below, and read as plain fields by
 * everything downstream. Why one channel rather than five private routes, and
 * why these five values are the same kind of thing: `control/hands.ts`.
 */
const hands = restingHands();

/**
 * The pilot is a rack entry like any other, and can be reordered like one.
 *
 * It is also **the chassis component**: it brings the dashboard, the cage and
 * the glass, and it costs nothing, which is why it has no cell on the dash. You
 * do not need a lamp to tell you the levers are fitted
 * (`docs/design/cab/components.md`).
 */
const pilot: Module = {
  id: CHASSIS,
  label: "PILOT",
  maker: "KIBA WORKS",
  considers: "your two thumbs",
  verb: "SET",
  enabled: true,
  // Off `hands`, not off the runes: `runRack` calls this from inside
  // `world.step()`, inside the render loop, which is not a reactive scope.
  intent: () => ({
    left: hands.leverL * MAX_TRACK_SPEED,
    right: hands.leverR * MAX_TRACK_SPEED,
  }),
  // Hands on the levers is active; hands off is nominal. It never warns —
  // KIBA does not believe the operator is a fault condition.
  condition: (): Condition =>
    hands.leverL !== 0 || hands.leverR !== 0 ? ACTIVE : NOMINAL,
};

/**
 * The rack, mutated in place. `runRack` walks this array every step, so
 * reordering a slot takes effect on the next tick — which is exactly the live
 * rewiring that LOTO hot-patching (BOARD L-026) will one day price.
 */
const rack: Module[] = $state([pilot]);
let rackOpen = $state(false);
let rackVersion = $state(0);
/** Numeric telemetry is debug now that the meters carry the live reading. */
let showDebug = $state(true);

/** Bumping this re-racks the exercise: the sim effect rebuilds from scratch. */
let runId = $state(0);
let report = $state(false);
let estop = $state(false);
/** Enabled-state of each module before the E-stop, so release can restore it. */
let preEstop: Record<string, boolean> = {};
/** So the report auto-opens once when the exercise settles, not every frame. */
let outcomeSeen = false;

/**
 * Which exercise is on the rig, and whether anybody has sat down yet.
 *
 * The schedule is the first thing you see, and going back to it is the only way
 * to change what is being asked of you — an exercise is not a setting you flip
 * mid-drive. Reading `exercise` inside the sim effect is what makes choosing one
 * rebuild the world, exactly as RESET does.
 */
let exercise = $state<Exercise>(FIRST_EXERCISE);
/** What is selected on the schedule, which is not yet what is on the rig. */
let picked = $state(FIRST_EXERCISE.id);
let briefing = $state(true);

/** Measured off the dash, so levers and toasts sit clear of a panel whose
 *  height changes as components are fitted and cells appear. */
let dashHeight = $state(96);

/**
 * How worried the machine is, and how much of that the pilot has pressed.
 *
 * It lives here rather than on the dash because it now has **three** consumers:
 * the master lamp, the horn, and the beacon behind it (L-046). A machine whose
 * light and noise disagreed about its own condition would be two instruments
 * wired to two facts — so they are wired to one, and the panel is handed the
 * answer rather than working it out again.
 */
let acked = $state<Condition>(NOMINAL);
const lamps = $derived<readonly Annunciation[]>(chassisConditions(latest, estop));
const master = $derived(
  worst([
    ...lamps.map((a) => a.condition),
    ...(latest?.stages ?? []).map((s) => s.condition),
  ]),
);
// A condition clearing winds the acknowledgement back down, which re-arms both
// the flash and the horn for next time.
$effect(() => {
  if (master < acked) acked = master;
});

/** The horn is down. A cab state, not sim state — nothing can hear it yet. */
let honking = $state(false);

// Kept current here, where the master and the acknowledgement exist. This is
// the only writer; `hands` itself is declared at the top, because the pilot
// module reads it and the rack is built before any of this.
$effect(() => {
  hands.leverL = leverL;
  hands.leverR = leverR;
  hands.horn = honking;
  hands.seated = !briefing;
  hands.headDown = rackOpen;
  // Silent while the folder is open. Hitting the stop lights the master at
  // ALARM and opens the debrief in the same press, and a horn blaring under
  // somebody explaining what you just did is the rig talking over itself.
  hands.alarm = !report && master > acked ? master : NOMINAL;
});

/**
 * The rig's volume, not the machine's.
 *
 * A Labor's horn has no cut-out — that is what a horn is for — so this is not a
 * dash control and does not live on the panel. It is the training rig's own
 * knob, and it sits with the camera, which is the other control that belongs to
 * the room rather than to the machine (`docs/design/rig/training-frame.md`).
 */
let sound = $state(true);
let audio: Audio | undefined;

/**
 * The cab's own switchgear, for the few controls the machine does not record.
 *
 * Almost every switch is already audible without anyone asking: flipping a
 * component off changes its slot on the snapshot and the engine hears that by
 * itself, which is why a replay clicks in all the right places. What is left is
 * furniture — the cabinet latch, the acknowledgement, an instrument clamping
 * home — and it is voiced by the maker whose furniture it is, which is the
 * chassis maker for everything bolted to the cab.
 *
 * The camera and the volume are deliberately **silent**: they belong to the
 * training rig rather than to the machine, and the rig does not reach into the
 * cab and make noises (`docs/design/rig/training-frame.md`).
 */
const CAB_MAKER = "KIBA WORKS";
const click = (maker = CAB_MAKER) => audio?.panel("click", maker);
const clunk = (maker = CAB_MAKER) => audio?.panel("clunk", maker);

function toggleSound() {
  sound = !sound;
  audio?.setVolume(sound ? 1 : 0);
}

/**
 * The machine's voice, built once and kept across a RESET.
 *
 * Deliberately *not* inside the sim effect: an `AudioContext` is an expensive,
 * limited resource and re-racking the exercise is not a reason to throw one
 * away. It costs nothing to keep, because the engine reads the event channel
 * like everything else — a rewind is a new run to it, and nothing from the old
 * one is played.
 *
 * A browser will not let a page make noise before the player has touched it, so
 * the context starts suspended and the first gesture anywhere wakes it. That is
 * not a workaround to be embarrassed about: a rig that started talking before
 * you had touched anything would be the rig being rude.
 */
$effect(() => {
  const live = createLiveAudio();
  audio = live.audio;
  const wake = () => live.resume();
  addEventListener("pointerdown", wake);
  addEventListener("keydown", wake);
  return () => {
    removeEventListener("pointerdown", wake);
    removeEventListener("keydown", wake);
    audio = undefined;
    live.dispose();
  };
});

/**
 * The run in progress, or nothing while one is being built or torn down.
 *
 * This replaced a `let setViewMode = () => {}` that the sim effect reassigned
 * from inside its `.then()` — so a camera press before the wasm landed reached a
 * function that did nothing and said nothing. A handle that is *absent* until
 * there is a run says the same thing honestly, and `run.setView` remembers a
 * mode given during the boot rather than dropping it.
 */
let current: Run | undefined;
function toggleRack() {
  rackOpen = !rackOpen;
  // A cabinet door, not a switch: the latch is the heaviest thing on the panel
  // and it is the same sound going both ways. The view needs no telling to come
  // back — nothing is holding the glass, so it is already on its way.
  clunk();
}

/**
 * A notice in a **manufacturer's** voice.
 *
 * L.A.B.O.R. certifies and bills, and the damage ledger speaks in its register.
 * A manufacturer sells and warns, and this is the first channel where one speaks
 * for itself. Keeping them visually distinct matters: a warranty notice is not
 * a verdict, and the player has to be able to tell whose opinion they are
 * reading (`docs/design/rig/training-frame.md`).
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
 * The handles every part of every component commands through — the cells on the
 * dash, the pods on the glass, and whatever is fitted next. The shell owns them
 * because the shell owns the live rack; nothing downstream of here ever sees a
 * module (`src/control/controls.ts`).
 *
 * Popping the hood: switching off **safety** kit is a deliberate act, so the
 * maker says so and the run report will remember. The `estop` check is why it is
 * a hook rather than a rule in the channel — an E-stop disables every module in
 * the rack, and nobody's warranty is void because you hit the big red button.
 */
const controls = createControls(rack, {
  onBypass(mod) {
    if (estop) return;
    const [head, body] = styleOf(mod.maker).voice.warranty;
    notify(mod.maker, head, body);
  },
  onChange: () => rackVersion++,
});

function setView(next: CameraMode) {
  mode = next;
  current?.setView(mode);
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
  // The mushroom itself. Every module it disables clunks on its own, off the
  // snapshot, so hitting the stop is one deliberate clack followed by the whole
  // bank letting go — which is what a stop actually sounds like.
  clunk();
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
  outcomeSeen = false;
  acked = NOMINAL;
  runId++;
}

/** Back to the schedule, with the current exercise selected on it. */
function openSchedule() {
  picked = exercise.id;
  briefing = true;
  report = false;
}

/**
 * Sit down and start. Always a fresh run, even for the exercise already loaded:
 * BEGIN means begin, and handing somebody a half-driven site because they
 * happened to re-pick the same row would be the rig losing track of what a run
 * is.
 */
function begin(next: Exercise = exerciseById(picked) ?? FIRST_EXERCISE) {
  exercise = next;
  picked = next.id;
  briefing = false;
  resetSim();
}

/**
 * "Keep your eyes on the road", in the chassis maker's own words.
 *
 * The cage is KIBA's structure, so the nag is KIBA's voice — and it is the
 * first thing to consume `voice.tips`, which has been populated for all three
 * makers and read by nothing (`docs/design/cab/components.md`).
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

/**
 * Auto-open the debrief the moment the exercise settles — either way.
 *
 * It used to watch the damage list for a citizen, which was the only ending
 * there was. Now there are two and they are one fact on the snapshot, so this
 * watches the fact: a citizen still opens the folder, because a failed exercise
 * is exactly what a citizen produces, and finishing opens it too.
 *
 * **Opening the folder is not stopping the machine.** Nothing here touches the
 * drive: the levers keep carrying what they were carrying and the sim keeps
 * stepping behind the scrim, the same bargain the chase camera makes. A rig
 * that yanked control at the finish line would be a rig deciding when you are
 * done with the site (L-038).
 */
$effect(() => {
  if (latest && latest.goal.outcome !== "running" && !outcomeSeen) {
    outcomeSeen = true;
    report = true;
  }
});

$effect(() => {
  // Reading `runId` and `exercise` here is what makes RESET and choosing an
  // exercise rebuild the world: the effect re-runs, disposes the old run and
  // starts a new one. Everything below the seam is `platform/run.ts` — this is
  // now a statement of what a run is made of, and nothing about how it turns.
  runId;
  const run = createRun({
    canvas,
    exercise,
    rack,
    pilot,
    hands,
    // NAV needs the pose of the machine it is driving and TILT-GUARD its
    // attitude, so both are built once the world exists. Which kit that is stays
    // the cab's decision; the run only knows when there is something to fit it
    // to. Nothing keeps a reference to either: their instruments read the
    // snapshot and command through the same handles as everything else.
    fit: (world) => [
      createAutonav(
        world.waypoints,
        () => {
          const t = world.machine.body.translation();
          return { x: t.x, z: t.z, rotation: world.machine.body.rotation() };
        },
        { verb: "CAP", enabled: false },
      ),
      // TILT-GUARD sits at the bottom of the rail, below everything: it is the
      // last thing between the rack and the tracks, which is where a safety
      // component belongs and also where it is most annoying. Move it up and it
      // guards only what is above it — that is the ordering lesson, in one slot.
      // It ships **enabled**, because safety kit does. Finding out that the
      // thing stopping you halfway up a grade is your own machine being careful
      // — and then finding its LED — is the best first lesson rung 1 has.
      createTiltGuard(() => world.machine.body.rotation()),
    ],
    onSnapshot: (snapshot) => {
      latest = snapshot;
    },
    onLook: mindTheRoad,
    audio: () => audio,
  });
  // The camera survives the boot: `setView` before the wasm lands is remembered,
  // not dropped, so `mode` is the truth from the first frame either way.
  run.setView(mode);
  current = run;
  return () => {
    current = undefined;
    run.dispose();
  };
});
</script>

<!-- `display: contents`, so it lays nothing out — it exists to publish the
     measured dash height to everything that has to sit clear of it. -->
<div
  class="shell"
  style="--cab-dash-h: {dashHeight}px; --cab-pillar: {PILLAR}px; --cab-beam: {BEAM}px"
>
  <!-- Looking down at the rack slides the whole viewport up: a strip of glass
       stays visible at the top, and the machine keeps running while you read. -->
  <div class="viewport" class:down={rackOpen}>
    <canvas bind:this={canvas}></canvas>
    <!-- The cage. Not a vignette and not a windscreen: a welded frame you are
         sitting inside, with pillars at the corners of your vision and a header
         beam overhead. It is the cheapest way to make the glass read as an
         *opening* rather than as the edge of a screen — and it is the chassis
         maker's structure, so it belongs to KIBA the way the dash does.

         It **continues past the windscreen**, which is what the sweep made
         necessary: turn your head and the A-pillar leaves, and if there is
         nothing beyond it you are looking out of a cab that ends. So there is a
         roof over you, a door post out to each side, and a waist rail between
         them with side glass in it. None of it is visible looking forward; all
         of it is the difference between a frame and a cab. -->
    {#if mode === "cab"}
      <div class="cage" aria-hidden="true">
        <div class="roof"></div>
        <div class="wall left"></div>
        <div class="wall right"></div>
        <div class="beam"></div>
        <div class="soffit"></div>
        <div class="pillar left"></div>
        <div class="pillar right"></div>
        <div class="post left"></div>
        <div class="post right"></div>
        <div class="rail left"></div>
        <div class="rail right"></div>
        <div class="gusset left"></div>
        <div class="gusset right"></div>
      </div>
    {/if}
    <div class="cabframe" class:cab={mode === "cab"}></div>
  </div>

  {#if showDebug}
    <Telemetry snapshot={latest} showChain={!rackOpen} />
  {/if}

  <!-- The rig's strip: what was asked for and how far through it you are. It is
       the training system's overlay, not fitted kit, so it costs no glass and it
       does not sweep with the cab — and it is the one thing on screen that is
       still there in the chase view, because the exercise does not stop when you
       take your hands off. Out of sight in the cabinet, like the toasts. -->
  <Objective snapshot={latest} hidden={rackOpen} />

  <!-- The live voice: the rig narrating as it happens, in the same register as
       the end-of-run report. Stacks, then fades; a citizen latches. Manufacturer
       notices ride the same channel in their own colours — a warranty notice is
       not a verdict, and you must be able to tell whose opinion you are reading.

       Hidden while you are in the rack, never unmounted: a subscription belongs
       to a consumer's lifetime, and rebuilding this mid-run made it re-voice
       every line still on the channel the moment you closed the cabinet. -->
  <Toasts snapshot={latest} {notices} hidden={rackOpen} />

  <!-- The levers go with the glass. Looking down at the rack puts your hands in
       the cabinet, not on the controls — the same bargain as the chase view,
       made with a different part of the body. The bus keeps carrying whatever
       they were last set to and the machine keeps doing it; you simply cannot
       reach them while you are reading (docs/design/cab/cockpit.md). -->
  {#if mode === "cab" && !rackOpen}
    <div class="levers left">
      <Lever side="left" label="L TRACK" value={leverL} onchange={(v) => (leverL = v)} />
    </div>
    <div class="levers right">
      <Lever
        side="right"
        label="R TRACK"
        value={leverR}
        onchange={(v) => (leverR = v)}
      />
    </div>
  {/if}

  <!-- The rig's own controls, fixed top-right: the view you are given, and how
       loud the room is. Neither belongs to the machine — a Labor's horn has no
       cut-out and its cab has no camera — so neither is on the dash. In chase
       this is the only equipment you keep. -->
  <div class="camera item">
    {#each ["cab", "chase"] as const as option (option)}
      <button class:on={mode === option} onclick={() => setView(option)}>
        {option === "cab" ? "CAB" : "CHASE"}
      </button>
    {/each}
    <button class:on={sound} onclick={toggleSound} aria-pressed={sound}>
      {sound ? "SND" : "MUTE"}
    </button>
  </div>

  <!--
    Fitted pods, draggable on the glass by their titlebars (L-008). Each one is a
    piece of view you gave up; the budget that prices that is L-025, and the
    glass is the pile it will price.

    Which components have one is the registry's business, not the shell's — a
    pod is optional and its maker decides whether it exists at all. NAV-1 is a
    capability component and pays in glass; TILT-GUARD is a safety component and
    pays in capability instead, so its gauges are there by choice rather than as
    the price of fitting it. This file knows neither of those things.
  -->
  {#if mode === "cab" && !rackOpen}
    <Glass
      snapshot={latest}
      {controls}
      bottomKeepOut={dashHeight + 12}
      onSettle={(maker) => clunk(maker)}
    />
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
        {lamps}
        {master}
        {acked}
        bind:height={dashHeight}
        onOpenRack={toggleRack}
        onEstop={hitEstop}
        onAck={() => {
          acked = master;
          click();
        }}
        onHorn={(down) => (honking = down)}
        {controls}
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
      onSchedule={openSchedule}
      onNext={(id) => begin(exerciseById(id) ?? exercise)}
    />
  {/if}

  <!-- The schedule, over everything. It is the first screen of the session and
       the only way to change what is being asked of you; BEGIN is also the
       gesture that wakes the sound, which a browser requires and the fiction
       wanted anyway (`ui/Briefing.svelte`). -->
  {#if briefing}
    <Briefing
      selected={picked}
      onselect={(next) => {
        picked = next.id;
        click();
      }}
      onbegin={() => begin()}
      oncancel={runId > 0 ? () => (briefing = false) : undefined}
    />
  {/if}
</div>

<style>
  /* width/height must be explicit: an abs-positioned <canvas> with width:auto
     lays out at its INTRINSIC (drawing-buffer) size, not the inset box. This
     cost the concept-3 probe a debugging round — see
     docs/design/code/prototype-findings.md. */
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
    translate: var(--cab-look-x, 0px) var(--cab-look-y, 0px);
  }
  /* Painted steel, lit from above-left like every other surface in here. */
  .cage .beam,
  .cage .pillar,
  .cage .post,
  .cage .rail {
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
  /* The header beam. Low enough to be present, not so low it is a letterbox —
     and running the whole width of the cab, not just the width of the glass,
     because a beam that stopped at the A-pillar would leave the side windows
     with no top edge the moment you looked at them. */
  .cage .beam {
    left: calc(-1 * var(--cab-side));
    right: calc(-1 * var(--cab-side));
    top: 0;
    /* One fact, one place: the frame you can see and the frame a pod's arm is
       measured against are the same numbers (`src/cockpit/cage.ts`). */
    height: var(--cab-beam);
    border-bottom: 1px solid #0a0d0e;
  }
  /* The pillars lean in toward the roof, the way a cab's actually do. */
  .cage .pillar {
    top: 0;
    bottom: 0;
    width: var(--cab-pillar);
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
    top: var(--cab-beam);
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

  /* The roof, above the beam and off the top of the glass: you only ever see it
     by looking up, and before it existed looking up showed sky through a hole
     in the machine. Ribbed, because a pressed steel roof is. */
  .cage .roof {
    position: absolute;
    left: calc(-1 * var(--cab-side));
    right: calc(-1 * var(--cab-side));
    bottom: 100%;
    height: 60vh;
    background:
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.5) 0 2px, transparent 2px 46px),
      linear-gradient(0deg, #2c3336 0%, #1b2124 40%, #12171a 100%);
    box-shadow: inset 0 -10px 18px rgba(0, 0, 0, 0.6);
  }
  /* The underside of the beam. A box section has a face you can see from below,
     and without it the beam is a painted stripe. */
  .cage .soffit {
    position: absolute;
    left: calc(-1 * var(--cab-side));
    right: calc(-1 * var(--cab-side));
    top: var(--cab-beam);
    height: 5px;
    background: linear-gradient(180deg, #596164 0%, #2b3235 100%);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.55);
  }
  /* The door posts, one glass-width out to each side. They are the reason a
     look sideways lands on a cab rather than on nothing: chunkier than the
     A-pillars, unskewed, and carrying the same bolt line. */
  .cage .post {
    top: 0;
    bottom: 0;
    width: 34px;
  }
  .cage .post.left {
    left: calc(-1 * var(--cab-side));
  }
  .cage .post.right {
    right: calc(-1 * var(--cab-side));
  }
  .cage .post::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 50% 50%, #6a7375 0 1.8px, transparent 2.2px);
    background-repeat: repeat-y;
    background-position: 50% 40px;
    background-size: 100% 66px;
    opacity: 0.7;
  }
  /* The door skin, beyond the post. The head turns further than the cab is
     wide, and past the side glass there is no more glass — there is a door. It
     runs the whole height and further out than the neck goes, so a look over
     your shoulder lands on painted steel rather than on a hole where the
     machine should be. Pressed, with a swage line at the waist. */
  .cage .wall {
    position: absolute;
    top: calc(-1 * var(--cab-wall));
    bottom: calc(-1 * var(--cab-wall));
    width: var(--cab-wall);
    background:
      linear-gradient(180deg, transparent calc(62% - 2px), rgba(0, 0, 0, 0.55) 62%,
        rgba(255, 255, 255, 0.06) calc(62% + 2px), transparent calc(62% + 5px)),
      linear-gradient(90deg, #171c1f 0%, #262d30 12%, #1c2225 60%, #12171a 100%);
  }
  .cage .wall.left {
    right: calc(100% + var(--cab-side));
  }
  .cage .wall.right {
    left: calc(100% + var(--cab-side));
  }

  /* The waist rail under each side window — the bottom edge of the side glass,
     at about the height the dash meets it. */
  .cage .rail {
    top: 62%;
    height: 16px;
    width: var(--cab-side);
    border-top: 1px solid #0a0d0e;
  }
  .cage .rail.left {
    right: 100%;
  }
  .cage .rail.right {
    left: 100%;
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

  /* Lays nothing out; it only publishes `--cab-dash-h` to everything that has to
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
    transform: translateY(calc(100dvh - var(--cab-dash-h)));
    transition: transform 0.28s ease;
    /* The deck travels between postures on `transform`, with a transition. The
       sweep is a *separate* property on purpose: a value rewritten every frame
       must never be fed through a 0.28s ease, or the dash lags behind the cage
       it is welded to. */
    translate: var(--cab-look-x, 0px) var(--cab-look-y, 0px);
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
  /* The levers come *out of* the dash. Their feet run below its top edge and the
     deck paints over them, which is the whole trick: a stick that stopped
     cleanly above the panel is a stick resting on it. Hence the z-index below
     the deck's — and above the cage, which it is bolted in front of. */
  .levers {
    position: fixed;
    bottom: calc(var(--cab-dash-h) - 12px);
    z-index: 1;
    /* Bolted to the cab like everything else: look away and your hands go out
       of shot. You cannot find a touchscreen lever by feel, which is the cost
       of a glance and the reason the view comes back on its own. */
    translate: var(--cab-look-x, 0px) var(--cab-look-y, 0px);
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
