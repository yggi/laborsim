/**
 * Cage space: where an arm reaches, and what that refuses.
 *
 * The claim under test is the one the card is about — **a drop is refused by
 * the reach of the arm, not by the edge of the screen** — so the cases that
 * matter are the ones where those two answers differ.
 */

import { describe, expect, it } from "vitest";
import {
  armReach,
  BEAM,
  type Box,
  fitsCage,
  type Glass,
  PILLAR,
  REACH,
} from "../src/cockpit/cage.ts";

/** A phone, which is the viewport the reach was chosen against. */
const GLASS: Glass = { width: 390, height: 844, dash: 108 };

/** A pod of the width the fitted kit actually is, placed by its top-left. */
function pod(left: number, top: number, w = 112, h = 96): Box {
  return { left, top, right: left + w, bottom: top + h };
}

/** Hard against the right-hand pillar, which is where the kit starts. */
const parked = pod(GLASS.width - PILLAR - 112, BEAM + 24);

describe("the arm", () => {
  it("comes off the nearer pillar", () => {
    expect(armReach(pod(30, 200), GLASS).side).toBe("left");
    expect(armReach(pod(240, 200), GLASS).side).toBe("right");
  });

  it("measures how far it is extended, not where the pod is", () => {
    // Clamped left, holding a pod whose far edge is 142 px in from the pillar.
    expect(armReach(pod(PILLAR, 200, 120), GLASS).reach).toBe(120);
    // Clamped right: the reach is to the near edge, so a wider pod on the same
    // arm sits further out — the arm does not have to span the instrument.
    expect(armReach(pod(GLASS.width - PILLAR - 120, 200, 120), GLASS).reach).toBe(120);
  });

  it("holds the default placements with room to spare", () => {
    expect(fitsCage(parked, GLASS)).toBe(true);
    expect(armReach(parked, GLASS).reach).toBeLessThan(REACH);
  });
});

describe("a drop", () => {
  it("is refused in the middle of the glass, where no arm reaches", () => {
    // Dead centre horizontally, nowhere near an edge: every screen-space rule
    // this replaces would have allowed it.
    const middle = pod((GLASS.width - 112) / 2, 300);
    expect(middle.left).toBeGreaterThan(PILLAR);
    expect(middle.right).toBeLessThan(GLASS.width - PILLAR);
    expect(middle.top).toBeGreaterThan(BEAM);
    expect(middle.bottom).toBeLessThan(GLASS.height - GLASS.dash);
    expect(fitsCage(middle, GLASS)).toBe(false);
    expect(armReach(middle, GLASS).reach).toBeGreaterThan(REACH);
  });

  it("is refused through a pillar, behind the beam, and behind the dash", () => {
    expect(fitsCage(pod(PILLAR - 1, 300), GLASS)).toBe(false);
    expect(fitsCage(pod(GLASS.width - PILLAR - 111, 300), GLASS)).toBe(false);
    expect(fitsCage(pod(30, BEAM - 1), GLASS)).toBe(false);
    expect(fitsCage(pod(30, GLASS.height - GLASS.dash - 95), GLASS)).toBe(false);
  });

  it("is allowed the whole height of the pillar, because the clamp slides", () => {
    expect(fitsCage(pod(PILLAR, BEAM), GLASS)).toBe(true);
    expect(fitsCage(pod(PILLAR, GLASS.height - GLASS.dash - 96), GLASS)).toBe(true);
  });

  it("gets less room, not more, as the dash grows with fitted kit", () => {
    const low = pod(PILLAR, 700);
    expect(fitsCage(low, { ...GLASS, dash: 40 })).toBe(true);
    expect(fitsCage(low, { ...GLASS, dash: 160 })).toBe(false);
  });
});
