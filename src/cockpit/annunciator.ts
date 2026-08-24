/**
 * What the dash makes of the whole machine at once.
 *
 * Two jobs, both deliberately dumb:
 *
 *   1. reduce a pile of conditions to MASTER WARNING / MASTER ALARM, and
 *   2. derive the *chassis*'s own conditions from the snapshot.
 *
 * Job 2 exists because the chassis is a component like any other. It has a plate
 * (the pilot's levers), it has no cell — you do not need a lamp to tell you the
 * levers are fitted — and its conditions are the ones nothing in the rack owns:
 * slip, lost ground, the ledger, the stop. Before this they were hand-wired into
 * `DashPanel`, along with a reach into TILT-GUARD's private readout, which meant
 * every new component edited the dash.
 *
 * Architecture rule 3: reads a snapshot, returns plain values.
 */

import { ALARM, type Condition, NOMINAL, type Stage, WARN } from "../control/bus.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { styleOf } from "./makers.ts";

/**
 * One thing the dash can light.
 *
 * Two strings, because a lamp and a strip are different instruments: `word` has
 * to fit on a legend plate you read peripherally, `text` is the sentence under
 * the master alarm that tells you what it means. Deriving one from the other
 * gives you either an unreadable lamp or a strip that says `GND`.
 */
export interface Annunciation {
  readonly id: string;
  /** Short enough for a lamp legend. Four characters or so. */
  readonly word: string;
  /** The line under the master alarm when this is the worst thing happening. */
  readonly text: string;
  readonly condition: Condition;
}

/** The worst thing happening anywhere. Nominal over an empty list. */
export function worst(conditions: readonly Condition[]): Condition {
  let found: Condition = NOMINAL;
  for (const c of conditions) if (c > found) found = c;
  return found;
}

export const isWarning = (c: Condition): boolean => c >= WARN && c < ALARM;
export const isAlarm = (c: Condition): boolean => c >= ALARM;

/** How much slip counts as slipping, m/s. Above this the tracks are sliding. */
const SLIPPING = 0.4;
/** How much commanded track speed counts as trying, m/s. */
const TRYING = 0.05;

/**
 * The chassis's own conditions.
 *
 * `estopped` is not in the snapshot because it is a cockpit control rather than
 * a simulated quantity — it acts on the machine by disabling every module, and
 * the rack already records that.
 */
export function chassisConditions(
  snapshot: Snapshot | undefined,
  estopped: boolean,
): readonly Annunciation[] {
  const m = snapshot?.machine;
  const slip = Math.max(Math.abs(m?.left.slip ?? 0), Math.abs(m?.right.slip ?? 0));

  // A track is commanded but has lost the ground — clawing air. Worth an alarm
  // rather than a caution: it is the shape of being beached or going over.
  const airborne =
    m !== undefined &&
    ((m.left.contacts === 0 && Math.abs(m.left.commanded) > TRYING) ||
      (m.right.contacts === 0 && Math.abs(m.right.commanded) > TRYING));

  // A citizen is categorical failure, never a line item, so it latches at alarm
  // for the rest of the run rather than clearing when the impact is over.
  const citizen = (snapshot?.damage ?? []).some((d) => d.category === "citizen asset");

  return [
    {
      id: "CITIZEN",
      word: "PROP",
      text: "CITIZEN PROPERTY",
      condition: citizen ? ALARM : NOMINAL,
    },
    {
      id: "STOP",
      word: "STOP",
      text: "EMERGENCY STOP",
      condition: estopped ? ALARM : NOMINAL,
    },
    {
      id: "GND",
      word: "GND",
      text: "TRACK — NO CONTACT",
      condition: airborne ? ALARM : NOMINAL,
    },
    {
      id: "SLIP",
      word: "SLIP",
      text: "TRACKS SLIPPING",
      condition: slip > SLIPPING ? WARN : NOMINAL,
    },
    {
      id: "YEN",
      word: "¥",
      text: "DAMAGE BILLED",
      condition: (snapshot?.bill ?? 0) > 0 ? WARN : NOMINAL,
    },
  ];
}

/**
 * The line under the dash: the single worst thing, named.
 *
 * Severity first; ties broken by the order below, which puts the rack ahead of
 * the chassis. `nominal` is the line when there is genuinely nothing to say.
 */
export function masterLine(
  annunciations: readonly Annunciation[],
  stages: readonly Stage[],
  nominal: string,
): { condition: Condition; text: string } {
  // Components first, then the chassis. At equal severity a component that has
  // an *opinion* outranks a bare symptom, because it tells you why: "TILT-GUARD
  // ÜBERBRÜCKT" is a better line than "TRACKS SLIPPING" when both are true and
  // the second is a consequence of the first. Severity still wins over order,
  // so a citizen or a stop takes the strip from anything a module has to say.
  const all: Annunciation[] = [
    ...stages.map((s) => ({
      id: s.id,
      word: s.label,
      // A bypassed guard is named in **its own maker's** word, not the chassis
      // maker's — the cell says ÜBERBRÜCKT, so the strip must not say OFF.
      //
      // Otherwise the strip carries the component's name and nothing else, and
      // the colour carries the severity. That is deliberate: there is no honest
      // word to add. TILT-GUARD taking the drivetrain to zero is not a fault —
      // the module is working exactly as designed — so calling it one would be
      // the instrument lying about the component behind it.
      text:
        s.safety && !s.enabled
          ? `${s.label} ${styleOf(s.maker).lexicon.bypassed}`
          : s.label,
      condition: s.condition,
    })),
    ...annunciations,
  ];

  let best: Annunciation | undefined;
  for (const a of all) {
    if (a.condition < WARN) continue;
    if (!best || a.condition > best.condition) best = a;
  }
  return best
    ? { condition: best.condition, text: best.text }
    : { condition: NOMINAL, text: nominal };
}
