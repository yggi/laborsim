/**
 * Who built the thing in the slot, and everything about how their kit presents
 * itself: colours, marks, the words they use, and the things they say to you.
 *
 * Moved here from `src/ui/` when the cockpit stopped being a set of panels and
 * became a registry of components (`docs/design/components.md`). `src/ui/` is
 * the application shell; this is the cab and what is bolted into it.
 *
 * The rail is a rack of equipment bought from different manufacturers, and it
 * should read that way. It is cosmetic, and it is doing real work — a uniform
 * grid of identical rows reads as a menu the game drew, and a mixed rack reads
 * as hardware somebody bolted in.
 */

export type Layout =
  /** Wordmark beside a wide label, meters to the right. Utilitarian OEM kit. */
  | "strip"
  /** Centred label on a dark plate, meters under it. Consumer electronics. */
  | "stack"
  /** Label in a boxed field with a hazard edge. Safety gear. */
  | "boxed";

/**
 * How a maker words the states every component shares.
 *
 * Severity crosses the snapshot boundary as a number (`control/bus.ts`) exactly
 * so that the *word* can live here, where it is a design decision rather than
 * sim state. HANSA says `STÖRUNG`; KIBA stamped `FAULT` into a plate in 1987 and
 * has not revisited it.
 */
export interface Lexicon {
  readonly on: string;
  readonly off: string;
  readonly fault: string;
  /** What this maker calls one of its own guards that has been switched off. */
  readonly bypassed: string;
}

/**
 * The maker's own voice.
 *
 * L.A.B.O.R. certifies and bills, and the ledger speaks in its register
 * (`docs/design/tone.md`). A manufacturer sells and warns, and this is the first
 * channel where one speaks for itself — the warranty notice when somebody
 * bypasses its safety kit, and the house safety tips.
 */
export interface Voice {
  /** Shown when one of this maker's safety components is deliberately bypassed. */
  readonly warranty: readonly [head: string, body: string];
  /** House nags. Not yet wired — they want the look-recentring QoL (NOTES). */
  readonly tips: readonly string[];
}

/**
 * The maker's mark, as an SVG path on a 16x16 grid.
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
  readonly lexicon: Lexicon;
  readonly voice: Voice;
}

const MAKERS: Record<string, MakerStyle> = {
  // The chassis OEM. Its own controls, in its own machine yellow, with the
  // stamped-steel look of something that came bolted in. KIBA is also the
  // fallback: an unmarked part reads as OEM kit until the grey-market maker
  // exists to claim it (docs/design/components.md).
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
    // Stamped into the plate decades ago and never revisited.
    lexicon: { on: "RUN", off: "OFF", fault: "FAULT", bypassed: "OFF" },
    voice: {
      warranty: ["KIBA WORKS", "You are responsible for this machine."],
      tips: [
        "KEEP YOUR EYES ON THE ROAD",
        "THE MACHINE DOES WHAT THE LEVERS SAY",
        "NO ONE IS COMING TO HELP YOU",
      ],
    },
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
    plateText: "TD-NAV1 · CLASS II",
    // Consumer electronics, so it is friendly and slightly overpromising.
    lexicon: { on: "ACTIVE", off: "STANDBY", fault: "CHECK", bypassed: "STANDBY" },
    voice: {
      warranty: ["TOWA DENKI", "Guidance unavailable while the unit is on standby."],
      tips: [
        "TOWA GUIDANCE — DRIVE WITH CONFIDENCE",
        "PLEASE OBSERVE THE ROUTE AHEAD",
        "SENSOR PERFORMANCE MAY VARY BY SITE",
      ],
    },
  },
  // Safety kit from a maker with lawyers. Orange, boxed, and slightly smug —
  // and *precise*: it is aftermarket, never a hackjob. It clashes by being too
  // correct for the machine it is bolted to.
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
    // German, because the firm is, and because a standard has one right word.
    lexicon: { on: "EIN", off: "AUS", fault: "STÖRUNG", bypassed: "ÜBERBRÜCKT" },
    voice: {
      warranty: [
        "HANSA REGELTECHNIK — GEWÄHRLEISTUNG",
        "Schutzeinrichtung überbrückt. Bypassing a certified guard voids this " +
          "component's warranty. The event has been recorded.",
      ],
      tips: [
        "SICHERHEIT ZUERST · SAFETY FIRST",
        "THE LIMIT IS THE LIMIT",
        "PRÜFZEICHEN 41-880 · DO NOT MODIFY",
      ],
    },
  },
};

/**
 * An unknown maker reads as KIBA: it is the chassis OEM and the house default,
 * so an unmarked part looks like the machine it came bolted to. When the
 * grey-market maker exists it takes over this slot with a character of its own —
 * hackjob is a *style*, not the absence of one.
 */
export const styleOf = (maker: string): MakerStyle =>
  MAKERS[maker] ?? (MAKERS["KIBA WORKS"] as MakerStyle);

/** Every maker with a house style, for the sandbox and the conformance tests. */
export const MAKER_NAMES: readonly string[] = Object.keys(MAKERS);
