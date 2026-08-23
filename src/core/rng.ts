/**
 * Architecture rule 2: no `Math.random()` is permitted anywhere sim-visible.
 * All randomness comes from here, and the seed is part of the recorded scenario.
 *
 * Attribution is the design: a failure you cannot reproduce cannot be blamed on
 * a design decision, and the whole loop collapses to vibes.
 *
 * See docs/design/architecture-rules.md.
 */

/** A seeded, explicitly-advanced source of randomness. */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** The generator's current position, for snapshotting and replay. */
  state(): number;
}

/**
 * A random heading as a half-angle quaternion about Y, **without trigonometry**.
 *
 * Rejection-samples a unit vector in the plane, then uses the half-angle
 * identities, which need only `Math.sqrt` — and IEEE-754 requires sqrt to be
 * correctly rounded, so this is bit-portable where `Math.sin(yaw / 2)` is not.
 *
 * This exists because placing site furniture with `sin`/`cos` quietly put a
 * non-portable value into collider transforms, which is sim state.
 */
export function randomYawQuat(rng: Rng): { y: number; w: number } {
  let c = 1;
  let s = 0;
  for (let attempt = 0; attempt < 32; attempt++) {
    const a = rng.range(-1, 1);
    const b = rng.range(-1, 1);
    const len2 = a * a + b * b;
    if (len2 > 1e-6 && len2 <= 1) {
      const len = Math.sqrt(len2);
      c = a / len;
      s = b / len;
      break;
    }
  }
  // cos(t/2) = sqrt((1+cos t)/2); sin t = 2 sin(t/2) cos(t/2).
  const w = Math.sqrt(Math.max(0, (1 + c) / 2));
  return w < 1e-9 ? { y: 1, w: 0 } : { y: s / (2 * w), w };
}

/**
 * mulberry32 — small, fast, and adequate for level generation and jitter.
 * Deliberately not cryptographic and deliberately not a shared global.
 */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    state: () => s,
  };
}
