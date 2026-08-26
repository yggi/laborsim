/**
 * What a component's parts are handed. One contract for all three postures.
 *
 * A component is one thing you bought, seen from three places at once — the
 * **plate** in the rack, the **cell** on the dash, the **pod** on the glass
 * (`docs/design/cab/components.md`). They were not written that way: cells were
 * given a stage and a style, pods went and found their own stage on the
 * snapshot and hardcoded their maker's colours, and the difference was an
 * accident of which one was built first.
 *
 * So every part gets the same two things — **the slot it is drawn from and the
 * house style it is drawn in** — and the postures differ only by what they
 * genuinely need on top:
 *
 * - a **face** (the module's own strip of its plate) gets nothing more; the rack
 *   supplies the fuse and the bus tap, and settings are the slot's business.
 * - a **cell** gets `controls`, because the base case is a pushbutton.
 * - a **pod** gets `controls` and the whole `snapshot`, because an instrument
 *   reads the machine and not only its own component.
 *
 * The direction is the rule (architecture rule 3): everything a part *shows*
 * arrives as a recording, and everything a part *does* leaves through
 * `Controls`. Nothing here can reach a live module, which is why the same
 * component code draws a replay.
 */

import type { Stage } from "../control/bus.ts";
import type { Controls } from "../control/controls.ts";
import type { Snapshot } from "../core/snapshot.ts";
import type { MakerStyle } from "../makers/houses.ts";

export interface PartProps {
  /** This component's slot, read off the snapshot. Never the live module. */
  readonly stage: Stage;
  /** Its manufacturer's house style, resolved by the cockpit from the stage. */
  readonly style: MakerStyle;
}

/**
 * A module's **face** — the part of a rack plate that belongs to the component
 * rather than to the slot.
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
export interface FaceProps extends PartProps {}

/**
 * A **cell** is the periphery view of a component: always in sight, glanced at
 * rather than read, and cheap. It costs nothing to fit — the indicator row has
 * no budget and nothing to configure, because fighting for space on three fronts
 * (glass, rack, dash) is one front too many (`docs/design/cab/components.md`).
 *
 * That is why a cell gets `controls` but must never call `setParam`: a cell with
 * a setting on it is a cell competing for room. The rule is enforced in
 * `tests/cockpit.test.ts`, along with the harder one — **safety kit's cell must
 * not call `toggle` at all.**
 */
export interface CellProps extends PartProps {
  readonly controls: Controls;
}

/**
 * A **pod** is the eyes view: an instrument on an arm, permanently in front of
 * the world. It is the only part that costs you something to own, and what it
 * costs is view (`docs/design/cab/cockpit.md`).
 *
 * It gets the whole snapshot because an instrument reads the *machine* — the
 * route scope needs the hull's pose to plot a pin, and no readout its own module
 * publishes could carry that. What it must not do is go looking for its own
 * slot on that snapshot: `stage` is already the answer, and a pod that finds
 * itself by id cannot be shown twice or shown for a component it was not fitted
 * to.
 */
export interface PodProps extends PartProps {
  readonly snapshot: Snapshot | undefined;
  readonly controls: Controls;
}
