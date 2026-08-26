/**
 * Fixture snapshots for the cockpit sandbox.
 *
 * Hand-built `Snapshot` values — no Rapier, no renderer, no world. That is the
 * whole point: a person (or an agent) authoring a manufacturer's theme should be
 * able to see every state a component can be in without driving a machine into a
 * ditch to reach it, and without waiting on a wasm boot.
 *
 * These are **not** test fixtures for behaviour. Nothing here asserts anything
 * about the sim; they exist so the states are *lookable at*. Screenshots catch
 * what CI cannot (`META.md`), and a theme you cannot see is a theme you are
 * guessing at.
 *
 * Architecture rule 3 holds trivially: an instrument is a view of a recording,
 * so a made-up recording drives it exactly as a real one does.
 */

import {
  ACTIVE,
  ALARM,
  type Condition,
  NOMINAL,
  type Stage,
  type Verb,
  WARN,
} from "../control/bus.ts";
import { NO_EXERCISE, type Snapshot, type Waypoint } from "../core/snapshot.ts";
import { G } from "../core/spec.ts";

/**
 * A track state that cannot be built inconsistent: no contact means no traction
 * reading, because there is no friction cone to report a fraction of. A fixture
 * saying `contacts: 0, traction: 1` used to be expressible, and it described a
 * machine that does not exist.
 */
const track = (over: Partial<Snapshot["machine"]["left"]> = {}) => {
  const contacts = over.contacts ?? 6;
  return {
    commanded: 0,
    surface: 0,
    slip: 0,
    traction: 0.2,
    // Sitting on its springs: the static sag, nothing moving. A track in the
    // air is hanging, which is what zero compression means.
    suspension:
      contacts === 0 ? HANGING : { compression: 0.45, damping: 0, bottomed: 0 },
    ...over,
    contacts,
    ...(contacts === 0 ? { traction: null } : {}),
  };
};

const HANGING = { compression: 0, damping: 0, bottomed: 0 };

interface StageSpec {
  readonly id: string;
  readonly label: string;
  readonly maker: string;
  readonly verb?: Verb;
  readonly enabled?: boolean;
  readonly idle?: boolean;
  readonly condition?: Condition;
  readonly safety?: boolean;
  readonly readout?: Record<string, number>;
  readonly output?: { left: number; right: number };
}

export function stage(spec: StageSpec): Stage {
  return {
    id: spec.id,
    label: spec.label,
    maker: spec.maker,
    verb: spec.verb ?? "SET",
    enabled: spec.enabled ?? true,
    idle: spec.idle ?? false,
    output: spec.output ?? { left: 0, right: 0 },
    readout: spec.readout,
    condition: spec.condition ?? NOMINAL,
    safety: spec.safety ?? false,
  };
}

/**
 * A route to plot. Fixed rather than generated: the scope is being *looked at*,
 * and a bench whose picture changes between runs is a bench you cannot compare
 * a screenshot against.
 */
const ROUTE: readonly Waypoint[] = [
  { x: 0, z: 62 },
  { x: 54, z: 30 },
  { x: 61, z: -28 },
  { x: 4, z: -58 },
  { x: -49, z: -34 },
  { x: -63, z: 18 },
  { x: -30, z: 55 },
  { x: -8, z: 24 },
];

/** The rack every fixture starts from: chassis, guidance, guard. */
export const PILOT = stage({
  id: "PILOT",
  label: "PILOT",
  maker: "KIBA WORKS",
  output: { left: 1.4, right: 1.4 },
});
export const NAV = stage({
  id: "NAV",
  label: "NAV-1",
  maker: "TOWA DENKI",
  verb: "CAP",
  enabled: false,
  idle: true,
  readout: { target: 2, pins: 8 },
});
export const TILT = stage({
  id: "TILT",
  label: "TILT-GUARD",
  maker: "HANSA REGELTECHNIK",
  verb: "AMP",
  safety: true,
  idle: true,
  readout: { pitch: 0.05, roll: 0.02, pitchLimit: 0.42, rollLimit: 0.31, gain: 1 },
});

export function snapshotOf(
  stages: readonly Stage[],
  over: {
    speed?: number;
    pitch?: number;
    roll?: number;
    slip?: number;
    contacts?: number;
    /**
     * The right track's contact count, when it differs from the left's. The two
     * sides losing the ground *separately* is the case a single reduced number
     * cannot show, so the bench has to be able to pose it.
     */
    rightContacts?: number;
    commanded?: number;
    traction?: number;
    bill?: number;
    seconds?: number;
    citizen?: boolean;
  } = {},
): Snapshot {
  const slip = over.slip ?? 0;
  return {
    tick: 4200,
    simSeconds: over.seconds ?? 1147,
    // The dataplate reads this as the machine's serial.
    seed: 20260823,
    distance: over.seconds !== undefined ? over.seconds * 1.4 : 1600,
    machine: {
      pose: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
      left: track({
        slip,
        traction: over.traction ?? 0.2,
        contacts: over.contacts ?? 6,
        commanded: over.commanded ?? over.speed ?? 0,
      }),
      right: track({
        slip: slip * 0.6,
        traction: over.traction ?? 0.2,
        contacts: over.rightContacts ?? over.contacts ?? 6,
        commanded: over.commanded ?? over.speed ?? 0,
      }),
      speed: over.speed ?? 0,
      pitch: over.pitch ?? 0,
      roll: over.roll ?? 0,
      // Standing on the ground: an accelerometer reads 1 g up and nothing else.
      // The panel shows none of this yet; the cab's rattle hears it.
      shake: { surge: 0, heave: G, sway: 0, jerk: 0 },
    },
    stages,
    props: [],
    route: ROUTE,
    goal: NO_EXERCISE,
    damage: over.citizen
      ? [
          {
            tick: 4100,
            prop: 17,
            kind: "scooter",
            category: "citizen asset",
            label: "scooter",
            state: "destroyed",
            yen: 3000,
            energy: 8200,
            toughness: 900,
            at: [12, 0, -4],
            speed: 2.4,
            driving: ["PILOT"],
            bypassed: [],
          },
        ]
      : [],
    bill: over.bill ?? 0,
    // A specimen is a state held still to be looked at. Nothing on the bench
    // reacts to events, and a frozen moment has no recent past.
    events: [],
  };
}

/** One named state worth looking at, and why it is worth looking at. */
export interface Specimen {
  readonly name: string;
  readonly note: string;
  readonly snapshot: Snapshot;
  readonly estopped?: boolean;
}

export const SPECIMENS: readonly Specimen[] = [
  {
    name: "nominal",
    note: "Everything fitted, nothing to say. Both masters dark, and the alarm strip green.",
    snapshot: snapshotOf([PILOT, NAV, TILT], { speed: 1.2, seconds: 1147 }),
  },
  {
    name: "guidance driving",
    note: "NAV-1 live and steering. TOWA's screen lights; the plate goes active.",
    snapshot: snapshotOf(
      [
        PILOT,
        stage({
          ...NAV,
          enabled: true,
          idle: false,
          condition: ACTIVE,
          output: { left: 2.1, right: 1.2 },
          readout: { target: 4, pins: 8 },
        }),
        TILT,
      ],
      { speed: 1.9, seconds: 1204 },
    ),
  },
  {
    name: "guard winding down",
    note: "On a grade. TILT-GUARD is taking authority, so it is WARN and the master warning is lit — a caution, not a fault. The module is working perfectly.",
    snapshot: snapshotOf(
      [
        PILOT,
        NAV,
        stage({
          ...TILT,
          idle: false,
          condition: WARN,
          readout: {
            pitch: 0.33,
            roll: 0.04,
            pitchLimit: 0.42,
            rollLimit: 0.31,
            gain: 0.44,
          },
        }),
      ],
      { speed: 0.6, pitch: 0.34, slip: 0.55, traction: 0.88, seconds: 1310 },
    ),
  },
  {
    name: "guard at zero",
    note: "Nose-high with no drive at all. ALARM, and gravity is about to have the argument.",
    snapshot: snapshotOf(
      [
        PILOT,
        NAV,
        stage({
          ...TILT,
          idle: false,
          condition: ALARM,
          readout: {
            pitch: 0.44,
            roll: 0.06,
            pitchLimit: 0.42,
            rollLimit: 0.31,
            gain: 0,
          },
        }),
      ],
      {
        speed: 0,
        pitch: 0.46,
        slip: 1.1,
        traction: 1,
        // Reared up: the tracks are commanded hard and touching nothing, so GND
        // lights too. Two alarms at once is a state the strip has to resolve.
        contacts: 0,
        commanded: 1.4,
        seconds: 1355,
      },
    ),
  },
  {
    name: "one track over the edge",
    note: "Left track hard on the ground and nearly out of grip, right track hanging over nothing. The old GRIP dial reduced the two sides with `max` and showed the good one, so this looked identical to a hard turn. The plan view cannot: one channel is hot, the other is hatched.",
    snapshot: snapshotOf([PILOT, NAV, TILT], {
      speed: 0.9,
      roll: 0.22,
      slip: 0.2,
      traction: 0.95,
      contacts: 4,
      rightContacts: 0,
      commanded: 1.2,
      seconds: 1288,
    }),
  },
  {
    name: "guard bypassed",
    note: "Popped the hood for one quick push. Hatched, ÜBERBRÜCKT, standing at WARN — and it stays there until the guard goes back in.",
    snapshot: snapshotOf(
      [PILOT, NAV, stage({ ...TILT, enabled: false, idle: true, condition: WARN })],
      { speed: 2.4, pitch: 0.3, slip: 0.7, traction: 0.94, bill: 3000, seconds: 1402 },
    ),
  },
  {
    name: "citizen",
    note: "Categorical failure. The ledger latches and everything the dash owns goes red at once.",
    snapshot: snapshotOf([PILOT, NAV, TILT], {
      speed: 2.4,
      bill: 3000,
      citizen: true,
      seconds: 1440,
    }),
  },
  {
    name: "bare chassis",
    note: "Nothing fitted but the levers. No cells at all — the chassis brings the dashboard and needs no lamp to say the levers are there.",
    snapshot: snapshotOf([PILOT], { speed: 0.4, seconds: 12 }),
  },
  {
    name: "unregistered component",
    note: "A component the registry has never heard of. It gets the base case: one lens and a strip of label tape.",
    snapshot: snapshotOf(
      [
        PILOT,
        stage({
          id: "SPEED",
          label: "SPEED-LIM",
          maker: "NOBODY IN PARTICULAR",
          verb: "CAP",
          condition: ACTIVE,
        }),
        TILT,
      ],
      { speed: 1.1, seconds: 88 },
    ),
  },
];
