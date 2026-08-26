/**
 * What the site is made of.
 *
 * The axis that was missing. Everything about a piece of site furniture used to
 * be a lookup keyed on its **kind** — `PROP_SPEC` for mass and price, `PROP_BOX`
 * for its collider, a table in `audio/voices.ts` for its voice, and an if/else
 * chain in `render/scene.ts` for its art. Four places, one of them silent: a new
 * kind that forgot the renderer drew a boulder and said nothing. That cost is
 * why the inventory never grew past five kinds and a scooter.
 *
 * A prop is a **part list over materials** (`props.ts`), and the material
 * decides the three things a kind should never have to state for itself: how it
 * rings when it is struck, how it comes apart when it is written off, and what
 * colour it is. Adding a kind is now a part list. Adding a material is one row
 * here. Nothing falls through to a default, because there is no default left.
 *
 * **These are stock, not chemistry.** A scaffold tube and a steel plate are one
 * metal and two entirely different things to hit — one rings and one screeches —
 * and everything this table decides follows the section rather than the alloy.
 * That is why `tube` sits beside `steel` without embarrassment.
 *
 * Architecture rule 2: arithmetic and `sqrt` only. No transcendentals reach a
 * collider transform or a replayed voice from here.
 */

import { MAX_TRACK_SPEED } from "../core/spec.ts";

export type MaterialId =
  | "steel"
  | "tube"
  | "plastic"
  | "concrete"
  | "timber"
  | "glass"
  | "rubber"
  | "ballast"
  | "stone";

/**
 * A body ringing, as the ear meets it. Three numbers, and they are quoted at a
 * **reference size** — see `RING_REF_MASS` in `audio/voices.ts`. A big thing of
 * the same stuff rings lower and longer, and that is derived rather than typed
 * out per kind, which is what makes a fourteen-kind inventory affordable.
 */
export interface Ring {
  /** Where it rings at the reference mass, Hz. */
  readonly hz: number;
  /** Seconds to silence at the reference mass, at a light touch. */
  readonly decay: number;
  /** 0–1 — how much of it is noise rather than tone. Plastic against steel. */
  readonly grit: number;
}

/**
 * What it sounds and looks like **coming apart** — the failure, not the strike.
 *
 * One mechanism for all of it: a **grain cloud**. Every failure this game has a
 * word for is some number of small transients scattered over some window, and
 * the words are what you get when you turn four dials:
 *
 * | reads as | grains | window | spread | regular |
 * |---|---|---|---|---|
 * | metal screeching | many | long | narrow | **high** |
 * | glass shattering | very many | short | wide | none |
 * | wood splintering | few | medium | wide | none |
 * | concrete crumbling | some | medium | wide | none |
 * | a sandbag landing | many | short | narrow | none |
 *
 * A screech is stick–slip: a *dense, regular* grain train, which is why it
 * belongs in the same mechanism as a shatter rather than beside it. That is the
 * same argument the bogie knock and the chain link already make for reusing one
 * transient — not a saving, the honest shape.
 */
export interface Rubble {
  /** Transients the failure is made of, at full energy. */
  readonly grains: number;
  /** Seconds they are spread over. */
  readonly window: number;
  /** Grain pitch, as a multiple of the body's own ring. */
  readonly pitch: number;
  /** 0–1: how far apart in pitch the grains are scattered. */
  readonly spread: number;
  /** 0 scattered (a shatter) · 1 metronomic (a screech). */
  readonly regular: number;
  /** 0–1: noise fraction of one grain. */
  readonly grit: number;
  /** 0–1: how much of the failure comes off as dust rather than as pieces. */
  readonly dust: number;
}

export interface MaterialSpec {
  /** What the rig calls the stuff, if it ever has to. */
  readonly label: string;
  /**
   * Fraction of `½·m·v_max²` this stuff absorbs before it is written off.
   *
   * **This is the whole toughness column, and it is a fraction rather than a
   * number of joules on purpose.** A heavy machine hitting a light object cannot
   * put more than about `½·m·v²` into it — the object simply leaves at roughly
   * the machine's speed — so a 6 kg cone can absorb at most 15 J from a 6.2 t
   * machine at 2.2 m/s, however hard that sounds. Rating that cone at 22 J once
   * made it **indestructible by any means the game has**, and the fix was not a
   * better number, it was never letting a toughness be typed in again.
   *
   * A fraction above 1 therefore means *this does not break*, deliberately and
   * visibly — see `ballast`.
   */
  readonly tough: number;
  /** Being struck. */
  readonly ring: Ring;
  /** Coming apart. */
  readonly rubble: Rubble;
  /**
   * Drawn colour.
   *
   * The site is nobody's house (`doc/design/cab/sound.md`): a pipe stack is
   * steel whoever stacked it, and a chassis manufacturer deciding what a boulder
   * looks like is as wrong as one deciding what it sounds like. So the material
   * owns its look for the same reason it owns its voice, and `render/scene.ts`
   * builds one toon material per row rather than guessing a palette per kind.
   */
  readonly colour: number;
  /** Rim light for the toon material. Brighter for anything that should read
   *  as glossy; near the body colour for anything dead. */
  readonly rim: number;
}

export const MATERIAL: Record<MaterialId, MaterialSpec> = {
  // Plate, sheet, frame. It does not ring, it *yields* — and a yielding sheet
  // is stick–slip, which is the screech.
  steel: {
    label: "steel",
    tough: 0.6,
    ring: { hz: 236, decay: 0.32, grit: 0.5 },
    rubble: {
      grains: 26,
      window: 0.55,
      pitch: 2.2,
      spread: 0.12,
      regular: 0.9,
      grit: 0.45,
      dust: 0.05,
    },
    colour: 0x93a3ab,
    rim: 0xffffff,
  },
  // Hollow section: scaffold, marker pole, drainage pipe. The one thing on site
  // that genuinely **dings**, and the only material whose failure is fewer
  // grains rather than more — a tube does not shatter, it clatters.
  tube: {
    label: "steel tube",
    tough: 0.55,
    ring: { hz: 240, decay: 0.6, grit: 0.28 },
    rubble: {
      grains: 3,
      window: 0.34,
      pitch: 1,
      spread: 0.06,
      regular: 0.5,
      grit: 0.14,
      dust: 0.03,
    },
    colour: 0x8d9aa2,
    rim: 0xffffff,
  },
  // Cone bodies, barrier planks. Thin, and a tick rather than a note.
  plastic: {
    label: "plastic",
    tough: 0.42,
    ring: { hz: 245, decay: 0.17, grit: 0.78 },
    rubble: {
      grains: 5,
      window: 0.16,
      pitch: 1.7,
      spread: 0.5,
      regular: 0.1,
      grit: 0.85,
      dust: 0.1,
    },
    colour: 0xdca42a,
    rim: 0xffe9a8,
  },
  // Kerbs, blocks, panels. Dead when struck and a cloud when it goes.
  concrete: {
    label: "concrete",
    tough: 0.28,
    ring: { hz: 205, decay: 0.09, grit: 0.9 },
    rubble: {
      grains: 12,
      window: 0.45,
      pitch: 0.8,
      spread: 0.5,
      regular: 0.1,
      grit: 0.9,
      dust: 0.9,
    },
    colour: 0xa9a89c,
    rim: 0xd8e4ea,
  },
  // Pallets, crates, cable-drum cheeks. A knock, then a tearing of long fibres.
  timber: {
    label: "timber",
    tough: 0.4,
    ring: { hz: 300, decay: 0.13, grit: 0.7 },
    rubble: {
      grains: 9,
      window: 0.3,
      pitch: 1.5,
      spread: 0.55,
      regular: 0.15,
      grit: 0.65,
      dust: 0.2,
    },
    colour: 0xa9793f,
    rim: 0xf0cf9a,
  },
  // The one that goes at a touch, and the loudest thing on site per joule.
  glass: {
    label: "glass",
    tough: 0.05,
    ring: { hz: 1180, decay: 0.35, grit: 0.35 },
    rubble: {
      grains: 40,
      window: 0.35,
      pitch: 2.6,
      spread: 0.8,
      regular: 0,
      grit: 0.4,
      dust: 0.35,
    },
    colour: 0x9fe8f2,
    rim: 0xffffff,
  },
  // Tyres, cone bases, buffers. It absorbs rather than rings, and it does not
  // break — it just goes somewhere else.
  rubber: {
    label: "rubber",
    tough: 0.9,
    ring: { hz: 96, decay: 0.05, grit: 0.98 },
    rubble: {
      grains: 1,
      window: 0.05,
      pitch: 0.9,
      spread: 0,
      regular: 0,
      grit: 1,
      dust: 0.05,
    },
    colour: 0x22282a,
    rim: 0x7fbcd0,
  },
  /**
   * Sand and gravel in a bag. **`tough` is above 1 on purpose.**
   *
   * The machine cannot destroy it at any speed it has, and that is the point:
   * the inventory needs one honest thing that only ever *moves*, so that
   * "everything here breaks" is a claim the site can be seen to falsify. It is
   * also the reason `tough` is a fraction — a number of joules could express
   * this only by accident, and did, once.
   */
  ballast: {
    label: "ballast",
    tough: 1.2,
    ring: { hz: 74, decay: 0.04, grit: 1 },
    rubble: {
      grains: 14,
      window: 0.2,
      pitch: 0.6,
      spread: 0.4,
      regular: 0,
      grit: 1,
      dust: 1,
    },
    colour: 0xb2a487,
    rim: 0xd6d2c0,
  },
  // Landscape. It is the ground with a different shape, so it never emits and
  // is never billed — the row exists so that the record stays total.
  stone: {
    label: "stone",
    tough: 2,
    ring: { hz: 150, decay: 0.12, grit: 0.95 },
    rubble: {
      grains: 8,
      window: 0.3,
      pitch: 0.9,
      spread: 0.5,
      regular: 0.05,
      grit: 0.95,
      dust: 0.7,
    },
    colour: 0x6f7468,
    rim: 0xbcd6e2,
  },
};

/**
 * The most energy the drivetrain can put into a body of this mass, joules.
 *
 * `½·m·v_max²`, and it is the ceiling every toughness is a fraction of. Exported
 * because the test that proves nothing is accidentally indestructible needs the
 * same number the derivation uses.
 */
export const deliverable = (mass: number): number =>
  0.5 * mass * MAX_TRACK_SPEED * MAX_TRACK_SPEED;

/** Joules this much of this stuff absorbs before it is written off. */
export const toughnessOf = (material: MaterialId, mass: number): number =>
  MATERIAL[material].tough * deliverable(mass);
