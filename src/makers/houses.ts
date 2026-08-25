/**
 * Who built the thing, and everything about how their kit presents itself:
 * colours, marks, the words they use, the things they say to you — and what
 * they sound like.
 *
 * It has moved twice, and the second move is the interesting one. It was in
 * `src/ui/`, then in `src/cockpit/` when the cockpit became a registry of
 * components. Now **two renderers read it**: the cab draws a plate in a maker's
 * colours and the audio engine voices a machine in its maker's sound
 * (`sound.ts`). A house belongs to neither of them — `cockpit/` holds what the
 * manufacturers *made*, and this is who they *are* — so it sits above both,
 * where the cab and the ear can each read it without importing the other.
 *
 * One house per maker, not one table per surface. Colours, words and sound
 * keyed separately by the same name would be three places to edit a
 * manufacturer into existence and three places for it to drift, which is the
 * defect the component registry was contracted out of (`cockpit/parts.ts`). It
 * is also what L-049 hands a blind author: **one object is one manufacturer.**
 *
 * The rail is a rack of equipment bought from different manufacturers, and it
 * should read that way. It is cosmetic, and it is doing real work — a uniform
 * grid of identical rows reads as a menu the game drew, and a mixed rack reads
 * as hardware somebody bolted in.
 */

import type { SoundHouse } from "./sound.ts";

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
  /**
   * What this maker's machines sound like. Timbre and rate only — never level,
   * and never what a quantity means. See `sound.ts` for the whole argument.
   */
  readonly sound: SoundHouse;
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
    // A diesel from three generations ago, and it is the reference the other two
    // are heard against: lumpy, detuned by wear, and it sags hard when you ask
    // it for something. Every number here was the whole engine before houses
    // existed, which is why nothing about the machine changed when they did.
    sound: {
      drive: {
        wave: "sawtooth",
        idleHz: 56,
        spanHz: 52,
        droopHz: 12,
        airHz: 15,
        // Worn, and it has never been balanced. You can hear the beat at idle.
        detune: 14,
        // One firing per two turns, cut deep: a big slow lump of an engine.
        beats: 0.5,
        beat: 0.34,
        cutIdle: 340,
        cutLoaded: 2600,
        cutAir: 1500,
        resonance: 3,
      },
      // Bare steel plates on a chain that has done twenty years, and every link
      // sounds slightly unlike the one before it.
      gear: {
        clankHz: 380,
        clankDecay: 0.075,
        clankGrit: 0.78,
        clankSpread: 0.3,
        squeakHz: 2400,
        squeakQ: 14,
        squeakSweep: 0.22,
      },
      // Sheet steel panels and a toolbox nobody latched.
      rattle: { hz: 900, q: 1.2 },
      // A pressed-steel buzzer wired straight to the annunciator relay.
      alarm: { wave: "square", warnHz: 620, alarmHz: 990 },
      // Sprung steel with a long throw, and a contactor the size of a fist
      // behind it. You can hear the difference between having pressed the
      // button and having actually switched something, which is the point.
      panel: {
        clickHz: 1500,
        clickDecay: 0.035,
        clickGrit: 0.72,
        clunkHz: 155,
        clunkDecay: 0.14,
        clunkGrit: 0.5,
      },
      // Three trumpets on the cab roof, plumbed into the same air line as the
      // brakes, tuned to a major triad by somebody who did not think of it as
      // tuning. It is the loudest thing the machine can do on purpose, and the
      // only one aimed at other people.
      horn: {
        hz: 214,
        chord: [1, 1.25, 1.5],
        wave: "sawtooth",
        cutoff: 3400,
        resonance: 5,
        spread: 8,
        waver: 11,
        waverHz: 5.4,
        attack: 0.05,
        release: 0.26,
        bend: 0.07,
        chuff: 0.55,
        chuffHz: 2400,
      },
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
    // Nothing on the machine is TOWA's yet, and the house is complete anyway —
    // that is what makes the shape real rather than promised. A TOWA drive is
    // electric: it holds its speed under load, so it barely droops, and there is
    // no firing to hear. What you get instead is inverter whine, which is the
    // same fact from the other side — smooth, high, and it tells you almost
    // nothing about how hard the machine is working. Sold as refinement.
    sound: {
      drive: {
        wave: "triangle",
        idleHz: 96,
        spanHz: 84,
        droopHz: 3,
        airHz: 22,
        detune: 4,
        beats: 1,
        beat: 0.05,
        cutIdle: 800,
        cutLoaded: 3400,
        cutAir: 2600,
        resonance: 6,
      },
      // Rubber-padded plates, machined to a tolerance, on sealed bearings. It
      // is quieter and it is *even*, which reads as new rather than as good.
      gear: {
        clankHz: 260,
        clankDecay: 0.05,
        clankGrit: 0.55,
        clankSpread: 0.08,
        squeakHz: 3200,
        squeakQ: 20,
        squeakSweep: 0.08,
      },
      // Moulded trim on clips. It does not clank, it buzzes.
      rattle: { hz: 1600, q: 2.1 },
      // A moulded piezo sounder. Polite, and impossible to take seriously.
      alarm: { wave: "sine", warnHz: 700, alarmHz: 1180 },
      // A membrane over a dome switch, and a solid-state relay that makes no
      // noise at all — so the clunk is barely there, and what you get instead
      // is a tick with nothing behind it. Whether that is refinement or a
      // machine that will not tell you what it did is left to the operator.
      panel: {
        clickHz: 2900,
        clickDecay: 0.014,
        clickGrit: 0.55,
        clunkHz: 420,
        clunkDecay: 0.03,
        clunkGrit: 0.35,
      },
      // Not an air horn at all: a moulded sounder behind a grille, an octave
      // apart, with an electronic attack and no air to let go of. It carries
      // about as far as a doorbell, which TOWA would describe as considerate.
      horn: {
        hz: 660,
        chord: [1, 2],
        wave: "triangle",
        cutoff: 5200,
        resonance: 2,
        spread: 2,
        waver: 0,
        waverHz: 6,
        attack: 0.012,
        release: 0.09,
        bend: 0.01,
        chuff: 0,
        chuffHz: 4000,
      },
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
    // HANSA does not build chassis, and it gets a complete house regardless: a
    // maker's parts have to be voiceable wherever they are bolted, and a table
    // with a hole in it is a table that fails at the worst moment. Its character
    // is the one it stamps on everything — hard, even, and precisely in tune.
    sound: {
      drive: {
        wave: "square",
        idleHz: 64,
        spanHz: 46,
        droopHz: 7,
        airHz: 12,
        // Balanced to a standard. Two cents, and there is a certificate for it.
        detune: 2,
        beats: 1,
        beat: 0.22,
        cutIdle: 500,
        cutLoaded: 3000,
        cutAir: 1900,
        resonance: 4,
      },
      // Hardened steel, ground flat, and inspected. Every link is the same link.
      gear: {
        clankHz: 620,
        clankDecay: 0.06,
        clankGrit: 0.66,
        clankSpread: 0.04,
        squeakHz: 1900,
        squeakQ: 12,
        squeakSweep: 0.12,
      },
      rattle: { hz: 1200, q: 1.6 },
      // Two tones a fifth apart, to a standard, as klaxons have been since 1954.
      alarm: { wave: "square", warnHz: 660, alarmHz: 880 },
      // Machined, short-throw, and utterly unambiguous: one hard clack going in
      // and another coming out, with a relay that shuts the same way every time
      // because a guard whose state you cannot hear is a guard you have to look
      // at.
      panel: {
        clickHz: 2100,
        clickDecay: 0.022,
        clickGrit: 0.8,
        clunkHz: 240,
        clunkDecay: 0.075,
        clunkGrit: 0.62,
      },
      // The same interval again, in brass this time, because the standard is
      // the standard. Harder-edged and quicker to speak than the KIBA, with the
      // shortest release of the three: HANSA does not believe in a note that
      // carries on after the switch has been let go.
      horn: {
        hz: 330,
        chord: [1, 1.5],
        wave: "square",
        cutoff: 4200,
        resonance: 7,
        spread: 3,
        waver: 4,
        waverHz: 6.8,
        attack: 0.03,
        release: 0.14,
        bend: 0.04,
        chuff: 0.3,
        chuffHz: 3200,
      },
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
