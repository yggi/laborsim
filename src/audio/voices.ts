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
 *
 * **Every voice has an owner** (`makers/sound.ts`). The machine's voices take a
 * `SoundHouse` — the chassis manufacturer's — and read their timbre and rates
 * out of it, so the same arithmetic voices a KIBA and a TOWA differently. The
 * *levels* stay here, because a maker that could turn itself up would.
 * Impacts take no house at all: a pipe stack is steel whoever stacked it.
 */

import { ALARM, type Condition, WARN } from "../control/bus.ts";
import type { HullEvent, ImpactEvent } from "../core/events.ts";
import { makeRng } from "../core/rng.ts";
import type { Shake, TrackState } from "../core/snapshot.ts";
import { GROUSER_PITCH, MAX_TRACK_SPEED } from "../core/spec.ts";
import type { SoundHouse, Wave } from "../makers/sound.ts";
import type { PropKind } from "../world/props.ts";

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/* -- the drive note -------------------------------------------------------- */

/**
 * One track's drivetrain: a pair of detuned oscillators through a lowpass, cut
 * into pulses at the firing rate.
 *
 * The waveform and every frequency below come from the chassis maker's house
 * (`makers/sound.ts`), which is what makes the same arithmetic sound like two
 * different machines. What does *not* come from the house is the mapping —
 * `traction` to droop, effort to pitch — because that is the sim rendered, and
 * it is the same inspectability claim the TRACTION head makes.
 *
 * Three things carry the depth, and each of them is one number in the house:
 *
 * - **two oscillators, `detune` cents apart.** Beating between them is most of
 *   what separates a machine from a synthesiser playing a note. It is also
 *   characterisation you can hear the age of: KIBA is fourteen cents out and
 *   has never been balanced; HANSA is two, and there is a certificate for it.
 * - **the firing pulse.** A diesel is not a tone, it is a series of bangs, and
 *   the drone you recognise is the note amplitude-modulated at the firing rate.
 *   `beats` sets that rate against the note, so the lump slows down with the
 *   engine rather than drifting free of it.
 * - **the filter**, which is where labouring lives, exactly as before.
 */
export interface DriveVoice {
  readonly wave: Wave;
  /** Fundamental, Hz. */
  readonly hz: number;
  /** 0–1, before the master. The steady part of the note. */
  readonly gain: number;
  /**
   * 0–1: how much of the note the firing pulse takes away and gives back. The
   * two sum to `gain + pulse` at the top of a pulse and `gain - pulse` at the
   * bottom, which is why the house is capped at half.
   */
  readonly pulse: number;
  /** Pulses per second — the firing rate, riding on the note's own frequency. */
  readonly pulseHz: number;
  /** Cents between the two oscillators. */
  readonly detune: number;
  /** Lowpass cutoff, Hz. This is where "labouring" lives. */
  readonly cutoff: number;
  readonly resonance: number;
}

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
 * The continuous voices are quiet on purpose, and it is a headroom decision
 * rather than a taste one.
 *
 * Measured on the bench: at two and a half times these numbers the drive note
 * alone peaked at 0.66 and sat permanently inside the limiter, so a 140 kJ
 * landing — the single most violent thing rung 1 can produce — came out no
 * louder than driving along. The machine is a bed; the site is what happens on
 * top of it, and the bed has to leave room for it. A player who wants it louder
 * has a volume control on the side of their phone.
 *
 * Trimmed a fifth when the note gained its twin and its firing pulse. Both
 * raise the *crest* of a sound without raising its loudness — a beat is by
 * definition the moments where two things line up — so at the old level
 * `labouring` peaked at 0.63 against an unchanged RMS, which is headroom spent
 * on nothing audible. At these numbers it peaks 0.48 and the impact scenes are
 * where they were, which is the trade taken deliberately: a fifth of the bed's
 * loudness bought the character, and the site kept its room.
 */
const IDLE_GAIN = 0.04;
const DRIVE_GAIN = 0.104;

/** The deepest a house may cut the note. At a half it reaches silence. */
const MAX_BEAT = 0.5;

export function driveVoice(track: TrackState, house: SoundHouse): DriveVoice {
  const drive = house.drive;
  const effort = clamp01(Math.abs(track.commanded) / MAX_TRACK_SPEED);
  // `traction` is `null` rather than 0 for a track in the air, because nothing
  // measured is not a low reading (`core/snapshot.ts`). The distinction survives
  // into the sound: an unloaded track does not go quiet, it runs away — higher
  // and thinner, which is what a machine clawing air actually does.
  const airborne = track.traction === null;
  const load = clamp01(track.traction ?? 0);

  const hz =
    drive.idleHz +
    effort * drive.spanHz -
    load * drive.droopHz +
    (airborne ? drive.airHz : 0);
  const level =
    (IDLE_GAIN + effort * (DRIVE_GAIN - IDLE_GAIN)) * (1 + LOAD_LOUDER * load);
  const depth = clamp01(Math.min(drive.beat, MAX_BEAT));

  /**
   * What the pulse costs, given back.
   *
   * A square pulse of depth `d` about a base `g` spends half its time at `g+d`
   * and half at `g−d`, so its mean square is `g² + d²` — a note cut into lumps
   * is *quieter* than the same note held, by exactly `hypot(1−d, d)`. Measured
   * before this line existed: adding the beat took `idle` from 0.037 RMS to
   * 0.016 while the peak stayed put, which is not "more depth", it is "less
   * machine". Dividing it back out makes the beat cost nothing but character,
   * and it is why the test below asserts `hypot(gain, pulse)` rather than the
   * sum: the sum is what an oscilloscope sees, and the ear hears the other one.
   */
  const crest = Math.hypot(1 - depth, depth);

  return {
    wave: drive.wave,
    hz,
    // The pulse is *taken out of* the note rather than added on top of it, so a
    // lumpy house and a smooth one are the same loudness — the beat is
    // character, and character is not a way to be louder.
    gain: (level * (1 - depth)) / crest,
    pulse: (level * depth) / crest,
    pulseHz: hz * drive.beats,
    detune: drive.detune,
    cutoff: airborne
      ? drive.cutAir
      : drive.cutIdle + load * (drive.cutLoaded - drive.cutIdle),
    resonance: drive.resonance,
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

/**
 * How unlike each other two hits on the same thing are.
 *
 * Nothing is ever struck twice in the same place. A cone caught on its rim and
 * a cone caught flat are the same plastic and not the same noise, and without
 * this a line of cones is one cone played eight times — which is the exact
 * complaint people have about *sampled* audio, arrived at from the other
 * direction. Drawn from `seq`, which is on the recording, so a replay of a run
 * hits everything the same way twice.
 */
const IMPACT_SPREAD = 0.2;

export function impactVoice(event: ImpactEvent): Knock {
  const material = MATERIAL[event.what];
  const level = loudness(event.joules, IMPACT_REF);
  const wobble = makeRng(event.seq).range(-1, 1) * IMPACT_SPREAD;
  return {
    // A harder hit excites lower modes: the same cone struck harder rings
    // deeper, which is why a bang and a tap are not the same sound louder.
    hz: material.hz * (1 - 0.28 * level) * (1 + wobble),
    gain: level,
    decay: material.decay * (0.5 + 0.9 * level) * (1 + wobble * 0.5),
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

/* -- the chain ------------------------------------------------------------- */

/**
 * The running gear: one knock per track plate over the sprocket, and the dry
 * bearing it turns on.
 *
 * **The rate is geometry, not taste.** A plate passes a fixed point every
 * `GROUSER_PITCH` metres of belt, so the chain clanks at
 * `|commanded| / GROUSER_PITCH` — between one and seven times a second at
 * working speeds — and that is the *same number the renderer turns the belt at*.
 * You hear what you see, and when the belt races under a machine that is not
 * moving, the clank races with it: slip becomes audible without slip being
 * mentioned anywhere in this voice.
 *
 * `commanded` and not `surface`, deliberately. The belt's speed relative to the
 * hull is what the drivetrain is delivering; a track spinning in mid-air clanks
 * *faster*, not slower, because nothing is holding it back.
 */
export interface ChainVoice {
  /** Plates per second past a fixed point. Zero on a stopped belt. */
  readonly rate: number;
  /** What one plate sounds like. Jittered per plate; see `chainLink`. */
  readonly link: Knock;
}

/** How loud the chain is against the note. Under it, always. */
const CHAIN_GAIN = 0.5;
/**
 * What a plate touching ground adds.
 *
 * A belt makes two noises: the plate coming over the sprocket, which happens
 * whatever the machine is doing, and the plate slapping the ground, which does
 * not. So a track in the air keeps a third of its voice — it is still turning,
 * and you can hear that it is turning against nothing.
 */
const CHAIN_SPROCKET = 0.34;

export function chainVoice(track: TrackState, house: SoundHouse): ChainVoice {
  const gear = house.gear;
  const belt = Math.abs(track.commanded);
  const effort = clamp01(belt / MAX_TRACK_SPEED);
  const ground = clamp01(track.contacts / 6);
  // A faster belt hits harder, but not by much: what mostly changes with speed
  // is how *often* it hits, and doubling both would run away with the mix.
  const level =
    CHAIN_GAIN *
    (0.45 + 0.55 * effort) *
    (CHAIN_SPROCKET + (1 - CHAIN_SPROCKET) * ground);

  return {
    rate: belt / GROUSER_PITCH,
    link: {
      hz: gear.clankHz,
      gain: level,
      decay: gear.clankDecay,
      grit: gear.clankGrit,
      strikeHz: strikeOf(0.35 + 0.4 * effort),
    },
  };
}

/**
 * One plate, made unlike the last one.
 *
 * `spread` is the maker's, `wobble` is a number from the seeded generator, and
 * the product is what stops seven clanks a second reading as a metronome. It is
 * the same trick the site uses for prop yaw, and it costs one multiply.
 */
export function chainLink(link: Knock, spread: number, wobble: number): Knock {
  const swing = 1 + spread * wobble;
  return {
    ...link,
    hz: link.hz * swing,
    // Half the spread on level: an uneven chain is uneven in pitch first.
    gain: link.gain * (1 + spread * wobble * 0.5),
    decay: link.decay * swing,
  };
}

/* -- the squeak ------------------------------------------------------------ */

/**
 * A dry bearing under load.
 *
 * It needs three things at once — weight on the track, the belt turning, and
 * ground under it — which is why it is not a drone: it arrives on a loaded
 * crawl and goes away the moment you take the weight off. That makes it the
 * only voice on the machine that says *slowly and heavily* rather than *fast*.
 */
export interface SqueakVoice {
  readonly gain: number;
  readonly hz: number;
  readonly q: number;
  /** How far the note wanders, as a fraction of `hz`. */
  readonly sweep: number;
}

/**
 * Nine times the drive note's, and **not nine times as loud**.
 *
 * A filter's gain is not what you hear — its *bandwidth* is. This squeak is a
 * `Q` of 14 around 2.4 kHz, which passes about 170 Hz of a 22 kHz noise floor,
 * so nine tenths of the number below is spent buying back what the filter threw
 * away. The same mistake has now been paid for three times in this file: the
 * strike was a bandpass until a 140 kJ landing measured quieter than a cone,
 * and both this and the rattle were written at "sensible" levels first and were
 * inaudible. **Set a filtered voice by measuring it, never by reading it.**
 */
const SQUEAK_GAIN = 0.5;

export function squeakVoice(track: TrackState, house: SoundHouse): SqueakVoice {
  const gear = house.gear;
  const effort = clamp01(Math.abs(track.commanded) / MAX_TRACK_SPEED);
  const load = clamp01(track.traction ?? 0);
  // Nothing to squeak against with no ground, however hard the belt is turning.
  const ground = track.contacts === 0 ? 0 : 1;
  /**
   * **Loudest at a heavy crawl, and gone by working speed.**
   *
   * A bearing squeals by stick-slip, which is a low-relative-speed phenomenon —
   * it is the noise of a machine inching a load, not of one driving. Without
   * the `crawl` term the squeak was simply on whenever the machine was loaded,
   * which measured as a labouring cue brighter than the note's own and made
   * every scene hiss. With it, the squeak belongs to one condition, and that
   * condition is the one nothing else on the machine says out loud.
   */
  const crawl = clamp01(1 - effort);
  return {
    // `sqrt` on the belt speed so it is already there at walking pace rather
    // than fading in from nothing.
    gain: SQUEAK_GAIN * load * Math.sqrt(effort) * crawl * ground,
    hz: gear.squeakHz,
    q: gear.squeakQ,
    sweep: gear.squeakSweep,
  };
}

/* -- the bogies ------------------------------------------------------------ */

/**
 * The running gear taking the ground — **the knock a rut makes**.
 *
 * This voice was refused once, on the record, and the refusal is worth keeping
 * because it is the rule working: a suspension knock could not be built while
 * nothing simulated suspension travel, because a voice with no quantity behind
 * it is a sound effect wearing a simulation's clothes (`docs/design/sound.md`).
 * The way to get it was never to relent, it was to build the springs.
 *
 * So the quantity is **the watts a side's dampers are dissipating**
 * (`core/snapshot.ts`), and choosing the damper rather than the spring is the
 * whole of the design:
 *
 * - a **spring** stores energy and gives it back. It is loudest exactly when
 *   the machine is heaviest — parked — and a voice keyed to it would drone at
 *   a machine standing still on a level pad.
 * - a **damper** turns energy into heat, and it can only do that while the
 *   wheel is moving against the frame. It is silent parked, silent on a graded
 *   pad at any speed, and it spikes at the instant a bogie is driven up into
 *   its travel. That is the noise, and it needed no threshold to find it.
 *
 * It is **per side**, which is the point of the card: the ear can hear which
 * track took the rut, because that track's dampers are the ones doing the
 * work. Nothing else on the machine can say that — the rattle is centred by
 * design, and an impact does not know it happened to one side (L-060).
 */
export interface BogieVoice {
  readonly gain: number;
  readonly hz: number;
  readonly q: number;
}

/**
 * The range the running gear works over, watts per side, **measured**.
 *
 * A probe drove the machine 80 m across the default site at full ahead and
 * recorded both sides' damper power every step. Parked reads exactly zero,
 * which is the check that the derivation is right, and a crawl over the same
 * ground reaches 7 W at the ninetieth percentile — the undercarriage is
 * genuinely quiet when it is not being asked anything. At working speed the
 * median step is 192 W, the ninetieth is 735 and the ninety-ninth is 3400,
 * with the worst single step at 13 kW.
 *
 * So the floor sits at the median — half the steps of an ordinary drive say
 * something — and the ceiling at the ninety-ninth, which leaves the worst one
 * per cent saturated and the rare 13 kW slam sharing a level with them. That
 * is deliberate: past the top of this range the bogie is on its stop, and what
 * distinguishes those is timbre rather than level.
 */
const BOGIE_FLOOR = 200;
const BOGIE_FULL = 3400;
/**
 * Set on the bench, for the bandwidth reason at `SQUEAK_GAIN` — **the fifth
 * time that lesson has been paid for in this file**, and the first time the
 * bench could not see the bill.
 *
 * Written at 0.85 first, which is a sensible-looking number for a band 140 Hz
 * wide out of a 22 kHz noise floor and is about a tenth of what it needs to be.
 * The null test — silence it and see whether anything changes — reported peak
 * 0.634 against 0.606 and an *identical* RMS, so by the bench's own numbers the
 * voice did not exist. It did; the bench was measuring channel 0's peak, and a
 * scene's loudest instant is loud on both channels. What was missing was an
 * instrument for **sides**, which is the one thing this voice is for. With one
 * (`sandbox/listen.ts`) the same pair reads 0.008 silenced against 0.048 at
 * this level, at the exact seconds the scene puts the ruts.
 *
 * The level itself is then a mix decision with one constraint: a bogie hitting
 * its stop is a big noise and it happens **under you**, but the site still has
 * to be the loudest thing in the exercise. At 2.0 `the-rut` peaked 0.72 against
 * `the-site`'s 0.62, which is a rut out-shouting a quarter-tonne of steel pipe.
 * At this it peaks 0.64, just above it, and nothing anywhere clips.
 */
const BOGIE_GAIN = 1.6;

export function bogieVoice(track: TrackState, house: SoundHouse): BogieVoice {
  const gear = house.gear;
  const { damping, bottomed } = track.suspension;
  const over = clamp01((damping - BOGIE_FLOOR) / (BOGIE_FULL - BOGIE_FLOOR));
  // How much of the side is on the rubber. It moves the voice up toward the
  // stop's own ring and **never** moves the level: how hard the ground hit you
  // is the watts, and having run out of travel is what it sounds like.
  const stopped = clamp01(bottomed / 6);
  return {
    // Square root, as everywhere else that maps a physical quantity to a
    // level: amplitude against energy.
    gain: BOGIE_GAIN * Math.sqrt(over),
    hz: gear.bogieHz + stopped * (gear.stopHz - gear.bogieHz),
    q: gear.bogieQ,
  };
}

/* -- the rattle ------------------------------------------------------------ */

/**
 * Everything in the cab that is not bolted down tightly enough.
 *
 * It reads the accelerometer (`core/snapshot.ts`) rather than anything the
 * drivetrain is doing, and that is what makes it the voice of the **ground**: a
 * graded pad is silent at any speed, and a rutted haul road is not. It is also
 * the one voice that answers a question the instruments cannot — the dash tells
 * you what the machine is doing, and this tells you what is being done to it.
 *
 * The 1 g the hull carries at rest is subtracted first, so standing still is
 * silent and free fall — where an accelerometer reads nothing at all — is
 * silent too. A machine in the air is *quiet*, and lands loudly.
 */
export interface RattleVoice {
  readonly gain: number;
  readonly hz: number;
  readonly q: number;
}

/**
 * The range the cab rattles over, m/s³, measured rather than chosen — and
 * **re-measured when the running gear got springs**, because they changed it.
 *
 * A probe drove the machine over the default site and recorded the jerk at
 * every step. Parked reads exactly zero, which is the check that the whole
 * derivation is right. Driving is not a smooth signal at all: it is *mostly
 * nothing, punctuated*, which is what a rattle is.
 *
 * What the springs did to that is the clearest number in this file. On a rigid
 * undercarriage the ninetieth-percentile step was a jerk of **416**; on bogies
 * it is **23** — eighteen times less — with the median almost unchanged at 4.
 * The suspension is not smoothing the ride evenly, it is taking the *knocks*
 * out of it, which is exactly what a suspension is for and exactly what the
 * ninetieth percentile measures.
 *
 * So the cab got quiet, and the sensible response is not to turn it back up:
 * it is to notice that **the ground now speaks twice**, loudly at the running
 * gear (`bogieVoice`) and faintly in the cab, filtered by the very thing that
 * separates them. These two numbers are refitted to keep the *shape* the old
 * pair had — a floor a little above the median so an ordinary drive mutters
 * rather than hisses, and a ceiling at the ninety-ninth so only a real slam
 * saturates. Everything past it is a landing, and the hull event has that.
 */
const RATTLE_FLOOR = 10;
const RATTLE_FULL = 160;
/** Ten times the drive note's, for the bandwidth reason at `SQUEAK_GAIN`. */
const RATTLE_GAIN = 1.0;

export function rattleVoice(shake: Shake, house: SoundHouse): RattleVoice {
  const over = clamp01((shake.jerk - RATTLE_FLOOR) / (RATTLE_FULL - RATTLE_FLOOR));
  return {
    // Square root, as everywhere else that maps a physical quantity to a level:
    // it is amplitude against energy, and it keeps small knocks audible.
    gain: RATTLE_GAIN * Math.sqrt(over),
    hz: house.rattle.hz,
    q: house.rattle.q,
  };
}

/* -- the panel ------------------------------------------------------------- */

/**
 * A switch under a thumb, and the contactor behind it.
 *
 * These reuse `Knock` and the transient that plays it, which is the same one an
 * impact and a track plate use. That is not a saving, it is the honest shape: a
 * switch bottoming out is a small thing being struck, and there is no reason
 * for the machine to have two ideas of what being struck sounds like.
 *
 * **Two events, because a real control is two events.** The click is the
 * pushbutton; the clunk is the load actually letting go, a fraction of a second
 * later and much lower. Pressing a cell gives you both, and the gap between
 * them is the difference between a panel and a website — it is also the only
 * way to hear that a switch did *not* do anything, which is a state this
 * machine can genuinely be in.
 *
 * Deliberately quiet. These happen under your hand rather than out on the site,
 * and a panel louder than the machine would be a cockpit made of noise.
 */
export type PanelEvent = "click" | "clunk";

/**
 * Louder than they look, for the bandwidth reason at `SQUEAK_GAIN`: a click is
 * a few milliseconds of lowpassed noise, and almost all of it is thrown away by
 * the filter that shapes it. Set by measuring — at a quarter of these numbers
 * the whole panel was inaudible under an *idling* machine, and the bench
 * measured a scene of switches identical to a scene of none.
 */
const CLICK_GAIN = 0.5;
const CLUNK_GAIN = 0.65;

export function panelVoice(event: PanelEvent, house: SoundHouse): Knock {
  const panel = house.panel;
  return event === "click"
    ? {
        hz: panel.clickHz,
        gain: CLICK_GAIN,
        decay: panel.clickDecay,
        grit: panel.clickGrit,
        strikeHz: strikeOf(0.9),
      }
    : {
        hz: panel.clunkHz,
        gain: CLUNK_GAIN,
        decay: panel.clunkDecay,
        grit: panel.clunkGrit,
        // A contactor is a dull, heavy event: the strike is the armature
        // hitting its stop, not a finger on plastic.
        strikeHz: strikeOf(0.25),
      };
}

/* -- the annunciator -------------------------------------------------------- */

/**
 * The annunciator's buzzer — the audible half of the master lamp.
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
export interface AlarmVoice {
  readonly hz: number;
  readonly gain: number;
  /** Pulses per second. Zero means silent. */
  readonly rate: number;
  readonly wave: Wave;
}

const SILENT: AlarmVoice = { hz: 0, gain: 0, rate: 0, wave: "square" };

export function alarmVoice(unacknowledged: Condition, house: SoundHouse): AlarmVoice {
  const alarm = house.alarm;
  if (unacknowledged >= ALARM)
    return { hz: alarm.alarmHz, gain: 0.12, rate: 1 / 0.34, wave: alarm.wave };
  if (unacknowledged >= WARN)
    return { hz: alarm.warnHz, gain: 0.08, rate: 1 / 1.1, wave: alarm.wave };
  return SILENT;
}

export const isSilent = (alarm: AlarmVoice): boolean => alarm.rate === 0;

/* -- the horn -------------------------------------------------------------- */

/**
 * The horn, which is a **chord with a mechanism in it**.
 *
 * Everything else on this machine renders a simulated quantity. The horn
 * renders a **decision**, and it is the only voice here that does — you press
 * it, deliberately, to tell somebody you are coming. That is why it is allowed
 * to be the loudest thing the machine can do, and why it is worth the trouble:
 * the one control whose entire output is sound had better be satisfying.
 *
 * Four things make it a horn rather than a synthesiser holding a chord, and all
 * four are mechanism rather than taste:
 *
 * - **it is several trumpets**, tuned to an interval and blown off one air
 *   line, and never quite in tune with each other;
 * - **the diaphragms take a moment to speak**, and bend up into pitch as the
 *   pressure behind them builds;
 * - **the valve chuffs** at the moment it opens, which is air and not tone;
 * - **the tank sags** when you let go, so the whole chord falls as it dies.
 *   That fall is the *owp* at the end, and it is the half people whistle.
 */
export interface HornVoice {
  /** One frequency per trumpet, Hz, already spread off the exact ratios. */
  readonly trumpets: readonly number[];
  /** Per trumpet, before the master. Divided down, so a triad is not louder. */
  readonly gain: number;
  readonly wave: Wave;
  readonly cutoff: number;
  readonly resonance: number;
  /** Cents of wander while held, and how fast it wanders. */
  readonly waver: number;
  readonly waverHz: number;
  readonly attack: number;
  readonly release: number;
  /** Fraction of pitch bent up into the attack and down through the release. */
  readonly bend: number;
  /** The valve: a burst of air at the moment it opens. */
  readonly chuff: number;
  readonly chuffHz: number;
}

/**
 * The horn is **loud**, and that is the point.
 *
 * Every other level in this file is set to leave room for the site. This one is
 * set to take the room, because a horn nobody flinches at is not a horn — and
 * because it is the only sound on the machine that the operator chose. The
 * limiter on the master is what keeps it from clipping, and what it does to the
 * rest of the mix while the horn is down is exactly what a horn does to
 * everything else in earshot.
 */
const HORN_GAIN = 0.36;

export function hornVoice(house: SoundHouse): HornVoice {
  const horn = house.horn;
  // Trumpets are spread alternately sharp and flat off their exact ratios, so
  // the chord beats against itself rather than drifting as a block.
  const cents = (n: number) => 2 ** ((n * horn.spread) / 1200);
  return {
    trumpets: horn.chord.map(
      (ratio, i) => horn.hz * ratio * cents(i % 2 === 0 ? 1 : -1),
    ),
    // Split across the trumpets in power, as the drive note's twin is: three
    // trumpets and two are the same horn, not one half again as loud.
    gain: HORN_GAIN / Math.sqrt(horn.chord.length),
    wave: horn.wave,
    cutoff: horn.cutoff,
    resonance: horn.resonance,
    waver: horn.waver,
    waverHz: horn.waverHz,
    attack: horn.attack,
    release: horn.release,
    bend: horn.bend,
    chuff: horn.chuff * HORN_GAIN,
    chuffHz: horn.chuffHz,
  };
}
