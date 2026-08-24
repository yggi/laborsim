/**
 * Architecture rule 1: the sim runs headless. Nothing in this file — or
 * anywhere under src/sim, src/control or src/modules — may import `three`,
 * touch the DOM, or read a canvas.
 *
 * That is what makes this testable in plain Node, and what keeps a worker
 * possible later. See docs/design/architecture-rules.md.
 */

import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import { type Module, runRack, type Stage } from "../control/bus.ts";
import { STEP_SECONDS } from "../core/clock.ts";
import { hashBytes } from "../core/hash.ts";
import { attitudeOf, type PropPose, type Snapshot } from "../core/snapshot.ts";
import { CLEARANCE, TRACK } from "../core/spec.ts";
import { vec } from "../core/vec.ts";
import {
  generateProps,
  isBreakable,
  PROP_BOX,
  PROP_SPEC,
  type Prop,
} from "../world/props.ts";
import {
  CELL,
  GRID,
  generateTerrain,
  heightAt,
  type Terrain,
} from "../world/terrain.ts";
import { generateWaypoints, type Pin } from "../world/waypoints.ts";
import { createLedger, impactOf, kineticEnergy, type Ledger } from "./damage.ts";
import { spawnTrackedMachine, type TrackedMachine } from "./tracked.ts";

/**
 * Rapier ships as wasm and must be initialised once before any world exists.
 * The `-deterministic` build is bit-level reproducible across machines and
 * browsers; the `-compat` flavour inlines the wasm so there is no async
 * loader dance in Vite. Slower than the SIMD build, and that is the trade.
 */
/**
 * Steps run at construction to let the site settle. Two seconds of sim: enough
 * for furniture to touch down and fall asleep, cheap enough to do on load.
 */
const SETTLE_STEPS = 120;

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
  readonly waypoints: readonly Pin[];
  readonly machine: TrackedMachine;
  /** Everything that has been broken so far, itemised and priced. */
  readonly ledger: Ledger;
  free(): void;
  readonly tick: number;
}

export interface SimOptions {
  readonly seed?: number;
  /** Ordered top of the rail to the actuator terminal. Order is the game. */
  readonly modules?: readonly Module[];
  /** Override the generated site — used by grade tests and set exercises. */
  readonly terrain?: Terrain;
}

export function createWorld(options: SimOptions = {}): SimWorld {
  const seed = options.seed ?? 20260823;
  const modules = options.modules ?? [];

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

  /**
   * Site furniture. Anything with a mass gets a **dynamic** body, so hitting it
   * knocks it over instead of stopping you dead — the visceral half of the
   * damage model, and it costs one word. Landscape stays fixed: a boulder is
   * the ground with a different shape.
   *
   * The ground's friction is 0 by design (the track model owns traction), so
   * props would skate forever on it. `CoefficientCombineRule.Max` fixes that
   * for props alone: prop-against-ground takes the prop's 0.7 rather than the
   * average of 0.7 and nothing. It also gives the tracks grip *on* a prop,
   * which is right — a machine climbing a barrier should be able to.
   */
  const props = generateProps(terrain);
  const propBodies: RAPIER.RigidBody[] = [];
  /** Linear kinetic energy each breakable had at the end of the last step. */
  const propEnergy = new Float64Array(props.length);
  for (const prop of props) {
    const [hx, hy, hz] = PROP_BOX[prop.kind];
    const breakable = isBreakable(prop.kind);
    const bodyDesc = (
      breakable ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed()
    )
      .setTranslation(prop.x, prop.y + hy * prop.scale, prop.z)
      .setRotation({ x: 0, y: prop.yawY, z: 0, w: prop.yawW });
    const propBody = world.createRigidBody(bodyDesc);
    const collider = RAPIER.ColliderDesc.cuboid(
      hx * prop.scale,
      hy * prop.scale,
      hz * prop.scale,
    )
      .setFriction(0.7)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max);
    const mass = PROP_SPEC[prop.kind].mass;
    if (mass !== undefined) collider.setMass(mass * prop.scale);
    world.createCollider(collider, propBody);
    propBodies.push(propBody);
  }

  const ledger = createLedger(props);

  const startY =
    (options.terrain ? 0 : heightAt(0, 0, seed)) + TRACK.height + CLEARANCE + 0.1;
  const machine = spawnTrackedMachine(world, vec(0, startY, 0));

  /**
   * Let the site settle before anyone is accountable for it.
   *
   * Furniture is dropped a few centimetres onto ground it was placed against by
   * bilinear sampling, and the collider it lands on is triangulated — so there
   * is always a small settling twitch. Charging for that produced a ¥55,690
   * bill before the machine had moved. These steps happen with no rack, no
   * drive and no ledger: the exercise begins with everything at rest.
   */
  for (let i = 0; i < SETTLE_STEPS; i++) world.step();
  for (let i = 0; i < propBodies.length; i++) {
    const body = propBodies[i];
    if (!body) continue;
    const v = body.linvel();
    propEnergy[i] = kineticEnergy(body.mass(), v.x, v.y, v.z);
  }

  const waypoints = generateWaypoints(terrain);

  let tick = 0;
  let stages: readonly Stage[] = [];

  /**
   * Energy delivered into each breakable this step, priced by the ledger.
   *
   * Only awake bodies are looked at, which is what keeps this cheap: a site
   * that nobody has driven into costs one `isSleeping()` call per prop.
   */
  function assessDamage() {
    const blame = { tick, speed: machine.speed(), stages };
    for (let i = 0; i < propBodies.length; i++) {
      const body = propBodies[i];
      if (!body || body.isSleeping()) continue;
      const mass = body.mass();
      if (mass <= 0) continue;
      const v = body.linvel();
      const now = kineticEnergy(mass, v.x, v.y, v.z);
      const delivered = impactOf(now, propEnergy[i] as number, mass);
      propEnergy[i] = now;
      if (delivered > 0) {
        const t = body.translation();
        ledger.absorb(i, delivered, [t.x, t.y, t.z], blame);
      }
    }
  }

  /**
   * Poses of props that are actually moving. Rule 3 wants a value the UI can
   * hold, so this is a fresh array — and it is empty on a site standing still,
   * which is nearly always.
   */
  function movedProps(): readonly PropPose[] {
    const moved: PropPose[] = [];
    for (let i = 0; i < propBodies.length; i++) {
      const body = propBodies[i];
      if (!body || body.isSleeping() || body.isFixed()) continue;
      const t = body.translation();
      const r = body.rotation();
      moved.push({
        index: i,
        position: [t.x, t.y, t.z],
        rotation: [r.x, r.y, r.z, r.w],
      });
    }
    return moved;
  }

  return {
    step() {
      const bus = runRack(modules);
      stages = bus.stages;
      machine.drive(bus.command.left, bus.command.right, STEP_SECONDS);
      world.step();
      tick++;
      assessDamage();
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
        stages,
        props: movedProps(),
        damage: ledger.events,
        bill: ledger.total,
      };
    },
    fingerprint() {
      return hashBytes(world.takeSnapshot());
    },
    terrain,
    props,
    waypoints,
    machine,
    ledger,
    free() {
      world.free();
    },
    get tick() {
      return tick;
    },
  };
}

export { CELL, GRID };
