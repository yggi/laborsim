/**
 * Architecture rule 1: the sim runs headless. Nothing in this file — or
 * anywhere under src/sim, src/control or src/modules — may import `three`,
 * touch the DOM, or read a canvas.
 *
 * That is what makes this testable in plain Node, and what keeps a worker
 * possible later. See docs/design/architecture-rules.md.
 */

import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import { STEP_SECONDS } from "../core/clock.ts";
import { hashBytes } from "../core/hash.ts";
import type { BodyPose, Snapshot } from "../core/snapshot.ts";

/**
 * Rapier ships as wasm and must be initialised once before any world exists.
 * The `-deterministic` build is bit-level reproducible across machines and
 * browsers; the `-compat` flavour inlines the wasm so there is no async
 * loader dance in Vite. Slower than the SIMD build, and that is the trade.
 */
let ready: Promise<void> | undefined;
export function initPhysics(): Promise<void> {
  ready ??= RAPIER.init();
  return ready;
}

export interface SimWorld {
  /** Advance exactly one fixed step. Never call this with a variable dt. */
  step(): void;
  /** A value, taken at a moment, safe for the UI to hold. */
  snapshot(): Snapshot;
  /** Fingerprint of full physics state — the determinism check. */
  fingerprint(): string;
  free(): void;
  readonly tick: number;
}

/**
 * A placeholder scene: flat ground and one box dropped slightly off-centre.
 * It exists to prove the loop steps and reproduces, nothing more. Rung 1 (the
 * tracked platform) replaces it — see BOARD.md L-014.
 */
export function createWorld(): SimWorld {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP_SECONDS;

  world.createCollider(RAPIER.ColliderDesc.cuboid(50, 0.5, 50));

  const crate = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0.35, 8, -0.2),
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), crate);

  let tick = 0;

  return {
    step() {
      world.step();
      tick++;
    },
    snapshot(): Snapshot {
      const bodies: BodyPose[] = [];
      world.forEachRigidBody((body) => {
        const t = body.translation();
        const r = body.rotation();
        bodies.push({
          id: String(body.handle),
          position: [t.x, t.y, t.z],
          rotation: [r.x, r.y, r.z, r.w],
        });
      });
      return { tick, simSeconds: tick * STEP_SECONDS, bodies };
    },
    fingerprint() {
      return hashBytes(world.takeSnapshot());
    },
    free() {
      world.free();
    },
    get tick() {
      return tick;
    },
  };
}
