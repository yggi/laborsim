<script lang="ts">
/**
 * The application shell. Svelte owns the DOM; a plain module owns the
 * renderer and the loop (architecture rule 3). The only thing crossing from
 * sim to UI is a snapshot, and it crosses at SNAPSHOT_HZ, not 60.
 *
 * What is left in here is **the wiring and nothing else**: what is fitted, what
 * the operator is doing, and one effect that says what a run is made of. Every
 * concern that had state of its own is now a module beside this one — the alarm
 * and its acknowledgement, the stop, the maker's notices, the nag, the sound —
 * each a handful of lines that can be driven from a test without mounting a
 * component. It was 991 lines with six of them in the middle of it.
 *
 * Two objects cross the seam to the loop and nothing else does: `hands` going
 * down (`control/hands.ts`) and a snapshot coming back.
 */

import { fitRungOne } from "./build/rung-one.ts";
import { createAlarm } from "./cockpit/alarm.svelte.ts";
import { BEAM, PILLAR } from "./cockpit/cage.ts";
import DashPanel from "./cockpit/DashPanel.svelte";
import { createEstop } from "./cockpit/estop.svelte.ts";
import Glass from "./cockpit/Glass.svelte";
import Lever from "./cockpit/Lever.svelte";
import { createNag } from "./cockpit/nag.ts";
import { createNotices } from "./cockpit/notices.svelte.ts";
import Rack from "./cockpit/Rack.svelte";
import { type Module, NOMINAL } from "./control/bus.ts";
import { createControls } from "./control/controls.ts";
import { restingHands, type View } from "./control/hands.ts";
import type { Act } from "./control/trace.ts";
import type { Snapshot } from "./core/snapshot.ts";
import { styleOf } from "./makers/houses.ts";
import { createPilot } from "./modules/pilot.ts";
import { createRun } from "./platform/run.ts";
import { createSound } from "./platform/sound.svelte.ts";
import Briefing from "./ui/Briefing.svelte";
import Objective from "./ui/Objective.svelte";
import RunReport from "./ui/RunReport.svelte";
import { createSession } from "./ui/session.svelte.ts";
import Telemetry from "./ui/Telemetry.svelte";
import Toasts from "./ui/Toasts.svelte";
import { type Exercise, exerciseById } from "./world/exercises.ts";

let canvas: HTMLCanvasElement;
let latest = $state<Snapshot | undefined>(undefined);
let mode = $state<View>("cab");
let leverL = $state(0);
let leverR = $state(0);
/** The horn is down. A cab state, not sim state — nothing can hear it yet. */
let honking = $state(false);

/**
 * The one place the reactive cab and the render loop touch — written by exactly
 * one effect, below, and read as plain fields by everything downstream. Why one
 * channel rather than five private routes: `control/hands.ts`.
 */
const hands = restingHands();

/** The chassis component: the levers, and everything they arrive bolted to. */
const pilot = createPilot(hands);

/**
 * The rack, mutated in place. `runRack` walks this array every step, so
 * reordering a slot takes effect on the next tick — which is exactly the live
 * rewiring that LOTO hot-patching (BOARD L-026) will one day price.
 */
const rack: Module[] = $state([pilot]);
/**
 * Commands the cab has issued that no tick has taken yet.
 *
 * The third plain object that crosses to the loop, beside `hands` and `rack`,
 * and for the same reason as both: the handles that write to it are held by
 * cells and plates that outlive any one run, so it cannot belong to the run.
 * The run drains it, stamps each command with the tick that applies it, and
 * writes it down — which is how the ledger will one day say what was driving
 * (`control/trace.ts`).
 */
const queue: Act[] = [];
const issue = (act: Act) => queue.push(act);
/**
 * Where the pilot has put each pod, by component id.
 *
 * It lived inside `Glass.svelte`, which is mounted under
 * `mode === "cab" && !rackOpen` — so **every placement was destroyed by opening
 * the cabinet**, and the arms came back at their defaults, while the field's own
 * comment promised you would find your instrument where you left it. Up here it
 * outlives the glass, exactly as the rack and the hands do.
 */
const placed = $state<Record<string, { x: number; y: number }>>({});
/**
 * A slot moved, a verb cycled, a fuse pulled — redraw the cabinet.
 *
 * Declared out here rather than inside the run effect because that effect *is*
 * the statement of what a run is made of, and a `rackVersion++` in its body
 * reads a rune in a place where reading one means "rebuild the world when this
 * changes". It does not, in fact — the read is inside a callback the loop calls
 * later — but the scanner in `tests/architecture.test.ts` cannot know that, and
 * a rule that has to be reasoned about is a rule that gets broken.
 *
 * It is one bump per frame in which anything landed. The four call sites that
 * each used to bump it themselves — two cells, the plate and the E-stop — are
 * this one.
 */
const remountRack = () => rackVersion++;
let rackOpen = $state(false);
let rackVersion = $state(0);
/** Numeric telemetry is debug now that the meters carry the live reading. */
let showDebug = $state(true);

/** Measured off the dash, so levers and toasts sit clear of a panel whose
 *  height changes as components are fitted and cells appear. */
let dashHeight = $state(96);

/**
 * The six concerns that have state of their own, each in its own module, and
 * each stepped by hand from `tests/cab.test.ts`. What is left in this file is
 * which of them exist and what they are wired to.
 */
const session = createSession();
const board = createNotices();
const estop = createEstop(rack, issue);
const alarm = createAlarm(
  () => latest,
  () => estop.engaged,
);
const sound = createSound();
const nag = createNag(pilot.maker, board.notify);

// Three lifetimes the shell owns, because an `$effect` only exists inside a
// component: the sound's context, the acknowledgement winding back down, and
// the debrief opening itself when the exercise settles.
$effect(() => sound.open());
// The knob, and *only* the knob. Kept apart from the effect above because that
// one owns an `AudioContext` and this one depends on a rune.
$effect(() => sound.level());
$effect(() => alarm.settle());
$effect(() => session.settle(latest?.goal.outcome));

/** Everything bolted to the cab is voiced by the maker who bolted it there. */
const CAB_MAKER = "KIBA WORKS";
const click = (maker = CAB_MAKER) => sound.panel("click", maker);
const clunk = (maker = CAB_MAKER) => sound.panel("clunk", maker);

// The one writer of the seam. `hands` itself is declared above, because the
// pilot module reads it and the rack is built before any of this.
$effect(() => {
  hands.leverL = leverL;
  hands.leverR = leverR;
  hands.horn = honking;
  hands.seated = !session.briefing;
  hands.headDown = rackOpen;
  // The camera crosses here rather than through a method on the run, because
  // the run effect used to read it and that threw the world away on every CHASE
  // press (`control/hands.ts`).
  hands.view = mode;
  // Silent while the folder is open. Hitting the stop lights the master at
  // ALARM and opens the debrief in the same press, and a horn blaring under
  // somebody explaining what you just did is the rig talking over itself.
  hands.alarm = session.report ? NOMINAL : alarm.unacked;
});

function toggleRack() {
  rackOpen = !rackOpen;
  // A cabinet door, not a switch: the latch is the heaviest thing on the panel
  // and it is the same sound going both ways.
  clunk();
}

/**
 * The handles every part of every component commands through. The shell owns
 * them because the shell owns the live rack; nothing downstream of here ever
 * sees a module (`src/control/controls.ts`).
 *
 * Popping the hood is a deliberate act, so the maker says so — and the `estop`
 * check is why that is a hook rather than a rule in the channel: nobody's
 * warranty is void because you hit the big red button.
 */
const controls = createControls(rack, issue, {
  onBypass(mod) {
    if (estop.engaged) return;
    const [head, body] = styleOf(mod.maker).voice.warranty;
    board.notify(mod.maker, head, body);
  },
});

/**
 * The stop is also the way out of the exercise. There is no menu button, because
 * a training rig does not have one: you stop the machine, and *then* somebody
 * comes and talks to you about it. RESUME is the twist that puts it back.
 */
function hitEstop() {
  // One deliberate clack, then the whole bank letting go: every module the stop
  // disables clunks on its own, off the snapshot.
  clunk();
  estop.hit();
  parkLevers();
  session.openReport();
}

/** Close the folder and hand the machine back. Twists the stop out if the stop
 *  is what opened it; a folder opened by a citizen leaves the drive as it was. */
function resumeRun() {
  session.closeReport();
  estop.release();
}

const parkLevers = () => {
  leverL = 0;
  leverR = 0;
};

/** The cab, back to how you found it — the other half of starting an exercise.
 *  The rig says it begins again (`ui/session.svelte.ts`); this says what that
 *  does to the machine you are sitting in. */
function resetCab() {
  estop.clear();
  parkLevers();
  rackOpen = false;
  mode = "cab";
}

/** RESET: the rig re-racks the exercise and hands the cab back at rest. */
function resetSim() {
  session.reRack();
  resetCab();
}

/** BEGIN: the same, for an exercise you have just chosen off the schedule. */
function begin(next?: Exercise) {
  session.begin(next);
  resetCab();
}

$effect(() => {
  // Reading `runId` and `exercise` here is what makes RESET and choosing an
  // exercise rebuild the world: the effect re-runs, disposes the old run and
  // starts a new one. Everything below the seam is `platform/run.ts` — this is
  // now a statement of what a run is made of, and nothing about how it turns.
  session.runId;
  const run = createRun({
    canvas,
    exercise: session.exercise,
    rack,
    pilot,
    hands,
    queue,
    onRack: remountRack,
    // What is bolted on beyond the chassis, and *which* list that is stays the
    // cab's decision — `createRun` only knows when there is a world to fit it to
    // (`build/rung-one.ts`).
    fit: fitRungOne,
    onSnapshot: (snapshot) => {
      latest = snapshot;
    },
    onLook: (offsetX) => nag.look(offsetX, innerWidth),
    audio: sound.voice,
  });
  return () => run.dispose();
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
  <Toasts snapshot={latest} notices={board.list} hidden={rackOpen} />

  <!-- The levers go with the glass. Looking down at the rack puts your hands in
       the cabinet, not on the controls — the same bargain as the chase view,
       made with a different part of the body. The bus keeps carrying whatever
       they were last set to and the machine keeps doing it; you simply cannot
       reach them while you are reading (doc/design/cab/cockpit.md). -->
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
      <button class:on={mode === option} onclick={() => (mode = option)}>
        {option === "cab" ? "CAB" : "CHASE"}
      </button>
    {/each}
    <button class:on={sound.on} onclick={() => sound.toggle()} aria-pressed={sound.on}>
      {sound.on ? "SND" : "MUTE"}
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
      {placed}
      bottomKeepOut={dashHeight + 12}
      onSettle={(maker) => clunk(maker)}
      onplace={(id, x, y) => {
        placed[id] = { x, y };
        issue({ kind: "pod", id, x, y });
      }}
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
        estopped={estop.engaged}
        lamps={alarm.lamps}
        master={alarm.master}
        acked={alarm.acked}
        bind:height={dashHeight}
        onOpenRack={toggleRack}
        onEstop={hitEstop}
        onAck={() => {
          alarm.ack();
          // The one bit of the annunciator the operator creates: the lamps, the
          // master and the unacked condition are all derived from the snapshot,
          // so the *press* goes on the recording and the condition never does.
          issue({ kind: "ack" });
          click();
        }}
        onHorn={(down) => (honking = down)}
        {controls}
      />
      {#if rackOpen}
        {#key rackVersion}
          <Rack modules={rack} snapshot={latest} {controls} debug={showDebug} />
        {/key}
      {/if}
    </div>
  {/if}

  {#if session.report}
    <RunReport
      snapshot={latest}
      estopped={estop.engaged}
      onReset={resetSim}
      onResume={resumeRun}
      onSchedule={() => session.schedule()}
      onNext={(id) => begin(exerciseById(id) ?? session.exercise)}
    />
  {/if}

  <!-- The schedule, over everything. It is the first screen of the session and
       the only way to change what is being asked of you; BEGIN is also the
       gesture that wakes the sound, which a browser requires and the fiction
       wanted anyway (`ui/Briefing.svelte`). -->
  {#if session.briefing}
    <Briefing
      selected={session.picked}
      onselect={(next) => {
        session.pick(next.id);
        click();
      }}
      onbegin={() => begin()}
      oncancel={session.runId > 0 ? () => session.dismiss() : undefined}
    />
  {/if}
</div>

<style>
  /* width/height must be explicit: an abs-positioned <canvas> with width:auto
     lays out at its INTRINSIC (drawing-buffer) size, not the inset box. This
     cost the concept-3 probe a debugging round — see
     doc/design/code/prototype-findings.md. */
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
