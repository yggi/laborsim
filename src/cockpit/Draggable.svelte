<script lang="ts">
/**
 * Inline edit (L-008): an instrument you can pick up by its titlebar and put
 * where you like on the glass — in the cab, while it runs.
 *
 * It is **on an arm** (L-050), and that is what decides where it may go. A drop
 * is refused by the cab's own structure — the pillars, the beam, the dash and
 * how far the arm reaches (`./cage.ts`) — and by the one rule that is about the
 * pilot rather than the hardware: instruments must **not overlap**, because
 * occlusion is a budget you spend on purpose, not a mess you make by accident.
 * A refused drop **snaps back** to where it last legally sat.
 *
 * Position is in **cage space**, so `x` and `y` mean the same thing whichever
 * way the head is turned: the sweep is a separate `translate` on this element,
 * fed by one custom property the renderer writes once a frame.
 *
 * Overlap is checked against the other live `[data-draggable]` elements by their
 * real boxes — every pod carries the same sweep, so screen boxes and cage boxes
 * disagree by a constant and the comparison is unaffected.
 *
 * Architecture rule 3: pure UI. It moves DOM, nothing else.
 */
import { type Snippet, untrack } from "svelte";
import {
  armReach,
  BEAM,
  type Box,
  fitsCage,
  type Glass,
  PILLAR,
  REACH,
} from "./cage.ts";

let {
  title,
  startX,
  startY,
  bottomKeepOut = 150,
  onplace,
  children,
}: {
  title: string;
  /** Where it hangs before anyone has moved it. Read once, at mount. */
  startX: number;
  startY: number;
  /**
   * How much glass the dash is occupying along the bottom. Passed in rather
   * than assumed, because the panel grows as components are fitted — each one
   * bolts another cell onto the indicator row.
   */
  bottomKeepOut?: number;
  /**
   * Where it came to rest. **Only ever called with a legal spot** — a refused
   * drop snaps back and says nothing, so an owner recording placements cannot
   * record one that breaks the rules. That is why the live position is owned
   * here rather than bound outward: mid-drag it is routinely illegal, and the
   * only interesting moment is the one it survives.
   */
  onplace?: (x: number, y: number) => void;
  children: Snippet;
} = $props();

// Seeded from the props once, and `untrack` says so out loud: nothing outside
// moves a fitted instrument — the pilot does, with a thumb — so following the
// props afterwards would mean a re-render could shove one out from under a
// finger. The owner hears about the landing through `onplace`.
let x = $state(untrack(() => startX));
let y = $state(untrack(() => startY));

let el: HTMLDivElement;
let dragging = $state(false);
let snapping = $state(false);

/** The pod's own size, measured rather than declared — a component's maker
 *  decides how big its instrument is, and the arm has to hold whatever it is. */
let w = $state(0);
let h = $state(0);
/** The glass, in cage coordinates. Re-read on rotation, which changes it. */
let glassW = $state(typeof window === "undefined" ? 390 : innerWidth);
let glassH = $state(typeof window === "undefined" ? 844 : innerHeight);
$effect(() => {
  const measure = () => {
    glassW = innerWidth;
    glassH = innerHeight;
  };
  addEventListener("resize", measure);
  return () => removeEventListener("resize", measure);
});

const glass = $derived<Glass>({ width: glassW, height: glassH, dash: bottomKeepOut });
const box = $derived<Box>({ left: x, top: y, right: x + w, bottom: y + h });
/** Which pillar the arm comes off, and how far it is extended right now. The
 *  drawn bracket is the part of that reach not covered by the pod itself. */
const arm = $derived(armReach(box, glass));

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Pull a pod back onto its arm.
 *
 * A placement can stop being legal without anyone dragging anything: an
 * instrument is whatever size its maker made it, the dash grows a row as kit is
 * fitted, and a phone gets turned sideways. So the arm settles rather than the
 * caller guessing — nothing is ever left hanging off the glass, and a default
 * position only has to be roughly right.
 *
 * Silently: `onplace` is the sound of a *drop* landing, and a clamp taking up
 * slack on a rotation is not something the pilot did.
 */
function settle() {
  x = clamp(x, PILLAR, glass.width - PILLAR - w);
  y = clamp(y, BEAM, glass.height - glass.dash - h);
  const a = armReach(box, glass);
  if (a.reach > REACH) {
    x = a.side === "left" ? PILLAR + REACH - w : glass.width - PILLAR - REACH;
  }
}

// Depends on the *glass and the instrument*, never on where the pod has been
// put: this reads x and y only to correct them, and tracking its own output
// would be a loop rather than a rule.
$effect(() => {
  void [w, h, glass];
  untrack(settle);
});
/** Where the pointer went down, and where the box was when it did. */
let grabX = 0;
let grabY = 0;
let originX = 0;
let originY = 0;

function grab(e: PointerEvent) {
  dragging = true;
  snapping = false;
  grabX = e.clientX;
  grabY = e.clientY;
  originX = x;
  originY = y;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function move(e: PointerEvent) {
  if (!dragging) return;
  x = originX + (e.clientX - grabX);
  y = originY + (e.clientY - grabY);
}

/** Is the pod, as currently placed, on its arm and clear of the others? */
function legal(): boolean {
  if (!fitsCage(box, glass)) return false;
  const r = el.getBoundingClientRect();
  for (const other of document.querySelectorAll<HTMLElement>("[data-draggable]")) {
    if (other === el) continue;
    const o = other.getBoundingClientRect();
    const clear =
      r.right <= o.left || r.left >= o.right || r.bottom <= o.top || r.top >= o.bottom;
    if (!clear) return false;
  }
  return true;
}

function release(e: PointerEvent) {
  if (!dragging) return;
  dragging = false;
  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  if (legal()) {
    onplace?.(x, y);
    return;
  }
  // Refused: ease back to the last place it legally sat, and tell nobody.
  snapping = true;
  x = originX;
  y = originY;
  setTimeout(() => {
    snapping = false;
  }, 200);
}
</script>

<div
  bind:this={el}
  bind:clientWidth={w}
  bind:clientHeight={h}
  data-draggable
  class="drag"
  class:dragging
  class:snapping
  style="transform: translate({x}px, {y}px)"
>
  <!-- The arm itself, drawn back to the pillar it is clamped to. It is the
       reason a drop gets refused, so it is a thing you can see rather than a
       rule you have to infer (principle 5, inspectable). -->
  <div
    class="arm {arm.side}"
    aria-hidden="true"
    style="width: {Math.max(0, arm.reach - w)}px"
  ></div>
  <div
    class="titlebar"
    role="button"
    tabindex="0"
    aria-label="move {title}"
    onpointerdown={grab}
    onpointermove={move}
    onpointerup={release}
    onpointercancel={release}
  >
    <span class="grip"></span>
    <span class="tt">{title}</span>
  </div>
  <div class="content">
    {@render children()}
  </div>
</div>

<style>
  .drag {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 4;
    touch-action: none;
    width: max-content;
    /* The sweep. `translate` rather than a second `transform`, because the
       placement transform above carries a snap-back transition and a value
       rewritten every frame must not be transitioned into. */
    translate: var(--cab-look-x, 0px) var(--cab-look-y, 0px);
  }
  .drag.dragging {
    z-index: 6;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.6));
  }
  .drag.snapping {
    transition: transform 0.18s ease;
  }
  /* Painted steel, lit from above like the cage it is bolted to. Sits at the
     height of the titlebar, which is where a hand would take hold of it. */
  .arm {
    position: absolute;
    top: 4px;
    height: 5px;
    background: linear-gradient(180deg, #4c5356 0%, #333a3d 55%, #1e2427 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
    pointer-events: none;
  }
  .arm.left {
    right: 100%;
  }
  .arm.right {
    left: 100%;
  }
  .titlebar {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 13px;
    padding: 0 5px;
    background: #2b3133;
    border: 1px solid #0d1012;
    border-bottom: none;
    cursor: grab;
  }
  .titlebar:active {
    cursor: grabbing;
  }
  .grip {
    width: 14px;
    height: 5px;
    background: repeating-linear-gradient(90deg, #5a6360 0 2px, transparent 2px 4px);
  }
  .tt {
    font: 7px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.16em;
    color: #8b968f;
    white-space: nowrap;
  }
  .content {
    display: block;
  }
</style>
