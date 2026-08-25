/**
 * Cage space, and the reach of an arm.
 *
 * A pod is not an overlay pinned to a screen. It is an instrument on an **arm
 * clamped to the cage**, so where it may sit is decided by the cab's structure
 * rather than by the edges of a rectangle: the pillars either side, the header
 * beam above, the dash below, and how far the arm extends.
 *
 * **Cage space is screen space at the neutral look.** The whole cab sweeps as
 * one rigid object when the pilot looks around, so a pod's position on the
 * glass is the same fact whichever way the head is pointing — which is exactly
 * why placement is judged here and not against the viewport.
 *
 * No DOM in this file. It is the geometry, so it can be tested without one.
 */

/** The cage's own dimensions, in CSS pixels. Also published to the stylesheet
 *  as `--cage-pillar` / `--cage-beam`, so the frame you see and the frame a
 *  drop is judged against cannot drift apart. */
export const PILLAR = 22;
export const BEAM = 26;

/**
 * How far an arm extends from its pillar into the glass.
 *
 * Chosen against the phone, which is the only viewport this game is designed
 * for, and it decides two things at once. At 390 px wide it leaves about 76 px
 * of play either side — enough that placement is a real choice — while putting
 * the middle of the windscreen out of reach of a full-size instrument, so
 * **you cannot park one in front of your own eyeline**. That is the occlusion
 * budget (L-025) getting a structural reason instead of a rule.
 *
 * The consequence is better than the intent: a *small* instrument still reaches
 * the centre, because a short pod on a long arm does. Cheap in view, free to
 * place; expensive in view, pushed to the edges. Nobody designed that.
 *
 * It is a length, not a fraction — the honest thing for a steel arm, and the
 * reason a much wider glass has a much bigger dead middle (see L-056). Later it
 * is per-component data, once a component can declare its own hardware (L-006);
 * one constant is the right amount of machinery for one arm length.
 */
export const REACH = 200;

/** A box in cage coordinates. Same axes as the screen: y grows downward. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The glass a pod is being placed on, at the neutral look. */
export interface Glass {
  readonly width: number;
  readonly height: number;
  /** How much of the bottom the dash is occupying. It grows as kit is fitted. */
  readonly dash: number;
}

/**
 * Which pillar the arm clamps to, and how far it has to reach to hold a pod
 * where it has been put.
 *
 * The clamp slides up and down the pillar — that is why there is no vertical
 * term here — and the arm comes off whichever side is nearer, because a fitter
 * bolts it to the post it can reach.
 */
export function armReach(
  box: Box,
  glass: Glass,
): {
  side: "left" | "right";
  reach: number;
} {
  const fromLeft = box.right - PILLAR;
  const fromRight = glass.width - PILLAR - box.left;
  return fromLeft <= fromRight
    ? { side: "left", reach: fromLeft }
    : { side: "right", reach: fromRight };
}

/**
 * May a pod sit here? Four structural answers and no screen edge among them:
 * not through a pillar, not behind the beam, not behind the dash, and not
 * further out than the arm goes.
 */
export function fitsCage(box: Box, glass: Glass): boolean {
  if (box.left < PILLAR || box.right > glass.width - PILLAR) return false;
  if (box.top < BEAM || box.bottom > glass.height - glass.dash) return false;
  return armReach(box, glass).reach <= REACH;
}
