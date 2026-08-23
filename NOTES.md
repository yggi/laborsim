# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `BOARD.md`), not
a record (that's `LOG.md`), not settled truth (that's `MEMORY.md`).

A thread leaves this file exactly three ways: it crystallizes into `MEMORY.md`,
it becomes a card in `BOARD.md`, or it is deleted as no longer interesting.

**Gate: 100 lines.** Overflow means threads have gone stale — resolve, promote
or delete. Do not grow the file.

---

## Does an external chase camera exist in the shipped game?

Occlusion is a core mechanic and a chase view defeats it — the probe's external
view is strictly better than the cab whenever panels are installed. Cab-only is
coherent but harsh on mobile, which is the primary target.

**Sharpened by § 6.1**: instruments are now mandatory, so occlusion is not
opt-out. A chase camera is therefore not a comfort setting, it is an escape
hatch from a core mechanic. The training frame offers a possible out — a rig
plausibly has an external observation view, and using it could simply be
recorded rather than forbidden.

Sub-question: **field stowing of panels** — allowed at a cost in hands or
seconds, or not at all?

## Determinism discipline: transcendentals are not portable

Rapier's `-deterministic` wasm build is bit-level cross-platform, and
`world.createSnapshot()` hashes identically across machines — so the *physics*
side of replay is solved and testable from day one.

**Our own sim code is not covered by that.** ECMAScript does not require
`Math.sin`, `cos`, `exp` or `pow` to be bit-identical across engines, and the
probe's analytic height field `H(x,z)` is built almost entirely from them. Two
players on different browsers could generate microscopically different terrain
and diverge.

Options: bake the field once and ship it as data; use our own polyfilled
transcendentals in anything sim-visible; or scope replay to same-device only
and say so. Unresolved, but it must be decided **before** `H(x,z)` is ported,
because it determines whether terrain is code or an asset.

## What does "multi-layer" cut along, for the player?

The physics tiers in `physics-migration.md` are a *development* fidelity ladder,
not a player-facing one. Still unanswered: whether the player sees a **domain
stack** (structure / mechanics / power / thermal / signal) they can open
individually, or a **fidelity ladder** they can descend, or both as a matrix.
Shapes `src/sim/layers/` directly.

## Gain tuning is a trap

Tedious, and it lets players brute-force past the interesting choice. The
working answer — make topology, priority and sensor selection the game, expose
gains as **one slider with a visible margin readout** — is a directive, not yet
a design. Watch for it creeping back in as per-component tuning.

## What does the procedural generator generate?

Landscape is scenery. **Job sites** — footing, clearances, load, an unsurveyed
obstruction — are the puzzle, and the thing that makes a load chart
insufficient. What that means as a generator is unwritten.

## Scale, and what "browser" costs us

World size, part counts, whether sim runs off the main thread. Now constrained
by mobile-first and by Rapier's wasm budget. Must be answered before `src/sim/`
gets real.
