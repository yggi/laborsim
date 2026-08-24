/**
 * The registry — which component owns which part of the cockpit.
 *
 * This is the seam that keeps architecture rule 1 intact. A module declares what
 * it *publishes* (its readout, its condition, whether it is safety kit) and
 * never how it is drawn, because nothing under `src/modules/` may touch the DOM.
 * The mapping from a module to its plate, cell and pod lives here instead, on
 * the cockpit side of the boundary, keyed by module id.
 *
 * Before this, the dash reached into TILT-GUARD's private readout to decide
 * whether to light a lamp, which meant every new component was an edit to the
 * dash. Now a component arrives with its own cell or does not, and the dash
 * neither knows nor cares which components exist.
 *
 * Registering a cell is optional and registering `null` is a statement: the
 * chassis brings the whole dashboard, so it needs no lamp to tell you the levers
 * are fitted. Anything unregistered gets the base case, which is the right
 * default — a component you have never seen before still shows up as one lens
 * and a strip of label tape.
 */

import type { Component } from "svelte";
import type { CellProps } from "./cell.ts";
import BasicCell from "./cells/BasicCell.svelte";
import NavCell from "./cells/NavCell.svelte";
import TiltCell from "./cells/TiltCell.svelte";

export type Cell = Component<CellProps>;

/** `null` means *deliberately no cell*, which is different from unregistered. */
const CELLS: Record<string, Cell | null> = {
  // The chassis component. It has a plate (your two levers) and it brings the
  // dashboard, the cage and the glass — so it is the one thing on the machine
  // that does not need an indicator saying it is there.
  PILOT: null,
  NAV: NavCell as Cell,
  TILT: TiltCell as Cell,
};

export function cellFor(id: string): Cell | null {
  return id in CELLS ? (CELLS[id] ?? null) : (BasicCell as Cell);
}

/** Ids with a deliberate registry entry, for the conformance tests. */
export const REGISTERED: readonly string[] = Object.keys(CELLS);
