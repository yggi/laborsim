/**
 * Run the profiling bench headlessly, and print what it measured.
 *
 * The numbers this produces are a **laptop's**, and a laptop is not what L-034
 * asked about — `profile.html` on a phone is. This exists for the other reason:
 * `META.md` says a bench has no assertion to fail, so it fails silently, and a
 * bench that only ever runs on somebody's phone fails silently *in their hand*,
 * a minute and a half into their evening. This drives the same page through the
 * same button and prints the same report, so a bench that has stopped working
 * says so here first.
 *
 *     npm run profile             # against the dev server
 *     npm run profile -- --build  # build first, and report the payload too
 *
 * It is slow — the passes are pinned to sim seconds, and software GL takes
 * longer to render them than a phone does. That is expected and is not a
 * reading; the only numbers worth quoting from this are the draw counts, which
 * are the driver's and not the hardware's.
 */

import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { build, createServer, preview } from "vite";

/** A phone, because that is the only viewport this game is designed for. */
const VIEWPORT = { width: 390, height: 844 };
/** The passes take about a minute on hardware and a good deal longer without. */
const PATIENCE_MS = 8 * 60 * 1000;

/**
 * `--build` builds first and serves the bundle.
 *
 * It is the only way this script can report the **payload** half of the budget
 * at all: a dev server hands out unbundled modules and discovers the rest at
 * run time, so the graph the bench walks is one `.ts` file, and it says so
 * rather than adding up a number that means nothing. Slower, and the only mode
 * in which the first-load figures are real.
 */
const built = process.argv.includes("--build");

let close;
let base;
if (built) {
  await build({ logLevel: "warn" });
  const server = await preview({ preview: { port: 0 }, logLevel: "warn" });
  base = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  close = () => server.close();
} else {
  const server = await createServer({ server: { port: 0 }, logLevel: "warn" });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("no dev server port");
  base = `http://localhost:${address.port}`;
  close = () => server.close();
}
if (!base) throw new Error("no server url");

// See scripts/shots.mjs: Playwright pins a browser by its own build number, so
// an image with Chromium already on disk under another build demands a download
// of what it has. Unset elsewhere, where Playwright's own resolution is right.
const PINNED = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const executablePath = existsSync(PINNED) ? PINNED : undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

const failures = [];
page.on("pageerror", (error) => failures.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") failures.push(message.text());
});

await page.goto(`${base}/profile.html`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "RUN THE PROFILE" }).click();

// The status line is the only thing that knows how far along it is, so it is
// also the progress bar. Printed on change rather than on a timer: a bench that
// has stalled should stop printing, not keep reassuring you.
let said = "";
const started = Date.now();
let report = "";
while (Date.now() - started < PATIENCE_MS) {
  const status = await page.locator(".status").textContent();
  if (status && status !== said) {
    said = status;
    process.stdout.write(`\r${status.padEnd(60)}`);
  }
  if (status?.startsWith("failed:")) break;
  const out = page.locator(".out");
  if (!(await out.isHidden())) {
    report = (await out.textContent()) ?? "";
    break;
  }
  await page.waitForTimeout(250);
}
process.stdout.write("\n\n");

await browser.close();
await close();

// `warn`, like the other two benches: a bench's output *is* its output, and
// the alternative is a lint exemption for the one place it is the whole point.
if (report) console.warn(report);
else console.error(`no report after ${Math.round((Date.now() - started) / 1000)}s`);

if (failures.length > 0) {
  console.error(`\n${failures.length} page error(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
}

// A bench is only a check if it can fail. No report, or a page that threw, is
// the bench being broken rather than the frame being slow.
if (!report || failures.length > 0) process.exitCode = 1;
