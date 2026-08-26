/**
 * What you are standing on — the facts a frame time is meaningless without.
 *
 * "18 ms" is not a measurement until you know how many pixels it drew and how
 * often the panel would have accepted them. A 120 Hz phone hitting 60 fps and a
 * 60 Hz phone hitting 60 fps are two different results, and the second one is
 * the good one.
 *
 * Refresh rate is **measured, not asked for**: nothing in the platform reports
 * it, and the frame times in the table are bounded below by it. Sampling the
 * shortest interval a run of empty frames can achieve is the only answer
 * available, and it is a good one — an idle `requestAnimationFrame` loop is
 * exactly the thing whose ceiling is the panel.
 */

export interface Device {
  readonly agent: string;
  readonly cores: number | undefined;
  /** GB, and coarse by design — browsers round it hard. */
  readonly memory: number | undefined;
  /** CSS pixels of the viewport: the glass the cab would be drawn on. */
  readonly glass: readonly [number, number];
  readonly dpr: number;
  /** What the renderer clamps that to (`render/scene.ts`). */
  readonly ratio: number;
  /** Hz, measured off an idle frame loop. */
  readonly refresh: number;
}

/** Frames sampled to find the panel's ceiling. A third of a second at 120 Hz. */
const REFRESH_FRAMES = 40;

async function measureRefresh(): Promise<number> {
  const intervals: number[] = [];
  let last = await new Promise<number>((r) => requestAnimationFrame(r));
  for (let i = 0; i < REFRESH_FRAMES; i++) {
    const now = await new Promise<number>((r) => requestAnimationFrame(r));
    intervals.push(now - last);
    last = now;
  }
  // The *shortest* interval, not the median: a browser that throttles or a
  // first frame that arrives late both push the middle out, and neither is a
  // statement about the display. The floor is the panel.
  const floor = Math.min(...intervals);
  return floor > 0 ? Math.round(1000 / floor) : 0;
}

export async function readDevice(): Promise<Device> {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  return {
    agent: nav.userAgent,
    cores: nav.hardwareConcurrency,
    memory: nav.deviceMemory,
    glass: [innerWidth, innerHeight],
    dpr: devicePixelRatio || 1,
    ratio: Math.min(devicePixelRatio || 1, 2),
    refresh: await measureRefresh(),
  };
}
