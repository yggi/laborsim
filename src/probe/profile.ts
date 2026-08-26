/**
 * The mobile frame, measured — L-034.
 *
 * Mobile-first is a hard pillar (`MEMORY.md` § 9) and until this existed no
 * frame had ever been timed on a phone. What the board asked for is a number.
 * What a *budget* needs is one number and three dials, because "18 ms" tells
 * you whether you are in trouble and nothing at all about what to cut.
 *
 * So this is not one measurement, it is a set of passes over the same run, each
 * changing exactly one thing:
 *
 *   - **the pixels** (half resolution) — if the frame halves with them, the
 *     phone is fill-bound and the lever is the buffer, not the scene.
 *   - **the motion** (parked) — what waking 130 dynamic bodies, pricing their
 *     impacts and rebuilding the moved-prop list actually costs.
 *   - **the furniture** (E-01's 22 props against E-03's 130) — the dial that
 *     arrived by accident when the exercises landed, and has never been read.
 *   - **the view** (chase) — outside the machine, where the interior layer is
 *     on and there is more site in frame.
 *
 * and one that changes nothing at all: the first pass, run again at the end,
 * because a phone that is fast for four seconds and slow for sixty is a slow
 * phone. Thermal drift is not a footnote on this platform.
 *
 * **Every pass drives the same seconds.** A pass ends on a *tick* count, not a
 * frame count, and each one gets a freshly built world — so a slow device and a
 * fast one profile the identical stretch of the identical run, which is the
 * only way two devices' numbers can be laid beside each other. That the phone
 * fits fewer frames into those seconds is the measurement.
 *
 * What this does **not** measure is the cab: the cage, the dash, the pods and
 * the levers are DOM over the glass, and none of it is on this page. By design
 * that is one custom-property write a frame plus a 10 Hz reactive pass
 * (`App.svelte`) — which is a claim, not a reading. It is the remainder, and it
 * is written down as one in `NOTES.md`.
 */

import { CHASSIS, type Module } from "../control/bus.ts";
import { makeClock, STEP_SECONDS } from "../core/clock.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import { type CameraMode, createViewport, type Viewport } from "../render/scene.ts";
import { createWorld, initPhysics } from "../sim/world.ts";
import { type Exercise, exerciseById } from "../world/exercises.ts";
import { type GlWatch, watchCanvas } from "./gl.ts";

const ticksFor = (seconds: number): number => Math.round(seconds / STEP_SECONDS);

/**
 * Sim seconds thrown away first. The frames a scene draws before its programs
 * are compiled and its buffers uploaded are real and are *not* the steady
 * state — they are the first-load number, measured separately below.
 */
const WARM_TICKS = ticksFor(1);
/** Sim seconds the headline numbers come from. Long enough to hold a p95. */
const MEASURE_TICKS = ticksFor(6);
/**
 * Sim seconds spent asking the GPU when it is actually finished.
 *
 * Separated from the measured window on purpose. `gl.finish()` is a stall by
 * construction: it stops the CPU running ahead into the next frame, which is
 * exactly the overlap the real loop lives on. Measuring the frame interval with
 * one in it would report a game slower than the one that ships — so the frame
 * is timed without it, and what the GPU still owed is timed here, after.
 */
const PROBE_TICKS = ticksFor(1);

export interface Pass {
  readonly id: string;
  /** Short enough for a column heading. */
  readonly name: string;
  /** One line, for the legend under the table. */
  readonly what: string;
  readonly exercise: string;
  readonly view: CameraMode;
  /** Fraction of the glass to render at. 1 is the buffer the game uses. */
  readonly scale: number;
  /** Levers hard forward, or parked. */
  readonly driving: boolean;
}

/**
 * Ordered so the stand is rebuilt as rarely as possible and the repeat lands as
 * late as possible. The two pull opposite ways and the repeat wins: a drift
 * reading taken thirty seconds in is not a drift reading.
 */
export const PASSES: readonly Pass[] = [
  {
    id: "full",
    name: "FULL SITE",
    what: "E-03 as shipped: 130 props, levers hard forward, from the cab",
    exercise: "E-03",
    view: "cab",
    scale: 1,
    driving: true,
  },
  {
    id: "half",
    name: "HALF RES",
    what: "the same frame at half the linear resolution — a quarter of the pixels",
    exercise: "E-03",
    view: "cab",
    scale: 0.5,
    driving: true,
  },
  {
    id: "parked",
    name: "PARKED",
    what: "the same frame with the levers at rest and the site asleep",
    exercise: "E-03",
    view: "cab",
    scale: 1,
    driving: false,
  },
  {
    id: "chase",
    name: "CHASE",
    what: "outside the machine: the whole hull drawn, and more site in frame",
    exercise: "E-03",
    view: "chase",
    scale: 1,
    driving: true,
  },
  {
    id: "graded",
    name: "GRADED PAD",
    what: "E-01: 22 props on ground turned down to 0.3 relief",
    exercise: "E-01",
    view: "cab",
    scale: 1,
    driving: true,
  },
  {
    id: "again",
    name: "FULL SITE 2",
    what: "the first pass again, a minute of load later. Drift is the reading",
    exercise: "E-03",
    view: "cab",
    scale: 1,
    driving: true,
  },
];

/** p50, p95 and the worst of it. A mean would hide the frame that stutters. */
export interface Spread {
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
}

export interface PassReport {
  readonly pass: Pass;
  /** The drawing buffer this pass rendered into, in device pixels. */
  readonly buffer: readonly [number, number];
  readonly frames: number;
  readonly seconds: number;
  readonly fps: number;
  /** Wall clock between one frame and the next: what the operator feels. */
  readonly frame: Spread;
  /** The fixed steps this frame owed, plus the snapshot it reads. */
  readonly sim: Spread;
  /** `viewport.render()` — the CPU half, which returns before the GPU is done. */
  readonly render: Spread;
  /** What the GPU still owed when `render()` returned. Measured apart. */
  readonly gpu: Spread;
  /** Steps per frame. Above 1 means the frame is behind the fixed clock. */
  readonly steps: Spread;
  readonly calls: number;
  readonly triangles: number;
  readonly programs: number;
}

/** What it costs to get from nothing to a frame. */
export interface Startup {
  readonly exercise: string;
  readonly props: number;
  /** Rapier's wasm, compiled once per page. Near zero on every stand after. */
  readonly physics: number;
  /** `createWorld` — colliders, and 120 settle steps before anyone is liable. */
  readonly world: number;
  /** `createViewport` — every mesh, every ink shell, every greeble. */
  readonly viewport: number;
  /** The first `render()`, which is where the shader programs get compiled. */
  readonly firstFrame: number;
}

export interface Profile {
  readonly startup: readonly Startup[];
  readonly passes: readonly PassReport[];
  /** What the driver calls itself. */
  readonly gpu: string;
}

export interface Progress {
  readonly pass: Pass;
  readonly index: number;
  readonly total: number;
  readonly phase: "building" | "warming" | "measuring" | "probing";
  /** 0–1 through the current phase. */
  readonly through: number;
}

function spread(samples: readonly number[]): Spread {
  if (samples.length === 0) return { p50: 0, p95: 0, max: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number): number =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return { p50: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] ?? 0 };
}

const median = (samples: readonly number[]): number => spread(samples).p50;

/** Device pixels per CSS pixel, as the renderer clamps it. */
const pixelRatio = (): number => Math.min(devicePixelRatio || 1, 2);

/**
 * A canvas, a context and a viewport for one exercise's ground.
 *
 * The **world** is rebuilt for every pass and this is not, which is the whole
 * trick: terrain and furniture are deterministic from the exercise's seed, so
 * two worlds of the same exercise place identical meshes, and rebuilding the
 * scene graph between passes would only time the same construction six times.
 * What must be fresh each pass is the *state* — where the machine is, what is
 * awake, what has been knocked over — and that is the world.
 */
interface Stand {
  readonly exercise: Exercise;
  readonly canvas: HTMLCanvasElement;
  readonly viewport: Viewport;
  readonly gl: GlWatch;
  readonly startup: Startup;
  /** CSS pixels the glass is, which is what `resize` speaks. */
  readonly glass: readonly [number, number];
  dispose(): void;
}

interface Levers {
  left: number;
  right: number;
}

const nextFrame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * The levers, as a rack module.
 *
 * A pass drives by writing to this rather than by reaching into the machine,
 * for the same reason the cab does: the pilot is a slot on the rail, its intent
 * is folded by verb like everything else's, and a bench that bypassed the rack
 * would be timing a machine nobody can drive.
 */
function pilotModule(lever: Levers): Module {
  return {
    id: CHASSIS,
    label: "PILOT",
    maker: "KIBA WORKS",
    considers: "a bench, holding the levers down",
    verb: "SET",
    enabled: true,
    intent: () => ({
      left: lever.left * MAX_TRACK_SPEED,
      right: lever.right * MAX_TRACK_SPEED,
    }),
  };
}

/**
 * Put the glass back to full size.
 *
 * `WebGLRenderer.setSize` writes the canvas's CSS size as well as its buffer,
 * so a half-resolution pass would otherwise draw a small canvas in the corner
 * rather than an upscaled one — a different amount of compositing, and a bench
 * that plainly looks wrong. What a scaled pass changes is the *buffer*; the
 * glass is still the glass.
 */
function fillTheGlass(canvas: HTMLCanvasElement): void {
  canvas.style.width = "100%";
  canvas.style.height = "100%";
}

async function buildStand(
  exercise: Exercise,
  canvas: HTMLCanvasElement,
  lever: Levers,
): Promise<Stand> {
  const gl = watchCanvas(canvas);

  const beforePhysics = performance.now();
  await initPhysics();
  const physics = performance.now() - beforePhysics;

  const beforeWorld = performance.now();
  const world = createWorld({ exercise, modules: [pilotModule(lever)] });
  const worldMs = performance.now() - beforeWorld;

  const glass: readonly [number, number] = [innerWidth, innerHeight];
  const beforeViewport = performance.now();
  const viewport = createViewport(canvas, world.terrain, world.props, world.waypoints);
  viewport.resize(glass[0], glass[1]);
  const viewportMs = performance.now() - beforeViewport;
  fillTheGlass(canvas);

  // The first frame compiles every program the scene uses, and on a phone it is
  // routinely the longest frame of the session by an order of magnitude. It is
  // a first-load cost, not a frame cost, so it is measured here and never lands
  // in a pass.
  const beforeFirst = performance.now();
  gl.reset();
  viewport.render(world.snapshot());
  gl.finish();
  const firstFrame = performance.now() - beforeFirst;
  world.free();

  // **The instrument gets checked against a frame that certainly drew.**
  // A counter that never saw the context, or one shadowing methods three.js
  // does not call, reports zero draws for ever — and zero is a plausible-
  // looking number in a column of numbers. A bench that fails silently is the
  // one thing `META.md` says a bench must not do, so it fails here instead,
  // loudly, one frame in.
  if (!gl.live()) throw new Error("no WebGL context was handed out to watch");
  if (gl.read().calls === 0) {
    throw new Error("a frame was rendered and no draw calls were counted");
  }

  return {
    exercise,
    canvas,
    viewport,
    gl,
    glass,
    startup: {
      exercise: exercise.id,
      props: exercise.props,
      physics,
      world: worldMs,
      viewport: viewportMs,
      firstFrame,
    },
    dispose() {
      viewport.dispose();
      gl.release();
    },
  };
}

/**
 * One pass: a fresh world on an existing stand, warmed, measured, then probed.
 *
 * The loop is `App.svelte`'s, deliberately — same clamp, same clock, same
 * snapshot-then-render order. A bench whose loop differed from the game's would
 * be measuring a game nobody ships.
 */
async function runPass(
  stand: Stand,
  pass: Pass,
  lever: Levers,
  report: (phase: Progress["phase"], through: number) => void,
): Promise<PassReport> {
  report("building", 0);
  await nextFrame();

  const world = createWorld({
    exercise: stand.exercise,
    modules: [pilotModule(lever)],
  });

  const width = Math.round(stand.glass[0] * pass.scale);
  const height = Math.round(stand.glass[1] * pass.scale);
  stand.viewport.setMode(pass.view);
  stand.viewport.resize(width, height);
  fillTheGlass(stand.canvas);

  lever.left = pass.driving ? 1 : 0;
  lever.right = pass.driving ? 1 : 0;

  const clock = makeClock();
  const frames: number[] = [];
  const sims: number[] = [];
  const renders: number[] = [];
  const gpus: number[] = [];
  const steps: number[] = [];
  const calls: number[] = [];
  const triangles: number[] = [];
  const programs: number[] = [];

  const warmUntil = WARM_TICKS;
  const measureUntil = warmUntil + MEASURE_TICKS;
  const probeUntil = measureUntil + PROBE_TICKS;

  let last = await nextFrame();
  while (world.tick < probeUntil) {
    const now = await nextFrame();
    const interval = now - last;
    const elapsed = Math.min(interval / 1000, 0.25);
    last = now;

    const owed = clock.advance(elapsed).steps;
    const probing = world.tick >= measureUntil;

    const beforeSim = performance.now();
    for (let i = 0; i < owed; i++) world.step();
    const snapshot = world.snapshot();
    const afterSim = performance.now();

    stand.gl.reset();
    stand.viewport.render(snapshot);
    const afterRender = performance.now();
    if (probing) {
      stand.gl.finish();
      gpus.push(performance.now() - afterRender);
      report("probing", (world.tick - measureUntil) / PROBE_TICKS);
      continue;
    }

    if (world.tick < warmUntil) {
      report("warming", world.tick / WARM_TICKS);
      continue;
    }

    report("measuring", (world.tick - warmUntil) / MEASURE_TICKS);
    const counted = stand.gl.read();
    frames.push(interval);
    // **Only frames that owed a step.** A 120 Hz phone steps a 60 Hz sim on
    // every other frame, so half the samples would be a snapshot and nothing
    // else — and a median over both halves would report a physics engine that
    // costs approximately nothing. What is wanted is what a step costs; how
    // often one is owed is the `steps` column's job, next to it.
    if (owed > 0) sims.push(afterSim - beforeSim);
    renders.push(afterRender - afterSim);
    steps.push(owed);
    calls.push(counted.calls);
    triangles.push(counted.triangles);
    programs.push(counted.programs);
  }

  world.free();

  // Wall time the measured window actually spanned: the sum of its own frame
  // intervals, not a clock difference across the phases either side of it.
  const seconds = frames.reduce((total, ms) => total + ms, 0) / 1000;
  const ratio = pixelRatio();

  return {
    pass,
    buffer: [Math.round(width * ratio), Math.round(height * ratio)],
    frames: frames.length,
    seconds,
    fps: seconds > 0 ? frames.length / seconds : 0,
    frame: spread(frames),
    sim: spread(sims),
    render: spread(renders),
    gpu: spread(gpus),
    steps: spread(steps),
    calls: median(calls),
    triangles: median(triangles),
    programs: median(programs),
  };
}

/**
 * Every pass, in order, into a host element that owns the glass.
 *
 * One canvas for the whole run: a second WebGL context per exercise would be a
 * second of a resource the browser hands out very few of, so the stand is torn
 * down and rebuilt on the same element when the ground changes.
 */
export async function runProfile(
  host: HTMLElement,
  onProgress: (progress: Progress) => void,
): Promise<Profile> {
  const lever: Levers = { left: 0, right: 0 };
  const startup: Startup[] = [];
  const reports: PassReport[] = [];
  let stand: Stand | undefined;
  let gpu = "";

  for (const [index, pass] of PASSES.entries()) {
    const exercise = exerciseById(pass.exercise);
    if (!exercise) continue;
    const total = PASSES.length;

    if (stand?.exercise.id !== exercise.id) {
      stand?.dispose();
      host.replaceChildren();
      const canvas = document.createElement("canvas");
      canvas.className = "glass";
      host.append(canvas);
      onProgress({ pass, index, total, phase: "building", through: 0 });
      await nextFrame();
      stand = await buildStand(exercise, canvas, lever);
      startup.push(stand.startup);
      if (!gpu) gpu = stand.gl.describe();
    }

    const here = stand;
    reports.push(
      await runPass(here, pass, lever, (phase, through) =>
        onProgress({ pass, index, total, phase, through }),
      ),
    );
  }

  stand?.dispose();
  host.replaceChildren();
  return { startup, passes: reports, gpu };
}
