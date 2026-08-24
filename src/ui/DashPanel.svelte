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
 * **The masters are the bridge** between the machine's own thresholds and the
 * components' conditions: anything that reaches WARN or ALARM, from the chassis
 * or from any fitted component, lights them. They are **push-to-acknowledge**,
 * the way an annunciator panel works — a new condition flashes, pressing makes
 * it steady, and it goes dark only when the condition actually clears. So
 * acknowledging is not dismissing, and the panel keeps telling you.
 *
 * The E-STOP sits with them, because they are the same conversation.
 *
 * Every gauge reads a real simulated quantity. A gauge that lied about the
 * machine would break the inspectability pillar as surely as a hidden sim layer.
 *
 * Architecture rule 3: reads a snapshot, reports intent up. Never the sim.
 */
import {
  type Annunciation,
  chassisConditions,
  isAlarm,
  isWarning,
  masterLine,
  worst,
} from "../cockpit/annunciator.ts";
import { styleOf } from "../cockpit/makers.ts";
import { cellFor } from "../cockpit/parts.ts";
import { ALARM, type Condition, NOMINAL, WARN } from "../control/bus.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import Attitude from "./Attitude.svelte";
import Gauge from "./Gauge.svelte";
import HourMeter from "./HourMeter.svelte";
import SlipGauge from "./SlipGauge.svelte";

let {
  snapshot,
  rackOpen,
  estopped,
  height = $bindable(0),
  onOpenRack,
  onEstop,
  onReport,
  onToggleModule,
}: {
  snapshot: Snapshot | undefined;
  rackOpen: boolean;
  estopped: boolean;
  /** Measured, so the levers and the toasts can sit clear of a panel that
   *  grows a row every time a component is fitted. */
  height?: number;
  onOpenRack: () => void;
  onEstop: () => void;
  onReport: () => void;
  onToggleModule: (id: string) => void;
} = $props();

const m = $derived(snapshot?.machine);
const stages = $derived(snapshot?.stages ?? []);

/** The vehicle's manufacturer owns this panel. Read it off the chassis slot. */
const chassis = $derived(stages.find((s) => s.id === "PILOT"));
const house = $derived(styleOf(chassis?.maker ?? "KIBA WORKS"));

const speed = $derived(m?.speed ?? 0);
const grip = $derived(Math.max(m?.left.traction ?? 0, m?.right.traction ?? 0));

/**
 * The chassis's own conditions. They no longer get individual lamps — a row of
 * SLIP/GND/¥ legends was the dash explaining itself in words, which is exactly
 * what a panel does not do. They still feed the masters and name the strip.
 */
const chassisLamps = $derived<readonly Annunciation[]>(
  chassisConditions(snapshot, estopped),
);

const overall = $derived(
  worst([...chassisLamps.map((a) => a.condition), ...stages.map((s) => s.condition)]),
);
const line = $derived(masterLine(chassisLamps, stages, "SYSTEMS NOMINAL"));

/**
 * Annunciator acknowledgement.
 *
 * `acked` is the worst condition the pilot has seen and pressed. Anything worse
 * than that is new, and new things flash. Pressing catches up to the present;
 * conditions clearing winds it back down, which re-arms the flash for next time.
 * Nothing here silences anything — a steady lamp is still a lit lamp.
 */
let acked = $state<Condition>(NOMINAL);
$effect(() => {
  if (overall < acked) acked = overall;
});
const unacked = $derived(overall > acked);

const alarmLit = $derived(isAlarm(overall));
const warnLit = $derived(isWarning(overall));

/** Cells, in rack order. A component with no registered cell contributes none. */
const cells = $derived(
  stages
    .map((stage) => ({ stage, cell: cellFor(stage.id) }))
    .filter((entry) => entry.cell !== null),
);
</script>

<div class="dash" class:up={rackOpen} bind:clientHeight={height}>
  <!-- Hazard trim along the top edge, the way a real panel is labelled. -->
  <div class="hazard mfg-hazard"></div>

  <!-- One flow. Groups are bolted where they fit and the panel wraps. -->
  <div class="panel">
    <div class="group ident">
      <span class="mfg-legend nameplate">
        {house.wordmark}<br /><b>{house.plateText.split(" · ")[0]}</b>
      </span>
    </div>

    <!-- The cluster. Attitude biggest and in the middle, because that is the
         question you ask most often and aircraft settled the arrangement. -->
    <div class="group instruments">
      <div class="inst">
        <Gauge
          label="road speed"
          frac={speed / MAX_TRACK_SPEED}
          display={(speed * 3.6).toFixed(0)}
          danger={0.92}
          size={44}
        />
        <span class="mfg-legend">KM/H</span>
      </div>
      <div class="inst">
        <Attitude {snapshot} size={54} />
        <span class="mfg-legend">ATT-0</span>
      </div>
      <div class="inst">
        <Gauge
          label="traction used"
          frac={grip}
          display="{(grip * 100).toFixed(0)}%"
          danger={0.85}
          size={44}
        />
        <span class="mfg-legend">GRIP</span>
      </div>
      <div class="inst">
        <SlipGauge {snapshot} size={46} />
        <span class="mfg-legend">SLIP M/S</span>
      </div>
      <div class="inst">
        <HourMeter {snapshot} />
        <span class="mfg-legend">HOURS</span>
      </div>
    </div>

    <!-- The bridge: the machine's own thresholds and every component's
         condition, arriving at two lamps and the thing that stops everything. -->
    <div class="group alarms">
      <div class="inst">
        <button
          class="master mfg-lamp"
          data-lit={alarmLit ? ALARM : 0}
          data-flash={alarmLit && unacked}
          onclick={() => (acked = overall)}
          aria-label="master alarm, acknowledge"
          aria-pressed={!unacked}
        ></button>
        <span class="mfg-legend" data-danger="true">MASTER ALARM</span>
      </div>

      <div class="inst">
        <button
          class="master mfg-lamp"
          data-lit={warnLit ? WARN : 0}
          data-flash={warnLit && unacked}
          onclick={() => (acked = overall)}
          aria-label="master warning, acknowledge"
          aria-pressed={!unacked}
        ></button>
        <span class="mfg-legend">MASTER WARNING</span>
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

    <!-- Everybody else's kit, bolted onto this panel in rack order. -->
    {#each cells as entry (entry.stage.id)}
      {@const Cell = entry.cell}
      {#if Cell}
        <div class="group">
          <Cell
            stage={entry.stage}
            style={styleOf(entry.stage.maker)}
            onToggle={() => onToggleModule(entry.stage.id)}
          />
        </div>
      {/if}
    {/each}
  </div>

  <!-- The one line of words on the panel, and the way into the account. -->
  <button class="strip" data-cond={line.condition} onclick={onReport}>{line.text}</button>

  <!-- The latch. It *is* the way into the rack, so it lives on the seam: the
       bottom edge of the dash, which is the top edge of the cabinet below. -->
  <button class="latch" class:open={rackOpen} onclick={onOpenRack} aria-label="open the rack">
    <span class="grip"></span>
    <span class="word">{rackOpen ? "CLOSE PANEL" : "OPEN RACK"}</span>
    <span class="grip"></span>
  </button>
</div>

<style>
  .dash {
    /* In flow inside the travelling deck (App.svelte). Not fixed: the whole
       point is that this object moves between the two postures. */
    flex: none;
    /* CAT-yellow sheet steel, lit from above, with a beaten lower edge. */
    background: linear-gradient(180deg, #e6b52c 0%, #d8a521 42%, #b9871a 100%);
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
     fit, and a panel that has run out of room grows another row. */
  .panel {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px 9px;
    padding: 7px 9px;
  }
  .group {
    flex: none;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .instruments {
    gap: 5px;
    align-items: flex-end;
  }
  /* Plates on one line, controls ragged above it — so the stop stands taller
     than the lamps, which is exactly what it does on a real panel. */
  .alarms {
    gap: 8px;
    align-items: flex-end;
  }
  /* A mounted thing and the plate that names it. */
  .inst {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  /* -- the nameplate ------------------------------------------------------ */
  .ident {
    align-self: center;
  }
  .nameplate {
    font-size: 6px;
    line-height: 1.8;
    letter-spacing: 0.2em;
    padding: 3px 6px;
  }
  .nameplate b {
    font-size: 7px;
    letter-spacing: 0.24em;
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

  /* -- the strip ---------------------------------------------------------- */
  .strip {
    display: block;
    width: 100%;
    font: inherit;
    text-align: center;
    letter-spacing: 0.2em;
    padding: 3px 0;
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.3);
    background: #2a2418;
    color: #6a8f7a;
    cursor: pointer;
  }
  .strip[data-cond="2"] {
    background: #a8760c;
    color: #fff3d6;
  }
  .strip[data-cond="3"] {
    background: #b81c0c;
    color: #ffe6e0;
    animation: strip-blink 0.72s steps(2, start) infinite;
  }
  @keyframes strip-blink {
    50% {
      opacity: 0.58;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .strip[data-cond="3"] {
      animation: none;
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
  .word {
    flex: none;
    color: #e8b53a;
  }
</style>
