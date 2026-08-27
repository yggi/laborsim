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
here intact, which is what the three verbatim archives it replaced did. Nothing
is lost: every entry is in git twice over, and what git cannot give you cheaply
is the arc. A month becomes a section, a quarter a paragraph, a year a line. The
file converges; if it does not, it is being appended to.

---

## Before the code — the probe, the frame, and the stack

The repo opened as an empty skeleton with the five surfaces and their gates in
place, and a feasibility prototype frozen at `prototype/concept-3/` under a
standing rule: **port named mechanisms, never the structure.** It had proved the
one thing that mattered — this can look and feel right on a phone — and faked
everything else. The first reversal shaped the build: **sequence the ladder, not
the biped**, because the probe started at a walker to buy a look.

The reframing that did the most work: **the whole thing is, in-universe, a Labor
design, operation and safety training system.** Not flavour — it licenses
inspectability without breaking fiction, makes replay native, failure affordable
and sandbox the default, and sets the UI register; questions that look like they
need new machinery keep turning out to be answered by it already. Two consequences
arrived together: **no job tickets in v0**, the damage ledger supplying the loop's
third beat, and **components ship mandatory instruments and the player places
them**, which collapsed the rack and the cockpit into one decision and made
capability literally cost sight. Tone crystallized into a sixth principle, **you
are an operator, not a demigod**.

The stack settled — TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js ·
Rapier — **with its rejected options recorded and reasoned**; the sharpest is
that Jolt's tracked-vehicle controller is an anti-feature here, because the
friction model *is* the teaching layer. The three architecture rules became
**executable rather than aspirational** — a scanner that fails the build, now the
house style for every invariant — and their one real threat, **JS transcendentals
are not bit-portable across engines**, was solved by avoiding it. Two live
violations had already shipped, and were found only once the rule had a scanner.

## Rung 1 drives, and the rack becomes a pipeline

**The track model is ours, and that is the design.** Rapier has no anisotropic
collider friction and its vehicle controller models wheels — verified, not
assumed — and a black box producing correct-looking motion is a layer the player
cannot open, which principle 5 forbids. One tuned constant, `MU = 0.95`; the rest
is dimensions and masses, and the climb limit measured at `atan(MU)` ≈ 43.5°,
past which the machine flips backwards **with no tipping logic anywhere**. Two
lessons outlived it: a grade probe read zero climb at every angle with ten tests
passing, and **the probe was wrong, not the machine**; and mirrored steering
shipped because the tests asserted yaw *changed*, never which way.

Then the best reframing in the project: **the rack stopped being a priority stack
and became a pipeline.** Each module folds its intent into the signal from above
by its **verb** and passes it down — dissolving per-actuator granularity,
suppress-versus-inhibit and `SET` at once, with no new machinery. Four verbs of
three letters, which makes a fifth typographically awkward *on purpose*. `CAP`
then produced a mechanic nobody designed: parked levers above a `CAP` module stop
the machine whatever is driving it. Ordering alone turns a guard into something
else — **a guard above the thing it guards is a warning light** — and attribution
came out better for it: under a pipeline there is no owner to name, so the chain
is shown stage by stage instead of a banner naming a winner.

## The world can be broken, and is made of things

**Damage is measured in joules absorbed, never in hit points**, straight from the
inspectability pillar: *the cone took 15 J and it is rated for 5* is a diagnosis
where *the cone lost 40 HP* is a number we made up. Three bugs from that round
keep as a class: the site billed itself ¥55,690 before the machine moved, because
props spawned overlapping and shoved each other to death; a cone rated at 22 J
was indestructible because 6 kg at 2.2 m/s carries 15, so toughness is now a
fraction of what the drivetrain can deliver into that mass; and a test that
**passed by measuring the bug**, having never hit anything.

The ledger was pricing a site that could neither stand up nor come apart, and
both were one problem: **a prop was identified by its kind**, with every fact
about it in a table keyed on that — mass, a collider box, a voice, and its art as
a branch of an if/else chain with a boulder in the `else`. Four places, one of
them silent, which is why the inventory never grew past five kinds and a scooter.
Naming the missing axis fixed all of it: **a prop is a part list over
materials**, so the collider, the art, the voice, the toughness and the wreckage
fall out of one declaration, and six kinds became fourteen at no cost to the ear
or the renderer.

The standing-up half was an **ordering** mistake: terrain came from noise and the
prop generator then invented work areas of its own, so the ground and the
furniture disagreed about where the work was — 46 of 102 breakables flat before
anyone touched them. The site plan comes first now and the ground is graded to
it, and a candidate is refused where its own tipping gradient says it cannot
stand. Measuring the parts against the box that had stood in for them turned up
two shipped defects nobody could have seen.

## The cab becomes a machine rather than a screen

A component became **one thing seen from three postures** — a plate in the rack,
a cell on the dash, a pod on the glass — and only the plate is mandatory. What
made it a mechanic rather than a layout system was **three currencies**: a
chassis costs nothing and brings the cockpit, a capability costs glass, a safety
component costs capability. The refactor that paid regardless: **severity crosses
the snapshot boundary as a number**, so the masters derive over the whole machine
and nothing is wired to a named module — while the *word* stays a theme decision,
because HANSA says `STÖRUNG` where KIBA says `STOP`.

Then the panel stopped talking, over a run of sessions against one instruction —
*industrial machine, not a website*. Three rules came out of it: **the label is a
separate object**, **a plate never changes**, **the lens is the state**. Prose on
faceplates became stamps and decals, and power and mode moved from the plate to
the slot, because *no manufacturer ships the fuse you power it through*.

**The cab stopped being a frame around a screen and became an object you sit
in.** Cage, dash, pods and levers are one rigid body and the head is the only
hinge, sweeping 1:1, so a glance takes your instruments and your hands off the
glass and springs back when you let go. That is the intended price, and the
reason the cage continues into a roof and door posts: turn far enough and you
must land on a cab rather than on nothing. The horizon had not rolled with the
hull because `lookAt` discards roll about the view axis, so composing the
orientation instead of aiming it produced `render/camera.ts` and `npm run cab`.
The bound on where an instrument may go became **the arm** — not through a
pillar, not past 200 px of reach — and the arm is drawn, so a refusal is visible.

**The benches were built here and are the reason most of it is right** — a
screenshot bench for the panel, a listening bench for the voice, both born of one
finding: a thing you cannot cheaply perceive ships broken with everything green.
The dash was authored blind, looked right in code, and the first screenshot
showed the cluster scrolled off at 390 px, from a deck sized in `vh` rather than
`dvh` — reproducible on no desktop viewport at all. The same bench found the
defect that was not a lever at all: a gesture dragged off the window's edge never
delivers its `pointerup`, so the canvas goes on believing a hand is on the glass,
which once the neck was sprung is a cab parked over your shoulder for good.

## The machine gets a voice, and the seams get redrawn

Sound arrived with an owner rather than as an effects pack: **a manufacturer's
house is colours, words *and* sound**, in one object above both renderers. The
machine's voices are its chassis maker's, the site's belong to materials, and a
house sets timbre and rate, never level. The horn and the buzzer separated on the
clearest line available: **the buzzer is the machine talking to you and the horn
is you talking to everyone else.**

The panel became switchgear in the same round, and almost all of it is heard
**off the recording** — switching a component off changes its slot on the
snapshot and the engine notices by itself, so a replay clicks in the right places
with nothing added to the event channel, which had arrived just before it as the
**discrete half of the snapshot boundary**: three files were each diffing the
damage list against a private high-water mark, two with a hack to notice a RESET.
The sim stamps every happening into a bounded ring now — **the channel notifies,
the ledger keeps**.

Two structural seams were redrawn while this was going on, both cases of a
document describing something that had stopped being true. Pods were hand-wired
into the shell per component, so fitting an instrument meant editing the
application; one **packet** per component fixed it. And commands got **one
channel** (`Controls`), replacing private routes, the worst of which handed an
instrument a live module reference — a pod that cannot render from a recording is
not an instrument, it is a remote control with a dial on it. The other seam:
`cockpit/` versus `ui/` is **the machine against the rig**, which may read the
machine while the machine knows nothing of it — a line that has since sorted
every question about what belongs on a recording.

*Does the dash need both GRIP and SLIP, or just SLIP?* was settled by measurement
rather than argument: 7,200 steps across eleven scenarios. Pearson r between the
two dials is **0.267** — neither determines the other — and GRIP as built was
right in one regime and misleading in three, so the answer was *both readings,
one instrument*. The deeper fix was a type: **`traction` is `null`, not 0, for a
track with no ground**, because 0 is what a *parked* machine reports, and one
number for two opposite conditions is a dial that lies.

## The ride gets springs, and the rig gets something to ask for

**Twelve springs, one per contact point.** Each track's six ray samples became a
bogie on its own spring and damper and the belts stopped touching ground at all,
so a rut is something one corner of the machine finds rather than something a
3.4 m block spans. The rate is *derived* from travel and static sag, which parks
the machine exactly where it sat before. Three defects surfaced and **all three
were in the old model**, hidden by rigid belts lying flat: friction spent an
equal share of the mass at each contact, ignoring that a push at ground level
also *turns* the machine (the term it dropped was the bigger one); the damper
answered to the hull's velocity rather than its own travel, which is a parked
machine putting 3.7 m a minute on its odometer; and the spring had to be a force,
because Rapier integrates one in the same breath as gravity. Hull jerk at p90
fell 416 m/s³ → 23. The suspension's voice had been *refused* a session earlier —
a knock with no quantity behind it is a sound effect in a simulation's clothes —
and building the springs was how to earn one.

Missions arrived beside it, and the decisions were about what *not* to build.
"Reach one marker" and "reach all of them" are one verb with a different pin
count, so the second rung cost nothing; and **the ladder is the ground, not the
task** — `relief` turns the same generator down, asserted as an angle rather than
an adjective. The rig got a voice, which `sound.md` had said it never would: that
rule was written when the rig owned only the camera and the volume, and nothing
in the world can announce a marker. So it narrowed rather than repealed — **the
rig speaks about the exercise and nothing else**. Merging the two branches then
cost the round's lesson: **green plus green is a third state nobody measured.**

## One idea, several special cases — and a run becomes a recording

Three feature branches in one week each bent the same seams, and two rounds went
to straightening them. The pattern every time was **one idea spelled as several
special cases**, and the cost every time the same: the duplicates drifted, and
nothing could see them drift. The site had been a **race** since branches were
added to it, because `deploy-pages` replaces the whole site with one artifact and
CI cannot report a push overwriting `main` when both deploys succeeded. **Three
places built `Snapshot` values by hand and none was the sim**; one had been fixed
so an airborne track could not carry a contact reading, the other two had not,
and the listening bench duly grew a scene feeding a voice off a spring nothing
stood on. And **five values crossed into the render loop by three mechanisms** —
the fifth not in the loop body at all but in the pilot's `intent`, inside
`world.step()`, sixty times a second, where **depth hid it**. The docs went the
same way: `doc/MEMORY.md`'s index had named all twenty spill files, one hop to
everything and no distance between anything, and became **four clusters** that
index their own.

The same shape then turned out to be the whole of the loop's missing beat.
`L-032` was not a feature either: **twelve pieces of a replay were already in the
tree, most carrying a comment saying they were put there for the replay** — the
seed and the route on the snapshot, the event channel's rewind flag, inert
controls, impact entropy drawn from a sequence number. Nothing had ever replayed
anything, because of three more places where one idea was several: the sim's
input was **ambient**, rack edits crossed by **four untimestamped routes** of
which the designed one could express neither a reorder nor a verb, and **the
frame was written twice** — the profiling bench kept a copy of the game's loop
that had already drifted, guarded by two regexes comparing the files. There is
one frame now, and the rule is structural: `world.step(` appears in one place.

Then the edge was wrong. The first recording carried the levers and the rack on
the argument that the rest was "not a sim input" — which answers the
**determinism** question and is not the **recording** question. A rig reviewing a
session cares about the horn before moving off, the alarm acknowledged or driven
through, and where you were looking when you hit something; **both cases had been
written down and neither had been read**, the round's own lesson a second time. A
recording has two channels now — what reached the machine, and what the operator
saw and did about it — and the second cannot reach the first, because the replay
is never handed it. Asking where a placement lived turned up a shipped bug on the
way: every instrument you had moved was thrown away the moment you looked down.

## Where it stands

What is built is in `README.md`; what it is, in `doc/MEMORY.md`; recent detail in
`doc/LOG.md`. The shape worth recording as *history*: the loop's last missing
beat is half done and the halves are unequal. A run **is** a recording, exactly
and in full — and nothing shows you one. The engine was the part expected to be
hard; the viewer was assumed, and is `L-083`.
