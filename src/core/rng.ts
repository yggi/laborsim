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
