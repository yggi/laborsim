/**
 * Who built the thing in the slot, and what their kit looks like.
 *
 * The rail is a rack of equipment bought from different manufacturers, and it
 * should read that way: different plate colours, different wordmarks, different
 * layouts. It is cosmetic, and it is doing real work — a uniform grid of
 * identical rows reads as a menu the game drew, and a mixed rack reads as
 * hardware somebody bolted in.
 *
 * Layouts stay deliberately few. This is a house style per manufacturer, not a
 * theming system: three makers, three plates, and a fourth needs a reason.
 */

export type Layout =
  /** Wordmark beside a wide label, meters to the right. Utilitarian OEM kit. */
  | "strip"
  /** Centred label on a dark plate, meters under it. Consumer electronics. */
  | "stack"
  /** Label in a boxed field with a hazard edge. Safety gear. */
  | "boxed";

/**
 * The manufacturer's mark, as an SVG path on a 16x16 grid.
 *
 * SVG rather than more CSS: this is graphic design, and the cheapest place to
 * put character without a combinatorial explosion of rules. See
 * docs/design/instrument-rendering.md for why the panels are DOM at all.
 */
export interface MakerStyle {
  /** Small type on the plate. Uppercase, as printed. */
  readonly wordmark: string;
  /** Faceplate background. */
  readonly plate: string;
  /** Screws and the bezel around the plate. */
  readonly bezel: string;
  /** Label type. */
  readonly face: string;
  /** LED, meters and the live edge. */
  readonly accent: string;
  readonly layout: Layout;
  /** The maker's mark, drawn on a 16x16 viewBox. */
  readonly mark: string;
  /** Silkscreen under the wordmark: model code, rating, standard. */
  readonly plateText: string;
}

const DEFAULT: MakerStyle = {
  wordmark: "UNMARKED",
  plate: "#1b1f22",
  bezel: "#0d1012",
  face: "#c6d0cb",
  accent: "#6fe3c4",
  layout: "strip",
  mark: "M3 8 h10 M8 3 v10",
  plateText: "NO PLATE",
};

const MAKERS: Record<string, MakerStyle> = {
  // The chassis OEM. Its own controls, in its own machine yellow, with the
  // stamped-steel look of something that came bolted in.
  "KIBA WORKS": {
    wordmark: "KIBA WORKS",
    plate: "#2b2a20",
    bezel: "#0d1012",
    face: "#efe2c0",
    accent: "#e8b53a",
    layout: "strip",
    // A fang. Kiba means fang, and the chassis is named for it.
    mark: "M8 2 L13 14 L8 10 L3 14 Z",
    plateText: "TYPE 3A · OEM FIT · MADE IN JAPAN",
  },
  // Navigation electronics. Lighter, newer, sold separately — and it looks it.
  "TOWA DENKI": {
    wordmark: "TOWA DENKI",
    plate: "#161f26",
    bezel: "#0b1114",
    face: "#cfe6ef",
    accent: "#6fe3c4",
    layout: "stack",
    // A swept bearing line. Navigation kit, and it wants you to know.
    mark: "M2 12 a6 6 0 0 1 12 0 M8 12 L12 5",
    plateText: "TD-NAV1 · 12–30 VDC · CLASS II",
  },
  // Safety kit from a maker with lawyers. Orange, boxed, and slightly smug.
  "HANSA REGELTECHNIK": {
    wordmark: "HANSA REGELTECHNIK",
    plate: "#241c14",
    bezel: "#120c07",
    face: "#f2ded0",
    accent: "#f07b2a",
    layout: "boxed",
    // A shield with a bar through it. Safety kit, from people with lawyers.
    mark: "M8 2 L14 5 V9 Q14 13 8 15 Q2 13 2 9 V5 Z M4 8 H12",
    plateText: "SG-2 · SIL 1 · PRÜFZEICHEN 41-880",
  },
};

export const styleOf = (maker: string): MakerStyle => MAKERS[maker] ?? DEFAULT;
