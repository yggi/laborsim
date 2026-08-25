/**
 * The registry — what arrives in the box when you buy a component.
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
 * **One packet per component, not one table per part.** Cells, faces, rack units
 * and fuse ratings each used to have their own `Record` keyed by the same id, so
 * fitting a component meant four edits in four places and a pod meant editing
 * `App.svelte` as well — which is how the pod ended up outside the registry
 * altogether. A packet is the whole delivery: this is what you unpack, this is
 * what a manufacturer's author is asked to produce, and this is the single
 * place a new component is registered.
 *
 * A packet is optional and a component with no packet is not an error: it gets
 * the base case, which is the right default — a component you have never seen
 * before still shows up as one lens and a strip of label tape. Registering a
 * cell as `null` is a different statement: the chassis brings the whole
 * dashboard, so it needs no lamp to tell you the levers are fitted.
 */

import type { Component } from "svelte";
import BasicCell from "./cells/BasicCell.svelte";
import NavCell from "./cells/NavCell.svelte";
import TiltCell from "./cells/TiltCell.svelte";
import type { CellProps, FaceProps, PodProps } from "./contract.ts";
import NavFace from "./faces/NavFace.svelte";
import NavScope from "./pods/NavScope.svelte";
import TiltGauges from "./pods/TiltGauges.svelte";

export type Cell = Component<CellProps>;
export type Face = Component<FaceProps>;
export type Pod = Component<PodProps>;

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

/** Everything the cockpit gets when a component is fitted. */
export interface Packet {
  /**
   * The dashboard indicator. `null` means *deliberately none*, which is a
   * different statement from a component the registry has never heard of.
   */
  readonly cell: Cell | null;
  /**
   * The module's own strip of its rack plate. Most components have none: a plate
   * with an identity and a couple of limit sliders is a complete plate. A face
   * is for kit with something of its own to show, and so far that is TOWA,
   * because TOWA cannot help itself.
   */
  readonly face?: Face;
  /**
   * The instrument on the glass. Optional, and its maker decides whether one
   * exists at all — a capability component pays for itself in view, a safety
   * component pays in capability and need not cost glass at all.
   */
  readonly pod?: Pod;
  readonly units: Units;
  /**
   * What the slot is fused at, in amps.
   *
   * Blade fuses are **colour-coded by rating** — the same code on every vehicle
   * built since about 1976 — so the rating is legible across the cabinet without
   * reading anything, and a component's current draw becomes a visible fact
   * about it. The drive controls take the big green thirty; guidance electronics
   * sip five; a guard sits in the middle on ten.
   *
   * It is characterisation with a real referent, which is the cheapest kind: the
   * numbers are not invented, they are what you would actually fit.
   */
  readonly amps: number;
}

const PACKETS: Record<string, Packet> = {
  // The chassis component. It has a plate (your two levers) and it brings the
  // dashboard, the cage and the glass — so it is the one thing on the machine
  // that does not need an indicator saying it is there, and the one thing that
  // costs no view, because the view is its.
  PILOT: { cell: null, units: 1, amps: 30 },
  NAV: {
    cell: NavCell as Cell,
    face: NavFace as Face,
    pod: NavScope as Pod,
    units: 2,
    amps: 5,
  },
  TILT: { cell: TiltCell as Cell, pod: TiltGauges as Pod, units: 2, amps: 10 },
};

const packetFor = (id: string): Packet | undefined => PACKETS[id];

export function cellFor(id: string): Cell | null {
  const packet = packetFor(id);
  if (!packet) return BasicCell as Cell;
  return packet.cell;
}

export const podFor = (id: string): Pod | undefined => packetFor(id)?.pod;

export const faceFor = (id: string): Face | undefined => packetFor(id)?.face;

/** Unknown kit gets the bigger plate: better a spare unit than a clipped one. */
export const unitsFor = (id: string): Units => packetFor(id)?.units ?? 2;

/** Unknown kit is fused mid-range, on the blue fifteen. */
export const ampsFor = (id: string): number => packetFor(id)?.amps ?? 15;

/**
 * The standard blade-fuse colour code. Not a palette decision — this is the
 * table, and getting it wrong would be like drawing a resistor with the wrong
 * bands.
 */
const FUSE_COLOURS: Record<number, string> = {
  1: "#2b2b2b",
  2: "#8a8f92",
  3: "#7b5aa6",
  4: "#e79ab5",
  5: "#c8a06a",
  7.5: "#7a4a34",
  10: "#d0342c",
  15: "#3f7fd0",
  20: "#e8d13a",
  25: "#e7e3d8",
  30: "#3faa63",
  40: "#e8802c",
};

export const fuseColour = (amps: number): string => FUSE_COLOURS[amps] ?? "#8a8f92";

/** Ids with a packet of their own, for the conformance tests. */
export const REGISTERED: readonly string[] = Object.keys(PACKETS);
