/**
 * A node counter the audio engine never finds out about.
 *
 * The sibling of `gl.ts`, for the same reason and by the same method. The frame
 * profiler has always timed `sim`, `render` and `gpu` and called their sum
 * `cpu` — and that sum **excluded `audio.render()` entirely**, because the
 * bench's copy of the loop simply did not call it. So the one half of the frame
 * that can make the machine go silent was the one half nobody had a number for.
 *
 * What is worth counting here is **nodes**, and it is worth counting for the
 * same reason draw calls are: it is the unit the cost comes in, and it is
 * unbounded by construction. A single knock — one track plate, one cone — builds
 * six nodes, and one prop written off builds up to forty-four grains' worth,
 * which is two hundred and sixty-four, synchronously, inside one frame. Whether
 * that is affordable is a question with an answer, and until now nothing asked.
 *
 * Shadowed on the **instance**, exactly as `gl.ts` shadows the draw entry
 * points: the engine is handed a context that behaves normally and counts, and
 * `createAudio` is not widened by one character to suit a bench.
 *
 * What this cannot see: the audio *thread*. `audio.render()` only schedules —
 * the browser renders the graph on a thread of its own, and whether that thread
 * keeps up is not observable from here. This measures what the frame pays.
 */

export interface AudioCount {
  /** Nodes built since the last `reset()`. */
  readonly nodes: number;
}

export interface EarWatch {
  /** Zero the counter. Call at the top of a frame. */
  reset(): void;
  read(): AudioCount;
  /** Put the context's own methods back. */
  release(): void;
}

/** Every factory `audio/engine.ts` builds its graph out of. */
const FACTORIES = [
  "createGain",
  "createOscillator",
  "createBiquadFilter",
  "createStereoPanner",
  "createBufferSource",
  "createDynamicsCompressor",
] as const;

export function watchAudio(context: BaseAudioContext): EarWatch {
  let nodes = 0;
  const original = new Map<string, unknown>();
  const target = context as unknown as Record<string, () => unknown>;

  for (const name of FACTORIES) {
    const made = target[name];
    if (typeof made !== "function") continue;
    original.set(name, made);
    target[name] = function counted(this: unknown, ...args: unknown[]) {
      nodes++;
      return (made as (...a: unknown[]) => unknown).apply(context, args);
    } as () => unknown;
  }

  return {
    reset() {
      nodes = 0;
    },
    read: () => ({ nodes }),
    release() {
      for (const [name, made] of original) {
        target[name] = made as () => unknown;
      }
      original.clear();
    },
  };
}
