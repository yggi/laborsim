/**
 * Screenshot the cab, at attitudes the sim will not hold still for.
 *
 * `npm run shots` benches the cockpit's *DOM*; nothing benched the view through
 * the glass, and that is the half where META's lesson was earned twice — a cab
 * that rendered as a solid black wall, and then as a cyan one, both with a green
 * build. The thing that makes the 3D view hard to look at is not the renderer,
 * it is that the interesting frames are transient: a hull at 25° of roll is one
 * you have to drive into and cannot hold.
 *
 * So this drives nothing. It builds the real world and the real viewport, then
 * hands the renderer a snapshot with the pose set by hand — the same trick the
 * cockpit bench plays with hand-built snapshots, one layer further down.
 *
 *     npm run cab            # every pose
 *     npm run cab -- roll    # just the ones whose name contains "roll"
 *
 * Writes to shots/cab/, which is gitignored: evidence, not artifacts.
 */

import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

/** A phone, because that is the only viewport this game is designed for. */
const VIEWPORT = { width: 390, height: 844 };
const OUT = new URL("../shots/cab/", import.meta.url).pathname;

/**
 * `[name, roll, pitch, pan, tilt]`, radians. Roll and pitch are the hull's;
 * pan and tilt are the operator's head. 0.44 rad is 25° — TILT-GUARD's roll
 * limit, so it is the steepest lean the machine is normally allowed to reach.
 */
const POSES = [
  ["level", 0, 0, 0, 0],
  ["roll-right-25", 0.44, 0, 0, 0],
  ["roll-left-25", -0.44, 0, 0, 0],
  ["nose-up-20", 0, 0.35, 0, 0],
  ["nose-down-20", 0, -0.35, 0, 0],
  ["roll-and-pitch", 0.35, 0.25, 0, 0],
  ["roll-and-look-right", 0.35, 0, 1.2, 0],
];

const filter = process.argv[2] ?? "";

const server = await createServer({ server: { port: 0 }, logLevel: "warn" });
await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === "string") throw new Error("no dev server port");
const base = `http://localhost:${address.port}`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

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
  // three.js deprecation chatter is not this bench's business.
  if (message.type() === "error") failures.push(message.text());
});

// Any page on the origin would do — this needs a module graph, not a document.
// sandbox.html is the cheapest one that is not the app booting itself.
await page.goto(`${base}/sandbox.html`, { waitUntil: "networkidle" });

await page.evaluate(async () => {
  const { initPhysics, createWorld } = await import("/src/sim/world.ts");
  const { createViewport } = await import("/src/render/scene.ts");
  await initPhysics();
  // An empty rack: nothing drives, and the machine is placed, not simulated.
  const world = createWorld({ modules: [] });

  document.body.replaceChildren();
  document.body.style.margin = "0";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh";
  document.body.append(canvas);

  const viewport = createViewport(canvas, world.terrain, world.props, world.waypoints);
  viewport.resize(innerWidth, innerHeight);
  const snapshot = world.snapshot();

  window.__cab = (roll, pitch, pan, tilt) => {
    // Roll about body forward (+Z), then pitch about body right (−X) — the two
    // hull rotations the cab has to answer for, composed by hand because there
    // is no three.js in this scope and a quaternion product is four lines.
    const [hr, hp] = [roll / 2, pitch / 2];
    const a = [0, 0, Math.sin(hr), Math.cos(hr)];
    const b = [-Math.sin(hp), 0, 0, Math.cos(hp)];
    const rotation = [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ];
    // `look` is relative and self-centring, so the head is re-aimed from zero
    // every time: set the mode (which zeroes it), then push the whole angle in
    // one gesture, in the pixel units the drag handler speaks.
    viewport.setMode("cab");
    if (pan || tilt) viewport.look(-pan / 0.005, -tilt / 0.004);
    const [x, y, z] = snapshot.machine.pose.position;
    viewport.render({
      ...snapshot,
      // Lifted clear of the ground: the hull is being posed, not dropped, and
      // a 25° lean about a resting pose buries the eye in the heightfield.
      machine: { ...snapshot.machine, pose: { position: [x, y + 1.2, z], rotation } },
    });
  };
});

let written = 0;
for (const [name, ...pose] of POSES) {
  if (filter && !name.includes(filter)) continue;
  await page.evaluate((p) => window.__cab(...p), pose);
  await page.screenshot({ path: `${OUT}${name}.png` });
  written++;
}

await browser.close();
await server.close();

// Verify by exit code, not by grepping output (META).
if (failures.length > 0) {
  console.error(`cab bench reported ${failures.length} error(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.warn(`${written} shot(s) → shots/cab/`);
