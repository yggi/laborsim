/**
 * The curriculum — what the rig is going to ask you to do, and on what ground.
 *
 * An exercise is **a site plus an objective**, and that is the whole of it. It
 * lives beside the terrain and the furniture rather than in `src/sim/` because
 * it is world data: deterministic from a seed, generated before anything runs,
 * and handed to the sim rather than invented by it. The rig reads the same list
 * to draw its menu, which is why nothing here is a class or holds a reference —
 * `src/ui/` may not import the sim (rule 3), and it does not have to.
 *
 * **There is exactly one objective verb: reach the pins you were given.** The
 * progression is entirely in the route and the ground — one marker on gentle
 * noise, then five on the full site — and that was worth the discipline. An
 * `ObjectiveKind` enum was written first and deleted: "reach a waypoint" and
 * "reach all waypoints" are the same sentence with a different number of pins,
 * and encoding them as two objectives would have made the second one a feature
 * rather than a consequence.
 *
 * The shape this extends into is in `doc/design/rig/missions.md`: use a tool at a
 * location, collect something, move X to Y. Each of those is a new verb and will
 * cost one; none of them is this one wearing a hat.
 */

import type { RouteSpec } from "./waypoints.ts";

export interface Exercise {
  /** Short and stencilled. It is a form number, not a title. */
  readonly id: string;
  readonly name: string;
  /**
   * What the rig tells you before you start, in its own register: procedural,
   * faintly condescending, and **never** an instruction in how to drive. It may
   * say what the exercise is for. It may not say which way to push the levers.
   */
  readonly brief: string;
  /** The objective, in the imperative, on one line. Shown while you drive. */
  readonly objective: string;
  readonly seed: number;
  /**
   * How much of the terrain generator's amplitude this site gets, 0–1.
   *
   * The climb limit is `atan(MU)` = 43.5°, and the default site has plenty of
   * ground either side of it on purpose. A first exercise cannot: a trainee who
   * has not yet found out that the levers are independent must not also be
   * finding out that the hill was never climbable. So the first site is the same
   * generator turned down, not a different generator — the same shapes, gentler,
   * which is what makes the full site legible when it arrives.
   */
  readonly relief: number;
  /** How much furniture the site is dressed with. See `generateProps`. */
  readonly props: number;
  readonly route: RouteSpec;
}

/**
 * The ladder, in order. Index is the exercise number the operator sees.
 *
 * Four entries and the last one is not an exercise at all: the open site has no
 * pins, so it can never be completed, which is exactly what a sandbox is. v0 is
 * sandbox and exploration (`doc/MEMORY.md` § 3) and missions arriving must not
 * quietly repeal that — so the sandbox is on the menu with the rest, named.
 */
export const EXERCISES: readonly Exercise[] = [
  {
    id: "E-01",
    name: "ORIENTATION",
    brief:
      "One marker has been set out ahead of the pad. Take the machine to it. " +
      "The ground has been graded for this exercise and will not be graded for " +
      "the next one.",
    objective: "REACH THE MARKER",
    seed: 10_001,
    relief: 0.3,
    props: 22,
    route: { count: 1, near: 46, far: 62, ahead: 0.34 },
  },
  {
    id: "E-02",
    name: "THREE STAKES",
    brief:
      "Three markers, no particular order. The site is closer to survey " +
      "condition. Note that the route between two markers has not been " +
      "inspected, and that nothing is going to inspect it for you.",
    objective: "REACH ALL THREE MARKERS",
    seed: 10_002,
    relief: 0.62,
    props: 70,
    route: { count: 3, near: 38, far: 70 },
  },
  {
    id: "E-03",
    name: "SITE ROUNDS",
    brief:
      "Five markers on a working site, as surveyed. Equipment has been left " +
      "where the last shift left it. You are reminded that site fixtures are " +
      "chargeable and that citizens' property is not.",
    objective: "REACH ALL FIVE MARKERS",
    seed: 20_260_823,
    relief: 1,
    props: 130,
    route: { count: 5, near: 40.7, far: 74 },
  },
  {
    id: "E-00",
    name: "OPEN SITE",
    brief:
      "No exercise is scheduled. The site is yours until somebody wants it " +
      "back. Nothing is being assessed, which is not the same as nothing being " +
      "recorded.",
    objective: "NO OBJECTIVE SET",
    seed: 20_260_823,
    relief: 1,
    props: 130,
    route: { count: 0, near: 40.7, far: 74 },
  },
];

/** The first thing anyone sees. Everything else is reached from the menu. */
export const FIRST_EXERCISE = EXERCISES[0] as Exercise;

/**
 * What a world is built from when nobody says.
 *
 * The full site, which is the one every test, probe and screenshot bench was
 * written against and the one the seed `20260823` has always meant. A default
 * that quietly became the gentle site would have re-tuned every measurement in
 * the repo — the settle-step census, the grade probes, the audio scenes — by
 * changing a word.
 */
export const DEFAULT_EXERCISE = EXERCISES[2] as Exercise;

export const exerciseById = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id);

/**
 * The next one down the ladder, or `undefined` at the end of it.
 *
 * The open site is deliberately last and deliberately reachable this way: you
 * finish the curriculum and what you are handed is the sandbox, which is the
 * right shape for a game whose v0 *is* the sandbox.
 */
export function nextExercise(id: string): Exercise | undefined {
  const at = EXERCISES.findIndex((e) => e.id === id);
  return at < 0 ? undefined : EXERCISES[at + 1];
}
