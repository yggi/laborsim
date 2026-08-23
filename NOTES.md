# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `BOARD.md`), not
a record (that's `LOG.md`), not settled truth (that's `MEMORY.md`).

A thread leaves this file exactly three ways: it crystallizes into `MEMORY.md`,
it becomes a card in `BOARD.md`, or it is deleted as no longer interesting.

**Gate: 100 lines.** Overflow means threads have gone stale — resolve, promote
or delete. Do not grow the file.

---

## The mobile budget — bytes, frames, and world size

One thread, because they are one question: mobile-first is a hard pillar and
**nothing about it has been measured.**

*Bytes.* The empty scaffold already built to 3.44 MB raw / 1.25 MB gzipped, and
`-compat` inlines Rapier's wasm as base64 at about a third extra size. Levers,
cheapest first: plain deterministic build plus `vite-plugin-wasm`, code-split
build mode from sim, lazily load instruments.

*Frames.* ~130 props, ink shells doubling every mesh, greebles, per-grouser
track geometry — and no frame ever timed on a phone. L-034 gets the number.

*World size and part counts*, and whether the sim runs off the main thread,
follow from those two numbers rather than preceding them. Must be answered
before `src/sim/` grows.

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

## What does a damaged machine feel like to drive?

Damage to the vehicle is carded (L-038) as break-and-reset. The stronger version
is **degradation before destruction**: a track that has lost grip, a bent frame
that pulls to one side, a sprocket that will not take full torque. It would make
a damaged machine a *different machine*, which is exactly the subject of the
whole project — and it is the most expensive thing on the list.

The friction model can already express most of it (per-track `MU`, a bias in the
normal-load share), which is suspicious in a good way. Not v0; revisit when
L-038 lands, and do not let the reset design foreclose it.
