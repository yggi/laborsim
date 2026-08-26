/**
 * The mechanical check behind architecture rules 1 and 2.
 *
 * Rule 1 holds if this file runs at all: it imports the sim in plain Node with
 * no DOM and no WebGL context (vite.config.ts sets `environment: "node"`).
 *
 * Rule 2 holds if the fingerprints match: same initial state, same number of
 * fixed steps, same physics state, bit for bit. Attribution is the design, and
 * a failure you cannot reproduce cannot be blamed on a design decision.
 *
 * Machine *behaviour* lives in machine.test.ts. This file is about the rules.
 *
 * See docs/design/code/architecture-rules.md.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { makeClock, STEP_SECONDS } from "../src/core/clock.ts";
import { makeRng } from "../src/core/rng.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { generateTerrain, heightAt, makeRampTerrain } from "../src/world/terrain.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

function runFor(steps: number): string {
  const world = createWorld();
  for (let i = 0; i < steps; i++) world.step();
  const fingerprint = world.fingerprint();
  world.free();
  return fingerprint;
}

describe("the sim runs headless", () => {
  it("steps a physics world with no DOM present", () => {
    expect(globalThis.document).toBeUndefined();
    const world = createWorld();
    world.step();
    expect(world.tick).toBe(1);
    world.free();
  });
});

describe("the sim is deterministic", () => {
  it("produces an identical fingerprint for an identical run", () => {
    expect(runFor(180)).toBe(runFor(180));
  });

  it("diverges when the run length differs", () => {
    // Guards against a fingerprint that is accidentally constant, which would
    // make the test above pass while proving nothing.
    expect(runFor(30)).not.toBe(runFor(180));
  });
});

describe("terrain is reproducible without transcendentals", () => {
  it("generates byte-identical heights from one seed", () => {
    expect(Array.from(generateTerrain(7).heights)).toEqual(
      Array.from(generateTerrain(7).heights),
    );
  });

  it("differs between seeds", () => {
    expect(Array.from(generateTerrain(7).heights)).not.toEqual(
      Array.from(generateTerrain(8).heights),
    );
  });

  it("quantizes every height, so float drift cannot move a vertex", () => {
    for (const h of generateTerrain(3).heights) {
      expect(Number.isInteger(h * 1024)).toBe(true);
    }
  });

  it("grades the starting pad flat", () => {
    expect(heightAt(0, 0, 99)).toBe(0);
    expect(heightAt(6, -4, 99)).toBe(0);
  });

  it("builds ramps at the grade asked for", () => {
    const ramp = makeRampTerrain(45, 0);
    const n = 129;
    // 45 degrees is a 1:1 rise, measured across one cell in +Z.
    const a = ramp.heights[64 * n + 100] as number;
    const b = ramp.heights[64 * n + 101] as number;
    expect(b - a).toBeCloseTo(2, 2);
  });
});

describe("randomness is seeded, never ambient", () => {
  it("replays exactly from a seed", () => {
    const draw = (seed: number) =>
      Array.from({ length: 8 }, () => makeRng(seed).next());
    expect(draw(20260823)).toEqual(draw(20260823));
    expect(makeRng(1).next()).not.toEqual(makeRng(2).next());
  });
});

describe("the clock is fixed-step", () => {
  it("accumulates fractional frames instead of scaling the step", () => {
    const clock = makeClock();
    // Two frames of two-thirds of a step: no step, then one.
    expect(clock.advance(STEP_SECONDS * (2 / 3)).steps).toBe(0);
    expect(clock.advance(STEP_SECONDS * (2 / 3)).steps).toBe(1);
    expect(clock.tick).toBe(1);
  });

  it("drops the backlog rather than freezing on a long stall", () => {
    const clock = makeClock();
    expect(clock.advance(60).steps).toBe(5);
  });
});
