# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `BOARD.md`), not
a record (that's `LOG.md`), not settled truth (that's `MEMORY.md`).

A thread leaves this file exactly three ways: it crystallizes into `MEMORY.md`,
it becomes a card in `BOARD.md`, or it is deleted as no longer interesting.

**Gate: 100 lines.** Overflow means threads have gone stale — resolve, promote
or delete. Do not grow the file.

---

## What does "multi-layer" cut along?

Two readings, probably both true, not yet reconciled:

- **Domain stack** — structure / mechanics / power / thermal / signal, each a
  layer that runs and can be opened and read.
- **Fidelity ladder** — the same subsystem simulated at selectable depth, so a
  player can start arcade and drop into the real model.

If both: are they orthogonal (a matrix), or does fidelity live inside each
domain layer independently? That answer shapes `src/sim/layers/` directly.

## Where does the "educational" surface actually live?

Inspectability is a pillar, but the *place* it happens is undecided. Candidates:
a cockpit widget (in-fiction, readable while driving), a debug overlay (out of
fiction, honest), or a post-run replay/telemetry view (best for reconstructing
failure, worst for immediacy). Probably more than one, but which is primary
changes what the sim layers must expose and when.

## Is the control hierarchy a tree, a graph, or a priority stack?

"Hierarchy" implies a tree, but arbitration between a gait stabilizer and an
autopilot both reaching for the same actuator smells like priority + veto, not
parent/child. KSP's staging analogy is a *sequence*, which is a third shape
again. Getting this wrong makes edit-cockpit unbuildable.

## How does a machine fail *legibly* rather than just fail?

The pillar demands the player can reconstruct the cause. Unclear whether that is
achieved by simulation honesty alone (it just is reconstructable if you watched
carefully), or needs explicit machinery — a causal chain the sim records and can
play back. The second is much more work and might be the actual product.

## Hazards as equalizer — how blunt?

Radiation / EMF making electronics fail is the mechanism that keeps the dozer
viable. Open: is it binary (electronics dead), degrading (noise, dropouts,
lying sensors), or attack-shaped (something is *doing* this to you)? Degrading
teaches more; binary is far more readable. Phantom-Labor framing suggests the
third eventually.

## What is the smallest machine that proves the loop?

Needed to pick a v0 vertical slice: the least complex thing that still exercises
build → wire → cockpit → sim → back. A dozer with one arm and two levers might
be enough; it may be too simple to show contention, which is the point.

## Scale, and what "browser" costs us

Unresolved: world size, machine part counts, whether sim runs off the main
thread. This is deferred but it will constrain the sim layer design, so it must
be answered before `src/sim/` gets real.
