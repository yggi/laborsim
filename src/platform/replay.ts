/**
 * Play a recording back through the engine that made it.
 *
 * There is nothing here but the loop condition. Everything a replay *does* —
 * writing the hands, applying the rack commands, stepping — is `frame.ts` and
 * `control/trace.ts`, unchanged and unaware, which is the entire claim behind
 * "one engine" (`doc/BOARD.md` L-032). What separates a replay from a session
 * is that the operator is a recording and the clock is fed a whole frame's worth
 * of time at once, so it runs as fast as the physics will go rather than at the
 * speed a person drove it.
 *
 * It draws nothing and sounds nothing by default, so it runs under Vitest in
 * plain Node — and it takes the same hooks a live run does, so a viewer that
 * wanted to watch one back would pass a `render` and be done. That viewer is
 * not this card; `EventReader`'s `rewound` flag is what it will scrub with.
 */

import type { Module } from "../control/bus.ts";
import { type Hands, restingHands } from "../control/hands.ts";
import { applySetup, createPlayback, type Trace } from "../control/trace.ts";
import { makeClock, STEP_SECONDS } from "../core/clock.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { createWorld, type SimWorld } from "../sim/world.ts";
import { exerciseById } from "../world/exercises.ts";
import { advance } from "./frame.ts";

export interface ReplayOptions {
  /**
   * The chassis component, built around the hands this replay will write.
   *
   * **Required, and it is the one thing that cannot be defaulted.** A recorded
   * lever movement reaches the machine through the pilot module and through
   * nothing else, so a replay assembled without one is a replay of a parked
   * machine that agrees with itself — which is exactly how this was first got
   * wrong, and why `tests/replay.test.ts` proves the drive happened before it
   * trusts that it matched.
   *
   * It is a callback rather than a module because the hands are the replay's,
   * and it is an option rather than a hard-coded `createPilot` for the same
   * reason `createRun` takes one: a run with opinions about the machine is a run
   * that has to be edited when there is a second chassis (BOARD L-053).
   */
  pilot(hands: Hands): Module;
  /**
   * What to bolt on beyond the chassis, once there is a world to bolt it to.
   *
   * The same shape `createRun` takes and for the same reason: which components
   * were fitted is not the run's business. A trace's `Setup` says how each slot
   * was *configured*; it does not say what a NAV-1 is, and it must not — a
   * recording that carried its modules would be a recording that could not be
   * replayed against a fixed version of them.
   */
  fit?(world: SimWorld): readonly Module[];
  /** Called with every frame's snapshot, at the fixed step. */
  onFrame?(snapshot: Snapshot): void;
}

export interface Replayed {
  readonly world: SimWorld;
  /** The last snapshot the run produced. `world` is still live; free it. */
  readonly snapshot: Snapshot;
}

/**
 * Rebuild the world the trace describes and run it to the end.
 *
 * `initPhysics()` must have resolved first, exactly as for `createWorld`.
 * The world is handed back **unfreed**, because everything worth asserting on
 * — the ledger, the fingerprint, the goal — is read off it after the fact.
 */
export function replay(trace: Trace, options: ReplayOptions): Replayed {
  const { setup } = trace;
  const exercise = exerciseById(setup.exercise);
  if (!exercise) throw new Error(`replay: no exercise ${setup.exercise}`);

  const hands = restingHands();
  // Nobody is at the schedule during a replay. The recording only has ticks for
  // the time the operator was in the seat, so every tick in it is a seated one.
  hands.seated = true;

  // The rail is assembled the way `createRun` assembles it: the chassis first,
  // by reference, because the world holds the array — then whatever the world
  // was needed to build.
  const rack: Module[] = [options.pilot(hands)];
  const world = createWorld({ exercise, seed: setup.seed, modules: rack });
  rack.push(...(options.fit?.(world) ?? []));
  // The rail as it was fitted, before the first tick. Ordinary commands through
  // the ordinary applier — there is no second way to move a slot.
  applySetup(rack, setup);

  const frame = {
    world,
    clock: makeClock(),
    hands,
    rack,
    operator: createPlayback(trace),
    ...(options.onFrame ? { render: options.onFrame } : {}),
  };

  let snapshot = world.snapshot();
  // One step per frame: the clock's backlog cap exists to stop a stalled tab
  // simulating a minute in one frame, and a replay has no tab and no stall.
  // Feeding it exactly one step's worth means no tick can ever be dropped,
  // which is the one way a replay could silently come out shorter than the run.
  while (world.tick < trace.ticks) snapshot = advance(frame, STEP_SECONDS).snapshot;

  return { world, snapshot };
}
