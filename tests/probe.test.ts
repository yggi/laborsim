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

describe("a difference the clock cannot resolve is not printed as one", () => {
  /**
   * The second run of the same phone on the same build. Two rows had read −5 %
   * and +5 % — one clock tick against a 21 ms basis — and gone into a design
   * document as prices. They came back +0 % and −9 %.
   */
  const noisy = [
    pass("full", 8.34, 22),
    pass("half", 8.34, 12), // 10 ticks: a reading
    pass("parked", 8.34, 21), // 1 tick: not
    pass("chase", 8.34, 23), // 1 tick: not
    pass("graded", 8.34, 17), // 5 ticks: a reading
    pass("again", 8.34, 22),
  ];

  const rowFor = (text: string, what: string): string =>
    text.split("\n").find((l) => l.includes(what)) ?? "";

  it("prints a real difference and withholds a one-tick one", () => {
    const text = report(noisy, 120);
    expect(rowFor(text, "half the pixels")).toContain("-45 %");
    expect(rowFor(text, "22 props, not 130")).toContain("-23 %");
    expect(rowFor(text, "nothing moving")).toContain("· · ·");
    expect(rowFor(text, "outside the machine")).toContain("· · ·");
  });

  it("says where the floor is, in the units of the basis it used", () => {
    // 1 ms clock, two ticks, 22 ms basis → ±9 %.
    expect(report(noisy, 120)).toContain("floor at ±9 %");
  });

  it("refuses the fill verdict too when the pixels are inside the floor", () => {
    const flatPixels = [pass("full", 8.34, 22), pass("half", 8.34, 21)];
    expect(report(flatPixels, 120)).toContain("inside the floor");
  });
});

describe("the repeat pass is the control, and it sets the floor", () => {
  /**
   * The same phone on Chrome: a 0.1 ms clock, so quantization explains almost
   * nothing, and a GPU-owed basis of 4.7 ms. On that clock alone the floor is
   * ±4 %, and the table claimed that parking the machine (+9 %) and *removing*
   * 108 props (+4 %) both made the frame slower. Neither is a thing that can
   * happen — but `FULL SITE 2`, which is the identical work run a minute later,
   * came back +6 %. That is the size of "nothing" on this device today.
   */
  const chrome = [
    pass("full", 16.7, 4.7),
    pass("half", 16.7, 3.4), // −1.3 ms: four times the drift, a reading
    pass("parked", 16.7, 5.1), // +0.4 ms: inside it
    pass("chase", 16.7, 5.4), // +0.7 ms: outside it, and `cpu` agrees
    pass("graded", 16.7, 4.9), // +0.2 ms: inside it
    pass("again", 16.7, 5.0), // +0.3 ms of drift — the control
  ];

  const fine = (passes: readonly PassReport[]): string =>
    formatReport(
      { startup: [], passes, gpu: "a gpu" },
      payload,
      { ...device(60), timer: 0.1 },
      "when",
      "where",
    );

  const row = (text: string, what: string): string =>
    text.split("\n").find((l) => l.includes(what)) ?? "";

  it("withholds what is smaller than the drift, and keeps what is not", () => {
    const text = fine(chrome);
    expect(row(text, "nothing moving")).toContain("· · ·");
    expect(row(text, "22 props, not 130")).toContain("· · ·");
    expect(row(text, "half the pixels")).toContain("-28 %");
    expect(row(text, "outside the machine")).toContain("+15 %");
  });

  it("never withholds the control itself — it is the number that decides", () => {
    // |drift| is by construction below 2 × |drift|, so the floor would suppress
    // exactly the row a reader needs in order to trust the other four.
    expect(row(fine(chrome), "a minute later")).toContain("+6 %");
  });

  it("says the repeat pass set the floor, not the clock", () => {
    const text = fine(chrome);
    expect(text).toContain("the repeat pass puts the floor");
    expect(text).not.toContain("the clock puts the floor");
  });

  it("falls back to the clock when the device does not drift", () => {
    const steady = chrome.map((p) =>
      p.pass.id === "again" ? pass("again", 16.7, 4.7) : p,
    );
    expect(fine(steady)).toContain("the clock puts the floor");
  });
});

describe("the frame basis is quantized by vsync, not by the clock", () => {
  /**
   * A device that is genuinely dropping frames, on a fine clock. Frame time is
   * still vsync-locked, so 183.4 ms and 200 ms are eleven and twelve periods of
   * a 60 Hz panel — one period apart, which is one quantum, which is nothing.
   * The same phone read a one-period gap as "+9 %" on one run and "+0 %" on the
   * next, which is the evidence that one period is not a reading.
   */
  const struggling = [
    pass("full", 183.4, 159), // eleven periods of a 60 Hz panel
    pass("half", 66.7, 59.7), // four: seven periods below, a reading
    pass("parked", 183.4, 178),
    pass("chase", 200.0, 187), // twelve: one period above, and not a reading
    pass("graded", 133.3, 145), // eight: three periods below, a reading
    pass("again", 183.4, 158),
  ];

  const fineClock = (passes: readonly PassReport[]): string =>
    formatReport(
      { startup: [], passes, gpu: "a gpu" },
      payload,
      { ...device(60), timer: 0.005 },
      "when",
      "where",
    );

  it("withholds a one-frame difference even when the clock is fine", () => {
    const text = fineClock(struggling);
    const row = (what: string) => text.split("\n").find((l) => l.includes(what)) ?? "";
    // A 0.005 ms clock would put the floor at 0.01 ms and call all three of
    // these findings. The panel's 16.7 ms period is the real step.
    expect(row("outside the machine")).toContain("· · ·");
    expect(row("half the pixels")).toContain("-64 %");
    expect(row("22 props, not 130")).toContain("-27 %");
  });

  it("states the floor in periods rather than in clock ticks", () => {
    // 2 × 16.67 ms against a 183 ms basis → ±18 %.
    expect(fineClock(struggling)).toContain("floor at ±18 %");
  });
});

describe("the report carries what its own numbers mean", () => {
  it("warns when the clock is too coarse for the digits it is printing", () => {
    // Firefox quantizes `performance.now()` to 1 ms. A column of integers that
    // nobody explained is read as a precise number rather than a rounded one.
    expect(report([pass("full", 8.34, 21)], 120)).toContain("quantized to it");
  });
});
