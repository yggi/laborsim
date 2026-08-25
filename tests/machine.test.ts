/**
 * Rung 1 behaviour. "Drivable on a phone" is not testable in CI, so these
 * stand in for it: a scripted input trace, run headless, asserting the
 * behaviours the design actually depends on.
 *
 * Note what is *not* asserted — nothing here checks that it feels good. These
 * catch a physics change that breaks the machine, not one that makes it dull.
 */

import { beforeAll, describe, expect, it } from "vitest";
// The dash's own threshold, not a second copy of it: the claim under test is
// about where the sim sits relative to what the panel calls slipping.
import { SLIPPING } from "../src/cockpit/annunciator.ts";
import type { Module, TrackCommand, Verb } from "../src/control/bus.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { createWorld, initPhysics } from "../src/sim/world.ts";
import { makeRampTerrain, makeRutTerrain } from "../src/world/terrain.ts";

beforeAll(async () => {
  await initPhysics();
}, 30_000);

/** A module that holds one command forever, standing in for held levers. */
function fixedLevers(left: number, right: number, verb: Verb = "SET"): Module {
  const command: TrackCommand = { left, right };
  return {
    id: "PILOT",
    label: "PILOT",
    maker: "TEST",
    considers: "the levers, and nothing else",
    verb,
    enabled: true,
    intent: () => command,
  };
}

function drive(left: number, right: number, steps: number, seed = 20260823) {
  const world = createWorld({ seed, modules: [fixedLevers(left, right)] });
  // Let it settle onto the ground before commanding anything.
  for (let i = 0; i < 30; i++) world.step();
  const start = world.snapshot();
  for (let i = 0; i < steps; i++) world.step();
  const end = world.snapshot();
  world.free();
  return { start, end };
}

const distance = (a: Snapshotish, b: Snapshotish) => {
  const dx = b.machine.pose.position[0] - a.machine.pose.position[0];
  const dz = b.machine.pose.position[2] - a.machine.pose.position[2];
  return Math.sqrt(dx * dx + dz * dz);
};
type Snapshotish = ReturnType<ReturnType<typeof createWorld>["snapshot"]>;

describe("the machine sits on the ground", () => {
  it("settles instead of falling through or launching", () => {
    const { end } = drive(0, 0, 120);
    expect(end.machine.pose.position[1]).toBeGreaterThan(-1);
    expect(end.machine.pose.position[1]).toBeLessThan(3);
    expect(end.machine.speed).toBeLessThan(0.2);
  });

  it("has both tracks in contact on the graded pad", () => {
    const { end } = drive(0, 0, 120);
    expect(end.machine.left.contacts).toBeGreaterThan(3);
    expect(end.machine.right.contacts).toBeGreaterThan(3);
  });
});

describe("the running gear is sprung, one bogie per contact point", () => {
  it("settles at the ride height its sag was specified for", () => {
    // The body's origin is the bottom of the tracks, so a machine at rest has
    // it at ground level — the springs are specified by the sag that puts it
    // there. This is why nothing in `render/` had to move: the belt is drawn
    // where it has always been drawn, and now something holds it there.
    const world = createWorld({ terrain: makeRampTerrain(0) });
    for (let i = 0; i < 120; i++) world.step();
    const m = world.snapshot().machine;
    world.free();
    expect(m.pose.position[1]).toBeCloseTo(0, 2);
    // 0.45 of the travel is the static sag, by construction (`core/spec.ts`).
    expect(m.left.suspension.compression).toBeCloseTo(0.45, 2);
    expect(m.right.suspension.compression).toBeCloseTo(0.45, 2);
  });

  it("is silent standing still, which is the check on the whole derivation", () => {
    // A damper turns energy into heat only while the wheel is travelling
    // against the frame. Parked, that is *exactly* zero — not nearly zero.
    // It read 122 W here once, permanently, because the compression rate was
    // taken from the hull's velocity and gravity is integrated half a step
    // away from an impulse. Measuring the travel itself fixed both that and a
    // parked machine clocking 3.7 metres a minute onto its own odometer.
    const world = createWorld({ terrain: makeRampTerrain(0) });
    for (let i = 0; i < 300; i++) world.step();
    const snap = world.snapshot();
    world.free();
    expect(snap.machine.left.suspension.damping).toBe(0);
    expect(snap.machine.right.suspension.damping).toBe(0);
    expect(snap.machine.left.suspension.bottomed).toBe(0);
    expect(snap.distance).toBeLessThan(0.01);
  });

  it("knocks on the side that took the rut, and not on the other", () => {
    // The card's whole claim, at the level the sound is a rendering of. One
    // bank, under the left track only: the left side's dampers do the work and
    // the right side's have nothing to do. Nothing else on the machine can
    // say which side something happened on — the accelerometer is one reading
    // for the whole hull, and an impact does not know where it landed.
    const world = createWorld({
      terrain: makeRutTerrain(0.22),
      modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
    });
    let left = 0;
    let right = 0;
    for (let i = 0; i < 15 * 60; i++) {
      world.step();
      const m = world.snapshot().machine;
      left = Math.max(left, m.left.suspension.damping);
      right = Math.max(right, m.right.suspension.damping);
    }
    world.free();
    // Measured: 933 W on the left against 362 W on the right. The right is not
    // *nothing*, and should not be — a bank under one track rolls the machine,
    // and rolling travels the other side's springs too. It is the difference
    // that carries the cue: through the voice's square root that is about six
    // decibels, which is a knock plainly on one side rather than in front of
    // you.
    expect(left).toBeGreaterThan(700);
    expect(left).toBeGreaterThan(right * 2);
  });

  it("takes the ground it drives over, and takes it harder the faster you go", () => {
    // The suspension answers to the ground rather than to the drivetrain: the
    // same rut, crossed at a crawl, is a fraction of the work. Measured over
    // the default site: 735 W at the ninetieth percentile at full ahead and
    // 7 W at a crawl.
    const worked = (speed: number) => {
      const world = createWorld({
        terrain: makeRutTerrain(0.22),
        modules: [fixedLevers(speed, speed)],
      });
      let peak = 0;
      for (let i = 0; i < 25 * 60; i++) {
        world.step();
        const m = world.snapshot().machine;
        peak = Math.max(peak, m.left.suspension.damping);
      }
      world.free();
      return peak;
    };
    expect(worked(MAX_TRACK_SPEED)).toBeGreaterThan(worked(0.35) * 2);
  }, 60_000);

  it("hangs, rather than reading a compressed spring, with no ground under it", () => {
    // A track in the air has no travel and no load, and the pair of readings
    // has to say so together: zero compression is a wheel at full droop, and
    // it is the only honest thing to report when the ray finds nothing.
    const world = createWorld({
      terrain: makeRampTerrain(55, 5),
      modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
    });
    for (let i = 0; i < 20 * 60; i++) world.step();
    const m = world.snapshot().machine;
    world.free();
    for (const side of [m.left, m.right]) {
      if (side.contacts > 0) continue;
      expect(side.suspension.compression).toBe(0);
      expect(side.suspension.damping).toBe(0);
      expect(side.suspension.bottomed).toBe(0);
    }
  }, 60_000);
});

describe("tank steering", () => {
  it("drives forward when both levers match", () => {
    const { start, end } = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    expect(distance(start, end)).toBeGreaterThan(3);
  });

  it("turns on the spot when the levers oppose", () => {
    const { start, end } = drive(MAX_TRACK_SPEED, -MAX_TRACK_SPEED, 180);
    const yawed = Math.abs(
      end.machine.pose.rotation[1] - start.machine.pose.rotation[1],
    );
    expect(yawed).toBeGreaterThan(0.05);
    // A neutral turn goes nowhere much — that is what makes it a neutral turn.
    expect(distance(start, end)).toBeLessThan(3);
  });

  // These pin the *direction*, which the tests above did not, so the machine
  // shipped once with mirrored steering: the left lever drove the right track.
  // Symmetric geometry made it invisible in every screenshot.
  //
  // Forward is +Z, up is +Y, and `forward = up × right`, so right is −X and
  // left is +X. Rotation about +Y by a positive angle carries +Z toward +X,
  // which is the machine's left. So a right turn is a *negative* quaternion y.
  it("turns right when the left track outruns the right", () => {
    const { end } = drive(MAX_TRACK_SPEED, -MAX_TRACK_SPEED, 180);
    expect(end.machine.pose.rotation[1]).toBeLessThan(0);
  });

  it("turns left when the right track outruns the left", () => {
    const { end } = drive(-MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    expect(end.machine.pose.rotation[1]).toBeGreaterThan(0);
  });

  it("curves right when only the left track drives", () => {
    const { end } = drive(MAX_TRACK_SPEED, 0, 180);
    expect(end.machine.pose.rotation[1]).toBeLessThan(0);
  });

  it("drives up +Z, not sideways or backwards, with both levers forward", () => {
    const { start, end } = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    const dz = end.machine.pose.position[2] - start.machine.pose.position[2];
    const dx = end.machine.pose.position[0] - start.machine.pose.position[0];
    expect(dz).toBeGreaterThan(3);
    expect(Math.abs(dx)).toBeLessThan(Math.abs(dz) / 2);
  });

  it("curves when one track outruns the other", () => {
    const straight = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 180);
    const curved = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED * 0.4, 180);
    const yawStraight = Math.abs(straight.end.machine.pose.rotation[1]);
    const yawCurved = Math.abs(curved.end.machine.pose.rotation[1]);
    expect(yawCurved).toBeGreaterThan(yawStraight);
  });
});

describe("slip is real and reported", () => {
  it("is near zero when rolling freely on the flat", () => {
    const { end } = drive(MAX_TRACK_SPEED, MAX_TRACK_SPEED, 240);
    expect(Math.abs(end.machine.left.slip)).toBeLessThan(0.6);
  });

  it("is large when a track is commanded but cannot bite", () => {
    // On the flat with six samples down, the drivetrain's own ramp keeps slip
    // near zero — the machine simply grips. Slip needs ground that cannot hold
    // the command, so this asks for a grade past the friction limit.
    //
    // It used to launch on the flat and pass, but only because construction
    // dropped the machine and it was still bouncing: intermittent contact, not
    // a traction limit. Settling the site at construction exposed that, and the
    // old assertion was testing a spawn artifact.
    const world = createWorld({
      terrain: makeRampTerrain(55, 5),
      modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
    });
    let peak = 0;
    for (let i = 0; i < 600; i++) {
      world.step();
      peak = Math.max(peak, Math.abs(world.snapshot().machine.left.slip));
    }
    world.free();
    expect(peak).toBeGreaterThan(0.5);
  });
});

describe("grades, and where traction runs out", () => {
  /** Drive at the ramp from the flat and report where it got to. */
  function climb(degrees: number, seconds: number) {
    const world = createWorld({
      terrain: makeRampTerrain(degrees, 5),
      modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
    });
    for (let i = 0; i < 60; i++) world.step();
    const start = world.snapshot();
    for (let i = 0; i < seconds * 60; i++) world.step();
    const end = world.snapshot();
    world.free();
    return {
      gained: end.machine.pose.position[1] - start.machine.pose.position[1],
      end,
    };
  }

  // The model's limit is atan(MU) — about 43.5 degrees for MU = 0.95. That is
  // not tuned to feel right, it is what a friction cone does, and these tests
  // pin it so a change to the model has to be deliberate.
  it("climbs a gentle grade without effort", () => {
    const { gained, end } = climb(10, 20);
    expect(gained).toBeGreaterThan(5);
    // A number rather than null: six samples are down, so there is a friction
    // cone for the reading to be a fraction of.
    expect(end.machine.left.traction).not.toBeNull();
    expect(end.machine.left.traction ?? 1).toBeLessThan(0.6);
  });

  it("climbs a hard grade, using nearly all its grip", () => {
    const { gained, end } = climb(40, 20);
    expect(gained).toBeGreaterThan(15);
    expect(end.machine.left.traction ?? 0).toBeGreaterThan(0.8);
  });

  it("runs out of margin before it runs out of grip — why the dash shows both", () => {
    // The load-bearing claim behind putting traction and slip on one head
    // instead of keeping slip alone: as the ground gets harder, the machine is
    // out of *friction* before it is out of *grip*. Delete this property and
    // the panel has no instrument that warns before the failure.
    //
    // Stated as the two thresholds crossing rather than as a fraction of steps
    // at one chosen grade, which is what it used to be — and which was an
    // accident of layout waiting to happen. It duly happened: the springs
    // transfer weight off the front bogies on a climb, so they saturate while
    // the rear ones still have margin and the machine slides at a gentler
    // grade than before. Measured as a fraction of steps, the old assertion
    // read 0.78 at 34°, 0.04 at 35° and 0.77 at 36° — a coin toss on which
    // side of `SLIPPING` the median step fell, testing nothing.
    const at = (degrees: number) => {
      const world = createWorld({
        terrain: makeRampTerrain(degrees, 5),
        modules: [fixedLevers(MAX_TRACK_SPEED, MAX_TRACK_SPEED)],
      });
      for (let i = 0; i < 60; i++) world.step();
      const traction: number[] = [];
      const slip: number[] = [];
      for (let i = 0; i < 15 * 60; i++) {
        world.step();
        const m = world.snapshot().machine;
        traction.push(Math.max(m.left.traction ?? 0, m.right.traction ?? 0));
        slip.push(Math.max(Math.abs(m.left.slip), Math.abs(m.right.slip)));
      }
      world.free();
      const median = (xs: number[]) =>
        xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
      return { traction: median(traction), slip: median(slip) };
    };

    const grades = [20, 26, 30, 34, 38, 42];
    const climbs = grades.map(at);
    const firstOver = (pick: (c: { traction: number; slip: number }) => boolean) =>
      grades[climbs.findIndex(pick)] ?? Number.POSITIVE_INFINITY;

    const outOfMargin = firstOver((c) => c.traction > 0.8);
    const sliding = firstOver((c) => c.slip > SLIPPING);
    // Measured: 34° for the first, 38° for the second. Four degrees of grade
    // in which the machine is telling you it is about to let go, and has not.
    expect(outOfMargin).toBeLessThan(sliding);
  }, 60_000);

  it("cannot climb past the friction limit, and ends up back down", () => {
    const gentle = climb(15, 20).gained;
    const impossible = climb(55, 20).gained;
    expect(impossible).toBeLessThan(gentle);
  });

  it("reports full slip when the tracks lose the ground entirely", () => {
    // Beyond the limit the machine rears, tips over backwards and slides down.
    // With no sample touching, the tracks are turning against nothing at all.
    const { end } = climb(55, 20);
    if (end.machine.left.contacts === 0) {
      expect(Math.abs(end.machine.left.slip)).toBeCloseTo(MAX_TRACK_SPEED, 1);
    }
  });

  it("reports no traction at all — not zero — for a track with no ground", () => {
    // Zero and null are opposite machines: a parked one using none of its grip,
    // and one in the air with no grip to use. They read the same on a dial that
    // takes a number for both, which is what the old GRIP dial did.
    const { end } = climb(55, 20);
    for (const track of [end.machine.left, end.machine.right]) {
      if (track.contacts === 0) expect(track.traction).toBeNull();
      else expect(typeof track.traction).toBe("number");
    }
  });

  it("still reports a number for a track that is merely idle", () => {
    const { end } = drive(0, 0, 120);
    expect(end.machine.left.contacts).toBeGreaterThan(0);
    expect(end.machine.left.traction).not.toBeNull();
    expect(end.machine.left.traction ?? 1).toBeLessThan(0.1);
  });
});

describe("the rack is a pipeline", () => {
  it("halts with an empty rack rather than doing something undefined", () => {
    const world = createWorld({ modules: [] });
    for (let i = 0; i < 90; i++) world.step();
    const snap = world.snapshot();
    world.free();
    expect(snap.stages).toEqual([]);
    expect(snap.machine.left.commanded).toBe(0);
  });

  it("reports every stage, so no module can drop out silently", () => {
    const world = createWorld({
      modules: [
        fixedLevers(1, 1),
        { ...fixedLevers(0, 0), enabled: false, id: "OFF", label: "OFF" },
      ],
    });
    world.step();
    const snap = world.snapshot();
    world.free();
    expect(snap.stages.map((s) => s.label)).toEqual(["PILOT", "OFF"]);
    // A disabled module is a pass-through, not a hole: the signal survives it.
    expect(snap.stages[1]?.output.left).toBe(1);
    expect(snap.stages[1]?.enabled).toBe(false);
  });
});

describe("verbs", () => {
  /** Run one step and read the command that reached the terminal. */
  function terminal(modules: Module[]): TrackCommand {
    const world = createWorld({ modules });
    world.step();
    const last = world.snapshot().stages.at(-1);
    world.free();
    return last?.output ?? { left: 0, right: 0 };
  }

  it("SET ignores what arrived — this is plain suppression", () => {
    const out = terminal([fixedLevers(2, 2), fixedLevers(-1, -1, "SET")]);
    expect(out).toEqual({ left: -1, right: -1 });
  });

  it("CAP holds the downstream module under what arrived", () => {
    const out = terminal([fixedLevers(0.5, 0.5), fixedLevers(2, 2, "CAP")]);
    expect(out).toEqual({ left: 0.5, right: 0.5 });
  });

  it("CAP at zero is a dead-man's throttle", () => {
    // Levers parked above a CAP module stop the machine whatever is driving.
    const out = terminal([fixedLevers(0, 0), fixedLevers(2, 2, "CAP")]);
    expect(out).toEqual({ left: 0, right: 0 });
  });

  it("CAP keeps the downstream module's own sign", () => {
    const out = terminal([fixedLevers(1, 1), fixedLevers(-2, -2, "CAP")]);
    expect(out).toEqual({ left: -1, right: -1 });
  });

  it("ADD trims what arrived", () => {
    const out = terminal([fixedLevers(1, 1), fixedLevers(0.5, -0.5, "ADD")]);
    expect(out).toEqual({ left: 1.5, right: 0.5 });
  });

  it("AMP reads its intent as a gain", () => {
    const out = terminal([fixedLevers(2, 2), fixedLevers(0.25, 0.5, "AMP")]);
    expect(out).toEqual({ left: 0.5, right: 1 });
  });

  it("order is the machine: the same pair, swapped, behaves differently", () => {
    const governed = terminal([fixedLevers(0.5, 0.5), fixedLevers(2, 2, "CAP")]);
    const trimmed = terminal([fixedLevers(2, 2, "SET"), fixedLevers(0.5, 0.5, "ADD")]);
    expect(governed).not.toEqual(trimmed);
  });
});

describe("determinism holds with the machine driving", () => {
  it("gives an identical fingerprint for an identical trace", () => {
    const run = () => {
      const world = createWorld({ modules: [fixedLevers(MAX_TRACK_SPEED, 0.3)] });
      for (let i = 0; i < 240; i++) world.step();
      const fp = world.fingerprint();
      world.free();
      return fp;
    };
    expect(run()).toBe(run());
  });
});
