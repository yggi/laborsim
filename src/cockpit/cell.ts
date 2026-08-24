/**
 * What every dashboard cell is handed.
 *
 * Separate from `parts.ts` so a cell can import the contract without importing
 * the registry that imports it back.
 *
 * A cell is the **periphery** view of a component: always in sight, glanced at
 * rather than read, and cheap. It costs nothing to fit — the indicator row has
 * no budget and nothing to configure, because fighting for space on three fronts
 * (glass, rack, dash) is one front too many (`docs/design/components.md`).
 */

import type { Stage } from "../control/bus.ts";
import type { MakerStyle } from "./makers.ts";

export interface CellProps {
  /** This component's slot, read off the snapshot. Never the live module. */
  readonly stage: Stage;
  readonly style: MakerStyle;
  /**
   * Toggle the component. Safety kit must **not** call this — its cell carries
   * no toggle at all, and bypassing it means opening the rack and paying with
   * the glass.
   */
  readonly onToggle: () => void;
}
