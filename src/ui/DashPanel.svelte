<script lang="ts">
/**
 * The machine's dash — the **closed face of the rack**, and a live instrument in
 * its own right. It sits as a strip of yellow sheet metal at the bottom of the
 * glass, in view while you drive (docs/design/cockpit.md, L-043).
 *
 * The look is a plant control panel: white-bezel needle gauges, warning lamps,
 * a red mushroom E-STOP, an ignition key, hazard labels, screws, a service
 * sticker. Principle 7 in the letter: the world may look like a simulation, but
 * the cockpit is a real, worn, industrial thing you sit behind.
 *
 * Everything on it is a **real simulated quantity** — speed, grip, slip,
 * attitude, contact, the tilt-guard cutting in. A gauge that lied about the
 * machine would break the inspectability pillar as surely as a hidden sim layer.
 *
 * The OPEN latch drops the panel and raises the rack. The E-STOP kills the
 * drive. Both are hands, not menus.
 *
 * Architecture rule 3: reads a snapshot, reports intent up. Never the sim.
 */
import type { Snapshot } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import Gauge from "./Gauge.svelte";

const {
  snapshot,
  rackOpen,
  estopped,
  onOpenRack,
  onEstop,
  onReport,
}: {
  snapshot: Snapshot | undefined;
  rackOpen: boolean;
  estopped: boolean;
  onOpenRack: () => void;
  onEstop: () => void;
  onReport: () => void;
} = $props();

const m = $derived(snapshot?.machine);
const DEG = 180 / Math.PI;

const speed = $derived(m?.speed ?? 0);
const grip = $derived(Math.max(m?.left.traction ?? 0, m?.right.traction ?? 0));
const slip = $derived(
  Math.max(Math.abs(m?.left.slip ?? 0), Math.abs(m?.right.slip ?? 0)),
);
const pitch = $derived((m?.pitch ?? 0) * DEG);
const roll = $derived((m?.roll ?? 0) * DEG);

/** TILT-GUARD is cutting when its stage is live and its gain has dropped. */
const tiltCutting = $derived.by(() => {
  const s = snapshot?.stages.find((x) => x.id === "TILT");
  return s?.enabled === true && s.idle === false && (s.readout?.gain ?? 1) < 0.999;
});

/** A track is commanded but has lost the ground — clawing air. */
const lostContact = $derived.by(() => {
  if (!m) return false;
  const left = m.left.contacts === 0 && Math.abs(m.left.commanded) > 0.05;
  const right = m.right.contacts === 0 && Math.abs(m.right.commanded) > 0.05;
  return left || right;
});

const slipping = $derived(slip > 0.4);
const citizen = $derived(
  (snapshot?.damage ?? []).some((d) => d.category === "citizen asset"),
);
const bill = $derived(snapshot?.bill ?? 0);

/** The master alarm gathers the conditions that mean *stop and look*. */
const alarm = $derived(estopped || citizen || tiltCutting || lostContact);
const alarmText = $derived(
  citizen
    ? "CITIZEN PROPERTY"
    : estopped
      ? "EMERGENCY STOP"
      : lostContact
        ? "TRACK — NO CONTACT"
        : tiltCutting
          ? "TILT LIMIT — DRIVE CUT"
          : "SYSTEMS NOMINAL",
);
</script>

<div class="dash" class:down={rackOpen}>
  <!-- Hazard trim along the top edge, the way a real panel is labelled. -->
  <div class="hazard"></div>

  <div class="lower">
    <!-- The instrument strip scrolls if the panel is wider than the glass; the
         critical controls do not (they live in `.actions`, pinned right). -->
    <div class="body">
      <!-- Identity: this is a KIBA chassis, and it says so. Themeable per
           chassis later (bulldozer ↔ police Labor). -->
      <div class="cluster ident">
        <div class="mark">KIBA<span>WORKS</span></div>
        <div class="model">TYPE 3A</div>
      </div>

      <!-- Master alarm and the annunciator lamps beneath it. -->
      <div class="cluster lamps">
        <button class="master" class:on={alarm} onclick={onReport} aria-label="alarm and report">
          <span class="dot"></span>
          <span class="mtext">MASTER<br />ALARM</span>
        </button>
        <div class="annun">
          <span class="lamp" class:lit={slipping}>SLIP</span>
          <span class="lamp warn" class:lit={tiltCutting}>TILT</span>
          <span class="lamp warn" class:lit={lostContact}>GND</span>
          <span class="lamp bill" class:lit={bill > 0}>¥</span>
        </div>
      </div>

      <!-- The gauges. Real quantities, industrial faces. -->
      <div class="cluster gauges">
        <Gauge label="km/h" frac={speed / MAX_TRACK_SPEED} display={(speed * 3.6).toFixed(0)} danger={0.92} size={50} />
        <Gauge label="GRIP" frac={grip} display="{(grip * 100).toFixed(0)}%" danger={0.85} size={50} />
        <div class="incline">
          <div class="incline-h">INCLINE</div>
          <div class="bubble-box">
            <span class="bubble" style="left: {50 + Math.max(-1, Math.min(1, roll / 45)) * 42}%; top: {50 - Math.max(-1, Math.min(1, pitch / 45)) * 42}%"></span>
            <span class="cross-h"></span>
            <span class="cross-v"></span>
          </div>
          <div class="incline-r">P{pitch.toFixed(0)} R{roll.toFixed(0)}</div>
        </div>
      </div>

      <!-- Ignition. Identity, not a control: the sim always runs. -->
      <div class="cluster key" aria-hidden="true">
        <span class="key-face"><span class="key-slot"></span></span>
        <span class="key-pos">OFF · RUN · START</span>
      </div>
    </div>

    <!-- Always-visible controls: the stop that kills the drive, and the latch
         that raises the rack. These never scroll off the panel. -->
    <div class="actions">
      <button class="estop" class:pressed={estopped} onclick={onEstop} aria-label="emergency stop">
        <span class="estop-label">STOP</span>
      </button>
      <button class="latch" class:open={rackOpen} onclick={onOpenRack} aria-label="open the rack">
        <span class="latch-grip"></span>
        <span class="latch-text">{rackOpen ? "CLOSE" : "RACK"}</span>
        <span class="chev">{rackOpen ? "▼" : "▲"}</span>
      </button>
    </div>
  </div>
  <div class="alarm-strip" class:on={alarm}>{alarmText}</div>
</div>

<style>
  .dash {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    /* CAT-yellow sheet steel, lit from above, with a beaten lower edge. */
    background:
      linear-gradient(180deg, #e6b52c 0%, #d8a521 42%, #b9871a 100%);
    border-top: 2px solid #7c5a10;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.25),
      0 -8px 22px rgba(0, 0, 0, 0.5);
    padding-bottom: env(safe-area-inset-bottom);
    color: #2a2418;
    font: 8px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    transition: transform 0.28s ease;
  }
  /* When the rack is up, the panel has dropped out of the way. */
  .dash.down {
    transform: translateY(110%);
  }
  .hazard {
    height: 5px;
    background: repeating-linear-gradient(
      -45deg,
      #1c1a12 0 8px,
      #e6b52c 8px 16px
    );
    opacity: 0.85;
  }
  .lower {
    display: flex;
    align-items: stretch;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: stretch;
    gap: 10px;
    padding: 7px 9px;
    overflow-x: auto;
  }
  .cluster {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* -- identity ---------------------------------------------------------- */
  .ident {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    justify-content: center;
  }
  .mark {
    font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
    font-weight: 800;
    font-size: 15px;
    line-height: 0.82;
    letter-spacing: 0.02em;
    color: #211d13;
  }
  .mark span {
    display: block;
    font-size: 8px;
    letter-spacing: 0.3em;
  }
  .model {
    font-size: 7px;
    letter-spacing: 0.1em;
    color: #4a4230;
  }

  /* -- lamps ------------------------------------------------------------- */
  .lamps {
    flex-direction: column;
    gap: 4px;
    justify-content: center;
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
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #5a1c14;
    box-shadow: inset 0 0 3px #000;
  }
  .master.on .dot {
    background: #ff3b24;
    box-shadow: 0 0 10px #ff3b24, inset 0 0 3px #ffb0a4;
  }
  .master .mtext {
    font-size: 7px;
    line-height: 1;
    letter-spacing: 0.1em;
  }
  .master.on .mtext {
    color: #ffd9d2;
  }
  .annun {
    display: flex;
    gap: 3px;
  }
  .lamp {
    font-size: 7px;
    padding: 2px 3px;
    background: #b59a2f;
    border: 1px solid #7c5a10;
    color: #6a5416;
    border-radius: 1px;
  }
  .lamp.lit {
    background: #ffe27a;
    color: #2a2100;
    box-shadow: 0 0 7px #ffdf6b;
  }
  .lamp.warn.lit {
    background: #ff9b2e;
    box-shadow: 0 0 7px #ff9b2e;
  }
  .lamp.bill.lit {
    background: #ff6a4d;
    color: #2a0a00;
    box-shadow: 0 0 7px #ff6a4d;
  }

  /* -- gauges ------------------------------------------------------------ */
  .gauges {
    gap: 5px;
    padding: 0 2px;
  }
  .incline {
    text-align: center;
    color: #4a4230;
  }
  .incline-h,
  .incline-r {
    font-size: 6px;
    letter-spacing: 0.1em;
  }
  .bubble-box {
    position: relative;
    width: 44px;
    height: 44px;
    margin: 1px auto;
    background: #16181a;
    border: 2px solid #e9e4d6;
    border-radius: 50%;
  }
  .bubble {
    position: absolute;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    border-radius: 50%;
    background: #6fe3c4;
    box-shadow: 0 0 5px #6fe3c4;
    transition: left 0.12s linear, top 0.12s linear;
  }
  .cross-h,
  .cross-v {
    position: absolute;
    background: #3a4a46;
  }
  .cross-h {
    left: 8%;
    right: 8%;
    top: 50%;
    height: 1px;
  }
  .cross-v {
    top: 8%;
    bottom: 8%;
    left: 50%;
    width: 1px;
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
  .key {
    flex-direction: column;
    text-align: center;
    color: #3a3226;
  }
  .estop {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 3px solid #f2c94c;
    background: radial-gradient(circle at 42% 34%, #ff5a44, #b81c0c 70%);
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.5), inset 0 -3px 6px rgba(0, 0, 0, 0.45);
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
  .key {
    text-align: center;
    color: #3a3226;
  }
  .key-face {
    display: block;
    width: 26px;
    height: 26px;
    margin: 0 auto;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #4a4c4f, #1c1e20 72%);
    border: 2px solid #cfc9b8;
    position: relative;
  }
  .key-slot {
    position: absolute;
    left: 50%;
    top: 22%;
    width: 2px;
    height: 12px;
    margin-left: -1px;
    background: #e8b53a;
    transform: rotate(35deg);
    transform-origin: 50% 90%;
  }
  .key-pos {
    font-size: 5.5px;
    letter-spacing: 0.06em;
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
  .alarm-strip.on {
    background: #b81c0c;
    color: #ffe6e0;
    animation: blink 0.9s steps(2, start) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.55;
    }
  }
</style>
