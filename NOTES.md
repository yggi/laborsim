# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `BOARD.md`), not
a record (that's `LOG.md`), not settled truth (that's `MEMORY.md`).

A thread leaves exactly three ways: it crystallizes into `MEMORY.md`, becomes a
card in `BOARD.md`, or is deleted as no longer interesting.

**Gate: 100 lines.** Overflow means threads have gone stale — resolve, promote
or delete. Do not grow the file.

---

## The mobile budget — bytes, frames, and world size

One thread, because they are one question: mobile-first is a hard pillar and
**nothing about it has been measured.**

*Bytes.* The empty scaffold already built to 3.44 MB raw / 1.25 MB gzipped, and
`-compat` inlines Rapier's wasm as base64 at about a third more. Levers, cheapest
first: `vite-plugin-wasm`, code-split build from sim, lazily load instruments.

*Frames.* ~130 props, ink shells doubling every mesh, greebles, per-grouser track
geometry — and no frame ever timed on a phone. L-034 gets the number. World size
and part counts follow from those two rather than preceding them, and 130 dynamic
bodies now step every frame. Answer before `src/sim/` grows.

## Missions, and what "operator interaction" means

Zachtronics-style budgeting scored on budget / time / **complexity**, written up
in `docs/design/missions.md` and explicitly **not v0**. Two things worth carrying
even if it never lands: it inverts the chase camera from a cost into a reward,
and determinism becomes the substrate for *verifying* a solution. The unresolved
core is the metric — **what counts as operator interaction**: lever changes,
seconds hands-on, distinct inputs? It is the load-bearing number in the only
scoring axis that puts two goods in tension, and it is undefined.

## The site is hard to crash into on purpose

A twelve-year-old found the fun in seconds by driving at the material; a scripted
driver went ten minutes without touching anything, because 130 props sit in six
clusters the route never passes. A site-design problem, not a damage one. Both
halves are carded now — composed-not-scattered (L-039, L-027) and standing up at
all (L-057, measured: most furniture is lying flat before the exercise starts).
What stays a thread is what "composed" means **as a generator**: footing,
clearances, an unsurveyed obstruction on the route you were actually given.

## Does equal-share normal load hold up for the load chart?

The track model splits weight equally across every sample touching ground. Enough
for rung 1, and it produced a textbook friction limit — but it ignores **load
transfer**, and a machine nose-down on a grade or braking hard really does put
more weight on one end of the track. The load chart (L-021) is about precisely
that: payload against reach, with tipping as a named failure mode, and
equal-share cannot express it. The fix — weight each sample's normal load by hull
attitude and acceleration — is contained to one function, and wants doing when
the load chart lands, not speculatively before.

## What does "multi-layer" cut along, for the player?

The physics tiers in `physics-migration.md` are a *development* fidelity ladder,
not a player-facing one. Unanswered: whether the player sees a **domain stack**
(structure / mechanics / power / thermal / signal), a **fidelity ladder** they
descend, or both as a matrix. Shapes `src/sim/layers/` directly.

## The lemon — degradation

The symptom half became cards and most are closed — the status panel (L-043), the
voice (L-040); lights (L-046) remain. Smoke, lamps and a rougher note teach the
player to *listen* before anything costs them.

What is still a thread is **degradation**: the drive genuinely changes — per-track
`MU` falls, a bias enters the normal-load share, a sprocket will not take full
torque. A damaged machine becomes a *different machine*, which is the whole
subject and the expensive part. It keeps getting cheaper: the friction model can
already express most of it, and the voices are per track and read `traction`,
`commanded` and `contacts` directly, so a lost tooth would sound wrong with **no
audio work at all**. Not v0; do not let the reset design (L-038) foreclose it.

## Does a component ship a voice?

Half answered. A component's **switchgear** is in its own maker's voice now, and
it needed no new machinery — the engine hears a slot change on the snapshot and
plays it. So *whose* noise it is was never the hard part.

Still open is **a voice of its own**: TILT-GUARD winding you down, a servo
hunting, a relay chattering. Not a control being operated but a component saying
something about its state — either a fourth part of the triptych, which the
plate/cell/pod argument would have to survive, or not a part at all but a thing a
component *does*. The switchgear is evidence for the second: it arrived as an
event on the recording, not as a surface to fit.

## How much of the cab should a glance cost you?

The cab sweeps 1:1 with the head, so a look takes the levers, the E-STOP and
every instrument off the glass within about 15° (`docs/design/cockpit.md`).
Honest, and the intended price — but you cannot find a touchscreen lever by
feel, and only somebody who did not build it can say if that is the right price.
Two dials if it is too much: shorten the pan range (you see less of the site) or
damp the sweep below 1:1 (the cab stops being rigid). Prefer the first; a
sim-sickness mitigation, if one is ever needed, is the same dial.
