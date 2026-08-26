/**
 * What a rung-one machine is fitted with, beyond the chassis.
 *
 * **v0's build surface is the rack** (`doc/MEMORY.md` § 3), so this list *is*
 * the build: the machine you are handed at the start of a session, before you
 * have reordered anything or switched anything off. The first file in
 * `src/build/`, and the first one that is about assembly rather than about a
 * running machine.
 *
 * It is a function of the world because both of these need one to read a pose
 * off, and the world does not exist until Rapier has landed. That is *why*
 * `createRun` takes a `fit` callback rather than building them itself — a run
 * with `createAutonav` in it would be a run with opinions about the machine
 * (`platform/run.ts`). Which list gets passed stays the shell's decision; this
 * is only the list.
 *
 * Nothing keeps a reference to either module: their instruments read the
 * snapshot and command through the same handles as everything else.
 */

import type { Module } from "../control/bus.ts";
import { createAutonav } from "../modules/autonav.ts";
import { createTiltGuard } from "../modules/tiltguard.ts";
import type { SimWorld } from "../sim/world.ts";

export function fitRungOne(world: SimWorld): readonly Module[] {
  return [
    /**
     * NAV-1, **off**, under `CAP` and below the pilot — so parked levers cap
     * guidance to zero. The dead-man's throttle, and the acceptance scenario in
     * one slot (BOARD L-066).
     */
    createAutonav(
      world.waypoints,
      () => {
        const t = world.machine.body.translation();
        return { x: t.x, z: t.z, rotation: world.machine.body.rotation() };
      },
      { verb: "CAP", enabled: false },
    ),
    /**
     * TILT-GUARD at the bottom of the rail, below everything: it is the last
     * thing between the rack and the tracks, which is where a safety component
     * belongs and also where it is most annoying. Move it up and it guards only
     * what is above it — that is the ordering lesson, in one slot.
     *
     * It ships **enabled**, because safety kit does. Finding out that the thing
     * stopping you halfway up a grade is your own machine being careful — and
     * then finding its LED — is the best first lesson rung 1 has.
     */
    createTiltGuard(() => world.machine.body.rotation()),
  ];
}
