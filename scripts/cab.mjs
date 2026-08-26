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

  const viewport = createViewport(
    canvas,
    world.terrain,
    world.props,
    world.waypoints,
    world.poses(),
  );
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
    // `look` is relative and the neck is sprung, so the head is re-aimed from
    // zero every time: set the mode (which zeroes it), hold the glass so it
    // cannot spring back mid-pose, then push the whole angle in one gesture, in
    // the pixel units the drag handler speaks.
    viewport.setMode("cab");
    viewport.hold(true);
    if (pan || tilt) viewport.look(-pan / 0.005, tilt / 0.004);
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

/**
 * Then the same view with the cab in front of it — the real app, driven by
 * dragging on the glass exactly as a thumb would.
 *
 * The poses above cannot show this half: the cage, the pods, the levers and the
 * dash are DOM, and they only exist once the app has booted. What is being
 * looked at here is whether the cab and the world agree about which way the
 * head is pointing.
 */
const LOOKS = [
  ["app-forward", 0, 0],
  ["app-look-right", -170, 0],
  ["app-look-left", 170, 0],
  ["app-look-up", 0, 120],
  ["app-look-down", 0, -120],
  ["app-look-far-right", -520, 0],
];

/** Every shot the app section can take — the gate has to know about all of
 *  them, or `npm run cab -- app-lever` skips the whole section on its way to
 *  looking for a shot it never reaches. */
const APP_SHOTS = [
  ...LOOKS.map(([name]) => name),
  "app-arm",
  "app-out-of-reach",
  "app-refused",
  "app-nag",
  "app-lever",
  "app-lever-foot",
];

/**
 * Open the app and sit down in it.
 *
 * A session now starts on the schedule, and the schedule is over everything —
 * so every shot in this section is of a cab behind a scrim until somebody
 * presses BEGIN. It is also what starts the clock (`App.svelte` feeds the held
 * frame zero seconds), so a bench that skipped it would be photographing a
 * frozen site and calling it a drive.
 */
async function openCab() {
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  // Rapier initialises before anything is on screen; the canvas is the tell.
  await page.waitForSelector("canvas");
  await page.getByRole("button", { name: "BEGIN EXERCISE" }).click();
  await page.waitForTimeout(1500);
}

if (!filter || APP_SHOTS.some((name) => name.includes(filter))) {
  await openCab();

  for (const [name, dx, dy] of LOOKS) {
    if (filter && !name.includes(filter)) continue;
    // A drag on the glass, in one gesture. The shot is taken *before* the
    // release on purpose: the neck is sprung and starts back the moment the
    // pointer lifts.
    await page.mouse.move(195, 380);
    await page.mouse.down();
    await page.mouse.move(195 + dx, 380 + dy, { steps: 6 });
    await page.screenshot({ path: `${OUT}${name}.png` });
    await page.mouse.up();
    // Let the spring bring the cab home before the next drag. Not politeness:
    // the levers sweep with everything else, so a drag started while the cab is
    // still out can land on a lever that has slid under the pointer — which is
    // the cab being honest, and a bench pulling a lever it did not mean to.
    await page.waitForTimeout(1400);
    written++;
  }

  // One check a screenshot cannot make: that *everything* bolted to the cab
  // moved by the same amount. A new overlay that forgets its `translate` is
  // invisible in a still — it just looks like part of the rig — and it is
  // exactly the regression this half of the bench exists to catch.
  const CAB_PARTS = [".cage", ".deck", ".levers", "[data-draggable]"];
  // Read the boxes and the offset in one go, so no frame lands between them.
  const measure = (selectors) =>
    page.evaluate((list) => {
      const style = getComputedStyle(document.documentElement);
      return {
        look: {
          x: Number.parseFloat(style.getPropertyValue("--cab-look-x")),
          y: Number.parseFloat(style.getPropertyValue("--cab-look-y")),
        },
        parts: list.map((selector) => {
          const r = document.querySelector(selector)?.getBoundingClientRect();
          return { selector, x: r?.left ?? Number.NaN, y: r?.top ?? Number.NaN };
        }),
      };
    }, selectors);

  const rest = await measure(CAB_PARTS);
  await page.mouse.move(195, 380);
  await page.mouse.down();
  await page.mouse.move(75, 330, { steps: 4 });
  const swept = await measure(CAB_PARTS);
  await page.mouse.up();

  // Each part carries its own resting transform — the deck is translated down
  // by a screen minus the dash, the levers sit in the corners — so what has to
  // agree is the *change*, not the position.
  for (const [i, part] of swept.parts.entries()) {
    const was = rest.parts[i];
    const off = Math.hypot(
      part.x - was.x - (swept.look.x - rest.look.x),
      part.y - was.y - (swept.look.y - rest.look.y),
    );
    if (!(off <= 1)) {
      failures.push(
        `${part.selector} did not sweep with the cab: moved by ` +
          `(${(part.x - was.x).toFixed(1)}, ${(part.y - was.y).toFixed(1)}) ` +
          `while the cab moved by (${(swept.look.x - rest.look.x).toFixed(1)}, ` +
          `${(swept.look.y - rest.look.y).toFixed(1)})`,
      );
    }
  }

  // Let the spring pull the view all the way back before the next set. It is
  // asymptotic: a full 86° pan is most of the way back in a second and settled
  // in about three. A screenshot taken too early catches the cab 20-odd px off
  // centre, which looks like a layout bug and is not one.
  await page.waitForTimeout(4000);

  // The arm, and what it refuses. A pod pulled in off its pillar shows the
  // bracket holding it; pulled to the middle of the glass, where no full-size
  // instrument reaches, the drop is refused and it snaps back.
  const grip = page.locator('[aria-label="move NAV-1"]');
  /** Where to drag NAV-1's left edge to, given the box it is in now. */
  const middle = (at) => (VIEWPORT.width - at.width) / 2;
  for (const [name, target, release] of [
    ["app-arm", (at) => at.x - 70, true],
    ["app-out-of-reach", middle, false],
    ["app-refused", middle, true],
  ]) {
    if (filter && !name.includes(filter)) continue;
    // Re-measured every time: a legal drop leaves the pod somewhere new, and
    // pressing where it *used* to be is pressing the glass — which pans the
    // view and quietly turns a placement test into a camera test.
    const at = await grip.boundingBox();
    const dx = target(at) - at.x;
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await page.mouse.down();
    await page.mouse.move(at.x + at.width / 2 + dx, at.y + at.height / 2, { steps: 6 });
    if (release) {
      await page.mouse.up();
      // Long enough for the 0.18 s snap-back to have finished.
      await page.waitForTimeout(320);
    }
    await page.screenshot({ path: `${OUT}${name}.png` });
    if (!release) await page.mouse.up();
    written++;
  }

  // The eyes back on the road, and the chassis maker's opinion about that.
  //
  // On a fresh page on purpose. The nag fires on the *first* long look that
  // comes back to centre and then holds its tongue for 45 s, so a session that
  // has already looked around five times has spent it — which is exactly what
  // happened when this shot came back empty and read as the nag being broken.
  if (!filter || "app-nag".includes(filter) || "app-lever".includes(filter)) {
    await openCab();
    await page.mouse.move(195, 400);
    await page.mouse.down();
    await page.mouse.move(195 - 400, 400, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(5600);
    await page.screenshot({ path: `${OUT}app-nag.png` });
    written++;

    // Both levers, at opposite ends of their throw. One shot answers two
    // questions: the stick is where the throw says it is (the pointer maths
    // reads the same box the shaft is drawn in), and the **foot** has moved as
    // well as the grip — which is what makes it a lever pivoting under the deck
    // rather than a rod going up and down a hole.
    const throwTo = async (label, t) => {
      const b = await page.locator(`[aria-label="${label}"]`).boundingBox();
      // The component's own mapping: 12% margin, 76% of span. t=1 is forward.
      const to = b.y + b.height * (0.12 + (1 - t) * 0.76);
      await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, to, { steps: 5 });
      await page.mouse.up();
      return b;
    };
    await throwTo("L TRACK", 1);
    const back = await throwTo("R TRACK", 0);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}app-lever.png` });
    // And a crop of both feet, where the detail is: a gasket is 50 px of an
    // 844 px screen, and a full-frame shot of one is a smudge.
    await page.screenshot({
      path: `${OUT}app-lever-foot.png`,
      clip: { x: 0, y: back.y + back.height - 110, width: VIEWPORT.width, height: 150 },
    });
    written += 2;
  }
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
