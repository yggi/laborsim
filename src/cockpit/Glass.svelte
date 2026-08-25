<script lang="ts">
/**
 * The glass, and everything hanging in front of it.
 *
 * A pod is the third posture of a component (`docs/design/components.md`) and it
 * is the expensive one: fitting kit that ships one costs you view, permanently,
 * for as long as it is in the rack. So this is the pile that L-025's budget will
 * one day price, and it has to be a pile — one place that knows what is fitted
 * and what each piece is taking — rather than a hand-written list of components
 * somebody remembered to add.
 *
 * It used to be that list. `App.svelte` carried a branch per component, a named
 * position variable per component, and NAV-1's title spelled out in a string; a
 * new component with an instrument meant editing the application shell, which is
 * precisely the defect the registry exists to kill. The shell should not know
 * what a NAV-1 is, and now it does not.
 *
 * What is fitted comes off the **snapshot**, not off the live rack, so this
 * renders a recording exactly as it renders a machine — the pods included.
 *
 * Deliberately *not* here: pods on arms (L-050). These are still viewport-fixed
 * overlays, and when they move into cage space this is the one file that has to
 * learn about look angle.
 */

import type { Controls } from "../control/controls.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { styleOf } from "../makers/houses.ts";
import Draggable from "./Draggable.svelte";
import { podFor } from "./parts.ts";

const {
  snapshot,
  controls,
  bottomKeepOut,
}: {
  snapshot: Snapshot | undefined;
  /** The one channel a part commands through. See `control/controls.ts`. */
  controls: (id: string) => Controls;
  /** How much glass the dash is taking along the bottom edge, px. */
  bottomKeepOut: number;
} = $props();

/** Every fitted component that brought an instrument, in rack order. */
const pods = $derived(
  (snapshot?.stages ?? []).flatMap((stage) => {
    const Pod = podFor(stage.id);
    return Pod ? [{ stage, Pod }] : [];
  }),
);

/**
 * Where the pilot has put each pod, by component id. Only *legal* drops land
 * here — `Draggable` refuses the others — and it is keyed by id rather than by
 * position in the rack so that unfitting a component and putting it back gives
 * you your instrument where you left it, not where a default says.
 *
 * Not yet persisted across a reload; that is L-012, and this is the shape it
 * will save.
 */
let placed = $state<Record<string, { x: number; y: number }>>({});

/**
 * Fresh kit hangs down the right-hand side, in the order it was fitted, clear
 * of the camera control at the very top. It is a stack of arms clamped to the
 * same rail — the pilot moves them, and the first thing many will do is.
 */
const COLUMN_X = 124;
const FIRST_Y = 50;
const PITCH = 174;
const startX = typeof window === "undefined" ? 280 : innerWidth - COLUMN_X;
</script>

{#each pods as { stage, Pod }, i (stage.id)}
  <Draggable
    title={stage.label}
    startX={placed[stage.id]?.x ?? startX}
    startY={placed[stage.id]?.y ?? FIRST_Y + i * PITCH}
    {bottomKeepOut}
    onplace={(x, y) => (placed[stage.id] = { x, y })}
  >
    <Pod {stage} style={styleOf(stage.maker)} {snapshot} controls={controls(stage.id)} />
  </Draggable>
{/each}
