# NOTES.md — open threads

**Open, uncrystallized threads only.** Not a task list (that's `doc/BOARD.md`), not a
record (that's `doc/LOG.md`), not settled truth (that's `doc/MEMORY.md`). A thread leaves
exactly three ways: it crystallizes into `doc/MEMORY.md`, becomes a card in
`doc/BOARD.md`, or is deleted as no longer interesting.

**Target: 100 lines, act at 120** (`CLAUDE.md`). The band is there so that being
a line or two over buys a reflow rather than a reckoning. At 120 the threads have
gone stale: resolve, promote or delete, back to 100 or below in one pass.

---

## The dropout that did not survive a refresh

Reported once: complete silence for seconds during ordinary driving, no impacts,
Android/Firefox, mute untouched — and gone after a full reload, never seen since.
Four real defects in `engine.ts` were found looking for it (L-080) and **none
explains it**. What is left is a browser stopping its audio device under load,
which the resume fix now covers, or a long dev session's stale context, which a
refresh fixes and nothing records. A thread until it recurs on a fresh load;
L-081 is the instrument that would say which.

## What counts as "operator interaction"?

The exercises are built (L-065) and deliberately carry **no score**, because the
metric a score needs is undefined: budget / time / **complexity**, where
complexity is parts plus *operator interaction*. Lever changes? Seconds
hands-on? Distinct inputs? It is the load-bearing number in the only axis that
puts two goods in tension, and until it is answered a score would measure
whichever thing was easiest to count. The clock is recorded and commits to
nothing; the interaction term commits to everything. `doc/design/rig/missions.md`.

## Can a generator be given an objective?

A twelve-year-old found the fun in seconds by driving at the material; a scripted
driver went ten minutes without touching anything, because 130 props sat in six
clusters the route never passed. **Two thirds is answered** (L-039, L-057): work
areas are graded pads in the route's own annulus, held off the markers, so
driving between two pins takes you past one, and footing is a rule rather than
luck.

The sharper third, and closing the others made it sharper: **proximity is not
composition.** A pad near the route is somewhere you pass; it is not somewhere
that was *laid out* — no bench to go round, no clearance to judge, no unsurveyed
obstruction on the line you were given. The generator has the vocabulary (a pad
is a thing with a target height) and none of the intent. L-027 is where it
becomes a card; the thread is what "composed" would have to mean first.

## Which simulated quantities does the player get to see?

The physics tiers in `machine/physics-migration.md` are a *development* fidelity
ladder, not a player-facing one. Unanswered: whether the player sees a **domain
stack** (structure / mechanics / power / thermal / signal), a **fidelity ladder**
they descend, or both as a matrix. Shapes `src/sim/layers/`, still empty.

The suspension is the live instance and the sharpest one, because it is
simulated and *heard* and shown nowhere: travel is on the developer's telemetry
line only, and an instrument costs view (§ 6). Does compression earn a head, join
TRACTION's plan view as a third channel, or is it the first quantity the machine
deliberately **refuses** to show you? That last is either a good rule or a hole
in principle 5. (Its other half — the belt not following its own bogies — is a
defect with a known fix, so it is L-086 rather than a question.)

## The lemon — degradation

The symptom half is mostly cards and mostly closed (L-043, L-040; lights L-046
remain). The thread is **degradation**: per-track `MU` falls, a bias enters the
normal-load share, a sprocket will not take full torque — a damaged machine
becoming a *different machine*, which is the whole subject and the expensive
part. It keeps getting cheaper: the friction model can already express most of
it, and the voices read `traction`, `commanded` and `contacts` per track, so a
lost tooth would sound wrong with **no audio work at all**. Not v0; do not let
the reset design (L-038) foreclose it.

## What else is a session, that nobody has thought to record?

Twice the answer to "should this be on the recording?" turned out to be written
down already and unread, so the useful question is not *what did we miss* but
*what class of thing keeps getting missed*. Both misses were the same shape: a
thing that reaches no simulated quantity, and is therefore invisible to every
instinct that sorts by whether it matters to the physics.

Left off deliberately, and worth re-asking once there is a viewer (L-083): the
**time between things** — a hesitation before a lever moves is on the trace as a
gap, and nothing reads gaps — and **what the operator was shown**, which is the
snapshot stream and is thrown away between frames.

## Does a component ship a voice?

Half answered: a component's **switchgear** is in its own maker's voice and
needed no new machinery, so *whose* noise it is was never the hard part. Open is
**a voice of its own** — TILT-GUARD winding you down, a servo hunting, a relay
chattering: a component saying something about its state rather than a control
being operated. Either a fourth part of the triptych, which the plate/cell/pod
argument would have to survive, or not a part at all but a thing a component
*does*. Three pieces of evidence for the second, all **readings on the
recording** rather than surfaces to fit: the switchgear, the bogies, the cues.

## How much of the cab should a glance cost you?

The cab sweeps 1:1, so a look takes the levers, the E-STOP and every instrument
off the glass within about 15°, and past 35° you are looking at the door
(`doc/design/cab/cockpit.md`). Honest, and the intended price — but you cannot find
a touchscreen lever by feel, and only somebody who did not build it can say if
that is the right price. Two dials if it is too much: shorten the pan range (you
see less of the site), or damp the sweep below 1:1 (the cab stops being rigid).
Prefer the first; a sim-sickness mitigation is the same dial.
