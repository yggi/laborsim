<script lang="ts">
/**
 * The live voice (L-044) — the rig speaking as it happens.
 *
 * The end-of-run report (L-029) is the itemised account; this is the running
 * commentary that reaches you mid-drive. Same voice, faster tempo: a line
 * slides in, waits, and fades. The one exception is a **citizen** — that latches
 * and stays until you dismiss it, because categorical failure does not scroll
 * quietly off the screen.
 *
 * It reads ledger lines off the **event channel** and turns each into a notice.
 * It used to diff the snapshot's damage list against a high-water mark it kept
 * itself, and to detect a RESET by noticing that list had got shorter — one
 * consumer's private reimplementation of a subscription. `src/core/events.ts`
 * owns both halves now, and this file keeps no position of its own.
 *
 * Architecture rule 3: snapshot in, nothing out but a dismiss.
 */
import { styleOf } from "../cockpit/makers.ts";
import { createEventReader } from "../core/events.ts";
import type { Snapshot } from "../core/snapshot.ts";
import type { DamageEvent } from "../sim/damage.ts";

/**
 * A notice from a **manufacturer**, not from the rig.
 *
 * Two institutions speak in this cockpit and they must not blur: L.A.B.O.R.
 * certifies and bills, a manufacturer sells and warns
 * (`docs/design/training-frame.md`). So a maker notice wears that maker's own
 * plate colours and its wordmark, and it never carries a price — only the
 * ledger does that.
 */
interface Notice {
  readonly id: number;
  readonly maker: string;
  readonly head: string;
  readonly body: string;
}

const {
  snapshot,
  notices = [],
}: { snapshot: Snapshot | undefined; notices?: readonly Notice[] } = $props();

/** How long a routine notice lingers before it fades, ms. */
const LINGER = 5200;

interface Toast {
  readonly id: number;
  readonly line: DamageEvent;
  readonly latched: boolean;
}

let toasts = $state<Toast[]>([]);
let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const ledger = createEventReader();

function drop(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

$effect(() => {
  const { events, rewound } = ledger.take(snapshot);

  // A reset re-racks the exercise. Whatever is on the board belongs to a run
  // that no longer exists.
  if (rewound) {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    toasts = [];
  }

  for (const event of events) {
    if (event.kind !== "ledger") continue;
    const line = event.line;
    const latched = line.category === "citizen asset";
    const id = nextId++;
    toasts = [...toasts, { id, line, latched }];
    if (!latched)
      timers.set(
        id,
        setTimeout(() => drop(id), LINGER),
      );
  }
});

const yen = (n: number) => `−¥${n.toLocaleString("en-US")}`;

function why(line: DamageEvent): string {
  if (line.bypassed.length > 0) return `${line.bypassed.join(", ")} bypassed`;
  if (line.driving.length > 0) return `${line.driving.join(" → ")} driving`;
  return "no module driving";
}
</script>

<div class="toasts">
  <!-- The manufacturer's channel, above the ledger's and in its own livery. -->
  {#each notices as notice (notice.id)}
    {@const style = styleOf(notice.maker)}
    <div
      class="notice"
      style="--mfg-plate: {style.plate}; --mfg-face: {style.face}; --mfg-accent: {style.accent}"
    >
      <div class="head">
        <svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
          <path d={style.mark} />
        </svg>
        <span class="what">{notice.head}</span>
      </div>
      <div class="sub">{notice.body}</div>
    </div>
  {/each}

  {#each toasts as t (t.id)}
    <div class="toast" class:citizen={t.latched}>
      <div class="head">
        <span class="what">
          {#if t.latched}CITIZEN PROPERTY{:else}{t.line.category} ({t.line.label}){/if}
        </span>
        {#if t.latched}
          <button class="x" onclick={() => drop(t.id)} aria-label="acknowledge">×</button>
        {:else}
          <span class="yen">{yen(t.line.yen)}</span>
        {/if}
      </div>
      <div class="sub">
        {#if t.latched}
          {t.line.label} struck at {t.line.speed.toFixed(1)} m/s &middot; this exercise is a failure
        {:else}
          {t.line.state} &middot; {t.line.speed.toFixed(1)} m/s &middot; {why(t.line)}
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  /* Rising off the top of the dash, newest at the bottom. Clear of a panel
     that grows a cell taller every time a component is fitted. */
  .toasts {
    position: fixed;
    left: 12px;
    bottom: calc(var(--cab-dash-h, 128px) + 14px);
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: min(300px, calc(100vw - 24px));
    pointer-events: none;
  }
  .toast {
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    border-left: 3px solid #e8b53a;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    font: 9px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.05em;
    color: #c6d0cb;
    padding: 5px 8px;
    animation: slide 0.22s ease;
  }
  .toast.citizen {
    border-left-color: #e0503c;
    pointer-events: auto;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: baseline;
  }
  .what {
    letter-spacing: 0.08em;
  }
  .yen {
    color: #e8b53a;
    white-space: nowrap;
  }
  .citizen .what {
    color: #ff9a8a;
  }
  .x {
    pointer-events: auto;
    background: none;
    border: 1px solid #6d3a33;
    color: #ff9a8a;
    font: inherit;
    line-height: 1;
    padding: 0 5px;
    cursor: pointer;
  }
  .sub {
    font-size: 8px;
    color: #78827f;
    margin-top: 1px;
  }

  /* A manufacturer, in its own colours. Squarer and heavier than a ledger line,
     because it is a plate somebody screwed on rather than a line in an account.
     No price on it, ever — pricing is L.A.B.O.R.'s and nobody else's. */
  .notice {
    background: var(--mfg-plate);
    border: 1px solid #0a0d0e;
    border-left: 3px solid var(--mfg-accent);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.55);
    font: 9px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.05em;
    color: var(--mfg-face);
    padding: 5px 8px;
    animation: slide 0.22s ease;
  }
  .notice .head {
    align-items: center;
    justify-content: flex-start;
    gap: 5px;
  }
  .notice .what {
    color: var(--mfg-accent);
    letter-spacing: 0.14em;
    font-size: 8px;
  }
  .notice .sub {
    color: color-mix(in srgb, var(--mfg-face) 78%, transparent);
  }
  .mark {
    width: 11px;
    height: 11px;
    flex: none;
    fill: none;
    stroke: var(--mfg-accent);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  @keyframes slide {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
