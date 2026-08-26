import type { Stage } from "../control/bus.ts";
import type { DamageEvent } from "../sim/damage.ts";
import type { SimEvent } from "./events.ts";

/**
 * Architecture rule 3: state crosses from sim to UI in one direction, through
 * an explicit snapshot. Commands cross back as discrete queued inputs, never as
 * shared mutable state.
 *
 * An instrument is a view of a recording. That is not a metaphor — it is why
 * the same instrument code can drive a live cockpit and a replay.
 *
 * See doc/design/code/architecture-rules.md.
 */

/** A plain, structurally-cloneable pose. No three.js types cross this line. */
export interface BodyPose {
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
}

/**
 * What one side's springs are doing — six bogies, summarised.
 *
 * The running gear is sprung **per contact point**: each of a track's six
 * samples hangs off the frame on its own spring and damper, and what holds the
 * machine up is the sum of them rather than a rigid block resting on the
 * ground. That is why this is a state rather than a decoration — the load a
 * bogie carries is what caps the friction it can deliver, so the springs are
 * upstream of `traction`, and the ground under one corner is now something the
 * machine can *feel* differently from the ground under another.
 *
 * It is a per-side summary and not per-bogie, because a side is what anything
 * downstream can act on: the ear hears left and right, an instrument would show
 * left and right, and six numbers a side would be a telemetry dump rather than
 * a quantity.
 */
export interface Suspension {
  /**
   * Mean compression across the side's six bogies, as a fraction of travel.
   *
   * Zero is fully extended — hanging in a hollow, carrying nothing. A parked
   * machine reads the static sag, which is 0.45 by construction (`spec.ts`).
   * **It can read past 1**: past the end of the travel the rubber stop takes
   * over, and clamping it here would hide the one reading that says the ground
   * won.
   */
  readonly compression: number;
  /**
   * Watts this side's dampers are turning into heat, right now.
   *
   * The honest quantity behind a suspension knock, and the reason there is one
   * at all. A spring stores and gives back; a **damper** is where a rut is
   * destroyed, and the power it dissipates is `c · v²` over the side's bogies —
   * so it is large exactly when the wheels are moving fast against the frame,
   * which is the moment you hear. It is zero standing still, zero rolling over
   * a graded pad, and zero in the air, none of which needed a special case.
   */
  readonly damping: number;
  /** Bogies past the end of their travel, of 6. These are on the rubber. */
  readonly bottomed: number;
}

/**
 * Everything one track is doing. `slip` is rung 1's teaching quantity: the
 * difference between the speed the track is turning at and the speed the
 * ground is actually going past. Every rung-1 failure is legible in it —
 * spinning on a grade, skating through a turn, clawing air when beached.
 */
export interface TrackState {
  /** Track surface speed the drivetrain is delivering, m/s. */
  readonly commanded: number;
  /** Mean ground speed under the contacting samples, m/s. */
  readonly surface: number;
  /** commanded − surface. Non-zero means the track is sliding. */
  readonly slip: number;
  /** Samples touching ground, of 6. Zero means this track is doing nothing. */
  readonly contacts: number;
  /**
   * Fraction of available traction being used, 0–1. At 1 you are sliding.
   *
   * **`null` means there is no ground to grip** — not "gripping nothing". It
   * used to be `0` for both, so 0% read the same whether the machine was parked
   * with all six samples down or clawing air over a ridge, which are opposite
   * conditions. Measured on a 55° ramp: 426 consecutive steps airborne, the dash
   * reading 0% beside a lit NO CONTACT lamp. A quantity nothing is measuring is
   * not a small quantity, and the type now says so — every consumer has to
   * decide what to show for it.
   */
  readonly traction: number | null;
  /**
   * What this side's springs are doing.
   *
   * It sits on the track rather than on the machine because the two sides are
   * genuinely independent: one bogie dropping into a rut is a fact about the
   * left-hand running gear, and a machine-wide average would throw away the
   * only thing about it worth hearing.
   */
  readonly suspension: Suspension;
}

/**
 * A pin on the route, in world metres.
 *
 * It lives in the kernel because three layers need the same two numbers and none
 * of them should own it: the world generates the pins, NAV-1 follows them, and
 * the cockpit draws them. It used to be declared on NAV-1, which made the world
 * import from a rack module to describe its own terrain furniture.
 */
export interface Waypoint {
  readonly x: number;
  readonly z: number;
}

/**
 * How the exercise is going — the third beat of the loop, at last with a
 * *success* in it.
 *
 * It is on the snapshot rather than held by the shell for the same reason the
 * route is: an exercise that cannot be read off a recording is an exercise a
 * replay cannot score, and scoring a replay is what `doc/design/rig/missions.md`
 * eventually wants. It is also why `outcome` is a settled fact with a tick on
 * it rather than something a consumer derives — three surfaces answer to it
 * (the overlay, the debrief, the cue), and three derivations of one fact is
 * three chances to disagree about whether you finished.
 */
export type Outcome = "running" | "success" | "failed";

export interface Goal {
  /** Which exercise this run is, by id. The catalogue is `world/exercises.ts`. */
  readonly exercise: string;
  /**
   * Tick each pin was reached at, in route order; `-1` for one still out there.
   *
   * A tick and not a flag, because *when* is the interesting half: it is the
   * split time, it orders the pins by the order you actually took them, and it
   * is what a scored run would be made of.
   */
  readonly reached: readonly number[];
  /** How many of them, so nothing has to count the array to draw a fraction. */
  readonly count: number;
  readonly total: number;
  readonly outcome: Outcome;
  /** Tick the outcome settled at, or `-1` while it is still running. */
  readonly settled: number;
}

/**
 * No exercise: what a bench scene and a hand-built fixture are running.
 *
 * Not a null and not an optional field. A snapshot always answers the question
 * "how is the exercise going", because three surfaces ask it every frame and an
 * optional would put a `?.` in each of them — and because the honest answer for
 * a rig with nothing scheduled is *nothing scheduled*, which is a state rather
 * than the absence of one. `exercise` is empty, so nothing looks it up and finds
 * a name for something that was never on the schedule.
 */
export const NO_EXERCISE: Goal = Object.freeze({
  exercise: "",
  reached: Object.freeze([]),
  count: 0,
  total: 0,
  outcome: "running",
  settled: -1,
});

/**
 * What an accelerometer bolted to the hull reads, in the body frame, m/s².
 *
 * **Proper acceleration, not `dv/dt`.** The difference is the whole usefulness
 * of it: an accelerometer at rest reads a steady 1 g upward, because the ground
 * is pushing it, and one in free fall reads *zero*, because nothing is. So the
 * quantity is already "how hard is this thing being shaken" rather than "how
 * fast is it going" — a machine flying off a bank is weightless and quiet, and
 * a machine landing at the bottom is not, which is what the cab has to sound
 * like.
 *
 * Ship axes, in the machine's own frame: `surge` along its nose (+Z),
 * `heave` up (+Y), `sway` to its left (+X, see `spec.ts`). Nothing shows this
 * yet — the first consumer is the rattle in the cab — but it is one snapshot
 * field away from being a G-meter on the glass, which is the test of whether a
 * simulated quantity was published honestly.
 */
export interface Shake {
  readonly surge: number;
  readonly heave: number;
  readonly sway: number;
  /**
   * How fast that reading is **changing**, m/s³, over one step.
   *
   * The reading itself cannot answer the question a rattling cab asks. A toolbox
   * on the floor is quiet at rest, because the floor holds it; it is also quiet
   * in free fall, because it is falling with the floor. Both are steady states,
   * and they read 1 g and 0 g — so no function of the reading alone can call
   * them both silent. What shakes something loose is the floor *changing* under
   * it faster than friction can carry it along, which is this.
   *
   * Physically it is jerk, and it is why a machine flying off a bank goes
   * quiet: it left the ground at one instant (loud), floats (silent), and
   * arrives (very loud). It is computed at the fixed step rather than
   * differenced by a renderer, so a phone dropping frames hears the same ride.
   */
  readonly jerk: number;
}

export interface MachineState {
  readonly pose: BodyPose;
  readonly left: TrackState;
  readonly right: TrackState;
  /** Hull speed over ground, m/s. */
  readonly speed: number;
  /** Radians. Derived for display only — see the note below. */
  readonly pitch: number;
  readonly roll: number;
  readonly shake: Shake;
}

/**
 * Where a piece of site furniture has ended up. Only sent for props that are
 * actually moving — a site standing still costs nothing to transmit.
 */
export interface PropPose {
  readonly index: number;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
}

/**
 * One piece of something that has been written off.
 *
 * A destroyed prop stops being a single box and becomes the solids its part list
 * says it is made of (`world/props.ts`), each with a body of its own — so a pipe
 * stack pushed over is four pipes that roll downhill and tumble into each other,
 * rather than one grey box that used to be a pipe stack.
 *
 * It is addressed by **prop and piece** rather than by a debris id, and that is
 * what makes the renderer's side free: the art is already built out of exactly
 * these pieces, in this order, so a write-off re-parents meshes that already
 * exist instead of making any. No new geometry, no new draw calls.
 *
 * Debris is landscape. It is never billed and never breaks again, which is the
 * existing rule — *hitting the wreck again is free* — arriving where it was
 * always going to.
 */
export interface DebrisPose {
  /** Index into the world's prop list: what it used to be part of. */
  readonly prop: number;
  /** Index into that kind's `pieces`. */
  readonly piece: number;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number, number];
}

export interface Snapshot {
  readonly tick: number;
  readonly simSeconds: number;
  /**
   * The seed this world was generated from.
   *
   * It belongs here because a recording that cannot rebuild its own world is
   * not a recording (rule 2 — the seed is part of the recorded scenario), and
   * it arrived because of a much better reason than that: **the machine's
   * serial number is the exercise number.** The rig generates the site and
   * stamps the dataplate in the same breath, so the number riveted to the panel
   * in front of the operator *is* the world they are about to be tested on.
   */
  readonly seed: number;
  /** Ground covered this run, metres. Integrated at the fixed step. */
  readonly distance: number;
  readonly machine: MachineState;
  /**
   * The rack, stage by stage, from the top of the rail to the terminal.
   *
   * Not "who won" — under a pipeline nobody wins, everyone shapes. Showing the
   * value at each stage is a stronger answer to the attribution rule than
   * naming an owner, and it is the multi-layer inspectability pillar landing
   * where it matters most.
   */
  readonly stages: readonly Stage[];
  /** Props that moved this step. Empty on an undisturbed site. */
  readonly props: readonly PropPose[];
  /**
   * Pieces of written-off furniture that are still moving.
   *
   * Same rule as `props`: only what is awake, so a site whose wreckage has come
   * to rest costs nothing. Empty on a site nobody has hit.
   */
  readonly debris: readonly DebrisPose[];
  /**
   * The route the site was laid out with, unchanging for the run.
   *
   * It is here rather than handed to the instrument that draws it, because a
   * recording that cannot draw the route it was following is not a recording —
   * and because a pod holding world data it was passed at build time is a pod
   * that cannot be replayed. The array is the world's, by reference: it costs
   * nothing to carry and it is never rebuilt.
   */
  readonly route: readonly Waypoint[];
  /** What the rig asked for, and how much of it has happened. */
  readonly goal: Goal;
  /** The ledger so far, oldest line first. */
  readonly damage: readonly DamageEvent[];
  /** Total billed, yen. */
  readonly bill: number;
  /**
   * The recent past as **events** rather than as state — impacts, hull jolts,
   * ledger lines — oldest first, each stamped with a monotonic `seq`.
   *
   * The rest of this interface is a state sampled at a moment, which is the
   * right shape for anything an instrument shows and the wrong shape for
   * anything that *happens*. Read it with a `createEventReader`, never by
   * diffing: `src/core/events.ts` says why.
   */
  readonly events: readonly SimEvent[];
}

/**
 * Rate at which the UI reads snapshots. Far below the sim's 60 Hz, by design.
 */
export const SNAPSHOT_HZ = 10;

/**
 * Pitch and roll use `Math.asin`/`atan2`, which are not bit-portable across JS
 * engines. That is safe *here* and nowhere else: these are derived read-only
 * for display and never feed back into sim state, so they cannot cause two
 * machines to diverge. The ban in rule 2 is on transcendentals that close a
 * loop back into the simulation.
 */
export function attitudeOf(q: BodyPose["rotation"]): { pitch: number; roll: number } {
  const [x, y, z, w] = q;
  const sinPitch = 2 * (w * x - y * z);
  // deterministic-exempt: display only, never read back into the sim.
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
  // deterministic-exempt: display only, never read back into the sim.
  const roll = Math.atan2(2 * (w * z + x * y), 1 - 2 * (x * x + z * z));
  return { pitch, roll };
}
