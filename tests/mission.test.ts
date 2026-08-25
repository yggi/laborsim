/**
 * The exercises, and the one thing the failure loop could never say: *yes.*
 *
 * Three things are pinned here and each of them is a way the feature could be
 * quietly wrong while looking right:
 *
 * 1. **"Gentler slopes" is an angle, not an adjective.** The first exercise is
 *    below the machine's climb limit everywhere and the last one is not.
 * 2. **"You can already see the flag" is a cone**, not a hope about a seed.
 * 3. **Reaching a marker is measured**, and it is measured by the sim rather
 *    than by anything watching it — including in a run that actually drove
 *    there, because a goal that fires at tick 0 would pass every unit test
 *    above and fail the only one that matters.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { Module } from "../src/control/bus.ts";
import { STEP_SECONDS } from "../src/core/clock.ts";
import { PIN_REACH } from "../src/core/spec.ts";
import { ARRIVED, createAutonav } from "../src/modules/autonav.ts";
import { createGoal } from "../src/sim/goal.ts";
import { MU } from "../src/sim/tracked.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { EXERCISES, exerciseById, nextExercise } from "../src/world/exercises.ts";
import { CELL, GRID, generateTerrain, type Terrain } from "../src/world/terrain.ts";
import { generateWaypoints } from "../src/world/waypoints.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

/** Steepest cell-to-cell grade anywhere on a site, in degrees. */
function steepest(terrain: Terrain): number {
  const n = GRID + 1;
  let max = 0;
  for (let ix = 0; ix < GRID; ix++) {
    for (let iz = 0; iz < GRID; iz++) {
      const h = terrain.heights[ix * n + iz] as number;
      const dx = Math.abs((terrain.heights[(ix + 1) * n + iz] as number) - h) / CELL;
      const dz = Math.abs((terrain.heights[ix * n + iz + 1] as number) - h) / CELL;
      if (dx > max) max = dx;
      if (dz > max) max = dz;
    }
  }
  return (Math.atan(max) * 180) / Math.PI;
}

/** What the machine can climb, from the one tuned constant it falls out of. */
const CLIMB_LIMIT = (Math.atan(MU) * 180) / Math.PI;

describe("the ladder", () => {
  it("puts the first exercise's whole site inside the climb limit", () => {
    const first = EXERCISES[0] as (typeof EXERCISES)[number];
    const grade = steepest(generateTerrain(first.seed, first.relief));
    // Not "gentler than the last one" — *climbable*, which is the only bound
    // that means anything to somebody who has never driven it. A trainee who
    // cannot get up a hill must be finding out something about their driving,
    // never something about the hill.
    expect(grade).toBeLessThan(CLIMB_LIMIT);
  });

  it("puts the full site outside it, which is what makes it the full site", () => {
    const full = EXERCISES[2] as (typeof EXERCISES)[number];
    expect(full.relief).toBe(1);
    expect(steepest(generateTerrain(full.seed, full.relief))).toBeGreaterThan(
      CLIMB_LIMIT,
    );
  });

  it("gives the first exercise one marker, ahead, and in sight", () => {
    const first = EXERCISES[0] as (typeof EXERCISES)[number];
    const route = first.route;
    const pins = generateWaypoints(generateTerrain(first.seed, first.relief), route);
    expect(pins).toHaveLength(1);
    const pin = pins[0] as (typeof pins)[number];
    // Ahead is +Z: the machine's rest pose faces it (`core/spec.ts`). A first
    // exercise whose marker is behind you is one you can fail by facing the
    // wrong way, and that teaches nothing about a machine.
    expect(pin.z).toBeGreaterThan(0);
    expect(Math.abs(pin.x)).toBeLessThanOrEqual((route.ahead as number) * pin.z);
    const range = Math.hypot(pin.x, pin.z);
    expect(range).toBeGreaterThanOrEqual(route.near);
    expect(range).toBeLessThanOrEqual(route.far);
  });

  it("ends on the open site, which has no objective and so cannot be finished", () => {
    const last = EXERCISES[EXERCISES.length - 1] as (typeof EXERCISES)[number];
    expect(last.route.count).toBe(0);
    expect(nextExercise(last.id)).toBeUndefined();
    // Every other exercise hands on to one.
    for (const e of EXERCISES.slice(0, -1)) expect(nextExercise(e.id)).toBeDefined();
    for (const e of EXERCISES) expect(exerciseById(e.id)).toBe(e);
  });
});

describe("NAV-1 and the rig agree about arriving", () => {
  /**
   * The failure this prevents is silent and total: NAV-1 decides it is close
   * enough and moves on, the rig decides it is not and never credits the pin,
   * and the exercise cannot be completed by the one component built to complete
   * it — with every instrument reading correctly the whole time.
   */
  it("never lets the module give up on a pin before the rig credits it", () => {
    expect(ARRIVED).toBeLessThanOrEqual(PIN_REACH);
  });
});

describe("goal track-keeping", () => {
  const route = [
    { x: 0, z: 20 },
    { x: 0, z: 60 },
  ];

  it("credits a marker only inside the reach, and never takes it back", () => {
    const goal = createGoal("T", route);
    expect(goal.step(1, 0, 20 - PIN_REACH - 0.5, false).reached).toEqual([]);
    expect(goal.state.count).toBe(0);

    expect(goal.step(2, 0, 20 - PIN_REACH + 0.5, false).reached).toEqual([0]);
    expect(goal.state.count).toBe(1);
    expect(goal.state.reached[0]).toBe(2);

    // Driving away does not un-reach it, and it is not credited twice.
    expect(goal.step(3, 0, 0, false).reached).toEqual([]);
    expect(goal.state.count).toBe(1);
    expect(goal.state.reached[0]).toBe(2);
  });

  it("settles once, on the step the last marker is reached", () => {
    const goal = createGoal("T", route);
    goal.step(1, 0, 20, false);
    expect(goal.state.outcome).toBe("running");

    const done = goal.step(9, 0, 60, false);
    expect(done.settled).toBe("success");
    expect(goal.state.outcome).toBe("success");
    expect(goal.state.settled).toBe(9);

    // Terminal: nothing that happens afterwards is recorded against this run.
    expect(goal.step(10, 0, 60, true).settled).toBeUndefined();
    expect(goal.state.outcome).toBe("success");
    expect(goal.state.settled).toBe(9);
  });

  it("fails on a citizen, even on the step that finished the route", () => {
    const goal = createGoal("T", route);
    goal.step(1, 0, 20, false);
    const last = goal.step(2, 0, 60, true);
    expect(last.settled).toBe("failed");
    // The marker was still reached — the account is honest about both halves.
    expect(goal.state.count).toBe(2);
    expect(goal.state.outcome).toBe("failed");
  });

  it("never completes a site with no markers, which is what a sandbox is", () => {
    const goal = createGoal("E-00", []);
    for (let tick = 1; tick <= 5; tick++) {
      expect(goal.step(tick, 0, 0, false).settled).toBeUndefined();
    }
    expect(goal.state.outcome).toBe("running");
    // It can still be failed. Nobody is scored on the open site; everybody is
    // accountable on it.
    expect(goal.step(6, 0, 0, true).settled).toBe("failed");
  });
});

describe("the first exercise, driven", () => {
  /**
   * The whole feature end to end, on the machine, in the world it ships with.
   *
   * It asserts the scenario as well as the result (META — a bite check proves
   * the code path ran, not that the thing happened): the machine has to have
   * covered real ground, and the events have to be on the channel, before a
   * `success` means anything at all.
   */
  it("is completed by NAV-1, and says so on the channel", () => {
    const first = EXERCISES[0] as (typeof EXERCISES)[number];
    // The rack is passed empty and filled afterwards: NAV has to read the pose
    // of the machine it is driving, and `runRack` walks the array every step.
    // The same order the cab builds it in.
    const rack: Module[] = [];
    const world = createWorld({ exercise: first, modules: rack });
    rack.push(
      createAutonav(
        world.waypoints,
        () => {
          const t = world.machine.body.translation();
          return { x: t.x, z: t.z, rotation: world.machine.body.rotation() };
        },
        { verb: "SET", enabled: true },
      ),
    );

    expect(world.waypoints).toHaveLength(1);
    expect(world.snapshot().goal.outcome).toBe("running");

    const seen: string[] = [];
    // 60 seconds of sim. The pin is about 53 m out and the machine tops out at
    // 2.2 m/s, so this is generous rather than tight — a test that only just
    // fits would be a test of the top speed.
    for (let i = 0; i < 60 / STEP_SECONDS; i++) {
      world.step();
      for (const event of world.snapshot().events) {
        if (event.kind === "waypoint" || event.kind === "outcome") {
          if (!seen.includes(event.kind)) seen.push(event.kind);
        }
      }
      if (world.snapshot().goal.outcome !== "running") break;
    }

    const end = world.snapshot();
    // It got there by driving, not by being generated on top of the marker.
    expect(end.distance).toBeGreaterThan(30);
    expect(end.goal.outcome).toBe("success");
    expect(end.goal.count).toBe(1);
    expect(end.goal.settled).toBeGreaterThan(0);
    expect(seen).toEqual(["waypoint", "outcome"]);
    world.free();
  });
});
