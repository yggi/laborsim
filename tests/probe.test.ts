/**
 * The profiling bench's one piece of reasoning, checked against known input.
 *
 * Everything else in `src/probe/` measures, and a measurement cannot be
 * asserted about in Node — which is exactly why the bench needed a headless
 * runner (`npm run profile`) rather than a test. `report.ts` is the exception:
 * it decides *which quantity the deltas mean*, and it decides it from a
 * condition that only some devices meet.
 *
 * That condition is why this file exists. The first version of the report took
 * every delta on frame time, and the first phone it ever ran on rendered every
 * pass inside its own 120 Hz refresh period — so all six passes reported the
 * same 8.34 ms, every delta read 0 %, and the fill verdict said *pixels are not
 * what is costing you* about a scene where halving the buffer removed 43 % of
 * the GPU's work. Nothing could have caught that: the branch it got wrong is one
 * a laptop never takes.
 */

import { describe, expect, it } from "vitest";
import type { Device } from "../src/probe/device.ts";
import type { Payload } from "../src/probe/payload.ts";
import type { PassReport, Spread } from "../src/probe/profile.ts";
import { PASSES } from "../src/probe/profile.ts";
import { formatReport } from "../src/probe/report.ts";

const flat = (value: number): Spread => ({ p50: value, p95: value, max: value });

/** One pass's report, with only the fields a given assertion is about set. */
function pass(id: string, frame: number, gpu: number): PassReport {
  const spec = PASSES.find((p) => p.id === id);
  if (!spec) throw new Error(`no such pass: ${id}`);
  return {
    pass: spec,
    buffer: [972, 1866],
    frames: 660,
    seconds: 6,
    fps: 1000 / frame,
    frame: flat(frame),
    cpu: flat(4),
    sim: flat(1),
    render: flat(3),
    gpu: flat(gpu),
    steps: flat(1),
    calls: 225,
    triangles: 37_472,
    programs: 6,
  };
}

const device = (refresh: number): Device => ({
  agent: "a phone",
  cores: 8,
  memory: undefined,
  glass: [486, 933],
  dpr: 2.22,
  ratio: 2,
  refresh,
  timer: 1,
});

const payload: Payload = { assets: [], encoded: 0, decoded: 0, caveat: "not measured" };

const report = (passes: readonly PassReport[], refresh: number): string =>
  formatReport(
    { startup: [], passes, gpu: "a gpu" },
    payload,
    device(refresh),
    "when",
    "where",
  );

describe("the deltas are taken on something the panel does not clamp", () => {
  /**
   * The device that earned this file: a 120 Hz phone whose frame time is the
   * refresh period in every pass, and whose GPU-owed time is not.
   */
  const pinned = [
    pass("full", 8.34, 21),
    pass("half", 8.34, 12),
    pass("parked", 8.34, 20),
    pass("chase", 8.34, 22),
    pass("graded", 8.34, 18),
    pass("again", 8.34, 21),
  ];

  it("says so when every pass fits inside the refresh period", () => {
    const text = report(pinned, 120);
    expect(text).toContain("THE FRAME FITS");
    expect(text).toContain("WHAT MOVED — gpu-owed p50");
  });

  it("reports what the pixels cost rather than 0 %", () => {
    const line = report(pinned, 120)
      .split("\n")
      .find((l) => l.includes("half the pixels"));
    // The bug: frame p50 is identical across passes, so a delta taken on it is
    // 0 % — and 0 % on this row is a scene where the buffer is free.
    expect(line).not.toContain("0 %");
    expect(line).toContain("-43 %");
    expect(line).toContain("43% of the GPU's work is pixels");
  });

  it("does not reach the wrong verdict, or give advice nobody needs", () => {
    const text = report(pinned, 120);
    // Both halves fail with the bug put back, which is the only reason to
    // write them: "not fill-bound" is what a clamped frame produces, and "the
    // buffer is the lever" is advice for somebody who is dropping frames.
    expect(text).not.toContain("not fill-bound");
    expect(text).not.toContain("the buffer is the lever");
  });
});

describe("a device that is actually dropping frames is read off the frame", () => {
  const struggling = [
    pass("full", 183, 159),
    pass("half", 66.7, 59.7),
    pass("parked", 183, 178),
    pass("chase", 200, 187),
    pass("graded", 150, 145),
    pass("again", 183, 158),
  ];

  it("takes the deltas on frame time, and gives the advice", () => {
    const text = report(struggling, 60);
    expect(text).not.toContain("THE FRAME FITS");
    expect(text).toContain("WHAT MOVED — frame p50");
    expect(text).toContain("fill-bound — the buffer is the lever");
  });
});

describe("the report carries what its own numbers mean", () => {
  it("warns when the clock is too coarse for the digits it is printing", () => {
    // Firefox quantizes `performance.now()` to 1 ms. A column of integers that
    // nobody explained is read as a precise number rather than a rounded one.
    expect(report([pass("full", 8.34, 21)], 120)).toContain("quantized to it");
  });
});
