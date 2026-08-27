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
 * ## What is deliberately not on a recording
 *
 * Three of the six fields on `Hands` are absent, and each for its own reason:
 *
 * - **`seated` gates the clock.** A tick only exists while the operator is in
 *   the seat, so a tick *existing* already says so. Recording it would be
 *   recording the same fact twice.
 * - **`horn` is not on the recording** — `hands.ts` has said so since it was
 *   written, because nothing on the site can hear it.
 * - **`alarm` is derived.** The annunciator computes the master condition from
 *   the snapshot, so a replay re-derives it rather than being told.
 *
 * What is left is two levers and a posture. The posture costs one boolean and
 * earns it: *you had your head in the cabinet* is the most damning single fact
 * the ledger's attribution column will ever get to say.
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
import type { Hands } from "./hands.ts";

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
 * Something the operator did, at the tick it took effect.
 *
 * `levers` and `posture` are **change-points, not samples**: between two of them
 * the value is whatever the last one said, which is what a thumb resting on a
 * lever actually is. A five-minute run is a few hundred of these rather than
 * eighteen thousand frames, and the trace is the same length whether it was
 * recorded on a phone at 30 fps or a desktop at 144.
 */
export type Input =
  | {
      readonly tick: number;
      readonly kind: "levers";
      readonly left: number;
      readonly right: number;
    }
  | { readonly tick: number; readonly kind: "posture"; readonly headDown: boolean }
  | { readonly tick: number; readonly kind: "rack"; readonly command: RackCommand };

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
  /** Ascending by tick, and within a tick in the order they were issued. */
  readonly inputs: readonly Input[];
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

/** The live operator: the cab, watched. */
export interface Tracer extends Operator {
  /**
   * A command the cab issued between two ticks. It is applied at the next one.
   *
   * This is the queue rule 3 has always described. A press does not reach the
   * rack in the pointer event's own turn any more — it reaches it at a tick,
   * with that tick's number on it, which is the entire reason the ledger can
   * eventually say what was driving.
   */
  issue(command: RackCommand): void;
  /** The run so far, as a value. Safe to hold; nothing here mutates it later. */
  trace(): Trace;
}

export function createTracer(setup: Setup): Tracer {
  const inputs: Input[] = [];
  const pending: RackCommand[] = [];
  let ticks = 0;
  let left = 0;
  let right = 0;
  let headDown = false;

  return {
    issue(command) {
      pending.push(command);
    },

    at(tick, hands, rack) {
      ticks = tick;

      // **Coalesce a drag.** The rack's sliders fire `setParam` on every
      // pointer-move sample, so a single thumb sweep can queue dozens of writes
      // for one param between two frames. Only the last of them ever mattered
      // to the machine, and recording the rest would be recording the DOM's
      // sample rate. Anything else keeps its place in the order.
      for (let i = 0; i < pending.length; i++) {
        const command = pending[i] as RackCommand;
        if (command.kind === "param") {
          const later = pending
            .slice(i + 1)
            .some(
              (c) =>
                c.kind === "param" && c.id === command.id && c.param === command.param,
            );
          if (later) continue;
        }
        applyRack(rack, command);
        inputs.push({ tick, kind: "rack", command });
      }
      pending.length = 0;

      if (hands.leverL !== left || hands.leverR !== right) {
        left = hands.leverL;
        right = hands.leverR;
        inputs.push({ tick, kind: "levers", left, right });
      }
      if (hands.headDown !== headDown) {
        headDown = hands.headDown;
        inputs.push({ tick, kind: "posture", headDown });
      }
    },

    trace: () => ({ setup, inputs: inputs.slice(), ticks }),
  };
}

/**
 * The recorded operator: a trace, played.
 *
 * The cursor only ever moves forward, because `inputs` is sorted and a frame
 * only ever asks for the next tick. A scrub would rebuild the world and play
 * from the start — which is what `EventReader`'s `rewound` flag has been
 * waiting for, and is not this card.
 */
export function createPlayback(trace: Trace): Operator {
  let cursor = 0;

  return {
    at(tick, hands, rack) {
      while (cursor < trace.inputs.length) {
        const input = trace.inputs[cursor] as Input;
        if (input.tick > tick) break;
        cursor++;
        switch (input.kind) {
          case "levers":
            hands.leverL = input.left;
            hands.leverR = input.right;
            break;
          case "posture":
            hands.headDown = input.headDown;
            break;
          case "rack":
            applyRack(rack, input.command);
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
