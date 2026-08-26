/**
 * The reading, as something you can paste into a message.
 *
 * The output is fixed-width plain text and not JSON-first, because the first
 * consumer of a device measurement is a person deciding whether to worry, and
 * the second is a table in `docs/design/code/mobile-budget.md` that somebody
 * types by hand. A machine-readable copy rides along at the end for the day
 * there are six devices' worth and a hand-typed table stops being the answer.
 *
 * Nothing here measures. It formats what `profile.ts`, `payload.ts` and
 * `device.ts` measured — which is the same separation the cockpit keeps, and
 * for the same reason: a formatter that also samples is a formatter you cannot
 * check against a known input.
 */

import type { Device } from "./device.ts";
import type { Payload } from "./payload.ts";
import type { PassReport, Profile, Spread } from "./profile.ts";

const pad = (text: string, width: number): string => text.padEnd(width);
const rpad = (text: string, width: number): string => text.padStart(width);

const ms = (value: number): string =>
  value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2);

const spread = (s: Spread): string => `${ms(s.p50)}/${ms(s.p95)}/${ms(s.max)}`;

const bytes = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)} MB` : `${(n / 1e3).toFixed(0)} kB`;

const count = (n: number): string =>
  n >= 10_000 ? `${(n / 1000).toFixed(0)}k` : n.toFixed(0);

/**
 * Which quantity the pass-to-pass deltas are taken on.
 *
 * **The frame time is the wrong one whenever the frame fits.** A device that
 * renders every pass inside its own refresh period reports the refresh period
 * back, six times, and every delta is 0 % — which reads as *nothing here costs
 * anything* and is the exact opposite of the truth. The first phone this bench
 * ever ran on did that: pinned at 8.34 ms across all six passes, while halving
 * the pixels removed 43 % of what the GPU was being asked for.
 *
 * So: when the frame is pinned, the deltas are taken on GPU-owed time, which
 * nothing clamps. The report says which, every time, rather than quietly
 * switching — a number whose meaning depends on a condition has to carry the
 * condition.
 */
interface Basis {
  readonly pinned: boolean;
  readonly label: string;
  of(report: PassReport): number;
}

function basisFor(base: PassReport | undefined, device: Device): Basis {
  const period = device.refresh > 0 ? 1000 / device.refresh : 0;
  // A tenth of a period of slack: vsync lands a shade late, not a shade early.
  const pinned = !!base && period > 0 && base.frame.p50 <= period * 1.1;
  return pinned
    ? { pinned, label: "gpu-owed p50", of: (r) => r.gpu.p50 }
    : { pinned, label: "frame p50", of: (r) => r.frame.p50 };
}

/** How much more a pass cost than the baseline, as a signed percentage. */
function delta(
  pass: PassReport | undefined,
  base: PassReport | undefined,
  basis: Basis,
): string {
  if (!pass || !base || basis.of(base) <= 0) return "—";
  const change = (basis.of(pass) / basis.of(base) - 1) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(0)} %`;
}

/**
 * The one interpretation this file is willing to make.
 *
 * It is a rule, not a judgement: cost that falls away with the pixel count is
 * fill cost, and cost that does not is something else. Saying it out loud is the
 * difference between a table and an answer, and getting it wrong is visible —
 * the numbers it read are printed directly above it.
 *
 * The wording turns on whether the frame fits, because the *advice* does. "The
 * buffer is the lever" is a thing to say to somebody who is dropping frames. To
 * somebody who is not, the same measurement is a statement about where the
 * headroom went, and telling them to pull a lever they do not need is how a
 * bench talks a project into optimising something nobody is waiting on.
 */
function fillVerdict(
  half: PassReport | undefined,
  base: PassReport | undefined,
  basis: Basis,
): string {
  if (!half || !base || basis.of(base) <= 0) return "";
  const share = Math.round((1 - basis.of(half) / basis.of(base)) * 100);
  if (basis.pinned) {
    return share >= 25
      ? `${share}% of the GPU's work is pixels — headroom, not a problem yet`
      : "pixels are a small part of the work; the scene is, not the buffer";
  }
  if (share >= 28) return "fill-bound — the buffer is the lever";
  if (share <= 10) return "not fill-bound — pixels are not what is costing you";
  return "partly fill-bound — the buffer is one lever of several";
}

export function formatReport(
  profile: Profile,
  payload: Payload,
  device: Device,
  stamp: string,
  /**
   * Where it was run. Passed in rather than read off `location`, which is what
   * lets this file be handed a known input and checked — the claim its own
   * header makes, and one it did not keep until the pinned-frame branch below
   * shipped wrong and nothing could have caught it.
   */
  href: string,
): string {
  const lines: string[] = [];
  const say = (line = "") => lines.push(line);

  const byId = new Map(profile.passes.map((p) => [p.pass.id, p]));
  const base = byId.get("full");

  say("LABORSIM · MOBILE FRAME PROFILE — L-034");
  say(`${stamp}`);
  say(href);
  say();

  say("DEVICE");
  say(`  agent    ${device.agent}`);
  say(`  gpu      ${profile.gpu || "not reported"}`);
  say(
    `  glass    ${device.glass[0]} × ${device.glass[1]} css · dpr ` +
      `${device.dpr.toFixed(2)} → ${device.ratio} · buffer ` +
      `${base ? `${base.buffer[0]} × ${base.buffer[1]}` : "—"}`,
  );
  say(
    `  hardware ${device.refresh} Hz measured · ` +
      `${device.cores ?? "?"} cores · ${device.memory ? `${device.memory} GB` : "? GB"}`,
  );
  // Printed next to the numbers it governs. A clock quantized to 1 ms turns
  // every duration below into an integer, and an integer that nobody warned you
  // about is read as a precise number rather than as a rounded one.
  say(
    `  clock    ${device.timer > 0 ? `${device.timer.toFixed(3)} ms resolution` : "unknown"}` +
      `${device.timer >= 0.5 ? " — every duration below is quantized to it" : ""}`,
  );
  say();

  say("FIRST LOAD");
  if (payload.caveat) say(`  payload  ${payload.caveat}`);
  else {
    say(
      `  payload  ${bytes(payload.encoded)} over the wire · ` +
        `${bytes(payload.decoded)} parsed · ${payload.assets.length} files`,
    );
    for (const asset of payload.assets.slice(0, 8)) {
      say(
        `             ${pad(asset.file, 30)} ${rpad(bytes(asset.encoded), 9)} → ` +
          `${bytes(asset.decoded)}`,
      );
    }
  }
  for (const start of profile.startup) {
    const total = start.physics + start.world + start.viewport + start.firstFrame;
    say(
      `  ${pad(start.exercise, 6)} ${rpad(`${start.props} props`, 9)} · ` +
        `wasm ${rpad(ms(start.physics), 7)} · world ${rpad(ms(start.world), 7)} · ` +
        `scene ${rpad(ms(start.viewport), 7)} · first frame ${rpad(ms(start.firstFrame), 7)}` +
        ` · = ${ms(total)} ms`,
    );
  }
  say();

  say("FRAME — 6 s of sim per pass. `frame` is p50/p95/worst; the rest are p50,");
  say("        with their own spreads in the json below.");
  say("  frame   wall clock between one frame and the next: what is felt, and");
  say("          the only column with a tail worth printing");
  say("  cpu     the whole frame's CPU span — steps, snapshot and render submit");
  say("  sim     the steps a frame owed plus its snapshot, over the frames that");
  say("          owed at least one. A 120 Hz panel steps a 60 Hz sim by halves");
  say("  render  viewport.render(), CPU side — it returns before the GPU is done");
  say("  gpu     what the GPU still owed, timed in a separate second behind a");
  say("          stall the real loop never pays. A size to compare, not to add");
  say("  step    fixed steps per frame. 5 is the clock's cap, and means the sim");
  say("          is behind wall time and dropping the backlog");
  say();
  say(
    `  ${pad("pass", 12)}${rpad("fps", 6)}  ${pad("frame", 18)}${rpad("cpu", 7)}` +
      `${rpad("sim", 7)}${rpad("render", 7)}${rpad("gpu", 7)}${rpad("step", 6)}` +
      `${rpad("calls", 7)}${rpad("tris", 7)}`,
  );
  for (const report of profile.passes) {
    say(
      `  ${pad(report.pass.name, 12)}${rpad(report.fps.toFixed(1), 6)}  ` +
        `${pad(spread(report.frame), 18)}${rpad(ms(report.cpu.p50), 7)}` +
        `${rpad(ms(report.sim.p50), 7)}${rpad(ms(report.render.p50), 7)}` +
        `${rpad(ms(report.gpu.p50), 7)}${rpad(report.steps.p50.toFixed(0), 6)}` +
        `${rpad(count(report.calls), 7)}${rpad(count(report.triangles), 7)}`,
    );
  }
  say();

  const basis = basisFor(base, device);
  if (basis.pinned) {
    say(
      `THE FRAME FITS. Every pass came back at the panel's own ${device.refresh} Hz ` +
        `period,\n  so frame time says only "fast enough" and the deltas below are ` +
        `on GPU-owed\n  time instead, which nothing clamps.`,
    );
    say();
  }
  say(`WHAT MOVED — ${basis.label} against FULL SITE`);
  const moved: readonly [string, string, string][] = [
    [
      "half the pixels",
      delta(byId.get("half"), base, basis),
      fillVerdict(byId.get("half"), base, basis),
    ],
    [
      "nothing moving",
      delta(byId.get("parked"), base, basis),
      "what the site's motion costs",
    ],
    [
      "22 props, not 130",
      delta(byId.get("graded"), base, basis),
      "what the furniture costs",
    ],
    [
      "outside the machine",
      delta(byId.get("chase"), base, basis),
      "what the chase view costs",
    ],
    [
      "a minute later",
      delta(byId.get("again"), base, basis),
      "drift: thermal, or the run's own ground",
    ],
  ];
  for (const [what, change, note] of moved) {
    say(`  ${pad(what, 22)}${rpad(change, 7)}   ${note}`);
  }
  say();

  say("THE PASSES");
  for (const report of profile.passes) {
    say(`  ${pad(report.pass.name, 12)} ${report.pass.what}`);
  }
  say();

  say("NOT MEASURED");
  say("  The cab. The cage, the dash, the pods and the levers are DOM over the");
  say("  glass and none of it is on this page — by design one custom-property");
  say("  write per frame plus a 10 Hz reactive pass, which is a claim rather");
  say("  than a reading. `gpu` is measured in a separate second, with a stall");
  say("  the real loop never pays, so it is a size and not a term to add.");
  say();

  say("--- json ---");
  say(
    JSON.stringify({
      stamp,
      href,
      device,
      gpu: profile.gpu,
      payload: {
        encoded: payload.encoded,
        decoded: payload.decoded,
        caveat: payload.caveat,
      },
      startup: profile.startup,
      passes: profile.passes.map((p) => ({
        id: p.pass.id,
        buffer: p.buffer,
        frames: p.frames,
        seconds: p.seconds,
        fps: p.fps,
        frame: p.frame,
        cpu: p.cpu,
        sim: p.sim,
        render: p.render,
        gpu: p.gpu,
        steps: p.steps,
        calls: p.calls,
        triangles: p.triangles,
        programs: p.programs,
      })),
    }),
  );

  return lines.join("\n");
}
