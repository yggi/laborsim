<script lang="ts">
/**
 * Mechanical rolling digits — the third display primitive, after `Seg` and
 * `Matrix`, and the one for a number that *accumulates*.
 *
 * That is the whole distinction, and it is a real one on a real machine: seven
 * segments show a reading, a matrix shows a message, and a drum shows a total
 * that only ever goes up. Hours run. Ground covered. Neither has ever been
 * displayed any other way on a piece of plant, because the number outlives the
 * electronics and a wheel keeps its count with the power off.
 *
 * Three things make it readable where a plain number is not:
 *
 * 1. Each place animates from its old digit to its new one over a **fixed**
 *    110 ms whenever the digit actually changes. Deriving the offset from the
 *    value's fraction instead would tie the animation to the source: slow the
 *    source and digits freeze half-rolled.
 * 2. Pass `rate` (units per second) and places spinning faster than the eye can
 *    follow are faded and blurred rather than shown as a smear. Since each place
 *    moves 10× slower than the one to its right, there is always some place
 *    ticking legibly, and the front of legible motion walks left as the value
 *    speeds up.
 * 3. Leading zeros are greyed, not hidden, so the block keeps a fixed width and
 *    the digits never shuffle sideways. A leading digit brightens as the value
 *    climbs toward it, so it arrives rather than pops.
 *
 * On rule 3 and per-frame work: this drives a `requestAnimationFrame` loop, but
 * only *while a digit is mid-roll* — 110 ms after a change, then it stops. The
 * ban is on instruments subscribing to sim state at frame rate; this reads a
 * snapshot value like everything else and animates its own presentation.
 *
 * Adapted from a standalone component. Theming, all namespaced per the theme
 * contract: `--mfg-odo-color`, `--mfg-odo-label`, `--mfg-odo-accent`,
 * `--mfg-odo-font`.
 */
import { fly } from "svelte/transition";

const {
  value = 0,
  rate = 0,
  digits = 5,
  decimals = 0,
  height = 18,
  hideLeading = true,
  prefix = "",
  epoch = 0,
  label = "value",
}: {
  /** The number to display. */
  value?: number;
  /**
   * Units per second. Only used to decide which places are legible; pass 0 for
   * a value that changes by user action rather than continuously.
   */
  rate?: number;
  /** Integer places. */
  digits?: number;
  /**
   * Fractional places. The point costs no column — it is drawn on the seam
   * between two digits, so `00` and `0.0` are the same width.
   */
  decimals?: number;
  /** Pixel height of one digit; the face scales to it. */
  height?: number;
  /** Grey the leading zeros. */
  hideLeading?: boolean;
  /**
   * A character rendered as an extra column before the digits — a unit or an
   * axis name. It is a column OF the reel, so it shares the digits' baseline
   * and metrics exactly.
   */
  prefix?: string;
  /**
   * Change this and the whole reel is replaced with a horizontal slide — for
   * when the number starts meaning something different rather than merely
   * changing.
   */
  epoch?: number;
  /** Accessible name. The rolling digits themselves are hidden: they read as
   *  noise to a screen reader. */
  label?: string;
} = $props();

/** ms per digit roll, identical for every place. */
const ROLL = 110;
/** em per digit column, the natural monospace advance. */
const ADV = 0.62;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const digitAt = (v: number, p: number): number =>
  ((Math.floor(v / 10 ** p) % 10) + 10) % 10;

const shown = $derived(Math.max(0, value));
const cols = $derived(digits + decimals);
const width = $derived((cols + (prefix ? 1 : 0)) * ADV);

interface Roll {
  from: number;
  to: number;
  start: number;
}
let roll = $state<Roll[]>([]);
/** Bumped each frame while anything is in flight, to recompute `places`. */
let beat = $state(0);
let raf = 0;

function pump() {
  raf = 0;
  beat++;
  if (roll.some((r) => performance.now() - r.start < ROLL)) {
    raf = requestAnimationFrame(pump);
  }
}

$effect(() => {
  const v = shown;
  const now = performance.now();
  let moved = false;
  for (let i = 0, p = digits - 1; p >= -decimals; p--, i++) {
    const d = digitAt(v, p);
    const current = roll[i];
    if (!current) roll[i] = { from: d, to: d, start: now - ROLL };
    else if (current.to !== d) {
      // A roll still in flight starts the next one from where it has got to.
      roll[i] = { from: current.to, to: d, start: now };
      moved = true;
    }
  }
  if (moved && !raf) raf = requestAnimationFrame(pump);
});

$effect(() => () => cancelAnimationFrame(raf));

const places = $derived.by(() => {
  beat; // recompute while rolling
  const v = shown;
  const now = performance.now();
  const out: {
    p: number;
    d: number;
    next: number;
    shift: number;
    open: number;
    lead: number;
  }[] = [];
  for (let i = 0, p = digits - 1; p >= -decimals; p--, i++) {
    const scale = 10 ** p;
    // Effects run after the first paint, so fall back to the live digit rather
    // than to zero — otherwise the first frame shows all zeros.
    const d = digitAt(v, p);
    const r = roll[i] ?? { from: d, to: d, start: now - ROLL };
    const t = Math.min(1, Math.max(0, (now - r.start) / ROLL));
    const spin = Math.abs(rate) / scale;
    out.push({
      p,
      d: r.from,
      next: r.to,
      shift: t * t * (3 - 2 * t),
      open: 1 - smooth(6, 30, spin),
      lead: !hideLeading || p <= 0 ? 1 : 0.24 + 0.76 * smooth(scale * 0.85, scale, v),
    });
  }
  return out;
});
</script>

<span
  class="odo"
  role="img"
  aria-label="{label}: {value.toFixed(decimals)}"
  style="height: {height}px; font-size: {(height * 0.74).toFixed(1)}px;
         width: {width.toFixed(2)}em; --mfg-adv: {ADV}em"
>
  {#key epoch}
    <!-- Fixed width, reels stacked absolutely: on an epoch change both are
         mounted at once, and laid out inline the box would grow and collapse
         instead of one sliding past the other. -->
    <span
      class="reel"
      in:fly={{ x: 22, duration: 240 }}
      out:fly={{ x: -22, duration: 240 }}
    >
      {#if prefix}
        <span class="col lab" style="height: {height}px; line-height: {height}px">
          {prefix}
        </span>
      {/if}

      {#each places as pl (pl.p)}
        {#if pl.p === -1}
          <span class="pt" style="height: {height}px; line-height: {height}px">
            <i>.</i>
          </span>
        {/if}
        <span
          class="col"
          style="height: {height}px;
                 opacity: {((0.18 + 0.82 * pl.open) * pl.lead).toFixed(3)};
                 filter: blur({((1 - pl.open) * 1.6).toFixed(2)}px)"
        >
          <span class="strip" style="transform: translateY({-pl.shift * 50}%)">
            <span style="height: {height}px; line-height: {height}px">{pl.d}</span>
            <span style="height: {height}px; line-height: {height}px">{pl.next}</span>
          </span>
        </span>
      {/each}
    </span>
  {/key}
</span>

<style>
  /* A typewriter face rather than the surrounding UI font: the digits should
     read as stamped on a wheel. `slashed-zero` applies where the font carries
     it; a hand-drawn slash reads worse than a plain zero, so there is no
     fallback. */
  .odo {
    position: relative;
    display: inline-block;
    overflow: hidden;
    font-family: var(
      --mfg-odo-font,
      "Roboto Mono",
      "DejaVu Sans Mono",
      "Liberation Mono",
      "Courier New",
      ui-monospace,
      monospace
    );
    font-weight: 700;
    letter-spacing: 0;
    font-variant-numeric: tabular-nums slashed-zero;
    font-feature-settings:
      "tnum" 1,
      "zero" 1;
  }
  .reel {
    position: absolute;
    inset: 0;
    display: inline-flex;
    align-items: flex-start;
  }
  .col {
    display: block;
    width: var(--mfg-adv);
    overflow: hidden;
  }
  .strip {
    display: block;
    will-change: transform;
  }
  .strip span {
    display: block;
    text-align: center;
    color: var(--mfg-odo-color, #ece7db);
  }
  .col.lab {
    color: var(--mfg-odo-label, #6b7580);
    font-weight: 400;
    opacity: 0.8;
    text-align: center;
  }
  /* Zero WIDTH but a full line box: the glyph is real and sits on the digits'
     baseline while costing no column. A zero-height box puts it above the reel,
     where overflow:hidden eats it. */
  .pt {
    position: relative;
    display: block;
    width: 0;
  }
  .pt i {
    position: absolute;
    left: -0.5em;
    top: 0;
    width: 1em;
    text-align: center;
    font-style: normal;
    color: var(--mfg-odo-color, #ece7db);
  }
</style>
