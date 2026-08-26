/**
 * "Keep your eyes on the road", in the chassis maker's own words.
 *
 * The cage is the chassis maker's structure, so the nag is its voice — and it is
 * the first thing to consume `voice.tips`, which had been populated for all
 * three makers and read by nothing (`doc/design/cab/components.md`).
 *
 * It fires when a **long look comes back to centre**, and then not again for a
 * while: a reminder you get every time you glance is one you learn to ignore,
 * and the point is the opposite of that. Watching the return rather than the
 * departure is deliberate — the cab recentres itself, so the moment worth
 * speaking into is the one where the operator has just been shown that.
 *
 * No runes. Nothing reactive reads any of this: it is fed one number a frame
 * from outside the reactive graph and it either says something or does not.
 */

import { styleOf } from "../makers/houses.ts";

/** How far off centre, as a fraction of the glass, counts as *looking away*. */
export const NAG_AFTER = 0.6;
/** And how long the maker then keeps quiet for, ms. */
export const NAG_COOLDOWN_MS = 45_000;
/** How close to centre counts as back. */
const CENTRED_PX = 24;

export interface Nag {
  /**
   * Where the head is pointing, px from centre, and how wide the glass is.
   * Called once a frame from the render loop.
   */
  look(offsetX: number, glassWidth: number): void;
}

export function createNag(
  maker: string,
  notify: (maker: string, head: string, body: string) => void,
  /** Injectable so the cooldown is a testable rule rather than a 45 s wait. */
  now: () => number = () => performance.now(),
): Nag {
  let lookedAway = false;
  /**
   * Not `0`: a wall clock a minute into the session is already past any cooldown
   * measured from zero, and the *first* nag is the one that teaches you the view
   * comes back on its own. It was silent for 45 s once.
   */
  let lastNag = Number.NEGATIVE_INFINITY;
  let tipIndex = 0;

  return {
    look(offsetX, glassWidth) {
      if (Math.abs(offsetX) > glassWidth * NAG_AFTER) {
        lookedAway = true;
        return;
      }
      if (!lookedAway || Math.abs(offsetX) > CENTRED_PX) return;
      lookedAway = false;
      const at = now();
      if (at - lastNag < NAG_COOLDOWN_MS) return;
      lastNag = at;
      const { wordmark, voice } = styleOf(maker);
      const tip = voice.tips[tipIndex % voice.tips.length];
      tipIndex++;
      if (tip) notify(maker, wordmark, tip);
    },
  };
}
