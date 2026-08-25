<script lang="ts">
/**
 * The machine's dash — the seam between the two postures, and a control panel
 * rather than a screen.
 *
 * It is the only thing visible whether you are looking out of the glass or down
 * at the rack, and it *travels* between them: the bottom of your view while you
 * drive, the top of it once you have dropped your eyes to the cabinet. That is
 * honest cab geometry — the dash sits between the windscreen and the rack.
 *
 * **The rules it is built to (2026-08-24):**
 *
 * - *No inline labelling.* Every control is named by a separate engraved plate
 *   bolted near it, never by text set inside or beside it. Text in a control is
 *   a website; a plate is a machine.
 * - *No horizontal split and no scrolling.* Things are bolted where they fit
 *   and the panel wraps, the way a real one does when somebody adds kit. The
 *   one fixed exemption is the latch, which is structural.
 * - *The lens is the state.* Colour and position, not words.
 *
 * **The master is the bridge** between the machine's own thresholds and the
 * components' conditions: anything that reaches WARN or ALARM, from the chassis
 * or from any fitted component, lights it. It is **push-to-acknowledge**, the
 * way an annunciator panel works — a new condition flashes, pressing makes it
 * steady, and it goes dark only when the condition actually clears. So
 * acknowledging is not dismissing, and the panel keeps telling you.
 *
 * There is **no status line**. A strip of words under the panel was the dash
 * reading the lamp out loud, and a lamp that needs a caption is a lamp that has
 * failed. What the strip used to say the master now says by colour and rhythm,
 * the tells beside the gauges say by pointing at the instrument that knows why,
 * and the sentence — which is a sentence, and belongs where sentences belong —
 * moved to the debrief.
 *
 * The E-STOP sits with the master, because they are the same conversation, and
 * it is also the way out: hitting it stops the machine *and* opens the folder.
 * That is one control for "I want out of this", which is the only thing a pilot
 * reaching for a mushroom button actually means.
 *
 * Every gauge reads a real simulated quantity. A gauge that lied about the
 * machine would break the inspectability pillar as surely as a hidden sim layer.
 *
 * Architecture rule 3: reads a snapshot, reports intent up. Never the sim.
 */

import { ALARM, type Condition, chassisOf, WARN } from "../control/bus.ts";
import type { Controls } from "../control/controls.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { styleOf } from "../makers/houses.ts";
import { type Annunciation, isAlarm, isWarning } from "./annunciator.ts";
import Meters from "./Meters.svelte";
import NavUnit from "./NavUnit.svelte";
import { cellFor } from "./parts.ts";

let {
  snapshot,
  rackOpen,
  estopped,
  lamps,
  master,
  acked,
  height = $bindable(0),
  onOpenRack,
  onEstop,
  onAck,
  onHorn,
  controls,
}: {
  snapshot: Snapshot | undefined;
  rackOpen: boolean;
  estopped: boolean;
  /**
   * The chassis's own conditions, and the worst thing happening anywhere.
   *
   * Both used to be computed here. They moved up to the shell when the horn
   * arrived, because the horn is the audible half of this lamp and a machine
   * whose light and noise disagreed about its own condition would be two
   * instruments wired to two facts. The lamp, the horn and — next — the beacon
   * all read one.
   */
  lamps: readonly Annunciation[];
  master: Condition;
  /** The worst condition the pilot has seen and pressed. Owned by the shell. */
  acked: Condition;
  /** Measured, so the levers and the toasts can sit clear of a panel that
   *  grows a row every time a component is fitted. */
  height?: number;
  onOpenRack: () => void;
  onEstop: () => void;
  onAck: () => void;
  /** Held, not toggled. A horn is a button you lean on. */
  onHorn: (down: boolean) => void;
  /** The one channel a part commands through. See `control/controls.ts`. */
  controls: (id: string) => Controls;
} = $props();

const stages = $derived(snapshot?.stages ?? []);

/** Mirrored so the button can look pressed. The horn itself is the shell's. */
let honking = $state(false);
function press(down: boolean) {
  if (down === honking) return;
  honking = down;
  onHorn(down);
}

/** The vehicle's manufacturer owns this panel. Read it off the chassis slot. */
const chassis = $derived(chassisOf(stages));
const house = $derived(styleOf(chassis?.maker ?? "KIBA WORKS"));

/**
 * The chassis's own conditions get no legend row of their own — a strip of
 * SLIP/GND/¥ lamps was the dash explaining itself in words, which is exactly
 * what a panel does not do. They feed the master, and the ones that *have* a
 * gauge light a tell beside it.
 */
const chassisLamps = $derived<readonly Annunciation[]>(lamps);
const overall = $derived(master);

/**
 * The tells — one small lamp beside the instrument that knows why — live on
 * the instrument housings themselves now, not on the dash. A single master
 * says *something is wrong* and says it once, which is right and useless on
 * its own, because the pilot's next question is always which instrument to
 * look at. The dash hands the conditions down; the housing decides where on
 * itself the lamp goes, which is a thing only the housing's maker knows.
 */

/**
 * Annunciator acknowledgement.
 *
 * `acked` is the worst condition the pilot has seen and pressed. Anything worse
 * than that is new, and new things flash. Pressing catches up to the present;
 * conditions clearing winds it back down, which re-arms the flash for next time.
 *
 * Nothing here silences the *lamp* — a steady lamp is still a lit lamp. What it
 * does silence is the horn, which is the whole bargain an annunciator panel
 * offers: you may stop the noise, you may not stop being told.
 */
const unacked = $derived(overall > acked);

/**
 * **One** annunciator, not two.
 *
 * Off, yellow, red — and the *rhythm* carries what a second lamp used to: fast
 * for an unacknowledged alarm, slow for an unacknowledged caution, steady once
 * you have pressed it. Two lamps meant two things could be lit at once saying
 * the same thing, which is a dashboard talking to itself.
 */
const alarmLit = $derived(isAlarm(overall) ? ALARM : isWarning(overall) ? WARN : 0);
const flash = $derived(
  !unacked || alarmLit === 0 ? undefined : alarmLit === ALARM ? "fast" : "slow",
);

/** Cells, in rack order. A component with no registered cell contributes none. */
const cells = $derived(
  stages
    .map((stage) => ({ stage, cell: cellFor(stage.id) }))
    .filter((entry) => entry.cell !== null),
);
</script>

<div class="dash mfg-sheet" class:up={rackOpen} bind:clientHeight={height}>
  <!-- Hazard trim along the top edge, the way a real panel is labelled. -->
  <div class="hazard mfg-hazard"></div>

  <!-- One flow. Groups are bolted where they fit and the panel wraps. -->
  <div class="panel">
    <!-- The machine's dataplate. Riveted, not screwed: it names the machine
         rather than a control, so it outlives everything bolted around it.

         The serial **is the world seed**. The rig stamps the machine and
         generates the site in the same breath, so the number riveted in front
         of the operator is the exercise they are about to be tested on — and
         two operators comparing serials are comparing worlds. -->
    <div class="mfg-dataplate plate">
        <svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
          <path d={house.mark} />
        </svg>
        <div class="fields">
          <b>{house.wordmark}</b>
          <span>TYPE 3A</span>
        <span class="sn">S/N 3A-{(snapshot?.seed ?? 0).toString(36).toUpperCase()}</span>
      </div>
    </div>

    <!-- What the machine is doing, in one housing (KIBA-NAV-UNIT). -->
    <NavUnit {snapshot} lamps={chassisLamps} />

    <!-- What it has done: hours over distance, one housing, deliberately not in
         the unit above. You steer by that one and you never steer by this one.
         No plate — the units are screened on the gauge's own face by whoever
         supplied it. -->
    <Meters {snapshot} />

    <!-- What the machine has to say, and the thing that stops it. Two controls,
         bolted together because they are the same conversation — the one group
         on this panel that stays a group, because a mushroom button you have to
         find twice is a mushroom button you find too late. -->
    <div class="masters">
      <div class="inst">
        <button
          class="master mfg-lamp"
          data-lit={alarmLit}
          data-flash={flash}
          onclick={onAck}
          aria-label="alarm, acknowledge"
          aria-pressed={!unacked}
        ></button>
        <span class="mfg-legend" data-danger="true">ALARM</span>
      </div>

      <div class="inst">
        <button
          class="estop"
          class:pressed={estopped}
          onclick={onEstop}
          aria-label="emergency stop"
          aria-pressed={estopped}
        >
          <span class="skirt"></span>
          <span class="cap"></span>
        </button>
        <span class="mfg-legend" data-danger="true">EMERGENCY STOP</span>
      </div>
    </div>

    <!-- The horn. Not in the masters group and never in it: that group is what
         the machine has to say about itself, and this is the one control on the
         panel aimed at somebody *outside* the cab. It is also the only control
         here whose entire output is sound.

         Held rather than toggled, because a horn is a button you lean on — so
         it takes pointer down and up rather than a click, and the keyboard gets
         the same behaviour rather than a shortcut that latches. -->
    <div class="inst">
      <button
        class="horn"
        class:down={honking}
        aria-label="horn"
        aria-pressed={honking}
        onpointerdown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          press(true);
        }}
        onpointerup={() => press(false)}
        onpointercancel={() => press(false)}
        onkeydown={(e) => (e.key === " " || e.key === "Enter") && press(true)}
        onkeyup={(e) => (e.key === " " || e.key === "Enter") && press(false)}
        onblur={() => press(false)}
      ></button>
      <span class="mfg-legend">HORN</span>
    </div>

    <!-- The fitted components, behind a seam: a gap wider than the one between
         any two of the machine's own parts, so you can see at a glance which is
         which. It used to be `margin-left: auto`, which made the seam *all* the
         slack — a third of the panel, empty, in landscape. A seam is a fixed
         thing on a real machine and the leftover steel is at the end of the
         row, which is also where the room for more kit is. -->
    <div class="fitted">
      {#each cells as entry (entry.stage.id)}
        {@const Cell = entry.cell}
        {#if Cell}
          <Cell
            stage={entry.stage}
            style={styleOf(entry.stage.maker)}
            controls={controls(entry.stage.id)}
          />
        {/if}
      {/each}
    </div>
  </div>

  <!-- The latch. It *is* the way into the rack, so it lives on the seam: the
       bottom edge of the dash, which is the top edge of the cabinet below. -->
  <button class="latch" class:open={rackOpen} onclick={onOpenRack} aria-label="open the rack">
    <!-- No word on it. It is a handle across the bottom edge of the panel, and
         finding out what a handle does is the whole of what a handle is. The
         accessible name still says, because a screen reader cannot pull it and
         see. -->
    <span class="grip"></span>
    <span class="latchmark" class:open={rackOpen}></span>
    <span class="grip"></span>
  </button>
</div>

<style>
  .dash {
    /* In flow inside the travelling deck (App.svelte). Not fixed: the whole
       point is that this object moves between the two postures. */
    flex: none;
    /* CAT-yellow sheet steel. `mfg-sheet` lays the light, the brush and the
       shaded lower edge over this base — the substrate owns how pressed steel
       behaves, this owns what colour it was painted. */
    --mfg-sheet-base: linear-gradient(180deg, #e6b52c 0%, #d8a521 42%, #b9871a 100%);
    border-top: 2px solid #7c5a10;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.25),
      0 -8px 22px rgba(0, 0, 0, 0.5);
    color: #2a2418;
    font: 8px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  /* Driving, the dash is the bottom-most thing on the glass, so it owns the
     home-indicator inset. Looking down, the rack does. */
  .dash:not(.up) {
    padding-bottom: env(safe-area-inset-bottom);
  }
  /* Looking down at the rack: the panel is overhead, so its shadow falls the
     other way and the hazard trim reads as the underside of a lip. */
  .dash.up {
    box-shadow:
      inset 0 -2px 0 rgba(0, 0, 0, 0.3),
      0 8px 22px rgba(0, 0, 0, 0.5);
  }
  .hazard {
    height: 5px;
  }

  /* One flow, wrapping. No columns, no scrolling: things are bolted where they
     fit, and a panel that has run out of room grows another row.

     **Every part is its own item in that flow**, and this is the fix for the
     thing that made the panel look sparse: the instruments used to be wrapped
     in a group, so 300 px of kit either fitted on a row or jumped to the next
     one *entire*, leaving a hole the width of everything in it. Nothing here
     needs to travel with anything else except the two masters, so nothing else
     does.

     **Bottom-aligned**, so every plate and every engraved legend across a row
     lands on one line and the controls go ragged above it — the stop standing
     taller than the lamp, HANSA's beacon taller again. That is what a row of
     mixed kit on one panel actually looks like, and it was already the rule
     *inside* each group before the groups went away. */
  .panel {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 7px 8px;
    padding: 7px 8px;
  }
  /* The masters keep their own box: they are one conversation and the stop has
     to be where the lamp is, every time, without looking for it. */
  .masters {
    flex: none;
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }
  /* Everything the machine did not come with, behind a seam. The extra margin
     is on top of the panel's own gap, so the join reads as a join at any width
     and whichever row the cells land on. */
  .fitted {
    flex: none;
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    margin-left: 12px;
  }
  /* A mounted thing and the plate that names it. */
  .inst {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  /* -- the nameplate ------------------------------------------------------ */
  /* The dataplate: the maker's mark stamped beside engraved fields. */
  .plate {
    flex: none;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 12px;
  }
  .mark {
    width: 15px;
    height: 15px;
    flex: none;
    fill: none;
    stroke: #2b2822;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  .fields {
    display: flex;
    flex-direction: column;
    font-size: 6px;
    line-height: 1.6;
    letter-spacing: 0.18em;
  }
  .fields b {
    font-size: 7px;
    letter-spacing: 0.14em;
  }
  .sn {
    color: #4c4840;
    letter-spacing: 0.12em;
  }

  /* -- the horn ----------------------------------------------------------- */
  /* A rubber dome on a steel collar. Deliberately not red and not a mushroom:
     it must not read as an emergency control, because leaning on it is a normal
     part of driving and hitting the stop by mistake is not. */
  .horn {
    width: 38px;
    height: 38px;
    padding: 0;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    background:
      radial-gradient(circle at 38% 30%, #6a7276 0 12%, transparent 55%),
      radial-gradient(circle at 50% 62%, #23282a, #14181a 70%);
    box-shadow:
      inset 0 -2px 3px rgba(0, 0, 0, 0.75),
      inset 0 2px 2px rgba(255, 255, 255, 0.14),
      0 0 0 3px var(--mfg-bezel, #0d1012),
      0 3px 5px rgba(0, 0, 0, 0.5);
    transition: transform 0.05s ease;
  }
  /* It goes *in*, and the highlight goes with it. Nothing else moves. */
  .horn.down {
    transform: translateY(2px) scale(0.97);
    box-shadow:
      inset 0 -1px 2px rgba(0, 0, 0, 0.8),
      inset 0 3px 6px rgba(0, 0, 0, 0.5),
      0 0 0 3px var(--mfg-bezel, #0d1012);
  }

  /* -- the masters -------------------------------------------------------- */
  .master {
    width: 30px;
    height: 30px;
    flex: none;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
  }
  .master:active {
    box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.65);
  }

  /* -- the stop ----------------------------------------------------------- */
  .estop {
    position: relative;
    width: 46px;
    height: 46px;
    flex: none;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  /* The yellow skirt it is mounted through, and the shadow the cap casts into
     it — which is what actually sells the height of the mushroom. */
  .skirt {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 42%, #f2c94c 58%, #a8811a 100%);
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.35),
      inset 0 3px 6px rgba(0, 0, 0, 0.45);
  }
  .cap {
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    /* A domed mushroom: highlight up and left, the body falling away to a dark
       rim, and a real drop shadow because it stands proud of the skirt. */
    background:
      radial-gradient(circle at 38% 28%, rgba(255, 255, 255, 0.75), transparent 44%),
      radial-gradient(circle at 50% 42%, #ef4a32 30%, #c0210e 72%, #7d1206 100%);
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.55),
      inset 0 -3px 6px rgba(0, 0, 0, 0.4);
    transform: translateY(-2px);
    transition:
      transform 0.09s cubic-bezier(0.2, 0.85, 0.3, 1),
      box-shadow 0.09s ease,
      background 0.09s ease;
  }
  .estop:active .cap {
    transform: translateY(0);
  }
  /* Latched in. A real mushroom stays down until it is twisted out, so the cap
     sits flush, loses its highlight, and the skirt shadow closes over it. */
  .estop.pressed .cap {
    inset: 7px;
    transform: translateY(2px);
    background:
      radial-gradient(circle at 42% 34%, rgba(255, 255, 255, 0.22), transparent 46%),
      radial-gradient(circle at 50% 50%, #a81c09 30%, #6e1206 100%);
    box-shadow:
      0 1px 1px rgba(0, 0, 0, 0.4),
      inset 0 4px 8px rgba(0, 0, 0, 0.75);
  }
  @media (prefers-reduced-motion: reduce) {
    .cap {
      transition: none;
    }
  }

  /* -- the latch ---------------------------------------------------------- */
  /* Full width along the bottom edge, because that edge *is* the seam: below it
     is the cabinet. It is the handle you pull to pop the hood, not a button
     that opens a panel, so it looks like a handle and spans the thing it lifts. */
  .latch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 7px 10px;
    font: inherit;
    font-size: 9px;
    letter-spacing: 0.24em;
    color: #efe6cf;
    background: linear-gradient(180deg, #3a362e, #23211b 60%, #17150f);
    border: none;
    border-top: 1px solid #14110a;
    cursor: pointer;
  }
  .latch:active {
    background: linear-gradient(180deg, #17150f, #23211b);
  }
  /* Knurling, so it reads as something you get a thumb on. */
  .grip {
    flex: 1;
    max-width: 90px;
    height: 7px;
    border-radius: 2px;
    background: repeating-linear-gradient(90deg, #6a6252 0 2px, #2a2620 2px 4px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  /* A machined recess for a thumb, in the middle of the knurling. */
  .latchmark {
    flex: none;
    width: 34px;
    height: 9px;
    border-radius: 5px;
    background: linear-gradient(180deg, #0d0c09, #26241e);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.8),
      0 1px 0 rgba(255, 255, 255, 0.12);
    transition: transform 0.2s ease;
  }
  .latchmark.open {
    transform: rotate(180deg) translateY(1px);
  }
</style>
