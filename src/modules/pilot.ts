/**
 * PILOT — two thumbs on two levers, and a rack entry like any other.
 *
 * It is also **the chassis component**: it brings the dashboard, the cage and
 * the glass, it costs nothing, and it is why it has no cell on the dash — you do
 * not need a lamp to tell you the levers are fitted
 * (`doc/design/cab/components.md`). Being an ordinary slot is the point: it can
 * be reordered, and NAV-1 sitting below it under `CAP` is the acceptance
 * scenario in one move.
 *
 * It reads `hands` rather than the cab's runes because `runRack` calls `intent`
 * from inside `world.step()`, inside the render loop, which is not a reactive
 * scope. That read was the worst of the five the seam was built for: sixty times
 * a second, through a module callback, where nobody thought to look (L-069).
 *
 * Architecture rule 1: no renderer and no DOM — `hands` is a plain object.
 */

import {
  ACTIVE,
  CHASSIS,
  type Condition,
  type Module,
  NOMINAL,
} from "../control/bus.ts";
import type { Hands } from "../control/hands.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";

export function createPilot(hands: Hands): Module {
  return {
    id: CHASSIS,
    label: "PILOT",
    maker: "KIBA WORKS",
    considers: "your two thumbs",
    verb: "SET",
    enabled: true,
    intent: () => ({
      left: hands.leverL * MAX_TRACK_SPEED,
      right: hands.leverR * MAX_TRACK_SPEED,
    }),
    // Hands on the levers is active; hands off is nominal. It never warns —
    // KIBA does not believe the operator is a fault condition.
    condition: (): Condition =>
      hands.leverL !== 0 || hands.leverR !== 0 ? ACTIVE : NOMINAL,
  };
}
