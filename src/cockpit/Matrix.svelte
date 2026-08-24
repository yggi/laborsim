<script lang="ts">
/**
 * A dot-matrix LCD — blue backlight, dark dots, the module's own little screen.
 *
 * The second general-purpose display primitive after `Seg`, and deliberately a
 * different *technology* rather than a different colour: seven segments can
 * show a number and nothing else, so a component with something to *say* needs
 * a matrix. That is a real distinction on a real panel, and it is the reason
 * TOWA's kit reads as newer than everything around it — dot-matrix character
 * modules are the part that dates a machine.
 *
 * Drawn, like `Seg`, so the unlit dots stay visible. On an STN panel the whole
 * grid is faintly there behind the text, and that grid is what the eye reads as
 * a screen; text on a blue rectangle is a `<div>` with a background colour.
 *
 * The glyphs are a 5x7 font, which is what these modules actually use. Only the
 * characters the cockpit needs are cut — a component that wants a letter this
 * font does not have should say something shorter.
 */
const {
  lines,
  cols = 8,
  lit = true,
}: {
  /** One string per row. Longer strings are cut, not wrapped: it is a window. */
  lines: readonly string[];
  /** Characters per row. Fixed, so the reading never reflows. */
  cols?: number;
  /**
   * Whether the backlight is on. An unpowered LCD is not a blue screen showing
   * nothing — it is a **dark grey rectangle**, because the backlight is what
   * makes it blue and the segments only show against it. Getting this wrong is
   * the single tell that a screen is a `<div>`.
   */
  lit?: boolean;
} = $props();

/**
 * 5x7 glyphs, one string of five bits per row, top to bottom.
 *
 * Hand-cut rather than imported: a full font is a dependency and a download,
 * and this needs thirty-odd characters. `MEMORY.md` § 9 — no further
 * dependencies without a reason, and "we might want W" is not one.
 */
const FONT: Record<string, readonly string[]> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

/** Dot pitch and size, in view units. */
const P = 2;
const R = 0.72;
/** One character is five dots wide and seven tall, plus a column of space. */
const CW = 6;
const CH = 8;

const rows = $derived(lines.map((line) => [...line.toUpperCase().slice(0, cols)]));

const dots = $derived.by(() => {
  const out: { x: number; y: number; on: boolean }[] = [];
  for (let r = 0; r < lines.length; r++) {
    const chars = rows[r] ?? [];
    for (let c = 0; c < cols; c++) {
      const glyph = FONT[chars[c] ?? " "] ?? FONT[" "];
      for (let gy = 0; gy < 7; gy++) {
        const bits = glyph?.[gy] ?? "00000";
        for (let gx = 0; gx < 5; gx++) {
          out.push({
            x: (c * CW + gx) * P + P / 2,
            y: (r * CH + gy) * P + P / 2,
            on: bits[gx] === "1",
          });
        }
      }
    }
  }
  return out;
});

const width = $derived(cols * CW * P);
const height = $derived(lines.length * CH * P);
</script>

<span class="matrix" class:dark={!lit} role="img" aria-label={lines.join(", ")}>
  <svg
    viewBox="0 0 {width} {height}"
    style="width: {width * 0.62}px"
    aria-hidden="true"
  >
    {#each dots as dot, i (i)}
      <circle class={dot.on ? "on" : "off"} cx={dot.x} cy={dot.y} r={R} />
    {/each}
  </svg>
</span>

<style>
  .matrix {
    display: inline-block;
    padding: 3px 4px;
    border-radius: 2px;
    /* Backlight leaking evenly out of a blue STN panel, brightest at the top
       where the lamp actually is. */
    background:
      linear-gradient(180deg, #2f6fd6 0%, #1f4fae 55%, #163c8b 100%);
    border: 1px solid #0b1c3e;
    box-shadow:
      inset 0 0 6px rgba(255, 255, 255, 0.28),
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      0 1px 0 rgba(255, 255, 255, 0.16);
    line-height: 0;
  }
  svg {
    display: block;
    height: auto;
  }
  /* The unlit grid. Present, faint, and the whole reason this reads as glass
     with a matrix behind it rather than as text on a blue box. */
  .off {
    fill: rgba(255, 255, 255, 0.13);
  }
  .on {
    fill: #f2f6ff;
  }
  /* No power: the backlight is off, so the panel is the colour of the polariser
     and the characters are only very faintly darker than the grid. */
  .matrix.dark {
    background: linear-gradient(180deg, #2b3033, #1c2124);
    border-color: #101416;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.55);
  }
  .matrix.dark .off {
    fill: rgba(255, 255, 255, 0.05);
  }
  .matrix.dark .on {
    fill: rgba(200, 210, 220, 0.16);
  }
</style>
