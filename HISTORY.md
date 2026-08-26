# HISTORY.md — how the project got here

The arc, at low resolution: what was decided, what was reversed, and what each
turn cost. `LOG.md` is what happened *this session*, in detail; this is what
happened *to the project*, in the shape somebody arriving needs.

**Target: 250 lines, act at 300** (`CLAUDE.md`). Oldest first, because it is a
story rather than a feed. The target is set below `MEMORY.md`'s on purpose:
current truth outranks how it was arrived at, so this file may never be the
longest thing in the repo.

**It is rewritten, not appended to.** When `LOG.md` overflows, its oldest
sessions are *folded into the paragraph they belong to* and deleted — not moved
here intact. That is the difference between this and the three verbatim archives
it replaced, which grew 1,577 lines in a month, condensed 2% of what they held,
duplicated four entries between themselves, and were read by nothing. Nothing is
lost by condensing: every entry is in git twice over. What git cannot give you
cheaply is the arc — it hands you commits, not periods, and changes, not changes
of mind.

A month becomes a section, a quarter a paragraph, a year a line. The file
converges; if it does not, it is being appended to.

---

## Before the code — the probe, and one reversal

The repo opened as an empty skeleton with the five surfaces and their gates
already in place, and seven questions deliberately left open rather than
answered. A feasibility prototype was frozen verbatim at `prototype/concept-3/`
under a standing rule: **port named mechanisms, never the structure, and never
patch a probe — write a new one.** It had proved the thing that mattered (this
can look and feel right in a browser, on a phone) and faked everything else.

The first reversal is the one that shaped the build: **sequence the ladder, not
the biped.** The probe started at a walker, correctly, because it was buying a
look. Production starts at rung 1, a tracked platform, and the acceptance test —
*two components fighting over one actuator, reachable within ten minutes, and
attributable from a replay* — was specified there rather than at the end.

## The frame, and what it paid for

The reframing that did the most work: **the whole thing is, in-universe, a Labor
design, operation and safety training system.** The player is not piloting a
Labor; they are using the rig that teaches people to.

It is not flavour, which is why it sits in `MEMORY.md` rather than `LORE.md`. It
licenses inspectability without breaking fiction (an open sim layer is the rig's
instrumentation, not a debug overlay), makes replay native, failure affordable,
sandbox the default, procedural sites the point, and it sets the UI register.
Several problems that looked like they needed machinery turned out to be answered
by the frame already — hence the standing instruction: check it before inventing
more.

Two consequences arrived immediately. **No job tickets in v0** — a damage counter
is the verdict instead, supplying the loop's missing third beat at a fraction of a
ticket economy's cost. And **the cockpit resolved to the middle ground**:
components ship instruments, those instruments are mandatory, and the player
places them — which collapsed the rack and the cockpit into one decision and made
capability literally cost sight.

Tone crystallized into a sixth guiding principle: **you are an operator, not a
demigod.** It earned that status because it decides arguments — a change that
makes the machine feel heroic rather than awkward is working against the game.
The chase camera resolved in the same shape: available, and it costs something
real. Not a pause — *hands off the wheel*: the sim keeps stepping and the machine
keeps doing whatever it was last told.

## The stack, and rules that execute

The stack settled — TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js ·
Rapier — **with its rejected options recorded and reasoned**, so they are not
relitigated: Godot's web export cannot run C# at all, Babylon's switching cost
lands on an already-proven cel pipeline, and Jolt's tracked-vehicle controller is
an anti-feature here because the friction model *is* the teaching layer.

**Mobile-first was fixed with a mechanical reason rather than a preference:**
viewport budgeting turned out to be a core mechanism, which couples it deeply to
touch. A desktop-first cockpit would be a different mechanic wearing the same
name.

The three architecture rules became **executable rather than aspirational** — a
scanner that fails the build, so breaking one has to be a deliberate act that
edits the rules first. That pattern (a rule nothing enforces is a rule that gets
violated anyway) is now the house style for invariants.

Determinism became a standing test rather than a claim. Its one real threat —
**JS transcendentals are not bit-portable across engines**, and the probe's height
function was made almost entirely of them — was solved by avoiding the problem:
terrain is value noise from an integer hash, quantized as belt and braces. The ban
is on transcendentals that close a loop back into sim state; display-only `asin`
is a licensed exception. Two live violations had already shipped, and were found
only when the rule got its scanner.

## Rung 1 drives, and fails predictably

**The track model is ours, and that is the design.** Rapier has no anisotropic
collider friction and its vehicle controller models wheels — verified, not
assumed — so neither shortcut applied. A black box producing correct-looking
motion would be a layer the player cannot open, which principle 5 forbids.

One tuned constant, `MU = 0.95`. Everything else is a dimension or a mass and the
behaviour falls out: the climb limit measured at `atan(MU)` ≈ 43.5°. Past it the
machine grinds partway up, rears, loses contact, **flips over backwards and slides
to the bottom** — with no tipping logic anywhere in the codebase. Principle 1
arriving for free, and pinned by tests so a model change has to be deliberate.

It shipped to GitHub Pages, gated on the checks, because the cockpit cannot be
judged honestly on a desktop.

Two lessons outlived the stretch. A grade probe reported zero climb at every angle
with ten tests passing — **the probe was wrong, not the machine.** And mirrored
steering shipped because the tests asserted that yaw *changed*, never which way;
the fix was derivation (`forward = up × right`) rather than trying both, and the
machine got sprockets and idlers so the bug class can never be silent again.

## The rack becomes a pipeline

The single best reframing in the project: **the rack stopped being a priority
stack and became a pipeline.** Each module takes the signal from the module
above, folds in its own intent by its **verb**, and passes it down to an actuator
terminal.

It dissolved three open questions in one move — per-actuator granularity,
suppress-versus-inhibit, and what to do about `SET` — without new machinery, and
became a `META.md` entry: a reframing that dissolves several questions at once is
probably right.

Four verbs, three letters each, which makes a fifth typographically awkward *on
purpose* — a complexity budget that enforces itself against
node-graph-by-accretion. `CAP` then produced a mechanic nobody designed: a lever
at rest caps to zero, so parking the levers above a `CAP` module stops the machine
whatever is driving it. A dead-man's throttle, out of the verb.

**Attribution had to be rethought and came out better.** Under a pipeline there is
no owner to name — everyone shaped the signal — so instead of a banner naming a
winner, the chain is shown stage by stage down to the terminal. Multi-layer
inspectability landing where it counts, and it reads the same live or in replay.

## Consequence — the world can be broken

**Damage is measured in joules absorbed, never in hit points**, and that comes
straight from the inspectability pillar: energy is a quantity the machine already
has and can be shown. *The cone took 15 J and it is rated for 5* is a diagnosis;
*the cone lost 40 HP* is a number we made up. Rapier's own contact-force events
were probed and rejected — a solver force is not a quantity you can show a player,
and it cannot explain a prop hit by another prop.

Three bugs from this round are worth remembering as a class: the site billed
itself ¥55,690 before the machine had moved (props spawned overlapping and shoved
each other to death), then ¥9,540 (anything already sliding integrates the energy
gravity feeds it), and a cone rated at 22 J was indestructible because 6 kg at
2.2 m/s only carries 15 J. Every toughness is now a fraction of what the
drivetrain can deliver into that mass. And the nastiest: a test that **passed by
measuring the bug** — it had never hit anything, and what it detected was the
spawn defect.

## The cab becomes a machine rather than a screen

A component became **one thing seen from three postures** — a plate in the rack,
a cell on the dash, a pod on the glass — and only the plate is mandatory. What
made it a mechanic rather than a layout system was **three currencies**: a
chassis component costs nothing and brings the cockpit, a capability component
costs glass, a safety component costs capability. Safety kit shipping no pod is
not a discount, it is a different bill.

The refactor that paid regardless: **severity crosses the snapshot boundary as a
number**, so the masters derive over the whole machine and nothing is wired to a
named module — and the *word* stays a theme decision, because HANSA says
`STÖRUNG` where KIBA says `STOP`.

Then the panel stopped talking, over a run of sessions against one instruction —
*industrial machine, not a website*. Three rules came out of it that still decide
more arguments than anything else in `cab/theming.md`: **the label is a separate
object**, **a plate never changes**, and **the lens is the state**. Prose on
faceplates became stamps and decals; the power rail became real blade fuses
colour-coded to the automotive table, so a component's current draw is legible
without printing a number; and power and mode moved from the plate to the slot,
because *no manufacturer ships the fuse you power it through*.

**The benches were built here and are the reason most of it is right** — a
screenshot bench for the panel, a listening bench for the voice, both born of one
finding: a thing you cannot cheaply perceive ships broken with everything green.
The dash was authored blind, looked right in code, and the first screenshot showed
the instrument cluster scrolled off at 390 px. One bug — the deck sized in `vh`
rather than `dvh` — was reproducible on no desktop viewport at all.

## The machine gets a voice, and the seams get redrawn

Sound arrived with an owner rather than as an effects pack: **a manufacturer's
house is colours, words *and* sound**, in one object above both renderers. The
machine's voices are its chassis maker's, the site's belong to materials, and the
rig's — added later and narrowly — speak about the exercise and nothing else. A
house sets timbre and rate, never level. The horn and the buzzer, which had
shared a name, separated on the clearest line available: **the buzzer is the
machine talking to you and the horn is you talking to everyone else.**

The panel became switchgear in the same round, and almost all of it is heard
**off the recording** — switching a component off changes its slot on the
snapshot and the engine notices by itself, so a replay clicks in the right
places without anything being added to the event channel.

Two structural seams were redrawn while this was going on, and both were cases of
a document describing something that had stopped being true. The triptych was
two-thirds built: plates and cells were registered, while pods were hand-wired
into the shell per component — so fitting an instrument meant editing the
application. One **packet** per component fixed it. And commands got **one
channel** (`Controls`), replacing a set of private routes, the worst of which
handed an instrument a live module reference — a pod that cannot render from a
recording is not an instrument, it is a remote control with a dial on it.

The other seam: `cockpit/` versus `ui/` is **the machine against the rig**.
Manufacturers' work on one side, the training system's on the other. The rig may
read the machine; the machine knows nothing of the rig.

## Instruments measured rather than styled

The question *does the dash need both GRIP and SLIP, or just SLIP?* was settled
by measurement rather than argument: 7,200 steps across eleven scenarios, reading
the panel's own reductions. Pearson r between the two dials is **0.267** —
neither determines the other — and the GRIP instrument as built was right in one
regime and misleading in three.

The answer was *both readings, one instrument*: **TRACTION**, a plan view with
colour for the fraction of the friction cone in use, length for the contact patch,
and a centre-zero bar for slip. Two alternatives were rejected by screenshot — a
contacts rail that measured 1.3 px at real size, and a heat ramp to red that
collapsed the two marks the head exists to separate.

The deeper fix was a type: **`traction` is `null`, not 0, for a track with no
ground**, because 0 is what a *parked* machine reports and one number for two
opposite conditions is a dial that lies. Every consumer now has to decide what to
show for nothing measured. Damping went into the instrument, with the table that
justifies it — a damped needle *is* the real quantity, since every dial on a real
machine has oil or a shorted coil in it.

## Where it stands

What is built is in `README.md`; what it is, in `MEMORY.md`. The one shape worth
recording as *history* is what the loop still cannot do: it can price what you
broke and name what was driving, but it cannot let you **watch the moment back**,
which is the difference between being told and being shown. `L-032` changes that,
and every attribution card waits on it. Recent detail is in `LOG.md`.
