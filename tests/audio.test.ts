/**
 * The voices, as arithmetic.
 *
 * Nobody can assert that a machine sounds good. What *can* be asserted is that
 * each voice is a monotone rendering of the quantity it claims to render, and
 * that the interesting states are distinguishable from each other — which is
 * the whole justification for synthesising rather than triggering clips. If a
 * test here fails, a player is being told something untrue about the machine.
 *
 * The graph itself is not testable in Node — there is no WebAudio. That is what
 * `npm run listen` is for: it renders these same voices through the real graph
 * in Chromium and measures the result. See `scripts/listen.mjs`.
 */

import { describe, expect, it } from "vitest";
import {
  driveVoice,
  grindVoice,
  hornVoice,
  hullVoice,
  impactVoice,
  isSilent,
  loudness,
} from "../src/audio/voices.ts";
import { ACTIVE, ALARM, NOMINAL, WARN } from "../src/control/bus.ts";
import type { HullEvent, ImpactEvent } from "../src/core/events.ts";
import type { TrackState } from "../src/core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { MAKER_NAMES, styleOf } from "../src/makers/houses.ts";

/**
 * The chassis OEM's house, which is what every machine in the game is voiced by
 * today and what these numbers were tuned against. A voice is only meaningful
 * next to the house it came out of, so every call names one.
 */
const KIBA = styleOf("KIBA WORKS").sound;

const track = (over: Partial<TrackState> = {}): TrackState => ({
  commanded: 0,
  surface: 0,
  slip: 0,
  contacts: 6,
  traction: 0,
  ...over,
});

const impact = (over: Partial<ImpactEvent> = {}): ImpactEvent => ({
  kind: "impact",
  seq: 1,
  tick: 1,
  prop: 0,
  what: "cone",
  joules: 10,
  at: [0, 0, 0],
  ...over,
});

const hullHit = (joules: number): HullEvent => ({
  kind: "hull",
  seq: 1,
  tick: 1,
  joules,
  jolt: 2,
});

/**
 * Every voice in the game has an owner, and the machine's owner is the maker of
 * its chassis (`makers/sound.ts`). These are the tests for the *shape* of that
 * rather than for any one house: a hole in the table is a machine with no voice,
 * and it would be found by a player rather than by a build.
 */
describe("a machine is voiced by the maker of its chassis", () => {
  it("gives every maker a complete sound house", () => {
    for (const name of MAKER_NAMES) {
      const { drive, horn } = styleOf(name).sound;
      expect(drive.idleHz, `${name} idle`).toBeGreaterThan(0);
      expect(drive.spanHz, `${name} span`).toBeGreaterThan(0);
      expect(horn.warnHz, `${name} warn`).toBeGreaterThan(0);
      expect(horn.alarmHz, `${name} alarm`).toBeGreaterThan(0);
      // A house may not cut its note to silence and back: past a half the
      // pulse inverts the note instead of shaping it.
      expect(drive.beat, `${name} beat`).toBeLessThanOrEqual(0.5);
    }
  });

  it("gives an unmarked chassis the OEM's voice", () => {
    // The same fallback the cab uses for an unmarked plate: an unknown maker
    // reads as KIBA until the grey-market maker exists to claim the slot.
    expect(styleOf("WHO?").sound).toBe(KIBA);
  });

  it("sounds like two different machines in two houses", () => {
    // The point of the whole arrangement, asserted once. If a future house is
    // written that happens to match KIBA on every axis, this fails and says so.
    const towa = styleOf("TOWA DENKI").sound;
    const at = (house: typeof KIBA) =>
      driveVoice(track({ commanded: 1.2, traction: 0.5 }), house);
    expect(at(towa).hz).not.toBeCloseTo(at(KIBA).hz, 1);
    expect(at(towa).wave).not.toBe(at(KIBA).wave);
    // TOWA's drive is electric: it holds its speed under load where the diesel
    // sags, which is the most audible difference between the two.
    const loaded = (house: typeof KIBA) =>
      driveVoice(track({ commanded: 1.2, traction: 0.95 }), house).hz -
      driveVoice(track({ commanded: 1.2, traction: 0 }), house).hz;
    expect(loaded(towa)).toBeGreaterThan(loaded(KIBA));
  });

  it("keeps loudness out of the maker's hands", () => {
    // A lumpy house and a smooth one must be the same size. `hypot` rather than
    // the sum, because the pulse is a square: the note spends half its time at
    // `gain + pulse` and half at `gain - pulse`, so what the ear gets is the
    // root mean square of the two rather than their sum. Asserting the sum
    // would let a house buy loudness by beating harder, which is the exact
    // thing this rule exists to forbid.
    const level = (name: string) => {
      const voice = driveVoice(
        track({ commanded: 1.2, traction: 0.5 }),
        styleOf(name).sound,
      );
      return Math.hypot(voice.gain, voice.pulse);
    };
    for (const name of MAKER_NAMES) {
      expect(level(name), `${name} level`).toBeCloseTo(level("KIBA WORKS"), 6);
    }
  });
});

describe("the drive note carries load", () => {
  it("rises with commanded track speed", () => {
    const idle = driveVoice(track(), KIBA);
    const half = driveVoice(track({ commanded: MAX_TRACK_SPEED / 2 }), KIBA);
    const full = driveVoice(track({ commanded: MAX_TRACK_SPEED }), KIBA);
    expect(half.hz).toBeGreaterThan(idle.hz);
    expect(full.hz).toBeGreaterThan(half.hz);
    expect(full.gain).toBeGreaterThan(idle.gain);
  });

  it("does not care which way the tracks are turning", () => {
    // Reverse is not quieter than forward. `commanded` is signed, and a voice
    // that forgot to take its magnitude would fall silent going backwards —
    // which is exactly when a reversing machine most needs to be audible.
    const ahead = driveVoice(track({ commanded: MAX_TRACK_SPEED }), KIBA);
    const astern = driveVoice(track({ commanded: -MAX_TRACK_SPEED }), KIBA);
    expect(astern).toEqual(ahead);
  });

  it("hardens, sags and swells under load — 90% grip sounds like it", () => {
    // The card's done-when, as an assertion. Two machines at identical track
    // speed, one of them working: it has to be *audibly* different, in the
    // three ways a diesel actually differs.
    const easy = driveVoice(track({ commanded: MAX_TRACK_SPEED, traction: 0.1 }), KIBA);
    const labouring = driveVoice(
      track({ commanded: MAX_TRACK_SPEED, traction: 0.9 }),
      KIBA,
    );
    expect(labouring.cutoff).toBeGreaterThan(easy.cutoff * 2);
    expect(labouring.hz).toBeLessThan(easy.hz);
    // Loudness was added after the bench measured the first version: opening a
    // sawtooth's filter moves only a few percent of its energy, because nearly
    // all of it is in the first handful of harmonics. Brightness alone was a
    // cue you could see in a spectrum and not hear across a room.
    expect(labouring.gain).toBeGreaterThan(easy.gain * 1.2);
  });

  it("runs away when a track loses the ground, rather than going quiet", () => {
    // `traction: null` means nothing measured, not a low reading — and the
    // distinction has to survive into the sound. Reading `null` as 0 would make
    // a track clawing air identical to a track sitting on frictionless ice.
    const loaded = driveVoice(
      track({ commanded: MAX_TRACK_SPEED, traction: 0.5 }),
      KIBA,
    );
    const air = driveVoice(
      track({ commanded: MAX_TRACK_SPEED, traction: null, contacts: 0 }),
      KIBA,
    );
    const ice = driveVoice(track({ commanded: MAX_TRACK_SPEED, traction: 0 }), KIBA);
    expect(air.hz).toBeGreaterThan(loaded.hz);
    expect(air.hz).toBeGreaterThan(ice.hz);
    expect(air.cutoff).not.toBe(ice.cutoff);
  });
});

describe("the grind carries slip", () => {
  it("is silent on a track that is not sliding", () => {
    expect(grindVoice(track({ commanded: MAX_TRACK_SPEED, traction: 0.9 })).gain).toBe(
      0,
    );
  });

  it("grows with how fast the track is sliding", () => {
    const little = grindVoice(track({ slip: 0.4 }));
    const lots = grindVoice(track({ slip: 2 }));
    expect(lots.gain).toBeGreaterThan(little.gain);
    expect(little.gain).toBeGreaterThan(0);
  });

  it("stays silent when there is no ground to grind against", () => {
    // The largest slip reading on the machine belongs to a track in mid-air,
    // which is rubbing against nothing at all. Without the contact check this
    // is the loudest possible sound for the quietest possible condition.
    const spinning = track({ commanded: 2.2, slip: 2.2, contacts: 0, traction: null });
    expect(grindVoice(spinning).gain).toBe(0);
  });

  it("brightens as the friction cone fills", () => {
    expect(grindVoice(track({ slip: 1, traction: 0.9 })).cutoff).toBeGreaterThan(
      grindVoice(track({ slip: 1, traction: 0.1 })).cutoff,
    );
  });
});

describe("an impact's voice follows how hard it was", () => {
  it("scales amplitude with the square root of energy", () => {
    // Four times the energy is twice the amplitude. Not a curve chosen to feel
    // right: radiated energy scales with impact energy, and an ear hears
    // amplitude.
    expect(loudness(100, 400)).toBeCloseTo(0.5, 6);
    expect(loudness(400, 400)).toBeCloseTo(1, 6);
    expect(loudness(-5, 400)).toBe(0);
    expect(loudness(4000, 400)).toBe(1);
  });

  it("makes a pole tipping over a tick and a pipe stack at speed a bang", () => {
    // Both measured off the real sim: an untouched site drops a marker pole for
    // 1.6 J, and 6.2 t into a pipe stack at full speed delivers about 550 J.
    // The whole range has to fit between them with no threshold anywhere.
    const tick = impactVoice(impact({ what: "pole", joules: 1.6 }));
    const bang = impactVoice(impact({ what: "pipes", joules: 550 }));
    expect(tick.gain).toBeLessThan(0.1);
    expect(bang.gain).toBeGreaterThan(0.8);
  });

  it("rings lower and longer the harder it is hit", () => {
    const tap = impactVoice(impact({ what: "pipes", joules: 20 }));
    const slam = impactVoice(impact({ what: "pipes", joules: 700 }));
    // A bang is not a tap turned up: it excites lower modes and rings on.
    expect(slam.hz).toBeLessThan(tap.hz);
    expect(slam.decay).toBeGreaterThan(tap.decay);
  });

  it("gives every kind on the site its own voice", () => {
    // A total table rather than a default, so adding a prop kind is a type
    // error rather than a cone noise coming out of a boulder.
    const kinds = ["cone", "pole", "pipes", "barrier", "scooter", "rock"] as const;
    const pitches = kinds.map((what) => impactVoice(impact({ what, joules: 20 })).hz);
    expect(new Set(pitches).size).toBe(kinds.length);
  });

  it("sharpens the strike with energy, independently of what rang", () => {
    // The ring is the material and the strike is the energy. Tying the strike
    // to the ring made the heaviest impacts the dullest — the heaviest things
    // ring lowest — and the bench measured a 140 kJ landing as quieter than
    // driving. A harder contact is a sharper one, whatever it landed on.
    const tap = impactVoice(impact({ what: "pipes", joules: 20 }));
    const slam = impactVoice(impact({ what: "pipes", joules: 700 }));
    expect(slam.strikeHz).toBeGreaterThan(tap.strikeHz * 2);
    // Same energy, different bodies: the ring differs, the strike does not.
    expect(impactVoice(impact({ what: "cone", joules: 20 })).strikeHz).toBe(
      tap.strikeHz,
    );
    expect(impactVoice(impact({ what: "cone", joules: 20 })).hz).not.toBe(tap.hz);
  });

  it("keeps the hull on its own scale", () => {
    // 140 kJ lands on the hull from a 2.4 m drop and 15 J is a real hit on a
    // pipe stack. One reference for both would make every prop inaudible.
    const landing = hullVoice(hullHit(140_000));
    const scuff = hullVoice(hullHit(300));
    expect(landing.gain).toBe(1);
    expect(scuff.gain).toBeLessThan(0.1);
    expect(landing.hz).toBeLessThan(impactVoice(impact({ what: "pipes" })).hz);
  });
});

describe("the horn is the audible half of the master lamp", () => {
  it("says nothing until something is wrong", () => {
    expect(isSilent(hornVoice(NOMINAL, KIBA))).toBe(true);
    expect(isSilent(hornVoice(ACTIVE, KIBA))).toBe(true);
  });

  it("beats faster and higher for an alarm than for a caution", () => {
    const caution = hornVoice(WARN, KIBA);
    const alarm = hornVoice(ALARM, KIBA);
    expect(isSilent(caution)).toBe(false);
    expect(alarm.rate).toBeGreaterThan(caution.rate);
    expect(alarm.hz).toBeGreaterThan(caution.hz);
  });

  it("beats at the lamp's own rates, so the two do not fight", () => {
    // `substrate.css` blinks at 1.1 s and 0.34 s. The duplication is deliberate
    // and flagged; this is the test that notices when one side moves.
    expect(hornVoice(WARN, KIBA).rate).toBeCloseTo(1 / 1.1, 6);
    expect(hornVoice(ALARM, KIBA).rate).toBeCloseTo(1 / 0.34, 6);
  });
});
