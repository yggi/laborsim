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
 * It reads new lines off the snapshot's damage list and turns each into a
 * notice. It never touches the sim, and it survives a reset (the run's damage
 * list shrinking back to empty) by noticing the count fell.
 *
 * Architecture rule 3: snapshot in, nothing out but a dismiss.
 */
import type { Snapshot } from "../core/snapshot.ts";
import type { DamageEvent } from "../sim/damage.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

/** How long a routine notice lingers before it fades, ms. */
const LINGER = 5200;

interface Toast {
  readonly id: number;
  readonly line: DamageEvent;
  readonly latched: boolean;
}

let toasts = $state<Toast[]>([]);
/** Lines already voiced. Plain, not reactive — it is a high-water mark. */
let seen = 0;
let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function drop(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

$effect(() => {
  const damage = snapshot?.damage ?? [];

  // A reset re-racks the exercise: the list shrinks back toward empty. Forget
  // what we voiced and clear the board.
  if (damage.length < seen) {
    seen = 0;
    for (const id of timers.keys()) clearTimeout(timers.get(id));
    timers.clear();
    toasts = [];
  }

  for (let i = seen; i < damage.length; i++) {
    const line = damage[i];
    if (!line) continue;
    const latched = line.category === "citizen asset";
    const id = nextId++;
    toasts = [...toasts, { id, line, latched }];
    if (!latched)
      timers.set(
        id,
        setTimeout(() => drop(id), LINGER),
      );
  }
  seen = damage.length;
});

const yen = (n: number) => `−¥${n.toLocaleString("en-US")}`;

function why(line: DamageEvent): string {
  if (line.bypassed.length > 0) return `${line.bypassed.join(", ")} bypassed`;
  if (line.driving.length > 0) return `${line.driving.join(" → ")} driving`;
  return "no module driving";
}
</script>

<div class="toasts">
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
  /* Rising off the top of the dash, newest at the bottom. */
  .toasts {
    position: fixed;
    left: 12px;
    bottom: 128px;
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
  @keyframes slide {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
