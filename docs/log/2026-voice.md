# LOG 2026 — the voice

Archived from `LOG.md` when it reached its 1200-line gate. Newest first, as it
was there. Three sessions in which the machine stopped being silent: a horn that
is a horn and a panel that clicks, sound becoming part of what a manufacturer
*is*, and the pod joining the registry — which is the session that moved the
cockpit/ui seam to where it still sits.

---

## 2026-08-25 — the horn, and a panel that clicks

Cards: closed [L-063]. Threads: narrowed "does a component ship a voice?".

**The machine had a horn and it was the wrong one.** What was called `horn` is
the annunciator's **buzzer**: it sounds by itself, it is the audible half of the
master lamp, and it stops when you acknowledge it — the machine talking *to
you*. A truck horn is you talking to everyone else. They were sharing a name and
a slot in the sound house, and separating them is most of the design.

An air horn is a **chord**: two or three trumpets on one air line, tuned to an
interval and blown together, which is why it is satisfying rather than merely
loud. So a house declares a root and the ratios stacked on it — KIBA gets a
major triad off 214 Hz, HANSA the two-tone fifth every European klaxon has used
since the war, TOWA a moulded sounder an octave apart with no air in it at all,
which carries about as far as a doorbell. The mechanism around the chord is the
same on everybody's horn and lives in `voices.ts`: the trumpets are never quite
in tune with each other, the diaphragms take a moment to speak and bend up into
pitch, the valve chuffs before the note arrives, and the tank sags through the
release. That last one is the *owp*.

It is the only voice in the game that renders a **decision** rather than a
simulated quantity, which is what earns it the loudest level on the machine —
every other number in `voices.ts` leaves room for the site and this one takes
the room. It also **ducks everything else** about 7 dB while it is down: three
trumpets at arm's length are all you can hear.

That duck arrived from a new bench scene rather than from taste.
`everything-at-once` — rutted ground, the horn down, a pipe stack at speed and
the master alarming, all inside a second — **clipped at 1.04 on its first run**,
which is the scene's whole job, the limiter's justification being summed
transients. With the duck and the horn's level set against it the worst case
peaks 0.88 and the horn alone 0.81.

**The panel is switchgear now.** Two events, because a real control is two: a
**click** for the button bottoming out and a **clunk** for the contactor behind
it letting go, a fraction later and much lower. The gap between them is the
difference between a panel and a website, and it is the only way to hear that a
switch did *not* do anything. KIBA is sprung steel with a fist-sized contactor
behind it; TOWA is a membrane over a dome switch with a solid-state relay that
makes no noise at all, which is either refinement or a machine that will not
tell you what it did.

The part worth keeping is **where it comes from**. Almost every switch on the
machine is already on the recording — flipping a component off changes its slot
on the snapshot — so the engine notices the change itself and plays it, exactly
as the scene notices that a prop moved. Nothing was added to the event channel
and nothing in the cockpit tells the ear it was pressed, and because it is on
the recording **a replay clicks too**. Only cab furniture the machine does not
record needs a direct channel: the cabinet latch, the acknowledgement, an
instrument clamping home on its arm. The shell already owned every one of those
callbacks, so `Audio.panel` was the whole of the plumbing.

The camera and the volume stay **silent**, and that is a decision rather than an
omission: they are the training rig's furniture, and the rig does not reach into
the cab and make noises.

**The panel was inaudible when it was finished, and the bench said so.** The
`switchgear` scene measured *identical* to a scene with the panel's gain set to
zero — five switch events firing correctly at the right moments, and not one of
them loud enough to matter. Fourth time the same lesson has been paid for here:
a click is a few milliseconds of filtered noise and almost all of it is thrown
away by the filter that shapes it. At three times the level it peaks 0.33 where
the same scene without the panel peaks 0.16.

Two things that came out of chasing it:

- **The null test is the check.** Setting the new voice's gain to zero and
  re-rendering is what turned "it sounds fine to me" into a number. It took
  about a minute and it was the only thing that would have caught this.
- **RMS over a fifth of a scene cannot see a transient.** Four clicks move it by
  a thousandth. For a scene about transients the honest column is the
  whole-scene peak, and the file is there to be played.

`Audio.render` takes a `CabState` — the acknowledgement and the horn — rather
than a bare condition. Both are things the *hands* did and neither is on the
recording: nothing on the site can hear a horn, because nothing on the site can
hear. When a citizen can, the horn becomes a sim input and joins the recording
where the levers are.

192 tests, seventeen bench scenes, nothing clipping, and the cell toggles, the
latch, the acknowledgement and the stop all checked in the browser with a live
context.

## 2026-08-25 — the machine gets a maker's voice, and three more of its own

Cards: closed [L-061]. Opened: [L-062]. Threads: opened "does a component ship a
voice?", closed "pods on arms" (it had crystallized into `components.md` and
L-050 and was being kept in three places).

**Sound got an owner.** A manufacturer was already three things — how its kit
looks, what words it uses, what it says to you — and it is four now. The
machine's drivetrain, running gear, loose fittings and horn are voiced by the
house of whoever built the **chassis**, read off the chassis slot on the
recording exactly as the dash reads its panel colours, so a replay sounds like
the machine it recorded. Nothing in `src/audio/` names a manufacturer.

The other two owners were written down because they are the ones that get got
wrong later: a **component** is voiced by its own maker rather than by the
chassis, and the **site** is voiced by materials and belongs to nobody. A pipe
stack is steel whoever stacked it.

**The house moved out of the cockpit** to `src/makers/`. `cockpit/` holds what
the manufacturers made; a house is who they are, and it now has two readers. One
house per maker rather than one table per surface — three places to edit a
manufacturer into existence is three places for it to drift, and it is also what
L-049 hands a blind author: one object is one manufacturer.

**A house may set timbre and rate; it may not set level**, and it may not decide
what a quantity means. That is the rack-unit rule in another medium — a maker
cannot make its plate taller to get more attention, so it cannot make its machine
louder either.

All three houses are complete, including HANSA, which does not build chassis. The
bench renders a TOWA chassis that does not exist, and the result was better than
the argument for it: TOWA's drive is electric, so against the same load ramp KIBA
hardens 17% → 23% brightness while TOWA sits flat at 12% → 11%. **A TOWA machine
hides its own labour from you.** Refinement as a trade rather than an upgrade,
and it fell out of characterising an electric drive honestly rather than being
designed in.

**Depth, and four voices.** The drone got a detuned twin and a firing pulse; the
machine got a **chain** (one knock per track plate at `commanded / GROUSER_PITCH`
— the rate the renderer already turns the belt at, so you hear what you see and
a racing belt under a stationary machine makes slip audible), a **squeak** (a
dry bearing under load at a crawl), and a **rattle** (the cab, answering to the
hull rather than to the drivetrain — the only voice that renders the *ground*).
Impacts stopped being identical: the wobble is drawn from `seq`, so a line of
cones is eight different cones and a replay still hits them the same way twice.

**Everything above was measured into place, and nearly everything was wrong
first.** The bench earned its keep four times over:

- The twin at full level doubled every driving peak at unchanged RMS. Halving it
  matched the peaks and *halved* every RMS — two detuned oscillators are briefly
  in phase and spend the rest of the beat cancelling, so they add in power and
  not in amplitude. Same shape of bug in the pulse: a square-cut note is quieter
  than a held one by `hypot(1−d, d)`, and `idle` fell 0.037 → 0.016 RMS at an
  unchanged peak until that was divided back out.
- The squeak and the rattle were both written at "sensible" levels and were both
  inaudible, for the third time in this file's history: **a filtered voice's
  level is not what you hear, its bandwidth is.** The strike was a bandpass once
  and made a 140 kJ landing quieter than a cone. They are set nine and ten times
  the drive note's level and are *not* nine times as loud.
- The rattle keyed off the accelerometer reading, and no function of a reading
  can tell "standing still" from "in free fall" — they read 1 g and 0 g, and
  both are silent. What shakes a toolbox is the floor changing under it, so the
  sim publishes **jerk** as well, differenced at the fixed step. A machine
  flying off a bank is now quiet, and arrives loudly.
- The `rough-ground` scene measured identically to smooth ground twice: first
  built out of sines, which is a wobble and not a ride; then out of sharp spikes
  in continuous time, which the 60 Hz bench sampled straight past. The sim is
  itself a 60 Hz signal, and a probe over the real site says what it looks like —
  median jerk 4 m/s³ at full ahead, ninetieth percentile 416, tail to 5000 —
  so the scene now draws one reading per frame from a curve fitted to that.

`MachineState` gained an accelerometer (`shake`: surge, heave, sway, and the
jerk between two readings). Nothing shows it, and it is a real measurement a
G-meter could read tomorrow, which is the test of whether a quantity was
published honestly. `GROUSERS`/`GROUSER_PITCH` and gravity moved into
`core/spec.ts`, where the picture, the physics and the sound read one number.

Rejected: a **suspension** voice, which is what "clanking suspension" would
literally want. Suspension travel is not simulated, and a voice with nothing
behind it is a sound effect wearing a simulation's clothes. The nearest honest
quantity is a track's `contacts` rising and falling, and the reason that was not
used instead is that no scene can vary it over time yet — so it would have
shipped unheard. Carded as L-062.

The architecture test caught `Math.hypot` in the jerk calculation: it is not
required to be correctly rounded and the value crosses to a renderer a replay
has to reproduce. Rewritten with `sqrt`, which is.

183 tests (169 before), thirteen bench scenes, nothing clipping, and six seconds
of real driving in the browser with the live context and no errors.

## 2026-08-25 — the pod joins the registry, and the seam moves

Cards: closed [L-059]. Opened: [L-057], [L-058]. Threads closed: "props seem to
float".

**The triptych was two-thirds built.** `parts.ts` registered a component's plate
and its cell; the pod — the instrument on the glass, the part that costs you view
— was hand-wired into `App.svelte` as a branch per component, a named position
variable per component, a title spelled out as a string, and a live `Autonav`
reference held so the route scope could call `setTarget`. Fitting a component
with an instrument therefore meant editing the application shell, which is the
exact defect the registry was built to kill. L-049 has been sitting in `ready`
asking three blind authors for a maker's plate, cell **and pod**, with nowhere
for the third one to go.

**One packet per component, not one table per part.** Cells, faces, rack units
and fuse ratings each had their own `Record` keyed by the same id. They are one
`Packet` now: what you unpack when you buy the kit, what an author is asked to
produce, and the single place a component is registered. Unregistered kit still
gets the base-case cell and now explicitly *no* pod — a dash missing a component
is lying, but the registry may not invent an instrument on a maker's behalf.

**One contract for all three postures.** Every part is handed the slot it is
drawn from and the style it is drawn in. Both pods were doing that work
themselves — `stages.find(s => s.id === "NAV")` and a hardcoded
`styleOf("TOWA DENKI")` — so neither could be drawn for anything but itself, and
no maker could re-skin its own instrument. Greps now fail if a part asks for
either.

**Commands cross back through one channel.** `Controls` is `toggle` and
`setParam`, handed to a part exactly as its stage is, and inert for a component
that is not in the live rack — which is what a replay gets. NAV-1's target was
the last control reachable only by holding the module, so it became what it
always was: a bounded number with a name and a unit. `setTarget` is gone. The
visible cost is a TARGET slider on NAV-1's faceplate, and that is the honest
consequence — the scope is a faster way to do what the plate does, not a second
wire into the module.

Rejected on the way: giving `FaceProps` a `controls` for symmetry. A face has
nothing to command — settings are the slot's business — and a container before
its contents is furniture (META).

**The seam moved.** `MEMORY.md` § 11 claimed `cockpit/` held the instruments and
`ui/` the shell; in fact every instrument lived in `ui/` while its own
primitives sat in `cockpit/`. The line is now **the machine against the rig**:
manufacturers' work in `cockpit/`, the training system's work — debrief, live
voice, debug telemetry, shell — in `ui/`. Eight files moved; three stayed, now
for a reason.

That exposed two scanners scoped by accident, which is the `META.md` lesson
about the `:global` ban landing where nothing was watching. Both style bans now
scan all of `src/`; the `--mfg-` rule became **two namespaces and no more**
(`--mfg-` a maker's token, `--cab-` the machine's own structure), because Svelte
scopes classes and not custom properties. And the half that bites: every
property something *reads* must be defined, unless it is a `--mfg-` offer with a
fallback — renaming `--dash-h` had already left a stale `var(--dash-h, 128px)`
in the toasts, which reads as working.

Bookkeeping, all of it forced rather than chosen: `MEMORY.md` hit 309 and lost
its § 9 Rapier paragraph to `docs/design/code/stack.md`, where the same text already
was, and its coding conventions to a new `docs/design/code/conventions.md` — each one
now carries the bug that earned it, which the four-bullet version had lost.
`META.md` hit 152, so *look at the numbers* and *ask what ran before your first
observation* merged into **suspect the probe before the system** — they are the
same lesson and the second one is the harder instance — and *one fact, one
place* left for `conventions.md`, where both its incidents live. `LOG.md` hit
1055 and the cab's fortnight went to `docs/log/2026-mid.md`.

**Measured the "props float" thread instead of arguing about it.** The rest gap
under a settled prop is **1 mm at the median** (n=102, lowest oriented corner
against the terrain sample beneath it), so the float is not a gap and never was:
what is left is the ground seam, which is rendering, and is now L-058.

The probe found something much worse on the way, and three wrong turns getting
there. First reading said poles were being *launched* — flipped over and moved
40 cm in a single step — which is impossible, and was: `createWorld` runs 120
settle steps before anything is observable, so "after one step" was never the
spawn state. Second, the obvious cause — furniture placed by sampling the ground
under its *centre*, so a 2.4 m barrier on a 15° bank is born 32 cm inside the
hill — was fixed, measured, and **made it worse**: standing a box on the highest
point of its own footprint drops it onto one corner, and cones toppled 10 → 23.
Reverted. What is actually happening is the boring answer: everything stands for
ten steps and then falls over, because a 3 m pole with a 0.16 m base cannot
stand on 20° noise. **Seventeen of eighteen marker poles, sixteen of
twenty-two barriers and ten of forty-five cones are lying flat before the
exercise begins**, inside the settle window where nobody could see them. Carded
as L-057; the fix is footing in the site generator, not a number in the sim, and
the comment in `world.ts` that called this "a small settling twitch" now says
what it really is.
