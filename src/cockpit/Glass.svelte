<script lang="ts">
/**
 * The glass, and everything hanging in front of it.
 *
 * A pod is the third posture of a component (`doc/design/cab/components.md`) and it
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
 * Pods are on arms now (L-050), and this file did **not** have to learn about
 * look angle after all: a placement is in cage space, which is screen space at
 * the neutral look, so the numbers here mean what they always did. The sweep is
 * one custom property, read by the arm itself.
 */

import type { Controls } from "../control/controls.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { styleOf } from "../makers/houses.ts";
import { BEAM, PILLAR } from "./cage.ts";
import Draggable from "./Draggable.svelte";
import { podFor } from "./parts.ts";

const {
  snapshot,
  controls,
  placed,
  bottomKeepOut,
  onSettle,
  onplace,
}: {
  snapshot: Snapshot | undefined;
  /** The one channel a part commands through. See `control/controls.ts`. */
  controls: (id: string) => Controls;
  /**
   * Where the pilot has put each pod, by component id — **the shell's, not
   * this component's.**
   *
   * It lived here as local `$state` and was therefore destroyed every time the
   * cabinet opened: `App.svelte` mounts this under `mode === "cab" && !rackOpen`,
   * so looking down at the rack or stepping out to the chase view unmounted the
   * glass and every arm came back at its default. The docblock above this field
   * used to promise the opposite — *"unfitting a component and putting it back
   * gives you your instrument where you left it"* — and that only ever held
   * inside one mount.
   *
   * Keyed by id rather than by position in the rack, which is what makes that
   * promise mean something once it is true. Still not persisted across a
   * reload; that is L-012, and this is the shape it will save.
   */
  placed: Readonly<Record<string, { x: number; y: number }>>;
  /** How much glass the dash is taking along the bottom edge, px. */
  bottomKeepOut: number;
  /**
   * An instrument has been let go somewhere legal, and its clamp has taken it.
   *
   * Only a legal drop reports — `Draggable` refuses the others silently — so
   * the knock is the sound of it *landing*, never of it being refused. In its
   * own maker's voice: it is their instrument on their arm.
   */
  onSettle?: (maker: string) => void;
  /** A legal drop, on its way to a tick and to the recording. */
  onplace?: (id: string, x: number, y: number) => void;
} = $props();

/** Every fitted component that brought an instrument, in rack order. */
const pods = $derived(
  (snapshot?.stages ?? []).flatMap((stage) => {
    const Pod = podFor(stage.id);
    return Pod ? [{ stage, Pod }] : [];
  }),
);

/**
 * Fresh kit hangs down the right-hand side, in the order it was fitted, clear
 * of the camera control at the very top. It is a stack of arms clamped to the
 * same rail — the pilot moves them, and the first thing many will do is.
 */
/** The widest instrument fitted today, measured in the browser. It only decides
 *  how the first frame looks — an arm settles a pod that does not fit. */
const POD_W = 124;
const FIRST_Y = BEAM + 24;
const PITCH = 174;
const startX = (typeof window === "undefined" ? 390 : innerWidth) - PILLAR - POD_W;
</script>

{#each pods as { stage, Pod }, i (stage.id)}
  <Draggable
    title={stage.label}
    startX={placed[stage.id]?.x ?? startX}
    startY={placed[stage.id]?.y ?? FIRST_Y + i * PITCH}
    {bottomKeepOut}
    onplace={(x, y) => {
      onplace?.(stage.id, x, y);
      onSettle?.(stage.maker);
    }}
  >
    <Pod {stage} style={styleOf(stage.maker)} {snapshot} controls={controls(stage.id)} />
  </Draggable>
{/each}
