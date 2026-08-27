/**
 * One run: the world, the kit on it, the view of it, and the loop that turns.
 *
 * `App.svelte` has claimed since it was written that "Svelte owns the DOM; a
 * plain module owns the renderer and the loop". That was aspirational — the loop
 * lived in a 155-line `$effect` in the middle of a component that also held the
 * annunciator, the E-stop, the horn, the notices and the nag. This is the module
 * the comment was describing.
 *
 * It lives under `platform/` because almost everything it does is where the
 * application meets the browser: `requestAnimationFrame`, pointer capture, a
 * resize listener, one custom-property write per frame. The world and the
 * renderer are things it *owns*, not things it is.
 *
 * ## It is synchronous, and that is the point
 *
 * Rapier is wasm and has to be initialised before a world can exist, so building
 * a run is unavoidably asynchronous. What is avoidable is letting that leak: the
 * old code hoisted `let setViewMode = () => {}` into the component and reassigned
 * it from inside the `.then()`, so pressing CHASE before the wasm landed did
 * nothing at all and said nothing about it.
 *
 * `createRun` returns a `Run` immediately. The camera it is given before the
 * world exists is *remembered* and applied on arrival, so the caller never holds
 * a handle that is quietly inert, and `dispose()` is safe at any point in the
 * boot — including before it finishes.
 *
 * ## What it does not decide
 *
 * It does not know what kit is fitted. NAV-1 needs a world to read a pose from
 * and TILT-GUARD needs one to read an attitude from, which is *why* they are
 * built in here — but which components those are is the cab's business, so the
 * caller passes `fit`, gets the world, and hands back modules. A run that had
 * `createAutonav` in it would be a run that has opinions about the machine.
 */

import type { Audio } from "../audio/engine.ts";
import type { Module } from "../control/bus.ts";
import type { Hands } from "../control/hands.ts";
import {
  createTracer,
  type RackCommand,
  setupOf,
  type Trace,
  type Tracer,
} from "../control/trace.ts";
import { MAX_FRAME_SECONDS, makeClock } from "../core/clock.ts";
import { SNAPSHOT_HZ, type Snapshot } from "../core/snapshot.ts";
import { type CameraMode, createViewport } from "../render/scene.ts";
import { createWorld, initPhysics, type SimWorld } from "../sim/world.ts";
import type { Exercise } from "../world/exercises.ts";
import { advance, type Frame } from "./frame.ts";

export interface RunOptions {
  readonly canvas: HTMLCanvasElement;
  /** The site, the route and the objective. A different one is a different run. */
  readonly exercise: Exercise;
  /**
   * The rail, mutated in place.
   *
   * Reset to the chassis and re-fitted here rather than rebuilt, because the
   * array's identity is what the cab is rendering — and because re-racking must
   * not leave a second copy of every module behind it.
   */
  readonly rack: Module[];
  /** The chassis component. The one slot a run always has. */
  readonly pilot: Module;
  /** What else to bolt on, once there is a world to bolt it to. */
  fit(world: SimWorld): readonly Module[];
  /** What the loop reads from the cab, and the only thing it reads from it. */
  readonly hands: Hands;
  /**
   * Commands the cab has issued and no tick has taken yet.
   *
   * The queue architecture rule 3 has always described and never had. It is the
   * caller's array rather than the run's for the same reason `rack` is: the cab
   * holds the handles that write to it, and those outlive any one run — a
   * `let issue = () => {}` reassigned from inside the boot is the exact shape of
   * bug the note above this file was written about.
   */
  readonly queue: RackCommand[];
  /**
   * The rail changed under the cockpit's feet — a slot moved, a verb cycled, a
   * fuse pulled. Called once per frame in which anything landed, never per
   * command, because a re-render is not per-command either.
   */
  onRack(): void;
  /** A sampled snapshot, at `SNAPSHOT_HZ` — not at frame rate. */
  onSnapshot(snapshot: Snapshot): void;
  /**
   * Where the head is pointing this frame, px from centre.
   *
   * The sweep itself is written to `:root` in here; this is for whoever wants to
   * have an opinion about *having* looked, which is the chassis maker's nag and
   * nothing the loop should know about.
   */
  onLook(offsetX: number): void;
  /**
   * The machine's voice, asked for once a frame.
   *
   * A getter rather than a value because the audio context outlives the run —
   * it is expensive, limited, and re-racking the exercise is no reason to throw
   * one away — and because a browser will not let it exist until the player has
   * touched something, so for the first moments there is honestly nothing here.
   */
  audio(): Audio | undefined;
}

export interface Run {
  /** Point the camera. Remembered if the world has not finished booting. */
  setView(mode: CameraMode): void;
  /** The world, once there is one. Undefined during the boot. */
  world(): SimWorld | undefined;
  /**
   * What has been done to this run so far, as a value.
   *
   * Undefined during the boot, for the same reason `world()` is. Recording is
   * always on: a trace is change-points, so a run nobody touched costs an empty
   * array, and the ledger cannot ask *what was driving* after the fact if
   * nothing was writing it down at the time.
   */
  trace(): Trace | undefined;
  /** Tear down the world, the renderer and every listener. Safe at any point. */
  dispose(): void;
}

export function createRun(options: RunOptions): Run {
  const { canvas, rack, pilot, hands, queue } = options;
  let frame = 0;
  let disposed = false;
  let live: SimWorld | undefined;
  let tracer: Tracer | undefined;
  let teardown = () => {};
  /** The camera the caller asked for before there was anything to point. */
  let pending: CameraMode | undefined;
  let setMode: ((mode: CameraMode) => void) | undefined;

  void initPhysics().then(() => {
    if (disposed) return;

    // Re-racking must not duplicate modules: mutate the rack back to just the
    // pilot in place (its identity is held by the world we are about to build),
    // then re-fit below.
    rack.splice(0, rack.length, pilot);
    const world = createWorld({ exercise: options.exercise, modules: rack });
    live = world;
    rack.push(...options.fit(world));

    // **The setup is read after the kit is on, and before a tick has run.**
    // Anything the cab does from here is a command with a tick on it; the rail
    // as fitted is not a command, it is what the commands are against. A queue
    // left over from the run before belongs to a rack that no longer exists.
    queue.length = 0;
    const runTracer = createTracer(
      setupOf(options.exercise.id, world.snapshot().seed, rack),
    );
    tracer = runTracer;

    const viewport = createViewport(
      canvas,
      world.terrain,
      world.props,
      world.waypoints,
      world.poses(),
    );
    const clock = makeClock();
    setMode = viewport.setMode;
    if (pending !== undefined) viewport.setMode(pending);

    const resize = () => viewport.resize(innerWidth, innerHeight);
    addEventListener("resize", resize);
    resize();

    const pointers = new Map<number, { x: number; y: number }>();
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // **Capture, or the spring never lets go.** A thumb that leaves the glass
      // mid-swipe — off the edge of the phone, onto the dash, onto a pod — takes
      // its `pointerup` with it, and the canvas is left believing a hand is
      // still on it. Before the neck was sprung that only meant a look you had
      // to undo; now it means a cab parked over your shoulder for good. Capture
      // makes every event for this pointer come back here whatever it is over.
      canvas.setPointerCapture(e.pointerId);
      viewport.hold(true);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) viewport.hold(false);
    };
    const drag = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      // Eyes down at the cabinet is a posture, not a camera mode: while the
      // rack is open you cannot look around, the same way you cannot reach the
      // levers. The strip of windscreen shows you what is ahead and nothing
      // else — which is the whole cost of reading while the machine is moving.
      if (!hands.headDown) viewport.look(e.clientX - prev.x, e.clientY - prev.y);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", drag);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    // The belt to the braces: a capture can be broken from outside (a system
    // gesture, another element taking it), and a lost capture is a released
    // hand as far as the neck is concerned.
    canvas.addEventListener("lostpointercapture", up);

    // `:root`, not the shell: the sweep is written imperatively every frame and
    // the shell's `style` attribute belongs to Svelte, which would overwrite it
    // the next time the dash changes height.
    const root = document.documentElement;

    let last = performance.now();
    let sinceSnapshot = 0;
    /** Commands forwarded to the tracer that no tick has taken yet. */
    let unlanded = false;

    // What a frame *is* lives in `frame.ts`; what advances one lives here.
    // Everything below this object is the browser's half — the callback, the
    // pointers, the resize, the two custom properties.
    const turn: Frame = {
      world,
      clock,
      hands,
      rack,
      operator: runTracer,
      render: (snapshot) => viewport.render(snapshot),
      sound: (snapshot) =>
        options.audio()?.render(snapshot, { alarm: hands.alarm, horn: hands.horn }),
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const interval = (now - last) / 1000;
      last = now;

      // The cab issues between frames; the tick is where a command gets its
      // number. Draining into the tracer rather than applying here is what
      // makes "queued" true rather than aspirational (`control/trace.ts`).
      if (queue.length > 0) {
        for (const command of queue) runTracer.issue(command);
        queue.length = 0;
        unlanded = true;
      }

      const { steps, snapshot: current } = advance(turn, interval);

      if (unlanded && steps > 0) {
        unlanded = false;
        options.onRack();
      }

      // The UI reads a value at 10 Hz. It never watches the sim.
      sinceSnapshot += Math.min(interval, MAX_FRAME_SECONDS);
      if (sinceSnapshot >= 1 / SNAPSHOT_HZ) {
        sinceSnapshot = 0;
        options.onSnapshot(current);
      }

      // The cab sweeps with the head. **One DOM write a frame, on one element**,
      // and the compositor moves the cage, the pods, the levers and the dash
      // between them — per-instrument reactivity at 60 Hz is the shape
      // architecture rule 3 exists to prevent (`doc/design/cab/components.md`).
      const head = viewport.head();
      root.style.setProperty("--cab-look-x", `${head.x}px`);
      root.style.setProperty("--cab-look-y", `${head.y}px`);
      options.onLook(head.x);
    };
    frame = requestAnimationFrame(tick);

    teardown = () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", drag);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      root.style.removeProperty("--cab-look-x");
      root.style.removeProperty("--cab-look-y");
      viewport.dispose();
      world.free();
    };
  });

  return {
    setView(mode) {
      // Before the viewport exists this is a note to self, not a no-op with a
      // shrug: the mode is applied the moment there is something to apply it to.
      if (setMode) setMode(mode);
      else pending = mode;
    },
    world: () => live,
    trace: () => tracer?.trace(),
    dispose() {
      disposed = true;
      live = undefined;
      teardown();
    },
  };
}
