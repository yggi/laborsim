/**
 * Render the listening bench to files, and measure what came out.
 *
 * The sibling of `shots.mjs`, and it exists for a harder version of the same
 * reason. A screenshot is hard to assert about; a *sound* cannot be asserted
 * about at all — no test tells you a machine sounds like a machine. So this
 * does the two things that are actually available:
 *
 *   - it writes a WAV per scene, which a person can play and judge; and
 *   - it prints peak, RMS and a brightness proxy, which is enough to check the
 *     claims the voices make — that a labouring machine is *measurably*
 *     brighter than a free-running one at the same track speed, that a pole
 *     tipping over is a fraction of a pipe stack at speed, and that nothing
 *     clips.
 *
 *     npm run listen              # every scene
 *     npm run listen -- labour    # just the ones whose name contains "labour"
 *
 * It boots Vite itself and renders in Chromium, because `OfflineAudioContext`
 * is the only place this code can run. Output is gitignored: renders are
 * evidence, not artifacts.
 */

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const OUT = new URL("../renders/", import.meta.url).pathname;
const filter = process.argv[2] ?? "";

const server = await createServer({ server: { port: 0 }, logLevel: "warn" });
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === "string") throw new Error("no dev server port");
const base = `http://localhost:${address.port}`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Same version-pin sidestep as `shots.mjs`: an image with Chromium already on
// disk under a different build makes Playwright demand a download of it.
const PINNED = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const executablePath = existsSync(PINNED) ? PINNED : undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();

const failures = [];
page.on("pageerror", (error) => failures.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") failures.push(message.text());
});

await page.goto(`${base}/listen.html`, { waitUntil: "networkidle" });

const names = await page.evaluate(() => window.sceneNames());
const rows = [];

for (const name of names) {
  if (filter && !name.includes(filter)) continue;
  const rendered = await page.evaluate((n) => window.renderNamed(n), name);
  if (!rendered) {
    failures.push(`scene "${name}" did not render`);
    continue;
  }
  await writeFile(`${OUT}${name}.wav`, Buffer.from(rendered.wav, "base64"));
  rows.push(rendered);
}

await browser.close();
await server.close();

const pad = (text, width) => String(text).padEnd(width);
const num = (value) => value.toFixed(3).padStart(6);
const pct = (value) => `${(value * 100).toFixed(0).padStart(3)}%`;

// Loudness and brightness at each end of the scene, because a single number
// over a whole scene answers almost nothing about a voice that is supposed to
// change while you listen to it.
console.warn(
  `\n${pad("scene", 25)}${pad("peak", 8)}${pad("rms  (open → close)", 24)}bright (open → close)`,
);
console.warn("-".repeat(78));
for (const row of rows) {
  console.warn(
    `${pad(row.name, 25)}${num(row.peak)}  ` +
      `${num(row.opens.rms)} → ${num(row.closes.rms)}     ` +
      `${pct(row.opens.bright)} → ${pct(row.closes.bright)}`,
  );
}
console.warn(`\n${rows.length} render(s) → renders/`);

// Verify by exit code, not by grepping output (META). Two things fail a run: a
// page error, and a scene that clipped — the limiter exists precisely so that
// summed transients do not, and a peak at 1.0 means it did not hold.
const clipped = rows.filter((row) => row.peak >= 0.999);
for (const row of clipped)
  failures.push(`scene "${row.name}" clipped (peak ${row.peak})`);

if (failures.length > 0) {
  console.error(`\nlistening bench reported ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
