<script lang="ts">
/**
 * The application shell. Svelte owns the DOM; a plain module owns the
 * renderer and the loop (architecture rule 3). The only thing that crosses
 * from sim to UI is a snapshot, and it crosses at SNAPSHOT_HZ, not 60.
 */
import { makeClock } from "./core/clock.ts";
import { SNAPSHOT_HZ, type Snapshot } from "./core/snapshot.ts";
import { createViewport } from "./render/scene.ts";
import { createWorld, initPhysics } from "./sim/world.ts";
import Telemetry from "./ui/Telemetry.svelte";

let canvas: HTMLCanvasElement;
let latest = $state<Snapshot | undefined>(undefined);

$effect(() => {
  let frame = 0;
  let disposed = false;
  let cleanup = () => {};

  void initPhysics().then(() => {
    if (disposed) return;

    const world = createWorld();
    const viewport = createViewport(canvas);
    const clock = makeClock();

    const resize = () => viewport.resize(innerWidth, innerHeight);
    addEventListener("resize", resize);
    resize();

    let last = performance.now();
    let sinceSnapshot = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = Math.min((now - last) / 1000, 0.25);
      last = now;

      const { steps } = clock.advance(elapsed);
      for (let i = 0; i < steps; i++) world.step();

      // The UI reads a value at 10 Hz. It never watches the sim.
      sinceSnapshot += elapsed;
      if (sinceSnapshot >= 1 / SNAPSHOT_HZ) {
        sinceSnapshot = 0;
        latest = world.snapshot();
      }

      viewport.render(latest ?? world.snapshot());
    };
    frame = requestAnimationFrame(tick);

    cleanup = () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      viewport.dispose();
      world.free();
    };
  });

  return () => {
    disposed = true;
    cleanup();
  };
});
</script>

<canvas bind:this={canvas}></canvas>
<Telemetry snapshot={latest} />

<style>
  /* width/height must be explicit: an abs-positioned <canvas> with width:auto
     lays out at its INTRINSIC (drawing-buffer) size, not the inset box. This
     cost the concept-3 probe a debugging round — see
     docs/design/prototype-findings.md. */
  canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
