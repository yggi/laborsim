/**
 * What the operator did, stamped with when they did it — the input twin of
 * `core/events.ts`.
 *
 * That file is the discrete half of the boundary going *out*: the sim stamps
 * every happening with a monotonic number, a consumer keeps one cursor, and
 * anything random about an event is drawn from a seed that is on the recording,
 * so a replay throws the same pieces the same way. This file is the same shape
 * pointing the other way. Everything the operator does becomes a plain value
 * with a tick on it, and the list of those values plus the `Setup` they started
 * from is a **recording** — the thing `doc/BOARD.md`'s L-032 asks for and that
 * a dozen comments across this tree were written in anticipation of.
 *
 * ## Why it had to exist before a replay could
 *
 * Two things were in the way, and neither was the physics — that has been
 * bit-reproducible and asserted since `tests/determinism.test.ts` was written.
 *
 * **The sim's input was ambient.** `world.step()` takes no arguments; the pilot
 * module closes over one live mutable `Hands` and `runRack` reads it from inside
 * the step. There was no moment at which anybody said *this is what the hands
 * did on this tick*, so live and replay could only have differed by swapping a
 * module — which is two engines, not one.
 *
 * **Rack edits crossed by four routes and none carried a tick.** `Controls` was
 * the designed one and could express neither a reorder nor a verb change, which
 * are the two the ledger most needs; `Rack.svelte` spliced the live array;
 * the E-stop wrote every module's field; and each of them landed synchronously
 * inside a pointer event's turn. Architecture rule 3 has always said commands
 * cross back as "discrete, **queued** inputs". They did not. Now they do, and
 * `applyRack` below is the one place a fitted module changes.
 *
 * ## Two channels, because a recording answers two questions
 *
 * The first draft of this file recorded the levers, the posture and the rack,
 * and argued the rest out on the grounds that it was "not a sim input". That
 * answered the **determinism** question and mistook it for the **recording**
 * question. A rig reviewing a session cares whether the operator sounded the
 * horn before moving off, whether they acknowledged an alarm or drove on with it
 * blaring, and where they were looking when they hit something — none of which
 * touches the physics, and all of which is what the rig exists to review. Both
 * of those had already been written down and neither had been read:
 * `doc/design/cab/sound.md` says the horn "**joins the recording where the
 * levers are**" once a citizen can hear it, and `doc/design/cab/cockpit.md` says
 * stepping out to the chase view "is a thing the rig can record".
 *
 * So a `Trace` has two:
 *
 * - **`commands`** — what reached the machine. The levers and the rack, per
 *   tick. This determines the sim, exactly, and `tests/replay.test.ts` takes
 *   each part of it away in turn and requires the answer to change.
 * - **`attention`** — what the operator saw, heard and did about it. The horn,
 *   the acknowledgement, the mushroom, the cabinet latch, the view they watched
 *   from, where their head was, and where they put their instruments. **None of
 *   it can reach the machine**, and that is structural rather than a promise:
 *   `createPlayback` takes `readonly Command[]`, so the headless replay cannot
 *   see this channel even by accident.
 *
 * The guard against the obvious failure — a field quietly becoming sim input —
 * is in `tests/architecture.test.ts`: the only `hands.` fields the sim, the rack
 * and the modules may read are `leverL`, `leverR` and `seated`.
 *
 * ## What is still not on a recording
 *
 * - **`seated` gates the clock.** A tick only exists while the operator is in
 *   the seat, so a tick *existing* already says so. Recording it would be
 *   recording the same fact twice.
 * - **`alarm` is derived.** `cockpit/alarm.svelte.ts` holds exactly one piece of
 *   state — the acknowledgement — and derives the lamps, the master and the
 *   unacked condition from the snapshot. So the **press** is recorded and the
 *   condition never is: a replay re-derives it.
 * - **The rig's own furniture.** The schedule, the debrief, the volume: not kit
 *   a manufacturer bolted into your cab, costing no glass for that reason
 *   (`doc/MEMORY.md` § 6, § 11). BEGIN and RESET *bound* a recording rather than
 *   sit inside one.
 *
 * ## Ticks
 *
 * **An input is stamped with the tick it produces.** `world.tick` is `N` before
 * a step and `N + 1` after, and the sim stamps its events after the increment —
 * so an input stamped 100 is the input that was in force for the step that
 * produced tick 100, and the damage events at tick 100 are what it did. Nothing
 * is stamped 0: tick 0 is the world as `Setup` describes it, before anybody has
 * touched anything.
 *
 * Architecture rule 1: plain values and one applier. No renderer, no DOM.
 */

import type { Module, Verb } from "./bus.ts";
import type { Hands, View } from "./hands.ts";

/**
 * One change to one fitted module.
 *
 * Four kinds, which is exactly the four decisions the rack is: where a module
 * sits, how it folds its intent in, whether it is in circuit at all, and what
 * its faceplate is set to. `Controls` used to offer two of them.
 */
export type RackCommand =
  | { readonly kind: "enable"; readonly id: string; readonly on: boolean }
  | { readonly kind: "verb"; readonly id: string; readonly verb: Verb }
  /** Move the slot to this index, top of the rail being 0. */
  | { readonly kind: "order"; readonly id: string; readonly to: number }
  | {
      readonly kind: "param";
      readonly id: string;
      readonly param: string;
      readonly value: number;
    };

/**
 * Something discrete the cab did, on its way to a tick.
 *
 * **One queue out of the cab**, not one per kind of press. The rack's four
 * commands were the first members and for a while the only ones, which made the
 * queue look like a rack queue; it is not. It is the channel a *press* crosses
 * on, and where the press lands afterwards — on the machine or only on the
 * record — is this file's business rather than the cab's.
 *
 * `estop` carries the latch and **not** the fuses it pulls. Those are ordinary
 * `enable` commands, emitted by `createEstop` through this same queue, and the
 * two are not redundant: "the mushroom is in" cannot be derived from "every
 * module is disabled", because you could have pulled every fuse by hand.
 */
export type Act =
  | { readonly kind: "rack"; readonly command: RackCommand }
  /** The master condition was acknowledged. The one bit the operator creates. */
  | { readonly kind: "ack" }
  /** The mushroom went in, or was twisted back out. */
  | { readonly kind: "estop"; readonly engaged: boolean }
  /** An instrument was moved on the glass, and it stayed where it was put. */
  | {
      readonly kind: "pod";
      readonly id: string;
      readonly x: number;
      readonly y: number;
    };

/**
 * What reached the machine, at the tick it reached it.
 *
 * **Change-points, not samples**: between two of them the value is whatever the
 * last one said, which is what a thumb resting on a lever actually is. Thirty
 * seconds of a rampage is fifty-odd of these rather than eighteen hundred
 * frames, and the trace is the same length whether it was driven on a phone at
 * 30 fps or a desktop at 144.
 */
export type Command =
  | {
      readonly tick: number;
      readonly kind: "levers";
      readonly left: number;
      readonly right: number;
    }
  | { readonly tick: number; readonly kind: "rack"; readonly command: RackCommand };

/**
 * What the operator saw, heard and did about it. **Reaches no machine.**
 *
 * Everything here is change-points too, with one exception noted on `look`.
 * `posture` lives on this side and not with the commands: eyes down at the
 * cabinet gates `viewport.look()` and nothing else, so it was never a command —
 * though it is the most damning single fact the ledger's attribution column will
 * ever get to say, which is why it was on the first draft at all.
 */
export type Attention =
  | { readonly tick: number; readonly kind: "horn"; readonly down: boolean }
  | { readonly tick: number; readonly kind: "posture"; readonly headDown: boolean }
  | { readonly tick: number; readonly kind: "view"; readonly view: View }
  /**
   * Where the head was pointed, in **radians** — `pan` about the machine's own
   * heading, `tilt` up from it.
   *
   * Angles and not the pixels `viewport.head()` reports, because those are
   * `focalPixels(fov, glassHeight)` through a tangent: the same glance is
   * ±10,730 px on a phone and ±13,740 px on a desktop. A replay recomputes its
   * own pixels from its own glass.
   *
   * **The one thing here that is sampled rather than caught**, at
   * `SNAPSHOT_HZ` — the neck is sprung and its decay is wall-clock driven
   * "on purpose" (`render/scene.ts`), so there is no gesture to record that
   * would reproduce it. A curve a person watches does not need the rate a
   * simulation consumes, and 10 Hz is already what every instrument reads at.
   * The spring snaps to exactly zero below 1e-3 rad, so a cab nobody is
   * sweeping costs nothing at all — the same as a parked lever.
   */
  | {
      readonly tick: number;
      readonly kind: "look";
      readonly pan: number;
      readonly tilt: number;
    }
  | { readonly tick: number; readonly kind: "ack" }
  | { readonly tick: number; readonly kind: "estop"; readonly engaged: boolean }
  | {
      readonly tick: number;
      readonly kind: "pod";
      readonly id: string;
      readonly x: number;
      readonly y: number;
    };

/** One slot of the rail, as it was fitted. */
export interface SlotSetup {
  readonly id: string;
  readonly verb: Verb;
  readonly enabled: boolean;
  /** Every declared param's value. Absent when the module declares none. */
  readonly params?: Readonly<Record<string, number>>;
}

/**
 * The run before anybody touched it: which site, which seed, which kit.
 *
 * The seed is not redundant with the exercise. `SimOptions.seed` overrides
 * `Exercise.seed`, which is how a set exercise and a grade test get a site of
 * their own, and a recording that could not say which one it had is a recording
 * that rebuilds a different world.
 */
export interface Setup {
  readonly exercise: string;
  readonly seed: number;
  /** Top of the rail to the actuator terminal. Order is the game. */
  readonly rack: readonly SlotSetup[];
}

/** A run, in full: what it was, what was done to it, and how long it lasted. */
export interface Trace {
  readonly setup: Setup;
  /**
   * What reached the machine. Ascending by tick, and within a tick in the order
   * they were issued. This alone reproduces the run.
   */
  readonly commands: readonly Command[];
  /** What the operator saw, heard and did about it. Reproduces nothing. */
  readonly attention: readonly Attention[];
  /** Ticks the run lasted. A replay is over when the world reaches it. */
  readonly ticks: number;
}

/**
 * Who is working the controls this tick.
 *
 * One interface, two directions, which is the whole trick. The live operator
 * *reads* the hands the cab has written and notes what changed; a replay
 * *writes* the hands the recording says were there. Both apply whatever rack
 * commands belong to this tick. The frame calls it once per step and cannot
 * tell which one it has — which is what "one engine" means.
 */
export interface Operator {
  /**
   * @param tick the tick this step will produce, not the one it starts from.
   * @param hands read by a live operator, written by a replay.
   * @param rack mutated in place, exactly as everything else that owns a slot.
   */
  at(tick: number, hands: Hands, rack: Module[]): void;
}

/**
 * Apply one command to the rail. **The one writer of a fitted module.**
 *
 * A command naming a slot that is not fitted is a no-op rather than a throw, on
 * the same reasoning as `createControls`: a component absent now may be fitted
 * later, and a recording made with NAV-1 in the rack must not explode when it is
 * replayed against a rack that has it. The same goes for a param a module does
 * not declare, and for an index off either end of the rail.
 */
export function applyRack(rack: Module[], command: RackCommand): void {
  const index = rack.findIndex((m) => m.id === command.id);
  if (index === -1) return;
  const module = rack[index] as Module;

  switch (command.kind) {
    case "enable":
      module.enabled = command.on;
      return;
    case "verb":
      module.verb = command.verb;
      return;
    case "order": {
      const to = command.to < 0 ? 0 : Math.min(command.to, rack.length - 1);
      if (to === index) return;
      rack.splice(index, 1);
      rack.splice(to, 0, module);
      return;
    }
    case "param":
      // The module's own `set` enforces the bounds. A param is the only numeric
      // surface a component exposes, and it polices itself.
      module.params?.find((p) => p.id === command.param)?.set(command.value);
      return;
  }
}

/** Read the rail as it stands. What a recording opens with. */
export function setupOf(
  exercise: string,
  seed: number,
  rack: readonly Module[],
): Setup {
  return {
    exercise,
    seed,
    rack: rack.map((module) => {
      const slot: SlotSetup = {
        id: module.id,
        verb: module.verb,
        enabled: module.enabled,
      };
      if (!module.params?.length) return slot;
      const params: Record<string, number> = {};
      for (const param of module.params) params[param.id] = param.get();
      return { ...slot, params };
    }),
  };
}

/**
 * Put a rail back the way a recording found it.
 *
 * Expressed as ordinary commands rather than as its own kind of write, so the
 * setup and the run go through the identical applier — a bug in one is a bug in
 * both, and there is no second way to move a slot.
 */
export function applySetup(rack: Module[], setup: Setup): void {
  setup.rack.forEach((slot, to) => {
    applyRack(rack, { kind: "order", id: slot.id, to });
    applyRack(rack, { kind: "verb", id: slot.id, verb: slot.verb });
    applyRack(rack, { kind: "enable", id: slot.id, on: slot.enabled });
    for (const [param, value] of Object.entries(slot.params ?? {})) {
      applyRack(rack, { kind: "param", id: slot.id, param, value });
    }
  });
}

/** Where the operator's head is pointed, in radians. Sampled, not commanded. */
export interface Look {
  readonly pan: number;
  readonly tilt: number;
}

/** The live operator: the cab, watched. */
export interface Tracer extends Operator {
  /**
   * Something the cab did between two ticks. It lands at the next one.
   *
   * This is the queue rule 3 has always described. A press does not reach the
   * rack in the pointer event's own turn any more — it reaches it at a tick,
   * with that tick's number on it, which is the entire reason the ledger can
   * eventually say what was driving.
   */
  issue(act: Act): void;
  /**
   * Where the head is, now. Called at `SNAPSHOT_HZ` by whoever can see a
   * viewport — the one thing on the recording that is *observed* rather than
   * *done*, because the neck is sprung and the spring runs on the wall clock.
   */
  watch(tick: number, look: Look): void;
  /** The run so far, as a value. Safe to hold; nothing here mutates it later. */
  trace(): Trace;
}

/**
 * Coarse enough that a settled head stops writing, fine enough that a sweep is
 * a curve rather than a staircase: 0.005 rad is 0.29°, which is one pixel of
 * thumb on the glass (`viewport.look` moves 0.005 rad per px).
 */
const LOOK_STEP = 0.005;
const quantize = (radians: number) => Math.round(radians / LOOK_STEP) * LOOK_STEP;

export function createTracer(setup: Setup): Tracer {
  const commands: Command[] = [];
  const attention: Attention[] = [];
  const pending: Act[] = [];
  let ticks = 0;
  let left = 0;
  let right = 0;
  let headDown = false;
  let horn = false;
  let view: View = "cab";
  let pan = 0;
  let tilt = 0;

  return {
    issue(act) {
      pending.push(act);
    },

    watch(tick, look) {
      const next = { pan: quantize(look.pan), tilt: quantize(look.tilt) };
      if (next.pan === pan && next.tilt === tilt) return;
      pan = next.pan;
      tilt = next.tilt;
      attention.push({ tick, kind: "look", pan, tilt });
    },

    at(tick, hands, rack) {
      ticks = tick;

      // **Coalesce a drag.** The rack's sliders fire `setParam` on every
      // pointer-move sample, so a single thumb sweep can queue dozens of writes
      // for one param between two frames — and a pod being dragged does the
      // same for its placement. Only the last of them ever mattered, and
      // recording the rest would be recording the DOM's sample rate. Anything
      // else keeps its place in the order.
      for (let i = 0; i < pending.length; i++) {
        const act = pending[i] as Act;
        if (supersededIn(pending.slice(i + 1), act)) continue;
        switch (act.kind) {
          case "rack":
            applyRack(rack, act.command);
            commands.push({ tick, kind: "rack", command: act.command });
            break;
          case "ack":
            attention.push({ tick, kind: "ack" });
            break;
          case "estop":
            attention.push({ tick, kind: "estop", engaged: act.engaged });
            break;
          case "pod":
            attention.push({ tick, kind: "pod", id: act.id, x: act.x, y: act.y });
            break;
        }
      }
      pending.length = 0;

      if (hands.leverL !== left || hands.leverR !== right) {
        left = hands.leverL;
        right = hands.leverR;
        commands.push({ tick, kind: "levers", left, right });
      }
      if (hands.headDown !== headDown) {
        headDown = hands.headDown;
        attention.push({ tick, kind: "posture", headDown });
      }
      if (hands.horn !== horn) {
        horn = hands.horn;
        attention.push({ tick, kind: "horn", down: horn });
      }
      if (hands.view !== view) {
        view = hands.view;
        attention.push({ tick, kind: "view", view });
      }
    },

    trace: () => ({
      setup,
      commands: commands.slice(),
      attention: attention.slice(),
      ticks,
    }),
  };
}

/**
 * Is a later act in the same drain about to overwrite this one?
 *
 * Two things stream: a param slider fires on every pointer-move sample, and so
 * does a pod being dragged. Only the last of each ever mattered, and keeping the
 * rest would make the trace a recording of the DOM's sample rate. Everything
 * else — a fuse, a verb, a reorder, an acknowledgement, the mushroom — is a
 * press, and two presses in one frame are two presses.
 */
function supersededIn(later: readonly Act[], act: Act): boolean {
  if (act.kind === "pod") return later.some((c) => c.kind === "pod" && c.id === act.id);
  if (act.kind !== "rack" || act.command.kind !== "param") return false;
  const { id, param } = act.command;
  return later.some(
    (c) =>
      c.kind === "rack" &&
      c.command.kind === "param" &&
      c.command.id === id &&
      c.command.param === param,
  );
}

/**
 * The recorded operator: a trace, played.
 *
 * **It is handed `commands` and not a `Trace`.** That is the whole guarantee
 * behind the two channels: the headless replay cannot read what the operator
 * merely *saw* even by accident, because it is never given it. A viewer that
 * wants to show you the horn, the mushroom and where you were looking builds a
 * second reader over `attention` (BOARD L-083), and that reader touches no
 * world.
 *
 * The cursor only ever moves forward, because the list is sorted and a frame
 * only ever asks for the next tick. A scrub would rebuild the world and play
 * from the start — which is what `EventReader`'s `rewound` flag has been waiting
 * for, and is still not this card.
 */
export function createPlayback(commands: readonly Command[]): Operator {
  let cursor = 0;

  return {
    at(tick, hands, rack) {
      while (cursor < commands.length) {
        const command = commands[cursor] as Command;
        if (command.tick > tick) break;
        cursor++;
        switch (command.kind) {
          case "levers":
            hands.leverL = command.left;
            hands.leverR = command.right;
            break;
          case "rack":
            applyRack(rack, command.command);
            break;
        }
      }
    },
  };
}

/**
 * An operator who does nothing at all.
 *
 * The honest source for a bench or a test that drives the rack directly, and
 * the reason `hands.ts` froze `AT_REST` in the first place.
 */
export const IDLE: Operator = Object.freeze({ at: () => {} });
