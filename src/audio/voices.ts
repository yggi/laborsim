/**
 * What the machine sounds like, as arithmetic.
 *
 * **Nothing is sampled.** A clip is a black box triggered by an event; a synth
 * voice is another rendering of a simulated quantity, and every number below is
 * a function of something the sim already publishes and an instrument already
 * shows (`docs/design/damage.md`). If a voice cannot be traced back to a
 * quantity, it does not belong here — that is the inspectability pillar applied
 * to the one channel that reaches you when your eyes are on the ground.
 *
 * This file is deliberately free of WebAudio. It maps a snapshot to numbers;
 * `engine.ts` is the only thing that knows an oscillator exists. That split is
 * what makes the mapping testable in plain Node, and it is why the claims below
 * ("labouring sounds like labouring") are assertions rather than opinions.
 *
 * The split between the two continuous voices matches the split on the
 * instrument that shows them, which is not a coincidence — it is the same two
 * facts:
 *
 *   - **the drive note carries load** — traction, the fraction of the friction
 *     cone in use. A machine at 90% grip is working, and it is the note that
 *     hardens and sags, exactly as a diesel does when you ask too much of it.
 *   - **the grind carries slip** — how fast the track is sliding over ground it
 *     has stopped holding. You can be at 90% grip and perfectly quiet; the
 *     moment you go over, the grind is what arrives.
 */

import { ALARM, type Condition, WARN } from "../control/bus.ts";
import type { HullEvent, ImpactEvent } from "../core/events.ts";
import type { TrackState } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import type { PropKind } from "../world/props.ts";

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/* -- the drive note -------------------------------------------------------- */

/**
 * One track's drivetrain, as a sawtooth through a lowpass.
 *
 * A sawtooth rather than a sine, and a low fundamental rather than a
 * comfortable one, for a reason that is mobile-first rather than musical: a
 * phone speaker reproduces almost nothing below about 400 Hz, so a pure 60 Hz
 * rumble is *silent* on the device this game is built for. A sawtooth at 60 Hz
 * puts harmonics at 120, 180, 240 … and the phone renders the machine out of
 * those while a laptop and a pair of headphones render the fundamental too.
 * Same voice, and it survives the small speaker instead of relying on it.
 */
export interface DriveVoice {
  /** Fundamental, Hz. */
  readonly hz: number;
  /** 0–1, before the master. */
  readonly gain: number;
  /** Lowpass cutoff, Hz. This is where "labouring" lives. */
  readonly cutoff: number;
}

/** Turning over, doing nothing. The machine is never silent; it is running. */
const IDLE_HZ = 56;
/** What full track speed adds to it. */
const SPAN_HZ = 52;
/**
 * How far the note sags at full load.
 *
 * Rpm droop: an engine asked for more torque than it wants to give slows down.
 * It is the single most recognisable sound a working machine makes, and here it
 * is a direct rendering of `traction` — the same number the TRACTION head paints
 * its channels with.
 */
const DROOP_HZ = 12;
/**
 * How much louder a machine at full load is than the same machine coasting.
 *
 * Added after the bench measured the first version: at identical track speed,
 * load 10% against load 95% moved the energy above 1500 Hz from 18% to 24% and
 * moved the loudness *not at all*. A filter opening is a real cue and a small
 * one — a sawtooth's power is nearly all in its first few harmonics, so
 * brightening it can only ever be a few percent of the energy. Working harder
 * has to be louder as well, which is both what a machine does and what makes
 * the difference land at arm's length on a phone.
 */
const LOAD_LOUDER = 0.45;
/**
 * What a track with **no ground** picks up.
 *
 * `traction` is `null` rather than 0 for a track in the air, because nothing
 * measured is not a low reading (`core/snapshot.ts`). The distinction survives
 * into the sound: an unloaded track does not go quiet, it runs away — higher
 * and thinner, which is what a machine clawing air actually does.
 */
const AIR_HZ = 15;

/**
 * The continuous voices are quiet on purpose, and it is a headroom decision
 * rather than a taste one.
 *
 * Measured on the bench: at twice these numbers the drive note alone peaked at
 * 0.66 and sat permanently inside the limiter, so a 140 kJ landing — the single
 * most violent thing rung 1 can produce — came out no louder than driving along.
 * The machine is a bed; the site is what happens on top of it, and the bed has
 * to leave room for it. A player who wants it louder has a volume control on
 * the side of their phone.
 */
const IDLE_GAIN = 0.05;
const DRIVE_GAIN = 0.13;

/** Muffled at rest; hard and bright at the edge of the friction cone. */
const CUT_IDLE = 340;
const CUT_LOADED = 2600;
/** A track spinning free is thin rather than muffled. Whine, not roar. */
const CUT_AIR = 1500;

export function driveVoice(track: TrackState): DriveVoice {
  const effort = clamp01(Math.abs(track.commanded) / MAX_TRACK_SPEED);
  const airborne = track.traction === null;
  const load = clamp01(track.traction ?? 0);

  return {
    hz: IDLE_HZ + effort * SPAN_HZ - load * DROOP_HZ + (airborne ? AIR_HZ : 0),
    gain: (IDLE_GAIN + effort * (DRIVE_GAIN - IDLE_GAIN)) * (1 + LOAD_LOUDER * load),
    cutoff: airborne ? CUT_AIR : CUT_IDLE + load * (CUT_LOADED - CUT_IDLE),
  };
}

/* -- the grind ------------------------------------------------------------- */

/** Filtered noise: the track sliding over ground it has stopped holding. */
export interface GrindVoice {
  readonly gain: number;
  readonly cutoff: number;
}

const GRIND_GAIN = 0.12;
/** Slip at which the grind is as loud as it gets, m/s. */
const GRIND_FULL = MAX_TRACK_SPEED;
const GRIND_CUT_LOW = 600;
const GRIND_CUT_HIGH = 4000;

export function grindVoice(track: TrackState): GrindVoice {
  // No ground, no grinding. A track in the air has enormous slip and is not
  // rubbing against anything — the loudest possible reading for the quietest
  // possible condition, if this line is missing.
  if (track.contacts === 0) return { gain: 0, cutoff: GRIND_CUT_LOW };

  const sliding = clamp01(Math.abs(track.slip) / GRIND_FULL);
  const load = clamp01(track.traction ?? 0);
  return {
    gain: GRIND_GAIN * sliding,
    cutoff: GRIND_CUT_LOW + load * (GRIND_CUT_HIGH - GRIND_CUT_LOW),
  };
}

/* -- things being hit ------------------------------------------------------ */

/**
 * A transient: a body ringing at a pitch, and the contact that set it ringing.
 *
 * The two halves say different things, and keeping them apart is what makes the
 * table below small. **The ring is the material** — what the thing is made of,
 * how long it goes on. **The strike is the energy** — how sharp the contact
 * was. So a cone and a pipe stack differ in `hz`, `decay` and `grit`, and a tap
 * and a slam on the same pipe stack differ in `strikeHz` and `gain`.
 */
export interface Knock {
  /** The ring, Hz. */
  readonly hz: number;
  /** 0–1, before the master. */
  readonly gain: number;
  /** Seconds to silence. */
  readonly decay: number;
  /** 0–1 — how much of it is noise rather than tone. Plastic against steel. */
  readonly grit: number;
  /**
   * Where the strike is cut off, Hz — how sharp the contact was.
   *
   * Independent of the ring, and it has to be. Tying it to the ring meant the
   * heaviest impacts got the *narrowest* strike, because the heaviest things
   * ring lowest: the bench measured a 140 kJ landing as quieter than driving
   * along, since a low-passed hiss at 190 Hz is a hiss with almost nothing in
   * it. Physically it is backwards too — a harder contact is a sharper one.
   */
  readonly strikeHz: number;
}

/** Dull at a touch, sharp at a slam. The contact, not the body. */
const strikeOf = (level: number): number => 700 + 2600 * level;

interface Material {
  /** Where it rings, before the energy pulls it down. */
  readonly hz: number;
  /** Seconds, at a light touch. */
  readonly decay: number;
  /** 0–1 — how much of it is noise rather than tone. Plastic against steel. */
  readonly grit: number;
}

/**
 * What each thing on the site is made of, as a voice.
 *
 * Not a sound designer's table: it is the one place in the whole audio path
 * where a number is *chosen* rather than derived, and it is confined to
 * **timbre** — what a pipe stack is made of. Everything about how hard it was
 * hit comes from the joules, below.
 */
const MATERIAL: Record<PropKind, Material> = {
  // Thin plastic. A tick, not a note.
  cone: { hz: 430, decay: 0.1, grit: 0.85 },
  // A hollow steel tube, and it rings for it.
  pole: { hz: 300, decay: 0.55, grit: 0.3 },
  // Quarter of a tonne of steel pipe. The lowest, longest voice on the site.
  pipes: { hz: 128, decay: 0.9, grit: 0.28 },
  barrier: { hz: 220, decay: 0.18, grit: 0.7 },
  // Sheet, plastic and a fuel tank. Mixed, and the one nobody wants to hear.
  scooter: { hz: 190, decay: 0.4, grit: 0.5 },
  // Landscape is never billed and never emits, but the table is total so that
  // adding a kind cannot silently fall through to a default.
  rock: { hz: 88, decay: 0.14, grit: 0.95 },
};

/**
 * Joules at which an impact is as loud as it gets.
 *
 * Above the biggest hit rung 1 can actually deliver, so the loud end stays
 * headroom rather than a wall everything piles into: 6.2 t at 2.2 m/s into a
 * pipe stack measures about 550 J.
 */
const IMPACT_REF = 700;

/**
 * **Amplitude follows the square root of energy**, and that is physics rather
 * than taste: radiated acoustic energy scales with impact energy, and what an
 * ear hears is amplitude. It is also what makes the range work — a marker pole
 * tipping over on its own puts 1.6 J into the ground and comes out at 5% of
 * full, which is the tick it should be, while a pipe stack at speed comes out
 * at 90%. No threshold, no special case, and nothing has to decide what counts
 * as a real impact.
 */
export const loudness = (joules: number, reference: number): number =>
  clamp01(Math.sqrt(Math.max(0, joules) / reference));

export function impactVoice(event: ImpactEvent): Knock {
  const material = MATERIAL[event.what];
  const level = loudness(event.joules, IMPACT_REF);
  return {
    // A harder hit excites lower modes: the same cone struck harder rings
    // deeper, which is why a bang and a tap are not the same sound louder.
    hz: material.hz * (1 - 0.28 * level),
    gain: level,
    decay: material.decay * (0.5 + 0.9 * level),
    grit: material.grit,
    strikeHz: strikeOf(level),
  };
}

/**
 * The machine's own collisions — running into something solid, or landing.
 *
 * A much larger reference than a prop's, because it is a much larger body: a
 * 2.4 m drop lands 140 kJ on the hull, and a cone is a 15 J event. One scale
 * for both would make every prop inaudible.
 */
const HULL_REF = 90_000;

export function hullVoice(event: HullEvent): Knock {
  const level = loudness(event.joules, HULL_REF);
  return {
    // Higher than a 6.2 t hull "should" ring, and for the same mobile-first
    // reason the drive note is a sawtooth: the first version put a heavy
    // landing at 43 Hz, which is a beautiful thump on a desk and **silence** on
    // the device this game is built for. Weight comes from the grit and the
    // decay, which a small speaker can actually reproduce.
    hz: 78 * (1 - 0.3 * level),
    gain: level,
    decay: 0.28 + 0.5 * level,
    grit: 0.6,
    strikeHz: strikeOf(level),
  };
}

/* -- the horn -------------------------------------------------------------- */

/**
 * The annunciator's horn — the audible half of the master lamp.
 *
 * It sounds while the master is **unacknowledged**, and stops when the pilot
 * presses it, exactly as a real annunciator panel does. Acknowledging is not
 * dismissing: the lamp stays lit and steady, and only the noise stops.
 *
 * The rates are the lamp's own blink rates, so the horn beats *with* it rather
 * than against it. They are the one number in this file duplicated from
 * elsewhere — `substrate.css` sets 1.1 s and 0.34 s — and the duplication is
 * flagged rather than hidden because a shared value would mean CSS reaching
 * into a module or a custom property carrying a frequency.
 */
export interface HornVoice {
  readonly hz: number;
  readonly gain: number;
  /** Pulses per second. Zero means silent. */
  readonly rate: number;
}

const SILENT: HornVoice = { hz: 0, gain: 0, rate: 0 };

export function hornVoice(unacknowledged: Condition): HornVoice {
  if (unacknowledged >= ALARM) return { hz: 990, gain: 0.12, rate: 1 / 0.34 };
  if (unacknowledged >= WARN) return { hz: 620, gain: 0.08, rate: 1 / 1.1 };
  return SILENT;
}

export const isSilent = (horn: HornVoice): boolean => horn.rate === 0;
