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

*Frames.* ~130 props, ink shells doubling every mesh, greebles, per-grouser track
geometry — and no frame ever timed on a phone. L-034 gets the number.

*World size and part counts* follow from those two numbers rather than preceding
them — and 130 dynamic bodies now step every frame. Must be answered before
`src/sim/` grows.

## Missions, and what "operator interaction" means

Zachtronics-style budgeting, scored on budget / time / **complexity**, with
complexity as parts-and-weight traded against operator interaction. Written up in
`docs/design/missions.md` and explicitly **not v0**. Two things worth carrying
even if missions never land: it inverts the chase camera from a cost into a
reward, and determinism becomes the substrate for *verifying* a solution.

The unresolved core is the metric. **What counts as operator interaction** —
lever changes, seconds hands-on, distinct inputs? It is the load-bearing number
in the only scoring axis that puts two goods in tension, and it is undefined.

## The site is hard to crash into on purpose

A twelve-year-old found the fun in seconds by driving at the material; a scripted
driver went ten minutes without touching anything, because 130 props sit in six
clusters the route never passes. A site-design problem, not a damage one. The
composed-not-scattered half is carded (L-039, L-027); what stays a thread is what
"composed" means **as a generator** — footing, clearances, an unsurveyed
obstruction on the route you were actually given.

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
stack** (structure / mechanics / power / thermal / signal), a **fidelity
ladder** they descend, or both as a matrix. Shapes `src/sim/layers/` directly.

## The lemon — degradation

The symptom half of this thread became cards (L-040 sound, L-046 lights, L-043
the status panel, now closed): smoke, lamps and a rougher note teach the player
to *listen* before anything costs them.

What is still a thread is **degradation**: the drive genuinely changes — per-track
`MU` falls, a bias enters the normal-load share, a sprocket will not take full
torque. That makes a damaged machine a *different machine*, which is the whole
subject, and it is the expensive part. The friction model can already express
most of it, which is suspicious in a good way. Not v0; do not let the reset
design (L-038) foreclose it.

## Friction feel — props seem to "float"

Hull skate is fixed; this half is not diagnosed. Candidates: the settled rest gap
between a box collider and bilinear placement height; too little contact shadow;
or the toon material flattening the ground seam. Measure the actual rest gap
before theorising further (META: ask the sim what it computed).

## Pods on arms — deferred, and deliberately separated

Instruments should be **clamped to the cage** and move on screen as you look
around, not sit as viewport-fixed overlays (`docs/design/components.md`). Split
off from the triptych work on purpose, because it drags in three things that are
each their own decision: look angle has to reach the DOM without going through
Svelte reactivity; L-008's placement rules move from screen space into cage
space, where the bound becomes the reach of the arm rather than the screen edge;
and the view-recentring QoL is entangled with it. None of it is blocked — it is
just a different problem than "what does a component look like."
