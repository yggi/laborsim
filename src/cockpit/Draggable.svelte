<script lang="ts">
/**
 * Inline edit (L-008): an instrument you can pick up by its titlebar and put
 * where you like on the glass — in the cab, while it runs.
 *
 * The rules are the cockpit's rules: an instrument must sit **wholly within the
 * viewport** and must **not overlap** another, because occlusion is a budget you
 * spend on purpose, not a mess you make by accident (docs/design/cockpit.md).
 * So a drop that breaks either rule is refused: the panel **snaps back** to
 * where it last legally sat. You reposition; you never lose one off the edge or
 * bury one under another.
 *
 * Overlap is checked against the other live `[data-draggable]` elements by their
 * real boxes, so it works whatever an instrument's shape or size.
 *
 * Architecture rule 3: pure UI. It moves DOM, nothing else.
 */
import { type Snippet, untrack } from "svelte";

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

/** Keep-out margin at the frame. The bottom is the dash, and it is a prop. */
const EDGE = 8;

let el: HTMLDivElement;
let dragging = $state(false);
let snapping = $state(false);
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

/** Is the box, as currently placed, inside the glass and clear of the others? */
function legal(): boolean {
  const r = el.getBoundingClientRect();
  if (
    r.left < EDGE ||
    r.top < EDGE ||
    r.right > innerWidth - EDGE ||
    r.bottom > innerHeight - bottomKeepOut
  ) {
    return false;
  }
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
  data-draggable
  class="drag"
  class:dragging
  class:snapping
  style="transform: translate({x}px, {y}px)"
>
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
  }
  .drag.dragging {
    z-index: 6;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.6));
  }
  .drag.snapping {
    transition: transform 0.18s ease;
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
