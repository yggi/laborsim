/**
 * The pilot's handles on a fitted module — the way a command crosses *back*.
 *
 * Architecture rule 3 is one-directional: state leaves the sim as a snapshot and
 * nothing reads the live rack to draw itself. Commands go the other way, and
 * until now each one crossed by its own private route — the dash was handed an
 * `onToggleModule` callback, and NAV-1's route scope was handed a live `Autonav`
 * reference so it could call `setTarget`. The second one is the bad case: an
 * instrument holding the module it is drawing cannot render from a recording,
 * and a pod that cannot render from a recording is not an instrument, it is a
 * remote control with a dial on it.
 *
 * So there is one channel, and every part of a component gets the same one:
 * **read through the snapshot, write through `Controls`.** A part never learns
 * what kind of module is behind the handle, and a part rendering a replay gets
 * handles that do nothing, because there is nothing there to command.
 *
 * ## Four verbs, because the rack is four decisions
 *
 * It had two — `toggle` and `setParam` — and the claim that this was "the one
 * channel" was therefore false in the place it mattered most. The two it was
 * missing, **reorder** and **verb**, are the two the rack is actually *about*:
 * order is the game, and a verb is how a module folds its intent into what
 * reached it. Both were reachable only by `cockpit/Rack.svelte` splicing the
 * live array and writing `module.verb` in place, which is exactly the thing
 * `cockpit/contract.ts` claims cannot happen. So the plate was the one part of
 * the cockpit holding a live module, and the two most consequential commands in
 * the game were the two nothing could record (L-032).
 *
 * There is still no way to reach anything else, which is the point — a
 * component's controls are what it declared, not what a cockpit author can find
 * on it.
 *
 * ## A command is a value, and it lands on a tick
 *
 * Rule 3 has always said commands cross "as discrete, **queued** inputs". They
 * did not: every one of these mutated a module synchronously, inside the pointer
 * event's own turn, out of band from the tick counter — so nothing could say
 * *what was driving* when a thing broke, which is the ledger's whole missing
 * column. Now a handle produces a `RackCommand` and hands it to `issue`; the
 * frame applies it at a tick and writes it down (`control/trace.ts`).
 *
 * The delay is at most one frame, and only the schedule can stop the ticks —
 * and the schedule covers the cab, so nothing can be pressed while nothing is
 * draining.
 */

import type { Module, Verb } from "./bus.ts";
import type { RackCommand } from "./trace.ts";

export interface Controls {
  /**
   * Switch the component off or on.
   *
   * Safety kit must **not** offer this: bypassing a guard costs you the glass,
   * so it happens in the rack, not from a cell (`doc/design/cab/components.md`).
   * That is a contract on the *part*, enforced in `tests/cockpit.test.ts` —
   * nothing here can tell who is calling.
   */
  toggle(): void;
  /**
   * Set one of the module's declared params. Unknown id is a no-op, and the
   * module's own `set` is what enforces the bounds — a param is the only
   * numeric surface a component exposes.
   */
  setParam(id: string, value: number): void;
  /** How this module folds its intent into the signal that reached it. */
  setVerb(verb: Verb): void;
  /** Move the slot, top of the rail being 0. Out of range is a no-op. */
  reorder(to: number): void;
}

/** Handles that reach nothing. What a replay gets, and it must be harmless. */
const INERT: Controls = {
  toggle: () => {},
  setParam: () => {},
  setVerb: () => {},
  reorder: () => {},
};

export interface ControlHooks {
  /**
   * Called *before* a module is switched off, and only for kit that is on and
   * flagged safety. It is the "popping the hood" moment: the maker's warranty
   * notice and the line in the debrief hang off it.
   *
   * It fires on the deliberate act only. An emergency stop disables everything
   * in the rack and voids nobody's warranty — which falls out rather than being
   * special-cased, because an E-stop has already left every module disabled by
   * the time anything could call `toggle`.
   *
   * It fires when the command is *issued*, not when it lands: a warranty notice
   * belongs to the press, and the press is what the maker has an opinion about.
   */
  onBypass?(module: Module): void;
}

/**
 * Build the lookup the cockpit hands to its parts.
 *
 * `modules` is the live rack, read at call time rather than captured, because
 * the rack is mutated in place — reordering a slot must not leave a cell holding
 * a handle on the module that used to be there. It is read to *ask* (is this on?
 * what verb is it?), never to write; writing is `issue`'s job and, one layer
 * down, `applyRack`'s.
 *
 * @param issue where a command goes. In the app this is the run's tracer, which
 *   stamps it with the tick that applies it. A bench or a test can pass a sink
 *   that applies it at once.
 */
export function createControls(
  modules: readonly Module[],
  issue: (command: RackCommand) => void,
  hooks: ControlHooks = {},
): (id: string) => Controls {
  return (id: string): Controls => {
    // Not a live check: a component absent *now* may be fitted later, and one
    // fitted now may go. Every call looks again.
    const find = () => modules.find((m) => m.id === id);
    return {
      toggle() {
        const module = find();
        if (!module) return;
        if (module.enabled && module.safety === true) hooks.onBypass?.(module);
        issue({ kind: "enable", id, on: !module.enabled });
      },
      setParam(paramId: string, value: number) {
        issue({ kind: "param", id, param: paramId, value });
      },
      setVerb(verb: Verb) {
        issue({ kind: "verb", id, verb });
      },
      reorder(to: number) {
        issue({ kind: "order", id, to });
      },
    };
  };
}

/** Handles for a component nothing is driving. Used by replays and benches. */
export const inertControls = (): Controls => INERT;
