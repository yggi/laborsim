/**
 * The damage model. Two halves, tested separately:
 *
 *   - the ledger's arithmetic, which is where double-billing and silent
 *     re-pricing would hide;
 *   - and an actual machine actually driving into an actual cone, because a
 *     damage model that only passes unit tests has not been shown to fire.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { ACTIVE, NOMINAL, type Stage } from "../src/control/bus.ts";
import { CLEARANCE, MAX_TRACK_SPEED, TRACK } from "../src/core/spec.ts";
import {
  createLedger,
  impactFloor,
  impactOf,
  kineticEnergy,
} from "../src/sim/damage.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { isBreakable, PROP_SPEC, type Prop } from "../src/world/props.ts";
import { makeRampTerrain } from "../src/world/terrain.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

const prop = (kind: Prop["kind"]): Prop => ({
  kind,
  x: 0,
  y: 0,
  z: 0,
  yawY: 0,
  yawW: 1,
  scale: 1,
});

const stage = (label: string, enabled: boolean, idle = false): Stage => ({
  id: label,
  label,
  maker: "KIBA WORKS",
  verb: "SET",
  enabled,
  idle,
  output: { left: 0, right: 0 },
  condition: enabled && !idle ? ACTIVE : NOMINAL,
  safety: false,
});

const blame = (stages: Stage[] = []) => ({ tick: 7, speed: 2.1, stages });

/** A rack entry that just holds both levers open. */
const fullAhead = {
  id: "PILOT",
  label: "PILOT",
  maker: "TEST",
  considers: "the test",
  verb: "SET" as const,
  enabled: true,
  intent: () => ({ left: MAX_TRACK_SPEED, right: MAX_TRACK_SPEED }),
};

describe("energy accounting", () => {
  it("ignores the trickle of settling and gravity", () => {
    // A 42 kg barrier accelerating under gravity for one step at 60 Hz gains
    // well under a joule. Anything that counts as an impact has to clear that.
    const v = 9.81 / 60;
    expect(impactOf(kineticEnergy(42, 0, v, 0), 0, 42)).toBe(0);
  });

  it("scales the floor with mass, because a joule is not a fixed insult", () => {
    // 1.5 J is a hard shove for a cone and jitter for a pipe stack. A flat
    // threshold let a 260 kg stack bill itself for settling.
    expect(impactFloor(6)).toBeLessThan(impactFloor(260));
    expect(impactOf(2, 0, 6)).toBeGreaterThan(0);
    expect(impactOf(2, 0, 260)).toBe(0);
  });

  it("counts a genuine gain", () => {
    expect(impactOf(140, 0, 42)).toBe(140);
  });

  it("does not bill a body that was already moving", () => {
    // The guard that stopped the site from billing itself for its own
    // hillside: energy fed to something already sliding is gravity's, not
    // yours. Reverting it makes a quiet site cost ¥9,540.
    expect(impactOf(500, impactFloor(42) + 1, 42)).toBe(0);
  });

  it("never counts a loss as damage", () => {
    // A prop slowing down is not being hit. Without this, every impact would
    // be billed twice — once on the way up and once on the way down.
    expect(impactOf(20, 140, 42)).toBe(0);
  });
});

describe("the ledger", () => {
  it("says nothing for a nudge", () => {
    // Relative to the spec, not a bare number: toughness moved once already,
    // and a test that hardcodes 4 J silently becomes a test of something else.
    const ledger = createLedger([prop("cone")]);
    const nudge = (PROP_SPEC.cone.toughness ?? 0) * 0.2;
    expect(ledger.absorb(0, nudge, [0, 0, 0], blame())).toBeUndefined();
    expect(ledger.events).toHaveLength(0);
    expect(ledger.total).toBe(0);
  });

  it("bills a damaged asset a fraction, and the write-off the remainder", () => {
    const ledger = createLedger([prop("cone")]);
    const { price = 0, toughness = 0 } = PROP_SPEC.cone;

    const damaged = ledger.absorb(0, toughness * 0.5, [0, 0, 0], blame());
    expect(damaged?.state).toBe("damaged");
    expect(damaged?.yen).toBe(Math.round(price * 0.3));

    const destroyed = ledger.absorb(0, toughness, [0, 0, 0], blame());
    expect(destroyed?.state).toBe("destroyed");
    // The point of the whole billing dance: an asset costs what it is worth,
    // once, however many lines it took to get there.
    expect(ledger.total).toBe(price);
  });

  it("does not bill a wreck again", () => {
    const ledger = createLedger([prop("cone")]);
    ledger.absorb(0, 500, [0, 0, 0], blame());
    ledger.absorb(0, 500, [0, 0, 0], blame());
    expect(ledger.events).toHaveLength(1);
    expect(ledger.total).toBe(PROP_SPEC.cone.price);
  });

  it("never prices landscape", () => {
    const ledger = createLedger([prop("rock")]);
    expect(ledger.absorb(0, 9000, [0, 0, 0], blame())).toBeUndefined();
    expect(ledger.total).toBe(0);
  });

  it("flags harm to a citizen asset categorically, not as a bigger number", () => {
    const site = createLedger([prop("barrier")]);
    site.absorb(0, 9000, [0, 0, 0], blame());
    expect(site.citizenHarm).toBe(false);

    const citizen = createLedger([prop("scooter")]);
    citizen.absorb(0, 9000, [0, 0, 0], blame());
    expect(citizen.citizenHarm).toBe(true);
  });

  it("records what was driving and what was switched off", () => {
    // The attribution half. Without it a line is a score, and this is the
    // exact case that matters: the guard was bypassed when it happened.
    const ledger = createLedger([prop("cone")]);
    const line = ledger.absorb(0, 500, [0, 0, 0], {
      tick: 7,
      speed: 2.1,
      stages: [stage("PILOT", true), stage("NAV-1", false), stage("TILT-GUARD", false)],
    });
    expect(line?.driving).toEqual(["PILOT"]);
    expect(line?.bypassed).toEqual(["NAV-1", "TILT-GUARD"]);
  });

  it("reports integrity so a prop can show its own state", () => {
    const ledger = createLedger([prop("cone")]);
    expect(ledger.integrityOf(0)).toBe(1);
    ledger.absorb(0, (PROP_SPEC.cone.toughness ?? 0) / 2, [0, 0, 0], blame());
    expect(ledger.integrityOf(0)).toBeCloseTo(0.5, 6);
    ledger.absorb(0, 9000, [0, 0, 0], blame());
    expect(ledger.integrityOf(0)).toBe(0);
    // Landscape has no integrity to report, because it has no toughness.
    expect(createLedger([prop("rock")]).integrityOf(0)).toBeUndefined();
  });
});

describe("driving into things", () => {
  it("bills the site when the machine runs something down", () => {
    // A deliberate scenario, on deliberately flat ground: a ramp of zero
    // degrees. Picking a prop out of the generated site instead put the
    // machine on a 40-degree hillside where it could not move at all, which
    // failed for a reason that had nothing to do with damage.
    const world = createWorld({
      terrain: makeRampTerrain(0),
      // The rack drives, not the test. `world.step()` runs the rack and calls
      // `drive` itself, so a `drive` call from outside is overwritten by the
      // empty rack's HALT on the very same step — which is how the first
      // version of this test came to pass without ever hitting anything.
      modules: [fullAhead],
    });
    const index = world.props.findIndex((p) => isBreakable(p.kind));
    const target = world.props[index];
    expect(target).toBeDefined();
    if (!target) return;

    // Six metres short of it, pointing at it. Driving there from the pad would
    // take a minute of sim time and prove nothing extra.
    const range = Math.hypot(target.x, target.z);
    const ux = target.x / range;
    const uz = target.z / range;
    const startX = target.x - ux * 6;
    const startZ = target.z - uz * 6;
    // Yaw that points +Z at the target, as a half-angle quaternion.
    const bearing = Math.atan2(ux, uz);
    world.machine.body.setTranslation(
      { x: startX, y: TRACK.height + CLEARANCE + 0.05, z: startZ },
      true,
    );
    world.machine.body.setRotation(
      { x: 0, y: Math.sin(bearing / 2), z: 0, w: Math.cos(bearing / 2) },
      true,
    );

    for (let i = 0; i < 600; i++) world.step();

    expect(world.ledger.events.length).toBeGreaterThan(0);
    expect(world.ledger.total).toBeGreaterThan(0);
    const line = world.ledger.events[0];
    expect(line?.energy).toBeGreaterThan(0);
    expect(line?.speed).toBeGreaterThan(0.5);
    expect(line?.category).not.toBe("landscape");
    world.free();
  }, 30_000);

  it("bills nothing at all on a site nobody has touched", () => {
    // The bug this pins: dynamic furniture settling onto triangulated ground
    // billed itself for ¥9,540 before the machine had moved a metre.
    const world = createWorld();
    for (let i = 0; i < 900; i++) world.step();
    expect(world.ledger.events).toHaveLength(0);
    expect(world.ledger.total).toBe(0);
    world.free();
  }, 30_000);
});
