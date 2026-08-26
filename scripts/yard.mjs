/**
 * The site, looked at. `npm run yard`
 *
 * The fifth bench, and it exists because none of the other four can see the
 * subject of this work. `shots` has no 3D in it at all — it poses DOM cockpit
 * specimens. `cab` puts the camera *inside* the machine, which is the right
 * place to judge a cage and the wrong one to judge a hundred and thirty pieces
 * of furniture. `listen` is the ear and `profile` is the clock.
 *
 * So: a camera over each graded work area, and then the machine driven into a
 * stack of pipes so that the coming-apart can be looked at rather than asserted
 * about. It **asserts nothing** — it is here to be looked at, which is the only
 * review a picture gets (`doc/META.md`). It fails only on a page error, because
 * a bench that has silently stopped reaching its subject is worse than none.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const OUT = process.env.OUT ?? "shots/yard";
/**
 * What to drive into. Two of them matter and they are opposite cases: a pipe
 * stack comes apart into four lengths of steel that **roll**, and a concrete
 * block comes apart into dust — `MaterialSpec.rubble.dust` is 0.03 for tube and
 * 0.9 for concrete, so a bench that only ever broke pipes could not see the
 * motes at all.
 */
const TARGET = process.env.TARGET ?? "pipes";
const server = await createServer({ server: { port: 0 } });
await server.listen();
const url = `http://localhost:${server.config.server.port}/listen.html`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
const failures = [];
page.on("pageerror", (error) => failures.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") failures.push(message.text());
});
await page.goto(url, { waitUntil: "load" });

const pads = await page.evaluate(async () => {
  const { initPhysics, createWorld } = await import("/src/sim/world.ts");
  const { createViewport } = await import("/src/render/scene.ts");
  await initPhysics();
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh";
  document.body.append(canvas);

  const world = createWorld();
  const viewport = createViewport(
    canvas,
    world.terrain,
    world.props,
    world.waypoints,
    world.poses(),
  );
  viewport.resize(innerWidth, innerHeight);
  viewport.setMode("chase");
  const still = world.snapshot();

  // The chase camera orbits the hull, so posing the hull is how you point it.
  window.__look = (x, y, z) => {
    viewport.render({
      ...still,
      machine: {
        ...still.machine,
        pose: { position: [x, y, z], rotation: [0, 0, 0, 1] },
      },
    });
  };
  return world.terrain.pads
    .filter((pad) => pad.furnished)
    .map((pad) => ({ x: pad.x, z: pad.z, y: pad.target }));
});

await mkdir(OUT, { recursive: true });
let written = 0;
for (const [i, pad] of pads.entries()) {
  await page.evaluate(([x, y, z]) => window.__look(x, y, z), [pad.x, pad.y, pad.z]);
  await writeFile(`${OUT}/pad-${i}.png`, await page.screenshot());
  written++;
}

/**
 * Now break something, and watch it.
 *
 * A fresh world with a rack that drives — `world.step()` runs the rack and
 * calls `drive` itself, so a `drive` from outside is overwritten by the empty
 * rack's HALT on the same step, which is how a damage test once came to pass
 * without ever hitting anything (`doc/META.md`).
 */
const ready = await page.evaluate(async (want) => {
  const { initPhysics, createWorld } = await import("/src/sim/world.ts");
  const { createViewport } = await import("/src/render/scene.ts");
  const { MAX_TRACK_SPEED } = await import("/src/core/spec.ts");
  const { makeRampTerrain } = await import("/src/world/terrain.ts");
  await initPhysics();

  const pilot = {
    id: "PILOT",
    label: "PILOT",
    maker: "KIBA WORKS",
    considers: "the bench",
    verb: "SET",
    enabled: true,
    intent: () => ({ left: MAX_TRACK_SPEED, right: MAX_TRACK_SPEED }),
  };
  const world = createWorld({ terrain: makeRampTerrain(0), modules: [pilot] });
  const index = world.props.findIndex((prop) => prop.kind === want);
  const target = world.props[index];
  if (!target) return false;
  const range = Math.hypot(target.x, target.z);
  const ux = target.x / range;
  const uz = target.z / range;
  const bearing = Math.atan2(ux, uz);
  world.machine.body.setTranslation(
    { x: target.x - ux * 9, y: 0.05, z: target.z - uz * 9 },
    true,
  );
  world.machine.body.setRotation(
    { x: 0, y: Math.sin(bearing / 2), z: 0, w: Math.cos(bearing / 2) },
    true,
  );

  const canvas = document.querySelector("canvas");
  const viewport = createViewport(
    canvas,
    world.terrain,
    world.props,
    world.waypoints,
    world.poses(),
  );
  viewport.resize(innerWidth, innerHeight);
  viewport.setMode("chase");
  // Side on, low: a stack coming apart is a thing that spreads sideways.
  viewport.look(300, -120);

  let step = 0;
  window.__run = (until) => {
    while (step < until) {
      world.step();
      step++;
    }
    viewport.render(world.snapshot());
    return step;
  };
  /**
   * Step until something is actually written off, and say when.
   *
   * A step count picked by hand is a bench that stops reaching its subject the
   * first time anything about the drive changes — the first version shot
   * "apart" at step 252 and photographed a machine that had not arrived yet.
   * The moment is a thing the sim can be asked for.
   */
  window.__untilBroken = () => {
    while (step < 1200) {
      world.step();
      step++;
      if (world.ledger.events.some((line) => line.state === "destroyed")) return step;
    }
    return -1;
  };
  return true;
}, TARGET);

if (ready) {
  await page.evaluate(() => window.__run(60));
  await writeFile(`${OUT}/${TARGET}-before.png`, await page.screenshot());
  written++;
  const broke = await page.evaluate(() => window.__untilBroken());
  if (broke < 0) {
    failures.push("nothing was written off in 1200 steps — the bench missed it");
  } else {
    console.warn(`  written off at step ${broke}`);
    for (const [name, after] of [
      ["apart", 6],
      ["rolling", 40],
      ["settling", 110],
      ["after", 260],
    ]) {
      await page.evaluate((until) => window.__run(until), broke + after);
      await writeFile(`${OUT}/${TARGET}-${name}.png`, await page.screenshot());
      written++;
    }
  }
}

console.warn(`${written} shot(s) → ${OUT}/`);
await browser.close();
await server.close();

if (failures.length > 0) {
  console.error(`yard bench reported ${failures.length} error(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exitCode = 1;
}
