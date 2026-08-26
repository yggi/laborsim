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

/** How much longer a pass took than the baseline, as a signed percentage. */
function delta(pass: PassReport | undefined, base: PassReport | undefined): string {
  if (!pass || !base || base.frame.p50 <= 0) return "—";
  const change = (pass.frame.p50 / base.frame.p50 - 1) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(0)} %`;
}

/**
 * The one interpretation this file is willing to make.
 *
 * It is a rule, not a judgement: a frame that falls away with the pixel count
 * is fill-bound and a frame that does not is bound by something else. Saying it
 * out loud is the difference between a table and an answer, and getting it
 * wrong is visible — the numbers it read are printed directly above it.
 */
function fillVerdict(
  half: PassReport | undefined,
  base: PassReport | undefined,
): string {
  if (!half || !base || base.frame.p50 <= 0) return "";
  const ratio = half.frame.p50 / base.frame.p50;
  if (ratio < 0.72) return "fill-bound — the buffer is the lever";
  if (ratio > 0.9) return "not fill-bound — pixels are not what is costing you";
  return "partly fill-bound — the buffer is one lever of several";
}

export function formatReport(
  profile: Profile,
  payload: Payload,
  device: Device,
  stamp: string,
): string {
  const lines: string[] = [];
  const say = (line = "") => lines.push(line);

  const byId = new Map(profile.passes.map((p) => [p.pass.id, p]));
  const base = byId.get("full");

  say("LABORSIM · MOBILE FRAME PROFILE — L-034");
  say(`${stamp}`);
  say(`${location.href}`);
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

  say("FRAME — ms as p50/p95/worst, over 6 s of sim per pass");
  say("  frame   wall clock between one frame and the next: what is felt");
  say("  sim     the fixed steps a frame owed plus its snapshot, over the");
  say("          frames that owed at least one");
  say("  render  viewport.render(), CPU side — it returns before the GPU is done");
  say("  gpu     what the GPU still owed, timed in a separate second behind a");
  say("          stall the real loop never pays. A size, not a term to add");
  say("  step    fixed steps per frame. 5 is the clock's cap, and means the sim");
  say("          is behind wall time and dropping the backlog");
  say();
  say(
    `  ${pad("pass", 12)}${rpad("fps", 6)}  ${pad("frame", 18)}${pad("sim", 18)}` +
      `${pad("render", 18)}${pad("gpu", 18)}${rpad("step", 5)}${rpad("calls", 7)}` +
      `${rpad("tris", 7)}`,
  );
  for (const report of profile.passes) {
    say(
      `  ${pad(report.pass.name, 12)}${rpad(report.fps.toFixed(1), 6)}  ` +
        `${pad(spread(report.frame), 18)}${pad(spread(report.sim), 18)}` +
        `${pad(spread(report.render), 18)}${pad(spread(report.gpu), 18)}` +
        `${rpad(report.steps.p50.toFixed(0), 5)}${rpad(count(report.calls), 7)}` +
        `${rpad(count(report.triangles), 7)}`,
    );
  }
  say();

  say("WHAT MOVED — frame p50 against FULL SITE");
  const moved: readonly [string, string, string][] = [
    [
      "half the pixels",
      delta(byId.get("half"), base),
      fillVerdict(byId.get("half"), base),
    ],
    ["nothing moving", delta(byId.get("parked"), base), "what the site's motion costs"],
    ["22 props, not 130", delta(byId.get("graded"), base), "what the furniture costs"],
    [
      "outside the machine",
      delta(byId.get("chase"), base),
      "what the chase view costs",
    ],
    [
      "a minute later",
      delta(byId.get("again"), base),
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
      href: location.href,
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
