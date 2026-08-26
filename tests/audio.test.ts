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
  alarmVoice,
  bogieVoice,
  chainLink,
  chainVoice,
  driveVoice,
  grindVoice,
  hornVoice,
  hullVoice,
  impactVoice,
  isSilent,
  loudness,
  panelVoice,
  rattleVoice,
  squeakVoice,
} from "../src/audio/voices.ts";
import { ACTIVE, ALARM, NOMINAL, WARN } from "../src/control/bus.ts";
import type { HullEvent, ImpactEvent } from "../src/core/events.ts";
import type { TrackState } from "../src/core/snapshot.ts";
import { G, GROUSER_PITCH, MAX_TRACK_SPEED } from "../src/core/spec.ts";
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
  // Standing on its springs: the static sag, nothing travelling.
  suspension: { compression: 0.45, damping: 0, bottomed: 0 },
  ...over,
});

/** A side's running gear, working. `damping` is watts, and it is the voice. */
const bogies = (damping: number, bottomed = 0) =>
  track({ suspension: { compression: 0.45, damping, bottomed } });

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
      const { drive, alarm } = styleOf(name).sound;
      expect(drive.idleHz, `${name} idle`).toBeGreaterThan(0);
      expect(drive.spanHz, `${name} span`).toBeGreaterThan(0);
      expect(alarm.warnHz, `${name} warn`).toBeGreaterThan(0);
      expect(alarm.alarmHz, `${name} alarm`).toBeGreaterThan(0);
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

describe("the chain is the belt, and you hear what you see", () => {
  it("clanks once per plate over the sprocket", () => {
    // The rate the renderer turns the belt at, and the rate the ear hears. One
    // number: change the plate count and the picture and the sound move
    // together, because neither owns it.
    const chain = chainVoice(track({ commanded: MAX_TRACK_SPEED }), KIBA);
    expect(chain.rate).toBeCloseTo(MAX_TRACK_SPEED / GROUSER_PITCH, 6);
  });

  it("says nothing on a stopped belt", () => {
    expect(chainVoice(track(), KIBA).rate).toBe(0);
  });

  it("clanks faster on a track that has lost the ground, not slower", () => {
    // `commanded` and not `surface`: the belt's speed relative to the hull is
    // what the drivetrain delivers, and a track spinning in mid-air has nothing
    // holding it back. Reading the ground speed here would make a machine
    // beached on a ridge go quiet at exactly the moment it is working hardest.
    const spinning = chainVoice(
      track({ commanded: MAX_TRACK_SPEED, surface: 0, contacts: 0, traction: null }),
      KIBA,
    );
    const gripping = chainVoice(
      track({ commanded: MAX_TRACK_SPEED * 0.5, surface: MAX_TRACK_SPEED * 0.5 }),
      KIBA,
    );
    expect(spinning.rate).toBeGreaterThan(gripping.rate);
  });

  it("keeps a third of its voice with no ground under it", () => {
    // Two noises: a plate coming over the sprocket, which happens whatever the
    // machine is doing, and a plate slapping the ground, which does not.
    const air = chainVoice(track({ commanded: 1.4, contacts: 0 }), KIBA);
    const dirt = chainVoice(track({ commanded: 1.4, contacts: 6 }), KIBA);
    expect(air.link.gain).toBeGreaterThan(0);
    expect(air.link.gain).toBeLessThan(dirt.link.gain);
  });

  it("makes each plate unlike the last, by the maker's amount", () => {
    const link = chainVoice(track({ commanded: 1.4 }), KIBA).link;
    const high = chainLink(link, 0.3, 1);
    const low = chainLink(link, 0.3, -1);
    expect(high.hz).toBeGreaterThan(low.hz);
    // A maker that grinds its links flat gets a metronome, and is entitled to.
    expect(chainLink(link, 0, 1).hz).toBe(link.hz);
    // Deterministic: the same wobble is the same plate, every replay.
    expect(chainLink(link, 0.3, 0.5)).toEqual(chainLink(link, 0.3, 0.5));
  });
});

describe("the squeak is a heavy crawl", () => {
  const crawl = track({ commanded: 0.3, traction: 0.9 });

  it("squeals inching a load", () => {
    expect(squeakVoice(crawl, KIBA).gain).toBeGreaterThan(0);
  });

  it("is gone by working speed", () => {
    // Stick-slip is a low-relative-speed phenomenon. Without this the squeak
    // was simply on whenever the machine was loaded, and measured as a
    // labouring cue brighter than the note's own.
    const fast = track({ commanded: MAX_TRACK_SPEED, traction: 0.9 });
    expect(squeakVoice(fast, KIBA).gain).toBeLessThan(squeakVoice(crawl, KIBA).gain);
  });

  it("needs weight on it and ground under it", () => {
    expect(squeakVoice(track({ commanded: 0.3, traction: 0 }), KIBA).gain).toBe(0);
    expect(
      squeakVoice(track({ commanded: 0.3, traction: null, contacts: 0 }), KIBA).gain,
    ).toBe(0);
  });
});

describe("the rattle is the ground, not the drivetrain", () => {
  const shake = (jerk: number) => ({ surge: 0, heave: G, sway: 0, jerk });

  it("is silent standing still", () => {
    expect(rattleVoice(shake(0), KIBA).gain).toBe(0);
  });

  /**
   * The case the whole quantity exists for. A toolbox on the floor is quiet at
   * rest because the floor holds it, and quiet in free fall because it is
   * falling with the floor — and no function of the accelerometer *reading*
   * alone can call both silent, because they read 1 g and 0 g. The first
   * version keyed off the reading and hissed all the way through a jump.
   */
  it("is silent in free fall, where the reading is nothing at all", () => {
    expect(rattleVoice({ surge: 0, heave: 0, sway: 0, jerk: 0 }, KIBA).gain).toBe(0);
  });

  it("rises with the jerk, and saturates", () => {
    const soft = rattleVoice(shake(30), KIBA).gain;
    const hard = rattleVoice(shake(120), KIBA).gain;
    expect(hard).toBeGreaterThan(soft);
    expect(rattleVoice(shake(50_000), KIBA).gain).toBeCloseTo(
      rattleVoice(shake(160), KIBA).gain,
      6,
    );
  });

  it("ignores an ordinary crawl", () => {
    // Measured on the machine: the median step at full ahead is a jerk of 4,
    // and the floor sits above the hum so that only the ruts speak.
    expect(rattleVoice(shake(4), KIBA).gain).toBe(0);
  });

  it("is quieter than it was, because the machine got springs", () => {
    // The numbers this voice is fitted to were re-measured when the running
    // gear was sprung, and the ride changed shape: the ninetieth-percentile
    // step fell from a jerk of 416 to 23. A rattle still fitted to the old
    // ride would have gone silent — 23 is 2% of the way up the old range and
    // most of the way up this one — which is a suspension being installed and
    // the cab pretending nothing happened.
    expect(rattleVoice(shake(23), KIBA).gain).toBeGreaterThan(0.2);
  });
});

/**
 * The knock a rut makes, which is the voice this project **refused to build**
 * until there was a quantity behind it (`docs/design/cab/sound.md`). What makes it
 * honest now is the springs, and what makes it useful is that it belongs to one
 * track: nothing else on the machine can tell you which side took something.
 */
describe("the bogies are the ground, one track at a time", () => {
  it("says nothing standing still, whatever the machine weighs", () => {
    // The reason the voice reads the **damper** and not the spring. A spring is
    // loudest when the machine is heaviest, which is when it is parked; a
    // damper can only speak while the wheel is moving against the frame.
    expect(bogieVoice(track(), KIBA).gain).toBe(0);
    expect(bogieVoice(bogies(0), KIBA).gain).toBe(0);
  });

  it("ignores an ordinary drive and answers a rut", () => {
    // Measured across 80 m of the default site at full ahead: the median step
    // dissipates 192 W a side, the ninetieth 735 and the ninety-ninth 3400.
    expect(bogieVoice(bogies(192), KIBA).gain).toBe(0);
    expect(bogieVoice(bogies(735), KIBA).gain).toBeGreaterThan(0);
    expect(bogieVoice(bogies(3400), KIBA).gain).toBeGreaterThan(
      bogieVoice(bogies(735), KIBA).gain,
    );
  });

  it("saturates rather than running away with the mix", () => {
    const full = bogieVoice(bogies(3400), KIBA).gain;
    expect(bogieVoice(bogies(13_000), KIBA).gain).toBeCloseTo(full, 6);
  });

  it("changes what it sounds like on the stops, never how loud it is", () => {
    // Running out of travel is the one thing that says *the ground won* rather
    // than *the ground was rough*. It is a timbre, because how hard you were
    // hit is already the watts — letting it add level would be counting the
    // same event twice.
    const rough = bogieVoice(bogies(2000), KIBA);
    const stopped = bogieVoice(bogies(2000, 6), KIBA);
    expect(stopped.hz).toBeGreaterThan(rough.hz);
    expect(stopped.gain).toBe(rough.gain);
  });

  it("sounds like the undercarriage its maker built", () => {
    const towa = bogieVoice(bogies(2000), styleOf("TOWA DENKI").sound);
    const kiba = bogieVoice(bogies(2000), KIBA);
    // Rubber-bushed bogies on a lighter machine: higher and tighter than steel
    // arms on torsion bars. Not quieter — level is not a house decision.
    expect(towa.hz).toBeGreaterThan(kiba.hz);
    expect(towa.q).toBeGreaterThan(kiba.q);
    expect(towa.gain).toBe(kiba.gain);
  });

  it("gives every maker a bogie that hits its stop harder than it rides", () => {
    for (const name of MAKER_NAMES) {
      const { gear } = styleOf(name).sound;
      expect(gear.stopHz, `${name} stop`).toBeGreaterThan(gear.bogieHz);
    }
  });
});

describe("nothing is struck twice in the same place", () => {
  it("gives two hits on one material two voices", () => {
    const first = impactVoice(impact({ seq: 1 }));
    const second = impactVoice(impact({ seq: 2 }));
    expect(first.hz).not.toBeCloseTo(second.hz, 3);
    // Same material, same energy: the difference is where it was caught, and it
    // must not be a difference in how *hard* it was hit.
    expect(first.gain).toBe(second.gain);
  });

  it("hits the same way twice on a replay", () => {
    // Drawn from `seq`, which is on the recording. A wobble from `Math.random`
    // would make two playbacks of one run into two different runs.
    expect(impactVoice(impact({ seq: 7 }))).toEqual(impactVoice(impact({ seq: 7 })));
  });
});

/**
 * The horn is the one voice that renders a **decision** rather than a quantity,
 * and the only one aimed at somebody outside the cab. What can be asserted
 * about it is that it is a chord, that a maker's chord is a maker's, and that
 * having three trumpets is not a way to be louder than a maker with two.
 */
describe("the horn is a chord with a mechanism in it", () => {
  it("sounds every trumpet the maker plumbed", () => {
    expect(hornVoice(KIBA).trumpets).toHaveLength(3);
    expect(hornVoice(styleOf("HANSA REGELTECHNIK").sound).trumpets).toHaveLength(2);
  });

  it("tunes them to the maker's interval", () => {
    // A major triad on KIBA: the classic three-trumpet rig. The spread is a few
    // cents either side of exact, so nothing lands on the ratio precisely.
    const [root, third, fifth] = hornVoice(KIBA).trumpets as [number, number, number];
    expect(third / root).toBeCloseTo(1.25, 1);
    expect(fifth / root).toBeCloseTo(1.5, 1);
  });

  it("is out of tune with itself, on purpose", () => {
    // Exactly in tune is a synthesiser. The beating between trumpets is what a
    // pair of diaphragms on one air line actually does.
    const house = styleOf("KIBA WORKS").sound;
    const [root, third] = hornVoice(house).trumpets as [number, number];
    expect(third / root).not.toBe(house.horn.chord[1]);
  });

  it("does not let a third trumpet buy loudness", () => {
    // Power, not amplitude — the same rule as the drive note's twin. Three
    // trumpets at a full share would make a KIBA half again as loud as a HANSA
    // for having plumbed one more pipe.
    const kiba = hornVoice(KIBA);
    const hansa = hornVoice(styleOf("HANSA REGELTECHNIK").sound);
    const power = (v: typeof kiba) => v.gain ** 2 * v.trumpets.length;
    expect(power(kiba)).toBeCloseTo(power(hansa), 6);
  });

  it("is the loudest thing the machine can do on purpose", () => {
    // Every other level leaves room for the site. This one takes the room.
    const drive = driveVoice(track({ commanded: MAX_TRACK_SPEED, traction: 1 }), KIBA);
    expect(hornVoice(KIBA).gain).toBeGreaterThan(Math.hypot(drive.gain, drive.pulse));
  });

  it("bends and chuffs, or is honest about being a doorbell", () => {
    const kiba = hornVoice(KIBA);
    expect(kiba.bend).toBeGreaterThan(0);
    expect(kiba.chuff).toBeGreaterThan(0);
    // TOWA's is a moulded sounder with no air in it at all, and says so.
    expect(hornVoice(styleOf("TOWA DENKI").sound).chuff).toBe(0);
  });
});

/**
 * Two events, because a real control is two events: the button, and the load
 * letting go a fraction later. Almost every switch on the machine is heard off
 * the snapshot rather than reported by the cockpit, so these are the tests for
 * the *voices*; that the engine notices a slot changing is what the bench's
 * `switchgear` scene is for.
 */
describe("the panel is switchgear, not a website", () => {
  it("gives the load a lower, longer voice than the button", () => {
    const click = panelVoice("click", KIBA);
    const clunk = panelVoice("clunk", KIBA);
    expect(clunk.hz).toBeLessThan(click.hz);
    expect(clunk.decay).toBeGreaterThan(click.decay);
    // A contactor is an armature hitting a stop, not a finger on plastic.
    expect(clunk.strikeHz).toBeLessThan(click.strikeHz);
  });

  it("sounds like the maker who built the kit", () => {
    const kiba = panelVoice("click", KIBA);
    const towa = panelVoice("click", styleOf("TOWA DENKI").sound);
    // A membrane over a dome switch is higher and shorter than sprung steel —
    // which is timbre. It is not allowed to be quieter, because level is not a
    // house decision.
    expect(towa.hz).toBeGreaterThan(kiba.hz);
    expect(towa.decay).toBeLessThan(kiba.decay);
    expect(towa.gain).toBe(kiba.gain);
  });

  it("stays under the machine it is bolted to", () => {
    // These happen under your hand rather than out on the site. A panel louder
    // than an impact would be a cockpit made of noise.
    const bang = impactVoice(impact({ what: "pipes", joules: 550 }));
    expect(panelVoice("clunk", KIBA).gain).toBeLessThan(bang.gain);
  });
});

describe("the buzzer is the audible half of the master lamp", () => {
  it("says nothing until something is wrong", () => {
    expect(isSilent(alarmVoice(NOMINAL, KIBA))).toBe(true);
    expect(isSilent(alarmVoice(ACTIVE, KIBA))).toBe(true);
  });

  it("beats faster and higher for an alarm than for a caution", () => {
    const caution = alarmVoice(WARN, KIBA);
    const alarm = alarmVoice(ALARM, KIBA);
    expect(isSilent(caution)).toBe(false);
    expect(alarm.rate).toBeGreaterThan(caution.rate);
    expect(alarm.hz).toBeGreaterThan(caution.hz);
  });

  it("beats at the lamp's own rates, so the two do not fight", () => {
    // `substrate.css` blinks at 1.1 s and 0.34 s. The duplication is deliberate
    // and flagged; this is the test that notices when one side moves.
    expect(alarmVoice(WARN, KIBA).rate).toBeCloseTo(1 / 1.1, 6);
    expect(alarmVoice(ALARM, KIBA).rate).toBeCloseTo(1 / 0.34, 6);
  });
});
