/**
 * Terrain generation.
 *
 * Deliberately built from integer hashing, multiplication and addition only —
 * no `Math.sin`, `cos`, `exp` or `pow` anywhere. ECMAScript does not require
 * transcendentals to be bit-identical across engines, and the probe's `H(x,z)`
 * was made almost entirely of them. Value noise from a seeded hash sidesteps
 * that completely: two browsers generate byte-identical terrain from one seed.
 *
 * `Math.sqrt` and `Math.round` are exempt — IEEE-754 requires both to be
 * correctly rounded, so they are portable.
 *
 * Heights are additionally quantized, so even a future accidental
 * transcendental cannot move a vertex by a visible amount.
 *
 * See docs/design/architecture-rules.md, rule 2.
 */

/** Metres per terrain cell. */
export const CELL = 2;
/** Cells per side. The site is CELL * GRID metres across. */
export const GRID = 128;
/** Height quantum, metres. Belt and braces against float drift. */
const QUANTUM = 1 / 1024;

/** Radius of the graded pad the machine starts on, and its blend-out. */
const PAD_INNER = 13;
const PAD_OUTER = 34;

/** Integer hash → [0, 1). Exact in IEEE-754: integer ops and a power-of-two divide. */
function hash2(ix: number, iz: number, seed: number): number {
  let h =
    Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smoothstep. Polynomial, so exactly reproducible. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fz;
}

/**
 * Height in metres at a world position. Used to *generate* the heightfield
 * only — the sim never calls this. Contact is measured against the collider,
 * which is what makes getting stuck real rather than scheduled.
 */
export function heightAt(x: number, z: number, seed: number, relief = 1): number {
  // Steeper than it was, and steeper on the short wavelengths especially: the
  // machine's whole character is what happens on a grade, and gentle ground
  // gives it nothing to be bad at. The climb limit is 43.5°, so the site should
  // have plenty of ground either side of that.
  //
  // `relief` scales every octave at once, so a gentler site is **the same site,
  // turned down** — the same hills in the same places, shallower. That is worth
  // more than a second generator: a trainee who learns the first exercise's
  // ground is not learning a shape they will never see again.
  let h = 0;
  let amplitude = 7.6 * relief;
  let frequency = 1 / 54;
  for (let octave = 0; octave < 4; octave++) {
    h +=
      (valueNoise(x * frequency, z * frequency, seed + octave) - 0.5) * 2 * amplitude;
    amplitude *= 0.55;
    frequency *= 2.13;
  }
  // A graded working pad, so the machine does not start on a slope.
  const r = Math.sqrt(x * x + z * z);
  const t =
    r <= PAD_INNER
      ? 0
      : r >= PAD_OUTER
        ? 1
        : smooth((r - PAD_INNER) / (PAD_OUTER - PAD_INNER));
  h *= t;
  return Math.round(h / QUANTUM) * QUANTUM;
}

export interface Terrain {
  /**
   * Heights for Rapier's heightfield, `(GRID + 1)^2` samples, indexed
   * `[ix * n + iz]`. Verified empirically against the collider, not assumed:
   * the slow-varying index maps to **X**, the fast-varying one to **Z**.
   */
  readonly heights: Float32Array;
  /** Per-cell material index. Unused at rung 1 — the slot exists because soft
   *  ground is the load chart's named failure mode and retrofitting it is dear. */
  readonly materials: Uint8Array;
  readonly seed: number;
  readonly extent: number;
}

/**
 * A constant-grade ramp rising along +Z, flat for the first `flat` metres so a
 * machine can settle before it starts climbing.
 *
 * This exists so the traction limit can be tested against a known angle rather
 * than against whatever slope the noise happened to produce. It is also the
 * shape a training exercise wants: "can this machine get up that?"
 */
export function makeRampTerrain(degrees: number, flat = 30): Terrain {
  const n = GRID + 1;
  const extent = GRID * CELL;
  const heights = new Float32Array(n * n);
  // deterministic-exempt: `Math.tan` is not bit-portable, but this is quantized.
  // Quantizing the slope settles it: engines disagree around 1e-16, which is
  // nine orders of magnitude below this, so every engine gets the same ramp.
  const slope = Math.round(Math.tan((degrees * Math.PI) / 180) * 1e6) / 1e6;
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const z = (iz / GRID - 0.5) * extent;
      const rise = z > flat ? (z - flat) * slope : 0;
      heights[ix * n + iz] = Math.round(rise / QUANTUM) * QUANTUM;
    }
  }
  return { heights, materials: new Uint8Array(GRID * GRID), seed: 0, extent };
}

/**
 * Flat ground with **one bank across one half of it** — a rut for one track.
 *
 * The sibling of the ramp, and it exists for the same reason: a claim about the
 * running gear needs ground with a known shape rather than whatever the noise
 * happened to produce. The bank runs along +X only, so a machine driving up +Z
 * puts its **left** track over it and its right track on the flat — which is
 * the one thing a suspension can say that nothing else on the machine can.
 *
 * `depth` is signed: negative digs a trench, positive raises a kerb. The band
 * is one heightfield cell wide, which is the narrowest a rut can be — 2 m at
 * `CELL`, against a 1.78 m gauge.
 */
export function makeRutTerrain(depth: number, at = 12): Terrain {
  const n = GRID + 1;
  const extent = GRID * CELL;
  const heights = new Float32Array(n * n);
  const step = Math.round(depth / QUANTUM) * QUANTUM;
  for (let ix = 0; ix < n; ix++) {
    const x = (ix / GRID - 0.5) * extent;
    for (let iz = 0; iz < n; iz++) {
      const z = (iz / GRID - 0.5) * extent;
      const inside = x > 0 && z >= at && z < at + CELL;
      heights[ix * n + iz] = inside ? step : 0;
    }
  }
  return { heights, materials: new Uint8Array(GRID * GRID), seed: 0, extent };
}

export function generateTerrain(seed: number, relief = 1): Terrain {
  const n = GRID + 1;
  const extent = GRID * CELL;
  const heights = new Float32Array(n * n);
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const x = (ix / GRID - 0.5) * extent;
      const z = (iz / GRID - 0.5) * extent;
      heights[ix * n + iz] = heightAt(x, z, seed, relief);
    }
  }
  return { heights, materials: new Uint8Array(GRID * GRID), seed, extent };
}

/**
 * Bilinear height lookup into a generated Terrain. Works for any terrain,
 * including the test ramps, which `heightAt` cannot do since it only knows the
 * noise generator. Used to sit props on the ground.
 */
export function sampleTerrain(terrain: Terrain, x: number, z: number): number {
  const n = GRID + 1;
  const half = terrain.extent / 2;
  const fx = ((x + half) / terrain.extent) * GRID;
  const fz = ((z + half) / terrain.extent) * GRID;
  const ix = Math.max(0, Math.min(GRID - 1, Math.floor(fx)));
  const iz = Math.max(0, Math.min(GRID - 1, Math.floor(fz)));
  const tx = Math.max(0, Math.min(1, fx - ix));
  const tz = Math.max(0, Math.min(1, fz - iz));
  const h = terrain.heights;
  const a = h[ix * n + iz] as number;
  const b = h[(ix + 1) * n + iz] as number;
  const c = h[ix * n + iz + 1] as number;
  const d = h[(ix + 1) * n + iz + 1] as number;
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}
