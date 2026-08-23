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
 * See docs/design/architecture-rules.md.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { makeClock, STEP_SECONDS } from "../src/core/clock.ts";
import { makeRng } from "../src/core/rng.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

function runFor(steps: number): { fingerprint: string; height: number } {
  const world = createWorld();
  for (let i = 0; i < steps; i++) world.step();
  const fingerprint = world.fingerprint();
  const height = world.snapshot().bodies[0]?.position[1] ?? Number.NaN;
  world.free();
  return { fingerprint, height };
}

describe("the sim runs headless", () => {
  it("steps a physics world with no DOM present", () => {
    expect(globalThis.document).toBeUndefined();
    const world = createWorld();
    world.step();
    expect(world.tick).toBe(1);
    world.free();
  });

  it("drops the crate under gravity", () => {
    const start = createWorld().snapshot().bodies[0]?.position[1] ?? 0;
    const after = runFor(60).height;
    expect(after).toBeLessThan(start);
  });
});

describe("the sim is deterministic", () => {
  it("produces an identical fingerprint for an identical run", () => {
    const a = runFor(180);
    const b = runFor(180);
    expect(b.fingerprint).toBe(a.fingerprint);
  });

  it("diverges when the run length differs", () => {
    // Guards against a fingerprint that is accidentally constant, which would
    // make the test above pass while proving nothing.
    expect(runFor(30).fingerprint).not.toBe(runFor(180).fingerprint);
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
    const { steps } = clock.advance(60);
    expect(steps).toBe(5);
  });
});
