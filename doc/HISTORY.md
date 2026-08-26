# HISTORY.md — how the project got here

The arc, at low resolution: what was decided, what was reversed, and what each
turn cost. `doc/LOG.md` is what happened *this session*, in detail; this is what
happened *to the project*, in the shape somebody arriving needs.

**Target: 250 lines, act at 300** (`CLAUDE.md`). Oldest first, because it is a
story rather than a feed. The target sits below `doc/MEMORY.md`'s on purpose:
current truth outranks how it was arrived at, so this may never be the longest
thing in the repo.

**It is rewritten, not appended to.** When `doc/LOG.md` overflows, its oldest
sessions are *folded into the paragraph they belong to* and deleted — never moved
here intact, which is what the three verbatim archives it replaced did, to
nobody's benefit. Nothing is lost by condensing: every entry is in git twice over,
and what git cannot give you cheaply is the arc. A month becomes a section, a
quarter a paragraph, a year a line. The file converges; if it does not, it is
being appended to.

---

## Before the code — the probe, the frame, and the stack

The repo opened as an empty skeleton with the five surfaces and their gates
already in place, and a feasibility prototype frozen verbatim at
`prototype/concept-3/` under a standing rule: **port named mechanisms, never the
structure, and never patch a probe — write a new one.** It had proved the thing
that mattered (this can look and feel right in a browser, on a phone) and faked
everything else. The first reversal shaped the build: **sequence the ladder, not
the biped** — the probe started at a walker because it was buying a look, and
production starts at rung 1, where the acceptance test was specified.

The reframing that did the most work: **the whole thing is, in-universe, a Labor
design, operation and safety training system.** Not flavour — it licenses
inspectability without breaking fiction, makes replay native, failure affordable
and sandbox the default, and it sets the UI register. Problems that looked like
they needed machinery turned out to be answered by the frame already, hence the
standing instruction to check it before inventing more. Two consequences arrived
at once: **no job tickets in v0**, the damage ledger supplying the loop's third
beat instead; and **the cockpit resolved to the middle ground** — components ship
instruments, those instruments are mandatory, the player places them — which
collapsed the rack and the cockpit into one decision and made capability
literally cost sight. Tone crystallized into a sixth guiding principle, **you are
an operator, not a demigod**, which earned that status by deciding arguments.

The stack settled — TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js ·
Rapier — **with its rejected options recorded and reasoned**, so they are not
relitigated; the sharpest is that Jolt's tracked-vehicle controller is an
anti-feature here, because the friction model *is* the teaching layer. The three
architecture rules became **executable rather than aspirational** — a scanner
that fails the build, now the house style for invariants — and their one real
threat, **JS transcendentals are not bit-portable across engines**, was solved by
avoiding it: terrain is value noise from an integer hash. Two live violations had
already shipped, and were found only when the rule got its scanner.

## Rung 1 drives, and the rack becomes a pipeline

**The track model is ours, and that is the design.** Rapier has no anisotropic
collider friction and its vehicle controller models wheels — verified, not
assumed — and a black box producing correct-looking motion would be a layer the
player cannot open, which principle 5 forbids. One tuned constant, `MU = 0.95`;
everything else is a dimension or a mass and the behaviour falls out. The climb
limit measured at `atan(MU)` ≈ 43.5°, and past it the machine rears, loses
contact, **flips over backwards and slides to the bottom** — with no tipping
logic anywhere in the codebase. Principle 1 arriving for free. Two lessons
outlived the stretch: a grade probe reported zero climb at every angle with ten
tests passing, and **the probe was wrong, not the machine**; and mirrored
steering shipped because the tests asserted that yaw *changed*, never which way.

Then the single best reframing in the project: **the rack stopped being a
priority stack and became a pipeline.** Each module takes the signal from the one
above, folds in its own intent by its **verb**, and passes it down to an actuator
terminal — dissolving per-actuator granularity, suppress-versus-inhibit and what
to do about `SET` at once, with no new machinery. Four verbs, three letters each,
which makes a fifth typographically awkward *on purpose*. `CAP` then produced a
mechanic nobody designed: a lever at rest caps to zero, so parked levers above a
`CAP` module stop the machine whatever is driving it. The first *safety*
component sharpened it further — TILT-GUARD takes `AMP`, because `CAP` clamps a
positive intent into the arriving signal's magnitude and a reversing machine
would come out going forward — and ordering alone turns a guard into something
else: **a guard above the thing it guards is a warning light.** Attribution came
out better for it: under a pipeline there is no owner to name, so instead of a
banner naming a winner the chain is shown stage by stage down to the terminal.

## The world can be broken, and is made of things

**Damage is measured in joules absorbed, never in hit points**, straight from the
inspectability pillar: *the cone took 15 J and it is rated for 5* is a diagnosis
where *the cone lost 40 HP* is a number we made up. Rapier's own contact-force
events were probed and rejected — a solver force is not a quantity you can show a
player. The bugs of that round are worth remembering as a class: the site billed
itself ¥55,690 before the machine had moved, because props spawned overlapping
and shoved each other to death; a cone rated at 22 J was indestructible because
6 kg at 2.2 m/s only carries 15 J, so every toughness is now a fraction of what
the drivetrain can deliver into that mass; and the nastiest, a test that **passed
by measuring the bug**, having never hit anything at all.

The ledger had been pricing a site that could not stand up and could not come
apart, and both were one problem: **a prop was identified by its kind**, and every
fact about it was a separate table keyed on that — mass here, a collider box
there, a voice in the audio, its art as a branch of an if/else chain. Four places,
one of them silent, which is why the inventory never grew past five kinds and a
scooter. Naming the missing axis fixed all of it: **a prop is a part list over
materials**, so the collider, the art, the voice, the toughness and the wreckage
all fall out of one declaration. Toughness stopped being typed in — it is a
fraction of `½·m·v_max²` — and the sound table stopped having a row per kind,
because a big body of the same stuff rings lower and longer by arithmetic. Six
kinds became fourteen at no cost to the ear or the renderer.

The standing-up half was an **ordering** mistake: terrain was generated from
noise, and then the prop generator invented work-area centres of its own, so the
ground and the furniture disagreed about where the work was — 46 of 102
breakables flat before anyone touched them. The site plan comes first now and the
ground is graded to it, and a candidate is refused where its own tipping gradient
says it cannot stand; neither half is sufficient alone. Then it comes apart, into
the solids the part list names, each with a body, so pipes roll downhill and
tumble into each other — while the ear gets a **grain cloud** whose count, span
and *regularity* make a screech, a shatter, a splinter, a crumble and a ding one
function. Measuring the parts against the box that stood in for them turned up two
shipped defects nobody could have seen: a pipe stack drawn end-to-end inside a
collider that said side-by-side, and a cable drum boxed on the wrong axis.

## The cab becomes a machine rather than a screen

A component became **one thing seen from three postures** — a plate in the rack,
a cell on the dash, a pod on the glass — and only the plate is mandatory. What
made it a mechanic rather than a layout system was **three currencies**: a
chassis component costs nothing and brings the cockpit, a capability component
costs glass, a safety component costs capability. Safety kit shipping no pod is
not a discount, it is a different bill. The refactor that paid regardless:
**severity crosses the snapshot boundary as a number**, so the masters derive
over the whole machine and nothing is wired to a named module — and the *word*
stays a theme decision, because HANSA says `STÖRUNG` where KIBA says `STOP`.

Then the panel stopped talking, over a run of sessions against one instruction —
*industrial machine, not a website*. Three rules came out of it that still decide
more arguments than anything else in `cab/theming.md`: **the label is a separate
object**, **a plate never changes**, and **the lens is the state**. Prose on
faceplates became stamps and decals, and power and mode moved from the plate to
the slot, because *no manufacturer ships the fuse you power it through*.

**The cab stopped being a frame around a screen and became an object you sit
in.** The whole thing — cage, dash, pods and levers — is one rigid body and the
head is the only hinge, sweeping 1:1 with a look, so a glance takes your
instruments and your hands off the glass and the view springs back when you let
go. That is the intended price, and the reason the cage continues into a roof,
door posts and side glass: turn far enough and you must land on a cab rather than
on nothing. The horizon rolls with the hull for the same reason and had not —
`lookAt` discards roll about the view axis — so composing the orientation instead
of aiming it produced `render/camera.ts` and `npm run cab`, a bench for the view
through the glass. Placement moved into cage space with it, and the bound on
where an instrument may go became **the arm**: not through a pillar, not further
out than 200 px of reach. The arm is drawn, so a refusal is visible.

**The last widget in the cab was a lever with a bezel round it.** A travel lever
stands in the open, bolted to the console it comes out of, so the housing, the
milled slot and the per-lever readout went — and then the foot had to *move*, a
fifth as far as the grip, through a gasket with the shaft's cut end showing in
it. The drawn swing is a third of the drag, because a control wants a comfortable
throw and a lever does not, and confusing those two numbers was the whole of a
stick that telescoped rather than pivoted. The bench found the other defect and
it was not the lever: a gesture dragged off the window's edge never delivered its
`pointerup`, so the canvas went on believing a hand was on the glass — which,
once the neck was sprung, is a cab parked over your shoulder for good.

**The benches were built here and are the reason most of it is right** — a
screenshot bench for the panel, a listening bench for the voice, both born of one
finding: a thing you cannot cheaply perceive ships broken with everything green.
The dash was authored blind, looked right in code, and the first screenshot
showed the instrument cluster scrolled off at 390 px, from a deck sized in `vh`
rather than `dvh` — reproducible on no desktop viewport at all.

## The machine gets a voice, and the seams get redrawn

Sound arrived with an owner rather than as an effects pack: **a manufacturer's
house is colours, words *and* sound**, in one object above both renderers. The
machine's voices are its chassis maker's, the site's belong to materials, and a
house sets timbre and rate, never level. The horn and the buzzer, which had
shared a name, separated on the clearest line available: **the buzzer is the
machine talking to you and the horn is you talking to everyone else.**

The panel became switchgear in the same round, and almost all of it is heard
**off the recording** — switching a component off changes its slot on the
snapshot and the engine notices by itself, so a replay clicks in the right places
without anything being added to the event channel, which had arrived just before
it as the **discrete half of the snapshot boundary**. Three files were each
keeping a high-water mark into the damage list and diffing it every frame, two
with a private hack to notice a RESET; audio would have been the fourth. The sim
stamps every happening into a bounded ring now, and the ledger stays the record:
**the channel notifies, the ledger keeps**.

Two structural seams were redrawn while this was going on, both cases of a
document describing something that had stopped being true. The triptych was
two-thirds built — plates and cells were registered while pods were hand-wired
into the shell per component, so fitting an instrument meant editing the
application; one **packet** per component fixed it. And commands got **one
channel** (`Controls`), replacing private routes, the worst of which handed an
instrument a live module reference — a pod that cannot render from a recording is
not an instrument, it is a remote control with a dial on it. The other seam:
`cockpit/` versus `ui/` is **the machine against the rig**, which may read the
machine while the machine knows nothing of it. The same shape turned up in the
tests, where three places built snapshots by hand and each grew its own kit: the
duplicates disagreed about what a parked track reports, which is **two answers to
a question nobody had noticed being asked twice**, and taking the loose one had
made a scene louder. One fixture now, with the invariants in it.

## Instruments measured rather than styled

The question *does the dash need both GRIP and SLIP, or just SLIP?* was settled
by measurement rather than argument: 7,200 steps across eleven scenarios, reading
the panel's own reductions. Pearson r between the two dials is **0.267** —
neither determines the other — and the GRIP instrument as built was right in one
regime and misleading in three. The answer was *both readings, one instrument*:
**TRACTION**, a plan view with colour for the fraction of the friction cone in
use, length for the contact patch, and a centre-zero bar for slip — two
alternatives having been rejected by screenshot, one of which measured 1.3 px at
real size. The deeper fix was a type: **`traction` is `null`, not 0, for a track
with no ground**, because 0 is what a *parked* machine reports and one number for
two opposite conditions is a dial that lies. Damping went in with the table that
justifies it — a damped needle *is* the real quantity, since every dial on a real
machine has oil or a shorted coil in it.

## The ride gets springs, and the rig gets something to ask for

**Twelve springs, one per contact point.** Each track's six ray samples became a
bogie on its own spring and damper and the belts stopped touching ground at all,
so a rut is something one corner of the machine finds rather than something a
3.4 m block spans. The rate is *derived* — travel and static sag are the
dimensions, the rate is weight over sag — which parks the machine exactly where
it sat before. Three defects surfaced and all three were in the **old** model,
hidden by rigid belts lying flat: friction spent an equal share of the mass at
each contact, ignoring that a push at ground level also *turns* the machine
(`m·h²/I ≈ 2`, so the term it dropped was the bigger one); the damper answered to
the hull's velocity rather than its own travel, which is a parked machine putting
3.7 m a minute on its odometer; and the spring had to be a force, because Rapier
integrates one in the same breath as gravity. Hull jerk at the ninetieth
percentile fell 416 m/s³ → 23. The suspension's voice had been *refused* a
session earlier — a knock with no quantity behind it is a sound effect in a
simulation's clothes — and building the springs was how to earn one: the watts a
side's dampers dissipate, per side, which no other voice can tell you.

Missions arrived beside it, and the decisions were about what *not* to build.
"Reach one marker" and "reach all of them" are one verb with a different pin
count, so the ladder is `count: 1 → 3 → 5` and the second rung cost nothing; and
**the ladder is the ground, not the task** — `relief` turns the same generator
down, so rung 1 is climbable everywhere, asserted as an angle rather than as an
adjective. The rig got a voice, which `sound.md` had said it never would: that
rule was written when the rig owned only the camera and the volume, and an
objective is not furniture, because nothing in the world can announce a marker.
So it narrowed rather than repealed — **the rig speaks about the exercise and
nothing else** — and the debrief can say yes at last, though RESUME still comes
first on every outcome, because a finished exercise is still a site. Merging the
two branches then cost the round's lesson: **green plus green is a third state
nobody measured.**

## Where it stands

What is built is in `README.md`; what it is, in `doc/MEMORY.md`; recent detail in
`doc/LOG.md`. The one shape worth recording as *history* is what the loop still
cannot do: it can price what you broke and name what was driving, but it cannot
let you **watch the moment back**, which is the difference between being told and
being shown. `L-032` changes that, and every attribution card waits on it.
