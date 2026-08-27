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
 *
 * ## It issues commands; it does not write modules
 *
 * It used to reach into every module and set `enabled` directly, which made it
 * the third of four routes into the rack and the only one that could change the
 * whole rail in a single press without anything downstream being able to say so
 * (L-032). It now emits one `enable` command per slot through the same channel
 * a cell's toggle uses, so the recording carries the stop and the release the
 * way it carries everything else the operator did.
 *
 * The `before` map stays. It is not a second home for rack state — it is the
 * stop's own memory of what it interrupted, which is what makes a release a
 * restoration rather than a guess, and it is read at the moment of the press
 * rather than sampled from anywhere.
 */

import type { Module } from "../control/bus.ts";
import type { RackCommand } from "../control/trace.ts";

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
 * @param rack read to see what is in circuit, never written.
 * @param issue where each `enable` command goes — the run's tracer, which
 *   stamps it with the tick that applies it.
 */
export function createEstop(
  rack: readonly Module[],
  issue: (command: RackCommand) => void,
): Estop {
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
        issue({ kind: "enable", id: mod.id, on: false });
      }
    },
    release() {
      if (!engaged) return;
      engaged = false;
      for (const mod of rack) {
        issue({ kind: "enable", id: mod.id, on: before[mod.id] ?? true });
      }
    },
    clear() {
      engaged = false;
      before = {};
    },
  };
}
