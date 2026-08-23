# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `BOARD.md`), not
a record (that's `LOG.md`), not settled truth (that's `MEMORY.md`).

A thread leaves this file exactly three ways: it crystallizes into `MEMORY.md`,
it becomes a card in `BOARD.md`, or it is deleted as no longer interesting.

**Gate: 100 lines.** Overflow means threads have gone stale — resolve, promote
or delete. Do not grow the file.

---

## Is the cockpit authored or derived?

**Direct conflict, unresolved, and it is upstream of a whole mode.**

The founding brief has the player *placing and connecting UI controls and
widgets into the viewport* — an authored cockpit, a DIN-rail component view,
the bridge between build and sim. `HANDOVER.md` § 9.4 argues the opposite:
three modes is a stall risk, so components **ship their own instruments** and
the cockpit is **derived**, with OS-mode living inside build while wearing the
sim's pilot viewport. Two modes, not three.

Both keep the DIN rail; they disagree on what the player drags onto it —
*components* (derived instruments follow) or *instruments* (placed by hand).
Derived is cheaper and dodges an empty-cockpit failure state; authored is the
thing that was actually asked for. A middle reading exists — components ship
instruments, the player places them within the panel budget — and may be the
answer, but it has not been chosen. **Every chassis must ship stock wiring that
works, and OS-mode must be tuning, never a gate**, under any of the three.

## Does an external chase camera exist in the shipped game?

Occlusion is a core mechanic and a chase view defeats it — the probe's external
view is strictly better than the cab whenever panels are installed. Cab-only is
coherent but harsh on mobile, which is the primary target. Unresolved, and
upstream of a lot of UI.

Sub-question: **field stowing of panels** — allowed at a cost in hands or
seconds, or not at all?

## Does v0 need the ticket?

The brief defers missions and progression from v0. `HANDOVER.md` § 3 argues job
tickets are not gamification but **the third beat of the failure loop** — KSP
always answers *did you make orbit*, and without a verdict the loop has no
close. Refusing a contract costing less than failing it is what makes the
sandbox real: you are not gated, you are quoting.

For now the acceptance test stands in as v0's verdict. Whether that is enough,
or whether a minimal ticket has to land inside v0 to make failure mean anything,
is open. Deciding it late is the risk.

## Is Rapier in?

The brief named Vite, Vitest, Svelte 5 and Three.js. `HANDOVER.md` names Rapier
too. Recorded in MEMORY as the engine of record because the physics argument
depends on it (determinism for replay, motorized joints), but it has not been
confirmed by the same voice that named the rest, and it is the one choice that
rules out the single-file build. Confirm before it is load-bearing.

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
