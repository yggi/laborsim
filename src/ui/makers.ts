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
}

const DEFAULT: MakerStyle = {
  wordmark: "UNMARKED",
  plate: "#1b1f22",
  bezel: "#0d1012",
  face: "#c6d0cb",
  accent: "#6fe3c4",
  layout: "strip",
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
  },
  // Navigation electronics. Lighter, newer, sold separately — and it looks it.
  "TOWA DENKI": {
    wordmark: "TOWA DENKI",
    plate: "#161f26",
    bezel: "#0b1114",
    face: "#cfe6ef",
    accent: "#6fe3c4",
    layout: "stack",
  },
  // Safety kit from a maker with lawyers. Orange, boxed, and slightly smug.
  "HANSA REGELTECHNIK": {
    wordmark: "HANSA REGELTECHNIK",
    plate: "#241c14",
    bezel: "#120c07",
    face: "#f2ded0",
    accent: "#f07b2a",
    layout: "boxed",
  },
};

export const styleOf = (maker: string): MakerStyle => MAKERS[maker] ?? DEFAULT;
