/**
 * States worth listening to.
 *
 * The audio counterpart of `fixtures.ts`, and it exists for the same reason
 * that file does: a thing you cannot cheaply perceive is a thing that ships
 * broken with everything green (`META.md`). A screenshot bench answered that
 * for the panel; a machine's voice needs one too, and it needs one *more*,
 * because nothing about a sound is expressible as an assertion at all.
 *
 * A scene is a function of time rather than a frozen state, because half of
 * what a voice does is what it does *while something changes* — a note sagging
 * as the grade steepens is the whole point, and no still frame contains it.
 *
 * These are hand-built, not simulated. That is deliberate: a scene has to hold
 * one condition still long enough to hear it, and a real run refuses to.
 */

import {
  ACTIVE,
  ALARM,
  type Condition,
  NOMINAL,
  type Stage,
  WARN,
} from "../control/bus.ts";
import { STEP_SECONDS } from "../core/clock.ts";
import type { SimEvent } from "../core/events.ts";
import { chassis, snapshot, stage, track } from "../core/fixture.ts";
import type { Shake, Snapshot, Suspension, TrackState } from "../core/snapshot.ts";
import { G, MAX_TRACK_SPEED } from "../core/spec.ts";
import type { PropKind } from "../world/props.ts";

/** Linear from `a` to `b` between times `from` and `to`, held at both ends. */
const ramp = (t: number, from: number, to: number, a: number, b: number): number => {
  if (t <= from) return a;
  if (t >= to) return b;
  return a + ((t - from) / (to - from)) * (b - a);
};

/** A marker reached, on the channel, at a tick. */
const mark = (
  tick: number,
  pin: number,
  count: number,
  total: number,
  seq: number,
): SimEvent => ({ kind: "waypoint", seq, tick, pin, count, total });

/** The exercise settling, either way. */
const settle = (
  tick: number,
  outcome: "success" | "failed",
  count: number,
  total: number,
  seq: number,
): SimEvent => ({ kind: "outcome", seq, tick, outcome, count, total });

/** An impact, on the channel, at a tick. */
const hit = (tick: number, what: PropKind, joules: number, seq: number): SimEvent => ({
  kind: "impact",
  seq,
  tick,
  prop: 0,
  what,
  joules,
  at: [0, 0, 0],
});

export interface Scene {
  readonly name: string;
  /** What you are listening for. Printed by the bench beside the file. */
  readonly note: string;
  readonly seconds: number;
  /**
   * The machine at time `t`, what it is complaining about, and whether a hand
   * is on the horn. The last one is not on the recording and never was — it is
   * a cab state, which is exactly why a scene has to be able to say it.
   */
  frame(t: number): { snapshot: Snapshot; alarm: Condition; horn?: boolean };
}

/**
 * The chassis slot, which is how a scene says **whose machine this is**.
 *
 * The audio engine reads the maker off this stage and voices the machine from
 * that house (`makers/sound.ts`), exactly as the dash reads it for the panel's
 * colours. So a scene can put a machine from a manufacturer that does not build
 * chassis yet on the bench, and hear what one would sound like — which is the
 * only way to check that the house arrangement is real rather than promised.
 */
const chassisStage = (maker: string): Stage => chassis(maker, { condition: ACTIVE });

/** A fitted component's slot, for scenes about the panel rather than the ride. */
const fittedStage = (over: Partial<Stage> & { id: string; maker: string }): Stage => ({
  ...stage({ id: over.id, maker: over.maker, verb: "CAP" }),
  ...over,
});

/**
 * A scene's frame: the kit's snapshot, plus the two things a scene owns.
 *
 * Everything unstated takes the kit's empty default — no route, no bill, no
 * exercise — because the bench is a listening surface and a route on it would
 * be a detail nobody can hear pretending to matter.
 */
function frameOf(
  t: number,
  left: TrackState,
  right: TrackState,
  events: readonly SimEvent[] = [],
  maker = "KIBA WORKS",
  /** Standing on the ground unless a scene says otherwise: 1 g up, and still. */
  shake?: Shake,
  /** Kit fitted below the chassis, for scenes about the panel. */
  fitted: readonly Stage[] = [],
): Snapshot {
  const tick = Math.round(t / STEP_SECONDS);
  return snapshot({
    tick,
    simSeconds: t,
    left,
    right,
    shake,
    stages: [chassisStage(maker), ...fitted],
    // The reader takes what it has not seen, so handing it the whole scene's
    // events every frame is correct and each one still fires exactly once.
    events: events.filter((e) => e.tick <= tick),
  });
}

const both = (
  t: number,
  state: Partial<TrackState>,
  events?: readonly SimEvent[],
  maker?: string,
  shake?: Shake,
) => frameOf(t, track(state), track(state), events, maker, shake);

/** The load ramp `labouring` runs, so two houses can be heard against it. */
const labour = (t: number): Partial<TrackState> => ({
  commanded: MAX_TRACK_SPEED,
  traction: ramp(t, 1, 5, 0.1, 0.95),
});

/**
 * Ground, as the hull feels it — shaped like **the measured thing**.
 *
 * Two false starts, both instructive. Sines first, which is a wobble: the scene
 * measured identically over smooth ground and rough. Then sharp spikes in
 * continuous time, which is the right *shape* and still measured flat — the
 * spikes decayed in 12 ms and the bench samples at 60 Hz, so most of them fell
 * between two frames and the ones that landed were aliased to whatever height
 * the sampler happened to catch.
 *
 * The sim has no such problem: it *is* a 60 Hz signal, and a probe over the
 * default site says what it looks like. Parked reads exactly zero; at full
 * ahead the percentiles are in the note on `rough` below, where the curve
 * fitted to them lives.
 */
const FRAME_HZ = 60;

/** A deterministic draw per frame. The bench must render the same twice. */
function dither(frame: number): number {
  const x = Math.sin(frame * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** What an accelerometer bolted to the hull would read at this instant. */
type Reading = Omit<Shake, "jerk">;

/**
 * A `Shake` from a reading, with the jerk **differenced from the frame before
 * it** — the same operation the sim performs, at the same rate.
 *
 * A scene cannot just make a jerk up: it is the difference between two
 * accelerometer readings, and inventing one that did not follow from the two
 * either side of it would be a bench that lies about the thing it exists to
 * check. Doing it this way also means a scene only has to describe *the ride*,
 * and the quantity the cab answers to falls out.
 */
function shakeAt(t: number, reading: (at: number) => Reading): Shake {
  const now = reading(t);
  const before = reading(Math.max(0, t - 1 / FRAME_HZ));
  return {
    ...now,
    jerk:
      Math.hypot(
        now.surge - before.surge,
        now.heave - before.heave,
        now.sway - before.sway,
      ) * FRAME_HZ,
  };
}

/**
 * Ground, as the hull feels it — shaped like **the measured thing**.
 *
 * Two false starts, both instructive. Sines first, which is a wobble: the scene
 * measured identically over smooth ground and rough. Then sharp spikes in
 * continuous time, which is the right *shape* and still measured flat — they
 * decayed in 12 ms and the bench samples at 60 Hz, so most of them fell between
 * two frames and the ones that landed were aliased to whatever height the
 * sampler happened to catch.
 *
 * The sim has no such problem: it *is* a 60 Hz signal, and a probe over the
 * default site says what it looks like. So this draws one reading per frame
 * from a curve fitted to the measured percentiles, and the differencing above
 * turns that into the jerk the cab answers to.
 *
 * **Refitted when the running gear got springs**, because they changed the
 * ride and a fixture fitted to the old one would have gone on describing a
 * machine that no longer exists. The knocks came out and a constant wobble
 * went in: the median step rose from 0.13 m/s² to 0.76 while the ninetieth
 * percentile *fell* from 8.6 to 1.85 and the ninety-ninth from 69 to 15.9. The
 * curve is `0.76 + 20·u^27.6`, through those last two.
 */
const rough =
  (amount: (at: number) => number) =>
  (t: number): Reading => {
    const frame = Math.round(t * FRAME_HZ);
    const jolt = amount(t) * (0.76 + 20 * dither(frame) ** 27.6);
    return {
      // A tracked machine walks sideways over a rut rather than riding across
      // it, so the vertical knock arrives with some of itself in the other two.
      surge: jolt * 0.3 * (dither(frame + 977) - 0.5),
      heave: G + jolt,
      sway: jolt * 0.24 * (dither(frame + 313) - 0.5),
    };
  };

/* -- the running gear ------------------------------------------------------ */

/**
 * What one side's dampers are dissipating, shaped like the measured thing.
 *
 * The same method as `rough` above and the same reason: a probe drove the
 * machine 80 m across the default site at full ahead and recorded both sides
 * every step. Parked is exactly zero, a crawl over the same ground reaches 7 W
 * at the ninetieth percentile, and at working speed the median step is 192 W,
 * the ninetieth 735 and the ninety-ninth 3400. The curve `937·u^2.29` passes
 * through the first two, which makes an ordinary drive a busy floor rather
 * than a series of bangs — because that is what an ordinary drive is. The
 * bangs are ruts, and a scene should put those where it means them.
 */
function riding(rough: number, frame: number, apart: number): Suspension {
  const u = dither(frame + apart);
  return {
    // Springs breathe either side of the static sag as the ground passes.
    compression: 0.45 + rough * (u - 0.5) * 0.3,
    damping: rough * 937 * u ** 2.29,
    bottomed: 0,
  };
}

/**
 * One rut, taken by one side: 0 either side of it, 1 at the bottom.
 *
 * A tenth of a second, which is what 0.16 m of travel at working speed is.
 */
function rut(t: number, at: number): number {
  const into = (t - at) / 0.12;
  return into < 0 || into > 1 ? 0 : 1 - Math.abs(2 * into - 1);
}

/** A side's running gear, with a rut in it. */
const took = (rough: number, frame: number, apart: number, hit: number): Suspension => {
  const base = riding(rough, frame, apart);
  if (hit <= 0) return base;
  return {
    // Past 1 is past the end of the travel: the reading that says the ground
    // won rather than that the ground was rough.
    compression: base.compression + hit * 0.75,
    // Nine kilowatts is the order of the worst single step the probe caught
    // (13 kW) — a bogie driven into its stop at working speed.
    damping: base.damping + hit * 9000,
    bottomed: Math.round(hit * 4),
  };
};

export const SCENES: readonly Scene[] = [
  {
    name: "idle",
    note: "running, hands off. Should be present and dull, never silent.",
    seconds: 4,
    frame: (t) => ({ snapshot: both(t, {}), alarm: NOMINAL }),
  },
  {
    name: "full-ahead",
    note: "levers open over a second, light going. Pitch and gain rise together.",
    seconds: 5,
    frame: (t) => ({
      snapshot: both(t, {
        commanded: ramp(t, 0.4, 1.6, 0, MAX_TRACK_SPEED),
        traction: ramp(t, 0.4, 1.6, 0, 0.3),
      }),
      alarm: NOMINAL,
    }),
  },
  {
    name: "labouring",
    note: "L-040's done-when: same track speed throughout, load 10% → 95%. It has to harden and sag.",
    seconds: 6,
    frame: (t) => ({ snapshot: both(t, labour(t)), alarm: NOMINAL }),
  },
  {
    name: "labouring-towa",
    note: "the same ramp on a TOWA chassis, which does not exist yet. Higher, smoother, and it barely sags — an electric drive holds its speed, and tells you far less about how hard it is working.",
    seconds: 6,
    frame: (t) => ({
      snapshot: both(t, labour(t), [], "TOWA DENKI"),
      alarm: NOMINAL,
    }),
  },
  {
    name: "slipping",
    note: "commanded full, ground going nowhere, cone full. The grind arrives on top of the note.",
    seconds: 5,
    frame: (t) => ({
      snapshot: both(t, {
        commanded: MAX_TRACK_SPEED,
        slip: ramp(t, 1, 2.5, 0, MAX_TRACK_SPEED),
        traction: ramp(t, 1, 2.5, 0.4, 1),
      }),
      alarm: t > 2.5 ? WARN : NOMINAL,
    }),
  },
  {
    name: "skid-turn",
    note: "left ahead, right astern. Two notes, two sides, and they should beat against each other.",
    seconds: 5,
    frame: (t) => ({
      snapshot: frameOf(
        t,
        track({ commanded: ramp(t, 0.5, 1.5, 0, MAX_TRACK_SPEED), traction: 0.55 }),
        track({ commanded: ramp(t, 0.5, 1.5, 0, -MAX_TRACK_SPEED), traction: 0.55 }),
      ),
      alarm: NOMINAL,
    }),
  },
  {
    name: "one-track-airborne",
    note: "left on the ground and loaded, right over a ridge. The free track runs away; it does not go quiet.",
    seconds: 5,
    frame: (t) => ({
      snapshot: frameOf(
        t,
        track({ commanded: MAX_TRACK_SPEED, traction: 0.9, slip: 0.2 }),
        t < 1.5
          ? track({ commanded: MAX_TRACK_SPEED, traction: 0.9 })
          : // `contacts: 0` is the whole statement now — the kit supplies the
            // null traction and the fully-drooped spring that follow from it.
            // Stated by hand, the spring did *not* follow: this scene ran a
            // track through the air at the parked 45% compression for as long
            // as it existed, and the bogie voice was reading it.
            track({
              commanded: MAX_TRACK_SPEED,
              contacts: 0,
              slip: MAX_TRACK_SPEED,
            }),
      ),
      alarm: t < 1.5 ? NOMINAL : ALARM,
    }),
  },
  {
    name: "creep",
    note: "walking pace with the weight on: slow separate clanks, and the dry bearing squeals. The one voice that says *heavy* rather than *fast*.",
    seconds: 6,
    frame: (t) => ({
      snapshot: both(t, { commanded: 0.35, traction: ramp(t, 0.5, 3, 0.2, 0.92) }),
      alarm: NOMINAL,
    }),
  },
  {
    name: "rough-ground",
    note: "the same drive over a graded pad, then over ruts. Nothing about the drivetrain changes — the rattle is the *ground*, and it is the only voice that renders it.",
    seconds: 8,
    frame: (t) => ({
      snapshot: both(
        t,
        { commanded: MAX_TRACK_SPEED * 0.8, traction: 0.45 },
        [],
        undefined,
        shakeAt(
          t,
          rough((at) => ramp(at, 2, 3.5, 0, 1)),
        ),
      ),
      alarm: NOMINAL,
    }),
  },
  {
    name: "the-rut",
    note: "a graded pad, then rutted ground, and twice a single track is driven into its stops — the **left** at 3.2 s and the **right** at 5.4 s. Listen for which side knocks: that is the whole card. The bogies are the only voice on the machine that can say it, because the damper doing the work belongs to one track.",
    seconds: 8,
    frame: (t) => {
      const frame = Math.round(t * FRAME_HZ);
      const gone = ramp(t, 1.6, 2.6, 0, 1);
      const left = rut(t, 3.2);
      const right = rut(t, 5.4);
      const driving = { commanded: MAX_TRACK_SPEED * 0.8, traction: 0.5 };
      return {
        snapshot: frameOf(
          t,
          track({ ...driving, suspension: took(gone, frame, 0, left) }),
          track({ ...driving, suspension: took(gone, frame, 977, right) }),
          [],
          undefined,
          // The cab hears the same ground through the springs, which is why it
          // is so much quieter than it used to be: what the bogies take is what
          // the rattle does not get.
          // A rut reaches the cab too, and much less than it used to: what the
          // bogies take is what the rattle does not get. Kept small on purpose
          // — the rattle is centred, so a scene where it dominated the ruts
          // would be a scene that could not tell you which side took one.
          shakeAt(t, (at) =>
            rough(
              (from) =>
                ramp(from, 1.6, 2.6, 0, 1) + 1.2 * (rut(from, 3.2) + rut(from, 5.4)),
            )(at),
          ),
        ),
        alarm: NOMINAL,
      };
    },
  },
  {
    name: "the-site",
    note: "a pole tipping over on its own (1.6 J), a cone, a barrier, then a pipe stack at speed (550 J). One scale, no thresholds.",
    seconds: 7,
    frame: (t) => {
      const events = [
        hit(60, "pole", 1.6, 1),
        hit(150, "cone", 12, 2),
        hit(240, "barrier", 46, 3),
        hit(330, "pipes", 550, 4),
      ];
      return {
        snapshot: both(t, { commanded: 1.4, traction: 0.5 }, events),
        alarm: NOMINAL,
      };
    },
  },
  {
    name: "landing",
    note: "the machine itself, dropped 2.4 m. 140 kJ into the hull — the biggest thing rung 1 can make happen. Weightless on the way down, and the whole cab arrives with it.",
    seconds: 5,
    frame: (t) => {
      // In the air an accelerometer reads **nothing**, which is why the cab goes
      // quiet before it lands rather than rattling all the way down. Then one
      // frame at 8 g, and everything loose in it arrives at once.
      const falling = t > 1.0 && t < 1.5;
      // Weightless from the moment it leaves the ground, then one frame at 9 g.
      // Both edges are steps, so the jerk differencing gives a bang leaving the
      // ground and a much bigger one arriving — and nothing in between.
      const reading = (at: number): Reading => ({
        surge: 0,
        heave: at > 1.0 && at < 1.5 ? 0 : at >= 1.5 && at < 1.52 ? G + 78 : G,
        sway: 0,
      });
      // Hanging in the air, then every bogie driven through its travel and on
      // to the stops at once. The hull event is the same 140 kJ it always was;
      // what is new is that the running gear is what *takes* it, and says so.
      const arriving = t >= 1.5 && t < 1.62;
      const suspension = falling
        ? { compression: 0, damping: 0, bottomed: 0 }
        : arriving
          ? { compression: 1.45, damping: 13_000, bottomed: 6 }
          : { compression: 0.45, damping: 0, bottomed: 0 };
      return {
        snapshot: both(
          t,
          {
            commanded: 0.6,
            traction: falling ? null : 0.2,
            contacts: falling ? 0 : 6,
            suspension,
          },
          [{ kind: "hull", seq: 1, tick: 90, joules: 140_000, jolt: 6.7 }],
          undefined,
          shakeAt(t, reading),
        ),
        alarm: NOMINAL,
      };
    },
  },
  {
    name: "horn",
    note: "two presses: a short one and a long lean. Listen for the valve chuffing before the chord speaks, and for the pitch sagging as the tank lets go — the *owp* is the half people whistle.",
    seconds: 6,
    frame: (t) => ({
      snapshot: both(t, { commanded: 0.8, traction: 0.3 }),
      alarm: NOMINAL,
      horn: (t > 0.8 && t < 1.15) || (t > 2.2 && t < 4.4),
    }),
  },
  {
    name: "horn-towa",
    note: "the same two presses on a TOWA chassis. Not an air horn at all — a moulded sounder an octave apart, with no air to let go of. It carries about as far as a doorbell.",
    seconds: 6,
    frame: (t) => ({
      snapshot: both(t, { commanded: 0.8, traction: 0.3 }, [], "TOWA DENKI"),
      alarm: NOMINAL,
      horn: (t > 0.8 && t < 1.15) || (t > 2.2 && t < 4.4),
    }),
  },
  {
    name: "everything-at-once",
    note: "the mix's worst case, and the reason there is a limiter: rutted ground, the horn down, a pipe stack at speed, the master alarming, and the rig calling the exercise complete over the top of all of it, inside a second and a half. If anything clips, it clips here.",
    seconds: 6,
    frame: (t) => ({
      snapshot: both(
        t,
        {
          commanded: MAX_TRACK_SPEED,
          traction: 0.9,
          slip: 0.8,
          // …and the running gear working the whole time, with a rut in the
          // middle of the pile-up. If the mix has a ceiling, this finds it.
          suspension: took(1, Math.round(t * FRAME_HZ), 0, rut(t, 2.7)),
        },
        [
          hit(150, "pipes", 550, 1),
          hit(156, "barrier", 46, 2),
          hit(162, "cone", 12, 3),
          // The rig, arriving in the middle of the worst moment the machine can
          // have. It ducks under the horn like everything else on the bed, and
          // it is the newest thing that can land on an already-full frame — so
          // the scene that exists to catch summed transients has to include it.
          mark(168, 3, 4, 5, 4),
          settle(210, "success", 5, 5, 5),
        ],
        undefined,
        shakeAt(
          t,
          rough((at) => 1 + 3 * rut(at, 2.7)),
        ),
      ),
      alarm: t > 1.5 ? ALARM : NOMINAL,
      horn: t > 2.2 && t < 4.5,
    }),
  },
  {
    name: "switchgear",
    note: "an idling machine and four switches thrown late: TOWA's guidance off, HANSA's verb changed, its guard bypassed, then put back. Each is a click and a clunk a fraction apart — the button, then the load letting go — in the voice of whoever built the kit. Nothing here is a UI event: it is all on the snapshot, so a replay clicks too. Opens quiet on purpose; the second half is the panel.",
    seconds: 7,
    frame: (t) => ({
      snapshot: frameOf(
        t,
        track({ commanded: 0, traction: 0 }),
        track({ commanded: 0, traction: 0 }),
        [],
        "KIBA WORKS",
        undefined,
        [
          fittedStage({ id: "NAV", maker: "TOWA DENKI", enabled: t < 2.6 }),
          fittedStage({
            id: "TILT",
            maker: "HANSA REGELTECHNIK",
            safety: true,
            verb: t > 3.4 ? "AMP" : "CAP",
            enabled: t < 5.2 || t > 6.0,
            // A bypassed guard stands at WARN rather than going quiet, so the
            // relay latches on the way in — and says nothing on the way out.
            condition: t >= 5.2 && t <= 6.0 ? WARN : NOMINAL,
          }),
        ],
      ),
      // Acknowledged almost at once, so that what the second half of this
      // scene measures is the *panel* and not the buzzer sitting on top of it.
      alarm: t >= 5.2 && t <= 5.5 ? WARN : NOMINAL,
    }),
  },
  {
    name: "checkpoint",
    note: "a machine at work, and the rig marking two markers and then the end of the exercise. The only voice in the cab that is not the machine, a manufacturer or the site — and the only one made of intervals. It has to arrive over a working drivetrain without shouting: listen for whether you could take your eyes off the ground and still know what happened.",
    seconds: 6,
    frame: (t) => {
      const events = [
        mark(60, 0, 1, 3, 1),
        mark(150, 1, 2, 3, 2),
        mark(240, 2, 3, 3, 3),
        settle(240, "success", 3, 3, 4),
      ];
      return {
        snapshot: both(t, { commanded: MAX_TRACK_SPEED * 0.7, traction: 0.4 }, events),
        alarm: NOMINAL,
      };
    },
  },
  {
    name: "exercise-failed",
    note: "the same instrument saying the opposite thing: a scooter *nudged* at 30 J, then the rig's two notes going the other way. The bang is deliberately small — the point is that barely touching somebody's property is still categorical failure, and it keeps the scene's peak the cue's rather than the impact's, so the number can see the thing the scene is about. The buzzer is not part of it: the machine is fine, the exercise is not, and they must not be the same noise.",
    seconds: 5,
    frame: (t) => {
      const events = [hit(60, "scooter", 30, 1), settle(96, "failed", 1, 3, 2)];
      // A crawl, not a charge. 30 J is what half a tonne of machine at 0.8 m/s
      // puts into a 90 kg scooter, which is the manoeuvring speed anybody would
      // actually be at when they clip one — and it leaves the bed quiet enough
      // that the scene's peak is the cue rather than the drive note. A scene
      // whose number cannot see its own subject is not a check (META).
      return {
        snapshot: both(t, { commanded: MAX_TRACK_SPEED * 0.25, traction: 0.3 }, events),
        alarm: NOMINAL,
      };
    },
  },
  {
    name: "caution",
    note: "the horn at WARN, over an idling machine. Slow, low, and it must not drown the note.",
    seconds: 5,
    frame: (t) => ({ snapshot: both(t, {}), alarm: t > 0.6 ? WARN : NOMINAL }),
  },
  {
    name: "alarm-then-acknowledged",
    note: "ALARM for three seconds, then the pilot presses it. The horn stops; nothing else changes.",
    seconds: 6,
    frame: (t) => ({
      snapshot: both(t, { commanded: 1.2, traction: 0.4 }),
      alarm: t > 0.6 && t < 3.6 ? ALARM : NOMINAL,
    }),
  },
];
