/**
 * The damage model — what an impact *means*, in yen.
 *
 * Damage is measured in **joules absorbed**, not in hit points. That is the
 * whole design decision here, and it follows from the inspectability pillar:
 * energy is a quantity the machine already has, that the player can be shown,
 * and that explains itself. "The cone took 31 J and it is rated for 22" is a
 * diagnosis. "The cone lost 40 HP" is a number the game made up.
 *
 * How it is measured: every step, a breakable body's kinetic energy is compared
 * with its kinetic energy last step, and the **increase** is what was delivered
 * into it. That works for anything that gets hit by anything — the machine, or
 * a barrier the machine has just thrown — without the model knowing what hit
 * what. A small floor ignores the joule-scale trickle of settling and gravity.
 *
 * Known limitation, deliberate at rung 1: only *linear* kinetic energy counts.
 * A prop that is spun rather than flung is under-counted. Rotational inertia is
 * available from the body and the fix is contained to `kineticEnergy` — it
 * wants doing when something on site is worth spinning.
 *
 * Architecture rule 1: no renderer, no DOM. Rule 2: arithmetic only.
 */

import type { Stage } from "../control/bus.ts";
import {
  PROP_SPEC,
  type Prop,
  type PropCategory,
  type PropKind,
} from "../world/props.ts";

/**
 * Speed below which a body's motion is noise rather than an impact.
 *
 * A flat joule threshold does not work across the mass range: 1.5 J is a hard
 * shove for a 6 kg cone and imperceptible jitter for a 260 kg pipe stack. The
 * threshold that means the same thing to both is a **speed**, converted to
 * energy per body — which is also the thing a person would say out loud:
 * anything moving slower than a slow walk was not hit.
 */
const IMPACT_SPEED = 0.35;

/** Joules below which an energy gain is settling rather than an impact. */
export const impactFloor = (mass: number): number =>
  0.5 * mass * IMPACT_SPEED * IMPACT_SPEED;

/** Fraction of toughness that counts as "damaged" rather than merely nudged. */
const DAMAGED_AT = 0.3;

/**
 * One line of the ledger.
 *
 * `driving` and `bypassed` are the attribution half, and they are the reason
 * this is a diagnosis rather than a score: the line records which modules were
 * shaping the signal at the moment of impact and which were switched off. A
 * ledger that says *what* without *why* is a score, and scores do not teach.
 */
export interface DamageEvent {
  readonly tick: number;
  /** Index into the world's prop list. */
  readonly prop: number;
  readonly kind: PropKind;
  readonly category: PropCategory;
  readonly label: string;
  readonly state: "damaged" | "destroyed";
  /** Yen billed by **this line**. Lines never double-bill an asset. */
  readonly yen: number;
  /** Joules absorbed in total, and what it was rated for. */
  readonly energy: number;
  readonly toughness: number;
  readonly at: readonly [number, number, number];
  /** Machine speed when it happened, m/s. */
  readonly speed: number;
  readonly driving: readonly string[];
  readonly bypassed: readonly string[];
}

/** What the machine and its rack were doing when something got hit. */
export interface Blame {
  readonly tick: number;
  readonly speed: number;
  readonly stages: readonly Stage[];
}

export interface Ledger {
  /** Every line so far, oldest first. */
  readonly events: readonly DamageEvent[];
  /** Total billed, yen. */
  readonly total: number;
  /** True once anything in the `citizen asset` category has been hit. */
  readonly citizenHarm: boolean;
  /**
   * Take one step's worth of energy for one prop. Returns the new line if this
   * crossed a threshold, so a caller can react without scanning the list.
   */
  absorb(
    index: number,
    energy: number,
    at: readonly [number, number, number],
    blame: Blame,
  ): DamageEvent | undefined;
  /** Joules absorbed so far, for the prop's own readout. */
  absorbedBy(index: number): number;
  /** 0 = written off, 1 = untouched. Undefined for landscape. */
  integrityOf(index: number): number | undefined;
}

/** Linear kinetic energy, joules. */
export const kineticEnergy = (
  mass: number,
  vx: number,
  vy: number,
  vz: number,
): number => 0.5 * mass * (vx * vx + vy * vy + vz * vz);

/**
 * The part of an energy gain that counts as an impact rather than as settling.
 *
 * Two guards, and the second one was expensive to learn. A body must have been
 * **at rest** to be hit: without that, anything already sliding integrates the
 * energy gravity feeds it and eventually writes itself off. The site billed
 * itself ¥9,540 for its own hillside before the machine had moved.
 *
 * The cost of the guard, stated plainly: a prop that is *already moving* when
 * it is hit again is not billed for the second hit, and a prop flung across the
 * site is not billed for its landing. The ledger therefore under-counts rather
 * than over-counts, which is the right way round for something that is
 * accusing the player of things.
 */
export const impactOf = (
  energyNow: number,
  energyBefore: number,
  mass: number,
): number => {
  const floor = impactFloor(mass);
  if (energyBefore > floor) return 0;
  const gained = energyNow - energyBefore;
  return gained > floor ? gained : 0;
};

export function createLedger(props: readonly Prop[]): Ledger {
  const events: DamageEvent[] = [];
  const absorbed = new Float64Array(props.length);
  const billed = new Float64Array(props.length);
  /** 0 untouched · 1 damaged · 2 written off. */
  const state = new Uint8Array(props.length);
  let total = 0;
  let citizenHarm = false;

  return {
    get events() {
      return events;
    },
    get total() {
      return total;
    },
    get citizenHarm() {
      return citizenHarm;
    },
    absorbedBy: (index) => absorbed[index] ?? 0,
    integrityOf(index) {
      const prop = props[index];
      if (!prop) return undefined;
      const { toughness } = PROP_SPEC[prop.kind];
      if (toughness === undefined) return undefined;
      const used = (absorbed[index] ?? 0) / toughness;
      return used >= 1 ? 0 : 1 - used;
    },
    absorb(index, energy, at, blame) {
      const prop = props[index];
      if (!prop || energy <= 0) return undefined;
      const spec = PROP_SPEC[prop.kind];
      const { toughness, price } = spec;
      if (toughness === undefined || price === undefined) return undefined;

      absorbed[index] = (absorbed[index] ?? 0) + energy;
      const carried = absorbed[index] as number;

      // A written-off asset cannot be written off twice. Hitting the wreck
      // again is free, which is both correct and the only thing that stops a
      // ledger turning into a slot machine.
      const reached =
        carried >= toughness ? 2 : carried >= toughness * DAMAGED_AT ? 1 : 0;
      if (reached <= (state[index] ?? 0)) return undefined;
      state[index] = reached;

      // Bill the remainder, never the full price twice: a cone that was damaged
      // for ¥140 and is then written off costs ¥260 more, not ¥400 more. The
      // rig is meticulous, and meticulous means the total is the asset's worth.
      const owed = reached === 2 ? price : Math.round(price * DAMAGED_AT);
      const yen = owed - (billed[index] as number);
      billed[index] = owed;
      total += yen;
      if (spec.category === "citizen asset") citizenHarm = true;

      const event: DamageEvent = {
        tick: blame.tick,
        prop: index,
        kind: prop.kind,
        category: spec.category,
        label: spec.label,
        state: reached === 2 ? "destroyed" : "damaged",
        yen,
        energy: carried,
        toughness,
        at,
        speed: blame.speed,
        driving: blame.stages.filter((s) => s.enabled && !s.idle).map((s) => s.label),
        bypassed: blame.stages.filter((s) => !s.enabled).map((s) => s.label),
      };
      events.push(event);
      return event;
    },
  };
}
