<script lang="ts">
/**
 * The machine's dash — and **the seam between the two postures.**
 *
 * It is the only thing visible whether you are looking out of the glass or down
 * at the rack, and it *travels* between them: the bottom of your view when you
 * are driving, the top of your view when you have dropped your eyes to the
 * cabinet. That is honest cab geometry — the dash sits between the windscreen
 * and the rack, so looking past it puts it overhead. It never fades and it never
 * disappears; it slides, because it is a real object at a real height.
 *
 * Its theme belongs to **the vehicle's manufacturer**, read off the chassis
 * component's slot rather than hardcoded. A KIBA tracked platform has a KIBA
 * dashboard; another chassis would bring a different panel with a different
 * layout, and everyone else's kit is bolted onto whatever it came with
 * (`docs/design/components.md`).
 *
 * Two rows:
 *
 *   1. **the machine instruments** — the chassis maker's own cluster, arranged
 *      the way aircraft practice solved this: the attitude head is the biggest
 *      thing and it sits in the middle, with everything else around it;
 *   2. **the indicator row** — one cell per fitted component, in rack order,
 *      floated and wrapping. No budget, nothing to configure. Cells just work.
 *
 * MASTER ALARM and MASTER WARNING are **derived** from every component's own
 * published condition plus the chassis's. Nothing here knows what a TILT-GUARD
 * is any more; before this it read that module's private readout to light a
 * lamp, which meant every new component was an edit to this file.
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
   *  changes height as components are fitted. */
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

/** The chassis's own conditions — the ones no module in the rack owns. */
const chassisLamps = $derived<readonly Annunciation[]>(
  chassisConditions(snapshot, estopped),
);

/**
 * The masters, over everything at once: the chassis and every fitted component.
 * A component lights the dash by publishing a number, not by being known here.
 */
const overall = $derived(
  worst([...chassisLamps.map((a) => a.condition), ...stages.map((s) => s.condition)]),
);
const line = $derived(masterLine(chassisLamps, stages, "SYSTEMS NOMINAL"));

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

  <div class="lower">
    <!-- Two rows, because one does not fit a phone. Alerts on top — the things
         that are wrong — and the instruments below, where the full width is
         theirs. The critical controls are pinned right across both and never
         scroll off (`.actions`). -->
    <div class="body">
      <div class="row alerts">
        <!-- Identity: whoever built the vehicle, and it says so. -->
        <div class="ident">
          <div class="mark">{house.wordmark}</div>
          <div class="model">{house.plateText.split(" · ")[0]}</div>
        </div>

        <div class="masters">
          <button
            class="master alarm"
            class:on={isAlarm(overall)}
            onclick={onReport}
            aria-label="master alarm and report"
          >
            <span class="dot"></span>
            <span class="mtext">MASTER<br />ALARM</span>
          </button>
          <button
            class="master warning"
            class:on={isWarning(overall)}
            onclick={onReport}
            aria-label="master warning and report"
          >
            <span class="dot"></span>
            <span class="mtext">MASTER<br />WARNING</span>
          </button>
        </div>
      </div>

      <div class="row annun">
        {#each chassisLamps as lamp (lamp.id)}
          <span class="lamp" data-cond={lamp.condition}>{lamp.word}</span>
        {/each}
      </div>

      <!-- The cluster. Attitude in the middle and biggest, because that is the
           question you ask most often and aircraft settled the arrangement:
           the attitude indicator is the big one and everything else sits round
           it. Scrolls only at the tail, where the hour meter is — the things
           you actually drive by are visible at rest on a 390px phone. -->
      <div class="row gauges">
        <Gauge
          label="km/h"
          frac={speed / MAX_TRACK_SPEED}
          display={(speed * 3.6).toFixed(0)}
          danger={0.92}
          size={42}
        />
        <Attitude {snapshot} size={54} />
        <Gauge
          label="GRIP"
          frac={grip}
          display="{(grip * 100).toFixed(0)}%"
          danger={0.85}
          size={42}
        />
        <SlipGauge {snapshot} size={44} />
        <HourMeter {snapshot} />
      </div>
    </div>

    <!-- Always-visible controls: the stop that kills the drive, and the latch
         that raises the rack. These never scroll off the panel. -->
    <div class="actions">
      <button
        class="estop"
        class:pressed={estopped}
        onclick={onEstop}
        aria-label="emergency stop"
      >
        <span class="estop-label">STOP</span>
      </button>
      <button
        class="latch"
        class:open={rackOpen}
        onclick={onOpenRack}
        aria-label="open the rack"
      >
        <span class="latch-grip"></span>
        <span class="latch-text">{rackOpen ? "CLOSE" : "RACK"}</span>
        <span class="chev">{rackOpen ? "▼" : "▲"}</span>
      </button>
    </div>
  </div>

  <!-- The indicator row: everybody else's kit, bolted onto this panel. -->
  {#if cells.length > 0}
    <div class="cells">
      {#each cells as entry (entry.stage.id)}
        {@const Cell = entry.cell}
        {#if Cell}
          <Cell
            stage={entry.stage}
            style={styleOf(entry.stage.maker)}
            onToggle={() => onToggleModule(entry.stage.id)}
          />
        {/if}
      {/each}
    </div>
  {/if}

  <div class="alarm-strip" data-cond={line.condition}>{line.text}</div>
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
  /* Looking down at the rack: the panel is overhead now, so its shadow falls
     the other way and the hazard trim reads as the underside of a lip. */
  .dash.up {
    box-shadow:
      inset 0 -2px 0 rgba(0, 0, 0, 0.3),
      0 8px 22px rgba(0, 0, 0, 0.5);
  }
  .hazard {
    height: 5px;
  }
  .lower {
    display: flex;
    align-items: stretch;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px 8px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  /* Only the instrument row scrolls, and only at its tail. */
  .row.gauges {
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .row.alerts {
    justify-content: space-between;
  }

  /* -- identity ---------------------------------------------------------- */
  .ident {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    justify-content: center;
    max-width: 74px;
  }
  .mark {
    font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
    font-weight: 800;
    font-size: 13px;
    line-height: 0.86;
    letter-spacing: 0.02em;
    color: #211d13;
  }
  .model {
    font-size: 7px;
    letter-spacing: 0.1em;
    color: #4a4230;
  }

  /* -- masters and annunciators ------------------------------------------ */
  .masters {
    display: flex;
    gap: 4px;
  }
  .master {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 6px;
    background: #2a2418;
    border: 1px solid #14110a;
    border-radius: 3px;
    color: #8a8272;
    cursor: pointer;
  }
  .master .dot {
    width: 11px;
    height: 11px;
    flex: none;
    border-radius: 50%;
    background: #4a3a24;
    box-shadow: inset 0 0 3px #000;
  }
  .master.alarm.on .dot {
    background: #ff3b24;
    box-shadow:
      0 0 10px #ff3b24,
      inset 0 0 3px #ffb0a4;
  }
  .master.alarm.on .mtext {
    color: #ffd9d2;
  }
  .master.warning.on .dot {
    background: #ffb43a;
    box-shadow:
      0 0 10px #ffb43a,
      inset 0 0 3px #ffe1a4;
  }
  .master.warning.on .mtext {
    color: #ffeccb;
  }
  .master .mtext {
    font-size: 6.5px;
    line-height: 1;
    letter-spacing: 0.1em;
    text-align: left;
  }
  .row.annun {
    gap: 3px;
    flex-wrap: wrap;
  }
  /* Legend plates: visible when dark, so you know what *could* light. */
  .lamp {
    font-size: 7px;
    padding: 2px 3px;
    background: #b59a2f;
    border: 1px solid #7c5a10;
    color: #6a5416;
    border-radius: 1px;
  }
  .lamp[data-cond="2"] {
    background: #ffe27a;
    color: #2a2100;
    box-shadow: 0 0 7px #ffdf6b;
  }
  .lamp[data-cond="3"] {
    background: #ff6a4d;
    color: #2a0a00;
    box-shadow: 0 0 7px #ff6a4d;
  }

  /* -- gauges ------------------------------------------------------------ */
  /* -- the indicator row ------------------------------------------------- */
  .cells {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 0 9px 7px;
    /* A darker strip so the bolted-on kit reads as sitting *on* the panel
       rather than being part of it. */
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.26));
    border-top: 1px solid rgba(0, 0, 0, 0.28);
    padding-top: 6px;
  }

  /* -- actions (pinned right, never scroll off) -------------------------- */
  .actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 9px 6px 8px;
    background: linear-gradient(180deg, #d8a521, #b9871a);
    border-left: 2px solid #7c5a10;
    box-shadow: inset 2px 0 4px rgba(0, 0, 0, 0.2);
  }
  .estop {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 3px solid #f2c94c;
    background: radial-gradient(circle at 42% 34%, #ff5a44, #b81c0c 70%);
    box-shadow:
      0 3px 5px rgba(0, 0, 0, 0.5),
      inset 0 -3px 6px rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    position: relative;
  }
  .estop-label {
    font-size: 7px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.08em;
  }
  .estop.pressed {
    background: radial-gradient(circle at 50% 50%, #8f1608, #6e1206 70%);
    box-shadow: inset 0 3px 7px rgba(0, 0, 0, 0.7);
  }

  /* -- latch ------------------------------------------------------------- */
  .latch {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 62px;
    padding: 6px 8px;
    background: linear-gradient(180deg, #33302a, #201e19);
    border: 1px solid #14110a;
    border-radius: 3px;
    color: #efe6cf;
    letter-spacing: 0.12em;
    cursor: pointer;
  }
  .latch-grip {
    width: 30px;
    height: 6px;
    border-radius: 3px;
    background: repeating-linear-gradient(90deg, #6a6252 0 2px, #33302a 2px 4px);
  }
  .latch-text {
    font-size: 8px;
  }
  .latch .chev {
    color: #e8b53a;
  }

  .alarm-strip {
    text-align: center;
    font-size: 8px;
    letter-spacing: 0.2em;
    padding: 2px 0;
    background: #2a2418;
    color: #6a8f7a;
  }
  .alarm-strip[data-cond="2"] {
    background: #a8760c;
    color: #fff3d6;
  }
  .alarm-strip[data-cond="3"] {
    background: #b81c0c;
    color: #ffe6e0;
    animation: blink 0.9s steps(2, start) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.55;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .alarm-strip[data-cond="3"] {
      animation: none;
    }
  }
</style>
