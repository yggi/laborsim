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
Four real defects in `engine.ts` were found looking for it (L-080) and **none of
them explains it**: the twin was audible-but-wrong, the mute path needs a press,
`dt` needs a NaN. What is left is a browser stopping its audio device under load,
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
clusters the route never passed. **Two thirds of that is answered now** (L-039,
L-057): the work areas are graded pads chosen in the route's own annulus and held
off the markers, so driving between two pins takes you past one, and the footing
that lets a thing stand is a rule rather than luck.

What is left is the sharper third, and closing the other two made it sharper
still: **proximity is not composition.** A pad near the route is somewhere you
pass; it is not somewhere that was *laid out* — no bench you have to go round, no
clearance you have to judge, no unsurveyed obstruction on the line you were
actually given. The generator now has the vocabulary for it (a pad is a first-
class thing with a target height) and none of the intent. L-027 is where that
becomes a card; the thread is what "composed" would have to mean first.

## The suspension is simulated and heard, and neither drawn nor shown

Two halves of one gap. **No instrument:** travel is on the developer's telemetry
line and nowhere else, and an instrument costs view (§ 6) — so does compression
earn a head, join TRACTION's plan view as a third channel, or is it the first
quantity the machine deliberately refuses to show you? That last is either a good
rule or a hole in principle 5. **Not drawn:** the belt is one rigid loop bolted
to the hull while the bogies move, so a big enough hit passes it through the
ground. A real track drapes over its wheels; the honest fix is a bottom run that
follows the six compressions, which nobody has costed.

## What does "multi-layer" cut along, for the player?

The physics tiers in `machine/physics-migration.md` are a *development* fidelity ladder,
not a player-facing one. Unanswered: whether the player sees a **domain stack**
(structure / mechanics / power / thermal / signal), a **fidelity ladder** they
descend, or both as a matrix. Shapes `src/sim/layers/`, which is still empty.

## The lemon — degradation

The symptom half became cards and most are closed (L-043, L-040; lights L-046
remain). Still a thread is **degradation**: the drive genuinely changes — per-track
`MU` falls, a bias enters the normal-load share, a sprocket will not take full
torque. A damaged machine becomes a *different machine*, which is the whole
subject and the expensive part. It keeps getting cheaper: the friction model can
already express most of it, and the voices are per track and read `traction`,
`commanded` and `contacts` directly, so a lost tooth would sound wrong with **no
audio work at all**. Not v0; do not let the reset design (L-038) foreclose it.

## A hand-authored scene and a replay are the same interface

`sandbox/scenes.ts` has `frame(t) => { snapshot, alarm, horn }` — 22 of them,
hand-written — and a replay's operator answers `at(tick)`. Those are one type
wearing two names, and the `alarm`/`horn` split in the scene signature is
*already* the recording boundary `control/trace.ts` arrived at independently.
So the listening bench could take either a posed sequence or a real recording,
and L-075's missing driver and this are the same shape again.

Not scheduled, and the reason is not doubt about the resemblance. The 22 scenes
exist to reach **isolated extremes** — one bogie knocking, one track in the air —
that a real drive produces only tangled together with everything else, so a
recording cannot replace them and the unification would buy a shared type rather
than fewer scenes. And putting audio-level regressions in the same change as a
sim seam move is the merge `doc/META.md` warns about. What would make it a card
is a scene that is *hard to author* and easy to drive.

## Does a component ship a voice?

Half answered: a component's **switchgear** is in its own maker's voice and it
needed no new machinery, so *whose* noise it is was never the hard part. Still
open is **a voice of its own** — TILT-GUARD winding you down, a servo hunting, a
relay chattering: a component saying something about its state rather than a
control being operated. Either a fourth part of the triptych, which the
plate/cell/pod argument would have to survive, or not a part at all but a thing a
component *does*. Three pieces of evidence for the second, all **readings on the
recording** rather than surfaces to fit: the switchgear, the bogies, the rig's
cues.

## How much of the cab should a glance cost you?

The cab sweeps 1:1, so a look takes the levers, the E-STOP and every instrument
off the glass within about 15°, and past 35° you are looking at the door
(`doc/design/cab/cockpit.md`). Honest, and the intended price — but you cannot find
a touchscreen lever by feel, and only somebody who did not build it can say if
that is the right price. Two dials if it is too much: shorten the pan range (you
see less of the site), or damp the sweep below 1:1 (the cab stops being rigid).
Prefer the first; a sim-sickness mitigation is the same dial.
