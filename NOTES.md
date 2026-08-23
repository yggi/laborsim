# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `BOARD.md`), not
a record (that's `LOG.md`), not settled truth (that's `MEMORY.md`).

A thread leaves this file exactly three ways: it crystallizes into `MEMORY.md`,
it becomes a card in `BOARD.md`, or it is deleted as no longer interesting.

**Gate: 100 lines.** Overflow means threads have gone stale — resolve, promote
or delete. Do not grow the file.

---

## First-load weight on mobile

The empty scaffold already builds to **3.44 MB raw / 1.25 MB gzipped**, and
there is no game in it. Three.js and Rapier are roughly comparable
contributors, and the `-compat` flavour of Rapier inlines its wasm as base64,
which costs about a third in size over shipping the binary.

Mobile-first is a hard pillar, so this is a real budget question, not a
premature optimisation — but it is also not urgent while there is nothing to
load. Levers, cheapest first: drop `-compat` for the plain deterministic build
plus `vite-plugin-wasm` (wasm streams and compresses properly), code-split the
build mode away from the sim, and lazily load instruments.

Worth setting an explicit first-load budget *before* the bundle grows enough to
make the choice for us.

## Missions, and what "operator interaction" means

A play session produced a coherent direction — Zachtronics-style budgeting,
scored on budget / time / **complexity**, with complexity as parts-and-weight
traded against operator interaction. Written up in `docs/design/missions.md`
and explicitly **not v0**.

Two things there are worth carrying even if missions never land. First: it
inverts the chase camera from a cost into a reward, because a solution good
enough to run itself is one you can watch. Second: determinism stops being only
an attribution tool and becomes the substrate for *verifying* a solution across
several sites.

The unresolved core is the metric. **What counts as operator interaction** —
lever changes, seconds hands-on, distinct inputs? It is the load-bearing number
in the only scoring axis that puts two goods in tension, and it is undefined.

## Field stowing of panels

Left over from the chase-camera decision. Instruments are installed, not
toggled — but may they be *stowed* in the field at a cost in hands or seconds,
or not at all? The chase camera's shape suggests an answer (available, but it
costs you something real while it is up), which has not been confirmed.

## Does equal-share normal load hold up for the load chart?

The track model splits weight equally across every sample touching ground. That
was enough for rung 1 and it produced a textbook friction limit — but it ignores
**load transfer**, and a machine nose-down on a grade or braking hard really
does put more weight on one end of the track.

The load chart (L-021) is about precisely that: payload against reach, with
tipping as a named failure mode. Equal-share cannot express it. The fix is to
weight each sample's normal load by hull attitude and acceleration, which is a
contained change to one function — but it wants doing when the load chart lands,
not speculatively before.

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
