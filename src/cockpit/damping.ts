/**
 * Instrument damping — the mechanical needle damper, in one function.
 *
 * Why an instrument may filter at all, when the rule is that every gauge reads a
 * real simulated quantity: a damped needle *is* the real quantity. Every dial on
 * a real machine has a damper in it — oil, a restricted orifice, a shorted coil —
 * because the raw signal off a sensor is never what a person can read. Filtering
 * in the instrument is the instrument doing its job; filtering in the sim would
 * be the machine lying to its own telemetry.
 *
 * It earned its place with numbers. The traction reading is an impulse ratio
 * recomputed from scratch every step, and on flat ground at full speed it spent
 * **21% of the run above the gauge's own danger band** while the machine was
 * doing nothing wrong — jittering 0.06 of full scale per sim step. The UI reads
 * snapshots at `SNAPSHOT_HZ` (10), and *decimating* a signal like that rather
 * than averaging it triples the jump between updates, to 0.19. Measured over a
 * 20 s run at each of flat, 25° and 40°:
 *
 * | pipeline | flat above danger | flat-to-40° separation |
 * |---|---|---|
 * | raw, 60 Hz | 23.0% | 1.50 σ |
 * | decimated to 10 Hz (what the dash did) | 21.0% | 1.53 σ |
 * | decimated, damped at 0.6 s | **0.0%** | **2.12 σ** |
 * | sim-side window mean, damped at 0.6 s | 0.0% | 2.29 σ |
 *
 * So the damper does the work and the sim keeps its definition. Publishing a
 * pre-averaged traction from the sim buys another 0.17 σ, which is not worth a
 * second meaning for one field.
 *
 * Architecture rule 3 holds: this is a pure function of a snapshot value and a
 * time step. It reaches nothing.
 */

/**
 * One damping step toward `target`, over `dt` seconds, with time constant `tau`.
 *
 * `null` in either direction is a state, not a number, and the damper does not
 * interpolate through it: a reading that stops existing takes the needle with
 * it, and one that starts existing snaps to where it is. Fading in from a stale
 * value would be the gauge inventing the moment a track found ground again.
 */
export function damp(
  previous: number | null,
  target: number | null,
  dt: number,
  tau: number,
): number | null {
  if (target === null) return null;
  if (previous === null || !(dt > 0) || !(tau > 0)) return target;
  // Rate-independent, so a dropped frame or a slow phone damps by the same
  // amount of *time* rather than the same number of updates.
  return previous + (1 - Math.exp(-dt / tau)) * (target - previous);
}
