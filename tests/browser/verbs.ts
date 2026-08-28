/**
 * Every verb the driver has to drive — which is the recording's own vocabulary.
 *
 * `doc/BOARD.md` L-075 asked for "one command that drives the shipped app
 * through its verbs and fails when one of them stops working", and the trap in
 * that sentence is *its verbs*: a hand-written list of what to press is a list
 * that goes stale the first time somebody adds a control, silently, in the
 * direction of less coverage.
 *
 * So the list is not invented here. `control/trace.ts` already enumerates it,
 * for another reason and maintained by somebody else: a `Command` is what
 * reached the machine and an `Attention` is what the operator saw, heard and did
 * about it, and **between them they are the shell's verbs**. This file names
 * them once so that two checks can share it:
 *
 * - `tests/browser/drive.test.ts` drives the app and asserts the recording it
 *   produced contains every one of them.
 * - `tests/architecture.test.ts` asserts *this list* is still the whole of both
 *   unions, by reading `control/trace.ts` — in the node suite, in milliseconds.
 *
 * The pair is what makes it self-maintaining. Add a `kind` to either union and
 * the fast suite fails until it is listed here; list it here and the browser
 * suite fails until something actually presses it. Neither half can be satisfied
 * by writing the list down again.
 */

/** What reached the machine, and reproduces it exactly. */
export const COMMAND_KINDS = ["levers", "rack"] as const;

/**
 * What the operator did that reached nothing — and the camera, which is the one
 * stated exception because it takes the levers away (`doc/MEMORY.md` § 12).
 */
export const ATTENTION_KINDS = [
  "horn",
  "posture",
  "view",
  "look",
  "ack",
  "estop",
  "pod",
] as const;
