/**
 * TILT-GUARD — the first safety component, and the second dumb one.
 *
 * It watches hull pitch and roll and winds the drivetrain down as the machine
 * approaches the limits set on its faceplate. At the limit it winds it to zero.
 *
 * What it does **not** consider is the whole design:
 *
 *   - not *why* you are tilted — a grade, a spoil pile, one track on a kerb;
 *   - not which way is out, so it slows you down just as hard when you are
 *     driving *off* the slope as when you are driving onto it;
 *   - not the difference between a slow lean and a fast one.
 *
 * So a conservative pitch limit will stop you halfway up a grade the machine
 * could have climbed, leave you nose-high with no drive, and then let gravity
 * have the argument. That is the module working correctly, and it is what makes
 * the limit sliders a real decision rather than a difficulty setting.
 *
 * Verb defaults to **AMP**: it multiplies whatever reached it by a gain, so it
 * keeps the sign of the command and cannot turn a reversing machine around.
 * `CAP` here would do exactly that — a fine thing to discover by trying it.
 *
 * Architecture rules 1 and 2: no renderer, and no transcendental closes a loop.
 * Attitude comes out of the quaternion as the sines of pitch and roll, which is
 * multiplication and addition — see the note on the limits below.
 */

import {
  ALARM,
  type Condition,
  type Module,
  NOMINAL,
  type Param,
  type TrackCommand,
  type Verb,
  WARN,
} from "../control/bus.ts";
import { RIGHT_X } from "../core/spec.ts";
import { clamp, type Quat, rotate, vec } from "../core/vec.ts";

/**
 * Fraction of the limit at which it starts easing off. Below this it has
 * nothing to say and passes the signal through untouched, which is why the
 * slot sits idle on flat ground instead of quietly scaling everything.
 */
const EASE = 0.6;

/** Faceplate range, degrees. Above 45° nothing on rung 1 stays upright anyway. */
const MIN_LIMIT = 5;
const MAX_LIMIT = 45;

/**
 * Limits are set in whole degrees and used as sines. Same argument and the same
 * quantum as `makeRampTerrain`'s slope.
 *
 * deterministic-exempt: `Math.sin` is not bit-portable, but this is quantized
 * to 1e-6 — nine orders above the ~1e-16 engines disagree by.
 */
const sineOf = (degrees: number): number =>
  Math.round(Math.sin((degrees * Math.PI) / 180) * 1e6) / 1e6;

/** The machine's own right, as a unit vector. `RIGHT_X` is the one fact. */
const BODY_RIGHT = vec(RIGHT_X / Math.abs(RIGHT_X), 0, 0);
const BODY_FORWARD = vec(0, 0, 1);

export interface TiltGuard extends Module {
  /** Degrees of nose-up or nose-down allowed before drive reaches zero. */
  pitchLimit: number;
  /** Degrees of lean allowed before drive reaches zero. */
  rollLimit: number;
}

export function createTiltGuard(
  attitude: () => Quat,
  options: { verb?: Verb; enabled?: boolean; pitch?: number; roll?: number } = {},
): TiltGuard {
  // Defaults are deliberately timid — a safety component from a maker with
  // lawyers. The machine can climb 43.5°; this stops it at 25°, and the pilot
  // has to decide whether to argue with it.
  let pitchLimit = options.pitch ?? 25;
  let rollLimit = options.roll ?? 18;

  /** Signed, in sines: +pitch is nose-up, +roll is leaning to the right. */
  function tilt(): { pitch: number; roll: number } {
    const q = attitude();
    return {
      pitch: rotate(q, BODY_FORWARD).y,
      roll: -rotate(q, BODY_RIGHT).y,
    };
  }

  const param = (
    id: string,
    label: string,
    get: () => number,
    set: (v: number) => void,
  ): Param => ({
    id,
    label,
    unit: "°",
    min: MIN_LIMIT,
    max: MAX_LIMIT,
    step: 1,
    get,
    set: (v) => set(clamp(Math.round(v), MIN_LIMIT, MAX_LIMIT)),
  });

  const guard: TiltGuard = {
    id: "TILT",
    label: "TILT-GUARD",
    maker: "HANSA REGELTECHNIK",
    considers: "hull pitch and roll. Not why, and not the way out.",
    verb: options.verb ?? "AMP",
    enabled: options.enabled ?? true,
    // Safety kit. Its cell carries no toggle, bypassing it costs you the glass,
    // and a bypassed guard stands at WARN until it is put back.
    safety: true,
    get pitchLimit() {
      return pitchLimit;
    },
    set pitchLimit(v: number) {
      pitchLimit = v;
    },
    get rollLimit() {
      return rollLimit;
    },
    set rollLimit(v: number) {
      rollLimit = v;
    },
    params: [
      param(
        "pitch",
        "PITCH",
        () => pitchLimit,
        (v) => {
          pitchLimit = v;
        },
      ),
      param(
        "roll",
        "ROLL",
        () => rollLimit,
        (v) => {
          rollLimit = v;
        },
      ),
    ],
    readout() {
      const { pitch, roll } = tilt();
      return {
        pitch,
        roll,
        pitchLimit: sineOf(pitchLimit),
        rollLimit: sineOf(rollLimit),
        gain: gainAt(pitch, roll),
      };
    },
    /**
     * Winding you down is a caution; having taken the drivetrain to zero is an
     * alarm, because at that point the machine will not move and gravity is
     * about to have the argument. Note it never reports a *fault* — the module
     * is working perfectly in both states, which is exactly the lesson.
     */
    condition(): Condition {
      const { pitch, roll } = tilt();
      const gain = gainAt(pitch, roll);
      if (gain <= 0) return ALARM;
      return gain < 1 ? WARN : NOMINAL;
    },
    intent(): TrackCommand | null {
      const { pitch, roll } = tilt();
      const gain = gainAt(pitch, roll);
      // Nothing to say on level ground: pass through, and let the slot show
      // idle rather than pretending to work.
      if (gain >= 1) return null;
      return { left: gain, right: gain };
    },
  };

  /** 1 below the ease point, falling linearly to 0 at the worse of the limits. */
  function gainAt(pitch: number, roll: number): number {
    const worst = Math.max(
      Math.abs(pitch) / sineOf(pitchLimit),
      Math.abs(roll) / sineOf(rollLimit),
    );
    if (worst <= EASE) return 1;
    return clamp((1 - worst) / (1 - EASE), 0, 1);
  }

  return guard;
}
