<script lang="ts">
/**
 * NAV-1's face — the part of the plate that is TOWA's and nobody else's.
 *
 * The slot around it supplies the power fuse and the bus tap; a module owns its
 * **style** and its **unique interface**, and nothing else. TOWA's is a
 * dot-matrix status module: the pin it is heading for, and how far. That is
 * exactly what NAV-1 knows and exactly what it can say, which is the same
 * restraint the route scope on the glass is built on — an interface that
 * implied more would be lying about the component behind it.
 *
 * Blue backlight on a machine where every other readout is red LED, because
 * TOWA is a generation newer than the cab it is bolted into and does not mind
 * saying so.
 *
 * Architecture rule 3: reads a stage off a snapshot.
 */
import type { FaceProps } from "../face.ts";
import Matrix from "../Matrix.svelte";

const { stage }: FaceProps = $props();

const target = $derived(stage.readout?.target ?? 0);
const pins = $derived(stage.readout?.pins ?? 0);
const pad = (n: number) => n.toFixed(0).padStart(2, "0");
</script>

<div class="face">
  <Matrix
    lit={stage.enabled}
    cols={9}
    lines={
      stage.enabled
        ? [`PIN ${pad(target + 1)}/${pad(pins)}`, stage.idle ? "STANDBY" : "GUIDING"]
        : ["PIN --/--", "OFF"]
    }
  />
</div>

<style>
  .face {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
</style>
