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
 * Deliberately two verbs and no more. `toggle` is the enable, which every
 * component has; `setParam` reaches the bounded numbers a module declares. There
 * is no way to reach anything else, which is the point — a component's controls
 * are what it declared, not what a cockpit author can find on it.
 */

import type { Module } from "./bus.ts";

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
}

/** Handles that reach nothing. What a replay gets, and it must be harmless. */
const INERT: Controls = {
  toggle: () => {},
  setParam: () => {},
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
   */
  onBypass?(module: Module): void;
  /** Called after any change, so a caller holding the rack can re-render. */
  onChange?(): void;
}

/**
 * Build the lookup the cockpit hands to its parts.
 *
 * `modules` is the live rack, read at call time rather than captured, because
 * the rack is mutated in place — reordering a slot must not leave a cell holding
 * a handle on the module that used to be there.
 */
export function createControls(
  modules: readonly Module[],
  hooks: ControlHooks = {},
): (id: string) => Controls {
  return (id: string): Controls => {
    const find = () => modules.find((m) => m.id === id);
    // Not a live check: a component absent *now* may be fitted later, and one
    // fitted now may go. Every call looks again.
    return {
      toggle() {
        const module = find();
        if (!module) return;
        if (module.enabled && module.safety === true) hooks.onBypass?.(module);
        module.enabled = !module.enabled;
        hooks.onChange?.();
      },
      setParam(paramId: string, value: number) {
        const param = find()?.params?.find((p) => p.id === paramId);
        if (!param) return;
        param.set(value);
        hooks.onChange?.();
      },
    };
  };
}

/** Handles for a component nothing is driving. Used by replays and benches. */
export const inertControls = (): Controls => INERT;
