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
  /**
   * The finest gap `performance.now()` will report, ms — the resolution of
   * every duration in the report.
   *
   * Not a curiosity. Firefox quantizes its clock to 1 ms against timing attacks,
   * so a 3 ms render on that browser is anything from 2.5 to 3.5 and a 0.4 ms
   * one reads as either 0 or 1. A column of integers is the tell, and a reader
   * who does not know why they are integers will believe the third digit of a
   * number that does not have one.
   */
  readonly timer: number;
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

/** Milliseconds of wall clock spent looking for the clock's own step. */
const TIMER_SAMPLE_MS = 20;

/**
 * The smallest non-zero gap two back-to-back `performance.now()` calls report.
 *
 * Bounded by wall clock rather than by an iteration count on purpose: on a
 * coarse clock the interesting event is *rare*, and a loop that waited for a
 * fixed number of them would spin for a second on the browser that most needs
 * asking.
 */
function timerResolution(): number {
  let smallest = Number.POSITIVE_INFINITY;
  const until = performance.now() + TIMER_SAMPLE_MS;
  while (performance.now() < until) {
    const a = performance.now();
    const b = performance.now();
    const gap = b - a;
    if (gap > 0 && gap < smallest) smallest = gap;
  }
  return Number.isFinite(smallest) ? smallest : 0;
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
    timer: timerResolution(),
  };
}
