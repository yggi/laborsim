/**
 * NAV-1 is the canonical predictable-failure module, so what it *ignores*
 * matters as much as what it does. These tests pin both.
 */

import { beforeAll, describe, expect, it } from "vitest";
import type { Module } from "../src/control/bus.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { createAutonav, type NavPose } from "../src/modules/autonav.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

/** Facing +Z at the origin, which is the machine's rest pose. */
const facingForward: NavPose = { x: 0, z: 0, rotation: { x: 0, y: 0, z: 0, w: 1 } };

describe("NAV-1 steers toward the pin", () => {
  it("drives both tracks forward when the pin is straight ahead", () => {
    const nav = createAutonav([{ x: 0, z: 50 }], () => facingForward, {
      enabled: true,
    });
    const out = nav.intent();
    expect(out).not.toBeNull();
    expect(out?.left).toBeGreaterThan(0);
    expect(out?.right).toBeGreaterThan(0);
    expect(out?.left).toBeCloseTo(out?.right ?? 0, 5);
  });

  // The machine's right is −X (core/spec.ts). Turning right means the left
  // track outruns the right. A mirrored control shipped here once, so the
  // direction is pinned rather than assumed.
  it("turns right for a pin on its right", () => {
    const nav = createAutonav([{ x: -50, z: 0 }], () => facingForward, {
      enabled: true,
    });
    const out = nav.intent();
    expect(out?.left).toBeGreaterThan(out?.right ?? 0);
  });

  it("turns left for a pin on its left", () => {
    const nav = createAutonav([{ x: 50, z: 0 }], () => facingForward, {
      enabled: true,
    });
    const out = nav.intent();
    expect(out?.right).toBeGreaterThan(out?.left ?? 0);
  });

  it("advances to the next pin once it arrives", () => {
    const nav = createAutonav(
      [
        { x: 0, z: 0 },
        { x: 0, z: 60 },
      ],
      () => facingForward,
      { enabled: true },
    );
    expect(nav.target).toBe(0);
    nav.intent();
    // Standing on pin 0, it should already be working on pin 1.
    expect(nav.target).toBe(1);
  });

  it("says nothing at all with no route", () => {
    const nav = createAutonav([], () => facingForward, { enabled: true });
    expect(nav.intent()).toBeNull();
  });

  it("never asks for more than the drivetrain has", () => {
    const nav = createAutonav([{ x: -30, z: 30 }], () => facingForward, {
      enabled: true,
    });
    const out = nav.intent();
    expect(Math.abs(out?.left ?? 0)).toBeLessThanOrEqual(MAX_TRACK_SPEED + 1e-9);
    expect(Math.abs(out?.right ?? 0)).toBeLessThanOrEqual(MAX_TRACK_SPEED + 1e-9);
  });
});

describe("NAV-1 considers nothing else", () => {
  it("asks for the same thing on a wall as on the flat", () => {
    // Identical pose, identical request — the ground it is standing on plays
    // no part. This is the module working correctly, and it is why it will
    // drive into things: the honesty is the design.
    const steep = createAutonav([{ x: 0, z: 50 }], () => facingForward, {
      enabled: true,
    });
    const flat = createAutonav([{ x: 0, z: 50 }], () => facingForward, {
      enabled: true,
    });
    expect(steep.intent()).toEqual(flat.intent());
  });
});

describe("NAV-1 in the rack", () => {
  /**
   * Levers above NAV with verb CAP: the pilot governs the autopilot.
   *
   * The rack array is passed empty and filled afterwards, because NAV has to
   * read the pose of the machine it is driving. `runRack` walks the array every
   * step, so this is also how the app reorders the rail at runtime.
   */
  function governed(leverValue: number) {
    const rack: Module[] = [];
    const world = createWorld({ seed: 4242, modules: rack });
    rack.push({
      id: "PILOT",
      label: "PILOT",
      considers: "the levers",
      verb: "SET",
      enabled: true,
      intent: () => ({ left: leverValue, right: leverValue }),
    });
    rack.push(
      createAutonav(
        world.waypoints,
        () => {
          const t = world.machine.body.translation();
          return { x: t.x, z: t.z, rotation: world.machine.body.rotation() };
        },
        { enabled: true, verb: "CAP" },
      ),
    );
    return world;
  }

  it("drives itself when the levers are wide open", () => {
    const world = governed(MAX_TRACK_SPEED);
    for (let i = 0; i < 30; i++) world.step();
    const start = world.snapshot();
    for (let i = 0; i < 420; i++) world.step();
    const end = world.snapshot();
    const moved = Math.hypot(
      end.machine.pose.position[0] - start.machine.pose.position[0],
      end.machine.pose.position[2] - start.machine.pose.position[2],
    );
    world.free();
    expect(moved).toBeGreaterThan(5);
  });

  it("is held still by parked levers — CAP is a dead-man's throttle", () => {
    const world = governed(0);
    for (let i = 0; i < 30; i++) world.step();
    const start = world.snapshot();
    for (let i = 0; i < 300; i++) world.step();
    const end = world.snapshot();
    const moved = Math.hypot(
      end.machine.pose.position[0] - start.machine.pose.position[0],
      end.machine.pose.position[2] - start.machine.pose.position[2],
    );
    world.free();
    expect(moved).toBeLessThan(1);
  });
});
