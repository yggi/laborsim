/**
 * What a module's **face** is handed — the part of a rack plate that belongs to
 * the component rather than to the slot.
 *
 * Reversing an earlier decision (2026-08-24): **power and mode belong to the
 * slot, not to the module.** The rack supplies a fuse on the left and a bus tap
 * on the right, identically for everyone, because that is what a rack *is* — a
 * standard that anything can be plugged into. A module owns its style and its
 * own interface and nothing else.
 *
 * The old arrangement gave every module the same enable lamp and the same verb
 * button, drawn by the rack but sitting inside the plate as though the maker had
 * chosen them. That reads as a form, not as equipment: no manufacturer ships the
 * fuse you power it through.
 *
 * A face is optional. A component with nothing to show — the pilot's two levers
 * — has none, and the plate is just its identity.
 */

import type { Stage } from "../control/bus.ts";
import type { MakerStyle } from "./makers.ts";

export interface FaceProps {
  /** This component's slot, read off the snapshot. Never the live module. */
  readonly stage: Stage;
  readonly style: MakerStyle;
}
