/**
 * Screenshot the cockpit sandbox.
 *
 * `META.md` says it twice — *screenshots catch what CI cannot* and *ask the
 * browser what it computed, do not re-read the CSS* — and both lessons were
 * paid for. A faceplate collapsed to 7px with lint, types and 71 tests green; a
 * cab rendered as a solid black wall with a green build. Neither is expressible
 * as an assertion.
 *
 * That matters more, not less, when a manufacturer's house style is authored by
 * someone who cannot see the result. This script is the loop that closes it:
 *
 *     npm run shots            # every specimen, 390x844
 *     npm run shots -- nominal # just the ones whose name contains "nominal"
 *
 * It boots Vite itself, so there is nothing to remember to start, and it writes
 * to a gitignored directory because screenshots are evidence, not artifacts.
 */

import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

/** A real mid-range phone, which is the platform this game is aimed at. */
const VIEWPORT = { width: 390, height: 844 };
const OUT = new URL("../shots/", import.meta.url).pathname;

const filter = process.argv[2] ?? "";

const server = await createServer({ server: { port: 0 }, logLevel: "warn" });
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === "string") throw new Error("no dev server port");
const base = `http://localhost:${address.port}`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

/**
 * Playwright resolves a browser by *its own* build number, so an environment
 * with Chromium preinstalled under a different build makes it demand a download
 * of something already on disk. `CHROMIUM_PATH`, or the stable symlink that
 * such images provide, sidesteps the version pin entirely. Unset everywhere
 * else, in which case Playwright's own resolution is correct and is used.
 */
const PINNED = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const executablePath = existsSync(PINNED) ? PINNED : undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

const failures = [];
page.on("pageerror", (error) => failures.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") failures.push(message.text());
});

await page.goto(`${base}/sandbox.html`, { waitUntil: "networkidle" });

// The whole bench, so the specimens can be compared against each other. This is
// the shot that answers "do these read as three suppliers in one cab?".
await page.screenshot({ path: `${OUT}bench.png`, fullPage: true });

// Then each dash specimen on its own, cropped to the phone, which is the shot
// that answers "does this survive 390px?".
const specimens = await page.locator("[data-specimen]").all();
let written = 1;
for (const specimen of specimens) {
  const name = (await specimen.getAttribute("data-specimen")) ?? "unnamed";
  if (filter && !name.includes(filter)) continue;
  await specimen.scrollIntoViewIfNeeded();
  await specimen.screenshot({ path: `${OUT}dash-${name.replace(/\s+/g, "-")}.png` });
  written++;
}

await browser.close();
await server.close();

// Verify by exit code, not by grepping output (META). A page error means the
// screenshots are of something broken, and a green run would hide that.
if (failures.length > 0) {
  console.error(`sandbox reported ${failures.length} error(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.warn(`${written} shot(s) → shots/`);
