/**
 * A draw-call counter the renderer never finds out about.
 *
 * The obvious way to count draws is `renderer.info.render.calls`, and it would
 * mean handing the profiler a reference to the `WebGLRenderer` — which
 * `render/scene.ts` deliberately does not publish, because everything it does
 * publish is something the *game* needs. A bench is not a reason to widen an
 * interface: this one reads the machine, it does not get to rewire it.
 *
 * So it counts one level below three.js instead. The canvas is asked for its
 * context before the viewport is built, the draw entry points on **that
 * instance** are shadowed by wrappers, and everything above carries on unaware.
 * Two things fall out of measuring here rather than in three.js:
 *
 *   - the count is the count the **driver** sees, shadow pass included. The
 *     scene renders twice per frame — once into a 2048² shadow map, once for
 *     real — and a number that only knew about the second would be half a
 *     number.
 *   - the context itself is in hand, which is the only way to ask the GPU when
 *     it is *finished*. `render()` returns as soon as the commands are queued;
 *     on a tiled mobile GPU that can be most of the frame early.
 *
 * A `Proxy` would have been shorter and is the wrong tool: three.js makes
 * thousands of context calls per frame, and a trap on every one of them would
 * be measuring the profiler. Shadowing four methods costs one extra call per
 * draw.
 */

export interface DrawCount {
  /** `drawElements` and friends, since the last `reset()`. */
  readonly calls: number;
  /** Triangles those calls asked for. Points and lines are not counted. */
  readonly triangles: number;
  /** Program switches — the state change a tiled GPU cares about most. */
  readonly programs: number;
}

export interface GlWatch {
  /** Zero the counters. Call at the top of a frame. */
  reset(): void;
  read(): DrawCount;
  /**
   * Block until the GPU has drained everything submitted.
   *
   * This is the only honest way to see work that `render()` has queued and
   * walked away from. It is a stall by construction — that is the point — so it
   * belongs in a bench and nowhere near the game loop.
   */
  finish(): void;
  /** True once a context has actually been handed out and shadowed. */
  live(): boolean;
  /** What the driver calls itself, if it will say. Empty until it is asked. */
  describe(): string;
  /** Hand the context back, so the next stand can have one. */
  release(): void;
}

/**
 * Shadow `getContext` on one canvas, and return the handle that goes live the
 * moment somebody asks for a context on it.
 *
 * Per-instance, never on the prototype: a global patch would be watching every
 * canvas on the page, including ones a future bench puts beside this one, and
 * counting two scenes as one is the kind of measurement that reads fine and is
 * wrong.
 */
export function watchCanvas(canvas: HTMLCanvasElement): GlWatch {
  let gl: WebGL2RenderingContext | undefined;
  let calls = 0;
  let triangles = 0;
  let programs = 0;
  /** One pixel's worth of somewhere to put a forced readback. */
  const probe = new Uint8Array(4);

  const native = (id: string, attrs?: unknown): RenderingContext | null =>
    HTMLCanvasElement.prototype.getContext.call(
      canvas,
      id as "webgl2",
      attrs as WebGLContextAttributes,
    );

  canvas.getContext = ((id: string, attrs?: unknown) => {
    const context = native(id, attrs);
    if (context && !gl && (id === "webgl2" || id === "webgl")) {
      gl = context as WebGL2RenderingContext;
      shadow(gl);
    }
    return context;
  }) as HTMLCanvasElement["getContext"];

  function shadow(context: WebGL2RenderingContext): void {
    // How many triangles a mode/count pair is worth. Strips and fans are
    // included because the sky dome and the extruded belt use them; anything
    // that is not a triangle contributes nothing, which is right — a line list
    // is a draw call with no fill behind it.
    const trianglesFor = (mode: number, count: number): number => {
      if (mode === context.TRIANGLES) return count / 3;
      if (mode === context.TRIANGLE_STRIP || mode === context.TRIANGLE_FAN) {
        return count > 2 ? count - 2 : 0;
      }
      return 0;
    };

    const arrays = context.drawArrays.bind(context);
    context.drawArrays = (mode, first, count) => {
      calls++;
      triangles += trianglesFor(mode, count);
      arrays(mode, first, count);
    };

    const elements = context.drawElements.bind(context);
    context.drawElements = (mode, count, type, offset) => {
      calls++;
      triangles += trianglesFor(mode, count);
      elements(mode, count, type, offset);
    };

    // Instanced draws are one call and many triangles, and conflating the two
    // is how an instanced renderer looks free. Nothing instances today; the
    // wrappers are here so that the day something does, the number does not
    // quietly stop counting it.
    const arraysInstanced = context.drawArraysInstanced?.bind(context);
    if (arraysInstanced) {
      context.drawArraysInstanced = (mode, first, count, instances) => {
        calls++;
        triangles += trianglesFor(mode, count) * instances;
        arraysInstanced(mode, first, count, instances);
      };
    }

    const elementsInstanced = context.drawElementsInstanced?.bind(context);
    if (elementsInstanced) {
      context.drawElementsInstanced = (mode, count, type, offset, instances) => {
        calls++;
        triangles += trianglesFor(mode, count) * instances;
        elementsInstanced(mode, count, type, offset, instances);
      };
    }

    const range = context.drawRangeElements?.bind(context);
    if (range) {
      context.drawRangeElements = (mode, start, end, count, type, offset) => {
        calls++;
        triangles += trianglesFor(mode, count);
        range(mode, start, end, count, type, offset);
      };
    }

    // Only a *change* of program is a state change. three.js calls
    // `useProgram` with the program already bound often enough that counting
    // every call would report the renderer's bookkeeping rather than the GPU's
    // work.
    let bound: WebGLProgram | null = null;
    const use = context.useProgram.bind(context);
    context.useProgram = (program) => {
      if (program !== bound) {
        bound = program;
        programs++;
      }
      use(program);
    };
  }

  return {
    reset() {
      calls = 0;
      triangles = 0;
      programs = 0;
    },
    read: () => ({ calls, triangles, programs }),
    live: () => gl !== undefined,
    finish() {
      if (!gl) return;
      gl.finish();
      // `finish()` alone is not to be trusted as a fence. It is specified as
      // "do not return until all commands are complete", and browsers have
      // shipped it as little more than a flush for years — a GPU-owed column
      // that read a flat zero everywhere would look like a scene with no GPU
      // cost rather than like an instrument that cannot see one.
      //
      // Reading one pixel back cannot be faked: the value has to exist, so the
      // frame has to have been drawn. It costs a small readback of its own,
      // which is the price of the number being real. (META: *move the
      // instrument before you trust it*.)
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe);
    },
    describe() {
      if (!gl) return "";
      // Chrome masks the real device behind ANGLE unless this extension is
      // exposed, and on Android it usually is. Either string is worth having:
      // the masked one still names the driver family.
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      const unmasked = debug
        ? (gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string | null)
        : null;
      return String(unmasked ?? gl.getParameter(gl.RENDERER) ?? "");
    },
    release() {
      // A page that builds two stands builds two contexts, and a browser keeps
      // very few. `renderer.dispose()` frees three.js's own objects and leaves
      // the context alive; this is the part that gives it back.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      gl = undefined;
    },
  };
}
