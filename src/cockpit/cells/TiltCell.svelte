<script lang="ts">
/**
 * HANSA REGELTECHNIK retrofits the panel standard — and is unable to stop
 * itself adding a certification plate.
 *
 * Same format as everyone else's: one lens, one engraved legend. HANSA is
 * *precise* aftermarket, not a hackjob, so it conforms to the KIBA panel
 * convention exactly, in its own orange, with hex sockets instead of slotted
 * screws and a second smaller plate carrying the standard number that nobody
 * asked for. It clashes by being too correct for the machine it is bolted to.
 *
 * **No toggle.** There is no way to switch a certified guard off from the
 * dashboard: you open the rack, which costs you the glass, and the warranty
 * notice arrives in German. When it *has* been bypassed the lens does not go
 * dark like an ordinary component — it sits amber, and the plate says so, for
 * as long as it takes you to put the guard back.
 *
 * Architecture rule 3: reads a stage off a snapshot. No intent leaves it.
 */
import type { CellProps } from "../cell.ts";

const { stage, style }: CellProps = $props();

const bypassed = $derived(!stage.enabled);
/**
 * A bypassed guard reads as a standing caution, never as a dark lamp — that is
 * the whole point of it not going quiet. Otherwise: lit while it is doing its
 * job, amber while it is taking authority, red at zero drive.
 */
const lit = $derived(bypassed ? 2 : Math.max(1, stage.condition));
</script>

<div
  class="cell"
  style="--mfg-plate: {style.plate}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
>
  <div class="mount">
    <span class="mfg-screw mfg-screw-hex"></span>
    <span
      class="lamp mfg-lamp"
      data-lit={lit}
      role="img"
      aria-label="{stage.label} {bypassed ? style.lexicon.bypassed : style.lexicon.on}"
    ></span>
    <span class="mfg-screw mfg-screw-hex"></span>
  </div>
  <!-- The plate never changes. It is engraved metal — it cannot know what the
       guard is doing, and a label that rewrites itself is a screen pretending to
       be a machine. The lens carries the state; the strip below carries the
       sentence, in German, when it matters. -->
  <span class="mfg-legend">{stage.label}</span>
  <!-- The certification plate. Nobody asked for this. -->
  <span class="cert">41-880</span>
</div>

<style>
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 2px 3px;
  }
  .mount {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .lamp {
    width: 26px;
    height: 26px;
    flex: none;
    border-radius: 50%;
  }
  .mount .mfg-screw {
    width: 4px;
    height: 4px;
  }
  .cert {
    font-size: 5px;
    letter-spacing: 0.18em;
    color: color-mix(in srgb, var(--mfg-accent) 62%, #2a2418);
  }
</style>
