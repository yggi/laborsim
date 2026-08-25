/**
 * A manufacturer's **sound house** — the audible half of its house style.
 *
 * A maker's identity was already three things: how its kit looks, what words it
 * uses, and what it says to you (`houses.ts`). This is the fourth, and it is the
 * one that reaches you with your eyes on the ground.
 *
 * ## Who owns a sound
 *
 * Everything that makes a noise in this game has an **owner**, and the owner
 * decides its character:
 *
 * - **The machine** — its drivetrain, its running gear, its loose fittings, its
 *   horn — is voiced by the house of the manufacturer that built the *chassis*.
 *   The chassis component brings the cab, the glass and the dashboard
 *   (`docs/design/components.md`); it brings the noise too. A KIBA does not
 *   sound like a TOWA for the same reason its dashboard does not look like one.
 * - **A component** is voiced by *its own* maker's house, not the chassis's.
 *   Nothing fitted makes a noise yet, and when something does — a guard's relay,
 *   a servo — it reads its maker's house exactly as its cell reads its maker's
 *   colours. No new machinery is needed for it; that is the point of this file.
 * - **The site** is voiced by **materials**, and belongs to no maker at all. A
 *   pipe stack is steel whoever stacked it, so an impact's timbre comes from the
 *   material table in `audio/voices.ts` and never from a house. Getting this
 *   backwards would make the machine's manufacturer decide what a boulder sounds
 *   like, which is nonsense you would hear.
 *
 * ## What a house may not decide
 *
 * **Loudness.** Every number here is a *timbre* or a *rate*; not one is a level.
 * That is the same rule the rack applies to plate heights — a maker cannot make
 * its plate taller to get more attention, so it cannot make its machine louder
 * either. Levels stay in `audio/voices.ts`, where they are set once against the
 * headroom an impact needs (see `IMPACT_REF` and the limiter note in
 * `engine.ts`). A house that could turn itself up would be a house that did.
 *
 * **What a quantity means.** The mapping from `traction` to droop, from slip to
 * grind, from joules to amplitude, is the sim rendered — it is the same
 * inspectability claim the instruments make, and it is not a style decision. A
 * house says *what the machine is made of*; the arithmetic says *what it is
 * doing*.
 */

/** Waveforms a house may pick from. The subset of `OscillatorType` we use. */
export type Wave = "sawtooth" | "square" | "triangle" | "sine";

/**
 * The drivetrain's voice — the drone you hear whenever the machine is running.
 *
 * The frequencies are all low and the waveform is deliberately harmonic-rich,
 * for a reason that is mobile-first rather than musical: a phone speaker
 * reproduces almost nothing below about 400 Hz, so a pure rumble is *silent* on
 * the device this game is built for. A sawtooth at 60 Hz puts harmonics at 120,
 * 180, 240 … and the phone renders the machine out of those while a laptop and a
 * pair of headphones render the fundamental too.
 */
export interface DriveSound {
  readonly wave: Wave;
  /** Turning over, doing nothing. A machine is never silent; it is running. */
  readonly idleHz: number;
  /** What full track speed adds to the idle note. */
  readonly spanHz: number;
  /**
   * How far the note sags at full load.
   *
   * Rpm droop: an engine asked for more torque than it wants to give slows
   * down. It is the single most recognisable sound a working machine makes, and
   * a maker with none of it (an electric drive holding its speed under load)
   * sounds *wrong* in a way a player can name.
   */
  readonly droopHz: number;
  /** What a track with no ground picks up. It runs away; it does not go quiet. */
  readonly airHz: number;
  /**
   * Cents between the two oscillators that make up the note.
   *
   * Two saws a few cents apart beat against each other slowly, and that beating
   * is most of what separates *a machine* from *a synthesiser playing a note*.
   * A tight, new drive is a few cents; something old and out of balance is
   * twenty.
   */
  readonly detune: number;
  /**
   * Firing pulses per cycle of the note, and how deep they cut.
   *
   * A diesel is not a tone, it is a *series of bangs* — and the drone you
   * recognise is the note amplitude-modulated at the firing rate. Below 0.5 the
   * pulse only ever dips the note; at 0.5 it reaches silence between pulses,
   * which is a single-cylinder thumper. An electric drive sets `beat: 0` and
   * gets a smooth tone, which is exactly what an electric drive is.
   */
  readonly beats: number;
  readonly beat: number;
  /** Lowpass at rest, and at the edge of the friction cone. Where labour lives. */
  readonly cutIdle: number;
  readonly cutLoaded: number;
  /** A track spinning free is thin rather than muffled. Whine, not roar. */
  readonly cutAir: number;
  /** Filter resonance. A little gives the note an edge as it opens. */
  readonly resonance: number;
}

/**
 * The annunciator's horn.
 *
 * The chassis maker's, because the annunciator is on the chassis maker's dash.
 * Only the pitch and the waveform are here: the **rates** are the master lamp's
 * own blink rates and belong to the panel, so a horn beats with its lamp rather
 * than against it (`audio/voices.ts`).
 */
export interface HornSound {
  readonly wave: Wave;
  readonly warnHz: number;
  readonly alarmHz: number;
}

/**
 * The running gear: a steel belt going round two wheels, and the bearings it
 * goes round them on.
 *
 * The **rate** is not here and cannot be — a plate passes at
 * `commanded / GROUSER_PITCH`, which is geometry the chassis already publishes
 * and the same number the renderer turns the belt at (`core/spec.ts`). What a
 * house owns is **one link's knock**: how it rings, how long, how rough, and how
 * unlike the last one it is. That is the difference between bare steel plates
 * and rubber-padded ones, and it is a thing you would hear from across a site.
 */
export interface GearSound {
  /** Where one link rings when it comes over the sprocket. */
  readonly clankHz: number;
  /** Seconds to silence. Short: this happens seven times a second. */
  readonly clankDecay: number;
  /** 0–1, noise against tone. Bare steel is nearly all strike. */
  readonly clankGrit: number;
  /**
   * How unlike each other two links are, 0–1.
   *
   * Worn kit is uneven and it is *the* cue that a machine is old: identical
   * clicks read as a metronome, and a metronome is a sample loop with extra
   * steps. The variation is drawn from the seeded generator, so a replay clanks
   * the same way twice.
   */
  readonly clankSpread: number;
  /** A dry bearing: where the squeak sits, how narrow, and how far it wanders. */
  readonly squeakHz: number;
  readonly squeakQ: number;
  readonly squeakSweep: number;
}

/**
 * Everything in the cab that is not bolted down tightly enough.
 *
 * It answers to the accelerometer (`core/snapshot.ts`) rather than to anything
 * the drivetrain is doing, which is why it is the voice that makes *ground*
 * audible: a smooth floor is silent at any speed and a rutted one is not.
 */
export interface RattleSound {
  readonly hz: number;
  readonly q: number;
}

export interface SoundHouse {
  readonly drive: DriveSound;
  readonly gear: GearSound;
  readonly rattle: RattleSound;
  readonly horn: HornSound;
}
