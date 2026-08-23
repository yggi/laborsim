/**
 * Architecture rule 1: the sim runs headless. Nothing in this file — or
 * anywhere under src/sim, src/control or src/modules — may import `three`,
 * touch the DOM, or read a canvas.
 *
 * That is what makes this testable in plain Node, and what keeps a worker
 * possible later. See docs/design/architecture-rules.md.
 */

import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import { type CommandSource, resolveBus } from "../control/bus.ts";
import { STEP_SECONDS } from "../core/clock.ts";
import { hashBytes } from "../core/hash.ts";
import { attitudeOf, type Snapshot } from "../core/snapshot.ts";
import { CLEARANCE, TRACK } from "../core/spec.ts";
import { vec } from "../core/vec.ts";
import { generateProps, PROP_BOX, type Prop } from "../world/props.ts";
import {
  CELL,
  GRID,
  generateTerrain,
  heightAt,
  type Terrain,
} from "../world/terrain.ts";
import { spawnTrackedMachine, type TrackedMachine } from "./tracked.ts";

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
  readonly terrain: Terrain;
  readonly props: readonly Prop[];
  readonly machine: TrackedMachine;
  free(): void;
  readonly tick: number;
}

export interface SimOptions {
  readonly seed?: number;
  /** Ordered low to high priority, exactly as on the rail. */
  readonly sources?: readonly CommandSource[];
  /** Override the generated site — used by grade tests and set exercises. */
  readonly terrain?: Terrain;
}

export function createWorld(options: SimOptions = {}): SimWorld {
  const seed = options.seed ?? 20260823;
  const sources = options.sources ?? [];

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = STEP_SECONDS;

  const terrain = options.terrain ?? generateTerrain(seed);
  world.createCollider(
    RAPIER.ColliderDesc.heightfield(GRID, GRID, terrain.heights, {
      x: terrain.extent,
      y: 1,
      z: terrain.extent,
    })
      // The ground supplies normal support only. Every horizontal force on the
      // machine comes from the track model, so that it stays inspectable.
      .setFriction(0),
  );

  // Site furniture gets real static colliders, so it is something you can hit
  // rather than something painted on. The damage ledger will attach here.
  const props = generateProps(terrain);
  for (const prop of props) {
    const [hx, hy, hz] = PROP_BOX[prop.kind];
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(prop.x, prop.y + hy * prop.scale, prop.z)
      .setRotation({
        x: 0,
        y: Math.sin(prop.yaw / 2),
        z: 0,
        w: Math.cos(prop.yaw / 2),
      });
    const propBody = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        hx * prop.scale,
        hy * prop.scale,
        hz * prop.scale,
      ).setFriction(0.4),
      propBody,
    );
  }

  const startY =
    (options.terrain ? 0 : heightAt(0, 0, seed)) + TRACK.height + CLEARANCE + 0.1;
  const machine = spawnTrackedMachine(world, vec(0, startY, 0));

  let tick = 0;
  let busOwner: string | null = null;
  let suppressed: string[] = [];

  return {
    step() {
      const bus = resolveBus(sources);
      busOwner = bus.owner?.label ?? null;
      suppressed = bus.suppressed.map((s) => s.label);
      machine.drive(bus.command.left, bus.command.right, STEP_SECONDS);
      world.step();
      tick++;
    },
    snapshot(): Snapshot {
      const t = machine.body.translation();
      const r = machine.body.rotation();
      const pose = {
        position: [t.x, t.y, t.z] as const,
        rotation: [r.x, r.y, r.z, r.w] as const,
      };
      return {
        tick,
        simSeconds: tick * STEP_SECONDS,
        machine: {
          pose,
          left: machine.left,
          right: machine.right,
          speed: machine.speed(),
          ...attitudeOf(pose.rotation),
        },
        busOwner,
        suppressed,
      };
    },
    fingerprint() {
      return hashBytes(world.takeSnapshot());
    },
    terrain,
    props,
    machine,
    free() {
      world.free();
    },
    get tick() {
      return tick;
    },
  };
}

export { CELL, GRID };
