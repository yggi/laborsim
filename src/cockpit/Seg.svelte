<script lang="ts">
/**
 * A seven-segment LED readout — the numeric window under a dial.
 *
 * Every number on this machine that is not a mechanical counter reads out here,
 * because a panel has exactly two ways of showing a number: drums that turn, or
 * segments that light. Set text on a coloured rectangle is a third way, and it
 * is the one that belongs to websites.
 *
 * **Drawn, not typeset.** The obvious move is a seven-segment webfont; this
 * draws the seven bars instead, and it is the better tool for three reasons.
 * The unlit segments become *real* — a display shows a ghostly `88.8` behind
 * whatever it is showing, because the dark bars do not go away, and that ghost
 * is what the eye reads as an LED more than the digit shapes are. It costs no
 * font file, against a mobile byte budget that is still an open question
 * (`NOTES`). And it is the argument in `instrument-rendering.md` exactly:
 * character goes in SVG, which scales to any DPI and costs nothing at runtime.
 *
 * Red by default, because that is what these were before green got cheap. A
 * manufacturer may set `--mfg-seg` and have its own colour.
 */
const {
  value,
  mask = "888",
}: {
  /** Already formatted. Right-aligned into the window, as a real one is. */
  value: string;
  /**
   * The window itself, written as every segment lit: `888`, `88.8`, `88`. It
   * sets the width *and* the ghost, which is why it is one prop and not two —
   * a ghost that does not line up with the reading is worse than none, and a
   * decimal point has to sit in the same place in both layers.
   */
  mask?: string;
} = $props();

/** Which of the seven bars each character lights. */
const DIGITS: Record<string, string> = {
  0: "abcdef",
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgedc",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
  "-": "g",
  " ": "",
};

/** Digit cell geometry. Bars are chamfered, the way an LED die actually is. */
const W = 11;
const H = 19;
/** Half the bar thickness. */
const M = 1.05;

const hbar = (y: number): string => {
  const x0 = 1.3;
  const x1 = W - 1.3;
  return `M${x0 + M} ${y - M} H${x1 - M} L${x1} ${y} L${x1 - M} ${y + M} H${x0 + M} L${x0} ${y} Z`;
};
const vbar = (x: number, y0: number, y1: number): string =>
  `M${x} ${y0 + M} L${x + M} ${y0} L${x + 2 * M} ${y0 + M} V${y1 - M} L${x + M} ${y1} L${x} ${y1 - M} Z`;

const BARS: Record<string, string> = {
  a: hbar(1.6),
  g: hbar(H / 2),
  d: hbar(H - 1.6),
  f: vbar(0.4, 2.8, H / 2 - 1.2),
  b: vbar(W - 2.5, 2.8, H / 2 - 1.2),
  e: vbar(0.4, H / 2 + 1.2, H - 2.8),
  c: vbar(W - 2.5, H / 2 + 1.2, H - 2.8),
};
const ORDER = ["a", "b", "c", "d", "e", "f", "g"];

/** Right-aligned, and never wider than the window it is bolted into. */
const shown = $derived(value.slice(-mask.length).padStart(mask.length, " "));

const DOT_W = 4;
const GAP = 1.5;
const cellWidth = (isDot: boolean) => (isDot ? DOT_W : W) + GAP;

/** One cell per mask character: a digit position, or a decimal point. */
const cells = $derived(
  [...mask].map((m, i) => {
    const dot = m === ".";
    return {
      dot,
      lit: DIGITS[shown[i] ?? " "] ?? "",
      on: dot && shown[i] === ".",
      x: [...mask].slice(0, i).reduce((sum, c) => sum + cellWidth(c === "."), 0),
    };
  }),
);

const width = $derived([...mask].reduce((sum, c) => sum + cellWidth(c === "."), 0));
</script>

<span class="seg" role="img" aria-label={value.trim() || "blank"}>
  <svg viewBox="0 0 {width} {H}" style="width: {width * 0.64}px" aria-hidden="true">
    {#each cells as cell, i (i)}
      <!-- Slanted, because every one of these is. -->
      <g transform="translate({cell.x} 0) skewX(-4)">
        {#if cell.dot}
          <!-- The point is a segment too: dark when unused, lit when it is. -->
          <circle class={cell.on ? "on" : "off"} cx={DOT_W / 2} cy={H - 1.8} r="1.3" />
        {:else}
          {#each ORDER as bar (bar)}
            <path class={cell.lit.includes(bar) ? "on" : "off"} d={BARS[bar]} />
          {/each}
        {/if}
      </g>
    {/each}
  </svg>
</span>

<style>
  .seg {
    display: inline-block;
    padding: 3px 4px 2px;
    border-radius: 1px;
    /* A window cut in the panel, with the display sunk behind it. The faint
       warm cast is the filter every one of these has over the LEDs. */
    background:
      radial-gradient(
        120% 140% at 50% 0%,
        color-mix(in srgb, var(--mfg-seg, #ff2d16) 7%, transparent),
        transparent 70%
      ),
      #120a09;
    border: 1px solid #2a1512;
    box-shadow:
      inset 0 2px 4px rgba(0, 0, 0, 0.9),
      0 1px 0 rgba(255, 255, 255, 0.18);
    line-height: 0;
  }
  svg {
    display: block;
    height: auto;
  }
  /* An unlit bar is still a bar. That is the whole illusion. */
  .off {
    fill: color-mix(in srgb, var(--mfg-seg, #ff2d16) 10%, transparent);
  }
  .on {
    fill: var(--mfg-seg, #ff2d16);
    filter: drop-shadow(
      0 0 1.4px color-mix(in srgb, var(--mfg-seg, #ff2d16) 80%, transparent)
    );
  }
</style>
