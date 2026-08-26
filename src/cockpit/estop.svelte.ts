/**
 * The mushroom. Kills the drive by disabling every module in the rack — the
 * terminal falls to HALT whatever was driving — and gives it back exactly as it
 * was, because a safety control that quietly rewired your rack would be its own
 * hazard.
 *
 * It is the machine's, not the rig's: KIBA bolted it to the dash and it acts on
 * the rack and nothing else. What the *rig* does when you hit it — open the
 * folder, stop asking you questions — is the shell's business and stays there.
 *
 * The stop is **latched, not toggled**. Hitting it while it is already in does
 * nothing new, which is why `hit` and `release` are two verbs rather than one
 * boolean: the way out is a twist, and that is exactly the ceremony a real stop
 * demands.
 */

import type { Module } from "../control/bus.ts";

export interface Estop {
  readonly engaged: boolean;
  /** Latch it in. Every module in the rack is disabled and remembered. */
  hit(): void;
  /** Twist it out, restoring the enable-state the rack had before. */
  release(): void;
  /** Out, and forgetting: the rig re-racked the exercise and that rack is gone. */
  clear(): void;
}

/**
 * @param rack mutated in place, exactly as everything else that owns a slot
 *   does — the array's identity is what the cab is rendering.
 * @param onChange the rack's contents changed under the cockpit's feet.
 */
export function createEstop(rack: Module[], onChange: () => void): Estop {
  let engaged = $state(false);
  /** Enabled-state of each module before the stop, so release can restore it. */
  let before: Record<string, boolean> = {};

  return {
    get engaged() {
      return engaged;
    },
    hit() {
      if (engaged) return;
      engaged = true;
      before = {};
      for (const mod of rack) {
        before[mod.id] = mod.enabled;
        mod.enabled = false;
      }
      onChange();
    },
    release() {
      if (!engaged) return;
      engaged = false;
      for (const mod of rack) mod.enabled = before[mod.id] ?? true;
      onChange();
    },
    clear() {
      engaged = false;
      before = {};
    },
  };
}
