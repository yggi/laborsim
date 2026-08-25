<script lang="ts">
/**
 * **KIBA-NAV-UNIT** — road speed, ATT-0 and TRACTION in one housing.
 *
 * That designation is an internal one and appears nowhere on the panel. It is
 * what the part is called in the parts book; what the operator sees is three
 * dials in one plate, which is what it looks like.
 *
 * It is one instrument because it is **one part**. Three separately bolted
 * gauges say three suppliers, three fitters and three dates, and none of that
 * is true: the chassis maker builds this cluster and ships it as a unit, so it
 * gets one bezel, one set of screws, and its legends cut into its own metal.
 * The panel gains from that twice — the plate reads as a single object the eye
 * lands on before it reads anything, and three bezels' worth of border,
 * shadow and plate stock comes back as panel.
 *
 * **The engraved legends are the narrow exception to the plate rule**, and
 * `substrate.css` carries the line: a plate names a *control* and was made by
 * whoever fitted it, while these name parts of an instrument that arrived from
 * its supplier with the units already on it. `Meters.svelte` established this
 * for the drum housing's H and KM; this is the same argument with more dials.
 *
 * The arrangement is aircraft practice and it does not change: the two big
 * heads in the middle are the two questions asked constantly — how am I sitting
 * (ATT-0, the horizon, the machine from the side) and what are the tracks doing
 * (TRACTION, the plan view, the machine from above) — with the small dial at
 * the end. The counters stay out of this housing on purpose: hours and distance
 * are not something you steer by, and a totaliser has never shared a bezel with
 * a live dial on any machine.
 *
 * Each stack is **gauge, readout, legend**, in that order and bottom-aligned,
 * so the three readouts sit on one line across the unit. The dials are ragged
 * along the top, the way a small gauge set among big ones actually is.
 *
 * Architecture rule 3: reads a snapshot, hands it on.
 */
import type { Annunciation } from "../cockpit/annunciator.ts";
import { conditionAt } from "../cockpit/annunciator.ts";
import { ALARM, type Condition, WARN } from "../control/bus.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import Attitude from "./Attitude.svelte";
import Gauge from "./Gauge.svelte";
import Traction from "./Traction.svelte";

const {
  snapshot,
  lamps,
}: {
  snapshot: Snapshot | undefined;
  /** The chassis's conditions, so the tells can find the ones that point here. */
  lamps: readonly Annunciation[];
} = $props();

const speed = $derived(snapshot?.machine.speed ?? 0);
const traction = $derived(conditionAt(lamps, "TRACTION"));

const said = (c: Condition): string =>
  c >= ALARM ? "alarm" : c >= WARN ? "warning" : "nominal";
</script>

<div class="unit mfg-proud mfg-grain">
  <!-- Four screws, because the unit comes out as one. They are at the corners
       of the *housing*, not of each dial, which is the whole difference. -->
  {#each ["tl", "tr", "bl", "br"] as const as corner (corner)}
    <span class="mfg-screw mfg-screw-hex screw {corner}"></span>
  {/each}

  <div class="faces">
    <div class="stack">
      <Gauge
        label="road speed"
        frac={speed / MAX_TRACK_SPEED}
        display={(speed * 3.6).toFixed(0)}
        danger={0.92}
        size={55}
      />
      <span class="mfg-engraved">KM/H</span>
    </div>

    <div class="stack">
      <Attitude {snapshot} size={70} />
      <span class="mfg-engraved">ATT-0</span>
    </div>

    <div class="stack">
      <Traction {snapshot} size={70} />
      <!-- The tell is cut into the plate beside the legend rather than sitting
           on the dial: a lit master's next question is *which instrument*, and
           the answer has to be readable without looking into the glass. -->
      <span class="mfg-engraved tell-line">
        <span
          class="tell mfg-lamp"
          data-lit={traction}
          role="img"
          aria-label="traction {said(traction)}"
        ></span>
        TRACTION %
      </span>
    </div>
  </div>
</div>

<style>
  /* One piece of brushed plate, screwed to the sheet and standing proud of it.
     Same brush and the same light as the dial faces it carries, because until
     now that gradient was drawn three times, once inside each bezel. */
  .unit {
    position: relative;
    flex: none;
    padding: 5px 7px 4px;
    border-radius: 2px;
    background:
      linear-gradient(148deg, #d6d9da 0%, #b4b9bb 42%, #8f9497 100%);
    border: 1px solid #6e7376;
  }
  .screw {
    position: absolute;
  }
  .tl {
    top: 2px;
    left: 2px;
  }
  .tr {
    top: 2px;
    right: 2px;
  }
  .bl {
    bottom: 2px;
    left: 2px;
  }
  .br {
    bottom: 2px;
    right: 2px;
  }
  /* Bottom-aligned: the readouts make one line across the unit and the dials go
     ragged along the top instead. A row of readouts at three heights is the
     thing that makes a cluster read as parts rather than as a part.

     Barely any gap, because every face carries a tenth of its own box as clear
     margin on each side — that is where its bezel used to be — and spacing the
     plate twice is how a cluster ends up mostly plate. */
  .faces {
    display: flex;
    align-items: flex-end;
    gap: 1px;
    /* Clear of the corner screws at both ends. */
    padding: 0 3px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .tell-line {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .tell {
    flex: none;
    width: 6px;
    height: 6px;
    border-width: 1px;
    border-radius: 50%;
  }
</style>
