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

import { ALARM, type Condition, NOMINAL, WARN } from "../control/bus.ts";
import { STEP_SECONDS } from "../core/clock.ts";
import type { SimEvent } from "../core/events.ts";
import type { Snapshot, TrackState } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import type { PropKind } from "../world/props.ts";

const REST: TrackState = {
  commanded: 0,
  surface: 0,
  slip: 0,
  contacts: 6,
  traction: 0,
};

/** Linear from `a` to `b` between times `from` and `to`, held at both ends. */
const ramp = (t: number, from: number, to: number, a: number, b: number): number => {
  if (t <= from) return a;
  if (t >= to) return b;
  return a + ((t - from) / (to - from)) * (b - a);
};

/** A track doing one thing. `surface` follows from the other two, as it does. */
function track(over: Partial<TrackState>): TrackState {
  const commanded = over.commanded ?? 0;
  const slip = over.slip ?? 0;
  return {
    ...REST,
    ...over,
    commanded,
    slip,
    surface: over.surface ?? commanded - slip,
  };
}

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
  /** The machine at time `t`, and how loudly it is complaining. */
  frame(t: number): { snapshot: Snapshot; alarm: Condition };
}

/**
 * Everything a scene needs and nothing it does not.
 *
 * A snapshot is a large record and a voice reads four fields of it. Rather than
 * fake the rest convincingly, this fills them with the emptiest honest value:
 * the bench is a listening surface, and a route or a bill on it would be a
 * detail nobody can hear pretending to matter.
 */
function frameOf(
  t: number,
  left: TrackState,
  right: TrackState,
  events: readonly SimEvent[] = [],
): Snapshot {
  const tick = Math.round(t / STEP_SECONDS);
  return {
    tick,
    simSeconds: t,
    seed: 0,
    distance: 0,
    machine: {
      pose: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
      left,
      right,
      speed: Math.max(0, (left.surface + right.surface) / 2),
      pitch: 0,
      roll: 0,
    },
    stages: [],
    props: [],
    route: [],
    damage: [],
    bill: 0,
    // The reader takes what it has not seen, so handing it the whole scene's
    // events every frame is correct and each one still fires exactly once.
    events: events.filter((e) => e.tick <= tick),
  };
}

const both = (t: number, state: Partial<TrackState>, events?: readonly SimEvent[]) =>
  frameOf(t, track(state), track(state), events);

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
    frame: (t) => ({
      snapshot: both(t, {
        commanded: MAX_TRACK_SPEED,
        traction: ramp(t, 1, 5, 0.1, 0.95),
      }),
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
          : track({
              commanded: MAX_TRACK_SPEED,
              traction: null,
              contacts: 0,
              slip: MAX_TRACK_SPEED,
            }),
      ),
      alarm: t < 1.5 ? NOMINAL : ALARM,
    }),
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
    note: "the machine itself, dropped 2.4 m. 140 kJ into the hull — the biggest thing rung 1 can make happen.",
    seconds: 5,
    frame: (t) => ({
      snapshot: both(t, { commanded: 0.6, traction: 0.2 }, [
        { kind: "hull", seq: 1, tick: 90, joules: 140_000, jolt: 6.7 },
      ]),
      alarm: NOMINAL,
    }),
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
