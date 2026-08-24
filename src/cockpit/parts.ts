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

/**
 * Rack units — how tall a component's faceplate is.
 *
 * A rack is a *standard*, and a standard has a pitch. Plates come in whole
 * units so the rail reads as a rack of bought equipment rather than a list that
 * happens to have rows; it also means a maker cannot make its plate taller to
 * get more attention, which is the failure mode a free-height rail invites.
 *
 * Two sizes for now: **1U** for something with nothing to configure, **2U** for
 * something with settings. A third needs an argument, the same way a fifth verb
 * does. A component that will not fit its unit has too much on its faceplate —
 * that is the constraint doing its job, not a layout problem.
 *
 * It lives here rather than on `Module` because panel geometry is a cockpit
 * fact: nothing under `src/modules/` should know how tall it is drawn.
 */
export type Units = 1 | 2;

const UNITS: Record<string, Units> = {
  // Two levers and no settings. It does not need the room.
  PILOT: 1,
  NAV: 2,
  TILT: 2,
};

export const unitsFor = (id: string): Units => UNITS[id] ?? 2;

/** Ids with a deliberate registry entry, for the conformance tests. */
export const REGISTERED: readonly string[] = Object.keys(CELLS);
