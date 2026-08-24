<script lang="ts">
/**
 * Small stickers and stamped marks — the things a real piece of equipment
 * accumulates and a designed one never has.
 *
 * A certification mark, a rating sticker, a QC stamp, a barcode. Individually
 * meaningless; together they are most of what separates a photograph of a
 * machine from a drawing of one, because nobody *designs* them onto a product —
 * they arrive from the test house, the factory line and the parts bin, each in
 * its own typeface, each stuck slightly crooked.
 *
 * That is also why this replaced the sentence of prose that used to sit on
 * every faceplate. A module has a manufacturer's label; it does not have a
 * slogan. The one honest sentence about what a component considers is still on
 * the module (`considers`) and belongs in the debrief, which is where this
 * machine is allowed to use words.
 *
 * **Seeded, never random.** The same component carries the same marks in every
 * run and every replay: rule 2 bans `Math.random` anywhere sim-visible, and
 * while a sticker is not sim state, kit that reprints its own certification
 * between replays of one recording is exactly the kind of detail that makes a
 * recording feel untrustworthy.
 */
const {
  kind,
  seed,
  tint = "currentColor",
  width = 26,
}: {
  kind: "pruef" | "rating" | "qc" | "bar";
  /** Anything stable — a module id. The marks are derived from it. */
  seed: string;
  tint?: string;
  /**
   * Rendered width in px. A prop rather than a CSS hook, because sizing it from
   * outside would need `:global` to reach the `<svg>` — and the theme contract
   * bans that for exactly the collision reason the `.bar` incident cost us.
   */
  width?: number;
} = $props();

/**
 * A small integer hash. Multiplication and xor only, same family as the terrain
 * hash, so it is portable and cheap and has no floating point in it at all.
 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const h = $derived(hash(seed));
/** `n` digits from the hash, as a string. */
const digits = $derived((n: number) => (h % 10 ** n).toString().padStart(n, "0"));
/** Bar widths for the barcode: 1, 2 or 3 units, walked out of the hash. */
const bars = $derived.by(() => {
  const out: { x: number; w: number }[] = [];
  let x = 0;
  let bits = h;
  for (let i = 0; i < 14 && x < 34; i++) {
    const w = (bits & 3) === 0 ? 2.5 : (bits & 1) === 1 ? 1 : 1.7;
    out.push({ x, w });
    x += w + ((bits >> 2) & 1 ? 1.6 : 1);
    bits = Math.imul(bits, 1103515245) + 12345;
  }
  return out;
});
</script>

{#if kind === "pruef"}
  <!-- A test-house mark: a stamped roundel with the house's letters and the
       certificate number round the bottom. The letters are always the same two;
       the number is the component's. -->
  <svg class="decal pruef" viewBox="0 0 26 26" style="color: {tint}; width: {width}px" aria-hidden="true">
    <circle class="ring" cx="13" cy="13" r="11.4" />
    <circle class="ring thin" cx="13" cy="13" r="9.4" />
    <text class="big" x="13" y="12" text-anchor="middle" dominant-baseline="middle">GS</text>
    <text class="tiny" x="13" y="19.4" text-anchor="middle">{digits(5)}</text>
  </svg>
{:else if kind === "rating"}
  <!-- A rating sticker: printed too small to read, which is what makes it read
       as a rating sticker. The lines are the text. -->
  <svg class="decal rating" viewBox="0 0 40 20" style="color: {tint}; width: {width}px" aria-hidden="true">
    <rect class="sticker" x="0.5" y="0.5" width="39" height="19" rx="1.5" />
    <text class="tiny" x="3" y="6.4">{digits(4)}-{digits(2)}</text>
    {#each [9.5, 12.5, 15.5] as y, i (y)}
      <line class="line" x1="3" y1={y} x2={34 - i * 7} y2={y} />
    {/each}
  </svg>
{:else if kind === "qc"}
  <!-- An inspector's pass stamp, rolled on with a rubber die and never quite
       square to anything. -->
  <svg class="decal qc" viewBox="0 0 30 16" style="color: {tint}; width: {width}px" aria-hidden="true">
    <rect class="stamp" x="1" y="1" width="28" height="14" rx="7" />
    <text class="mid" x="15" y="8.6" text-anchor="middle" dominant-baseline="middle">
      QC {digits(2)}
    </text>
  </svg>
{:else}
  <!-- A parts-bin barcode. Nobody reads it; every part has one. -->
  <svg class="decal bar" viewBox="0 0 36 14" style="color: {tint}; width: {width}px" aria-hidden="true">
    <rect class="sticker" x="0" y="0" width="36" height="14" rx="1" />
    {#each bars as b, i (i)}
      <rect class="ink" x={b.x + 1} y="2" width={b.w} height="8" />
    {/each}
    <text class="tiny" x="18" y="13" text-anchor="middle">{digits(6)}</text>
  </svg>
{/if}

<style>
  .decal {
    display: block;
    height: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  /* Stamped into the plate: an ink mark, not a printed one. */
  .ring {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.3;
    opacity: 0.75;
  }
  .ring.thin {
    stroke-width: 0.6;
    opacity: 0.5;
  }
  .big {
    fill: currentColor;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.02em;
    opacity: 0.85;
  }
  .mid {
    fill: #16161a;
    font-size: 7px;
    letter-spacing: 0.08em;
  }
  .tiny {
    fill: currentColor;
    font-size: 4px;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  /* Stuck on: a pale label with printing on it. */
  .sticker {
    fill: #d9d5c8;
    stroke: #9d998c;
    stroke-width: 0.6;
  }
  .rating .tiny,
  .bar .tiny {
    fill: #2a2820;
    opacity: 0.9;
  }
  .line {
    stroke: #4a4740;
    stroke-width: 1.1;
    opacity: 0.55;
  }
  .ink {
    fill: #24221c;
  }
  .stamp {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.2;
    opacity: 0.8;
  }
</style>
