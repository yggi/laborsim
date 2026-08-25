# LOG.md — worklog

Append-only. Newest first. What was actually done, and closed cards.
Not plans, not open questions.

**Gate: 1000 lines.** On overflow, cut the oldest year into `docs/log/<year>.md`
and link it from the archive list below.

Archives:
- `docs/log/2026-early.md` — the scaffolding and rung 1, up to the first deploy.
- `docs/log/2026-mid.md` — the cab: the pipeline rack, the damage ledger, the
  dash and the triptych.

Entry format:

```
## YYYY-MM-DD — title
Cards: [id] ...
What happened, in past tense. Anything tried and rejected, and why.
```

---

## 2026-08-25 — a cab that goes round you, and levers you can hold

Cards: none closed. [L-051] narrowed — the cab furniture has geometry now and
still has no maker. Merged the audio branch in; see the merge commit for what
had to be reconciled.

**The cage stops being a frame and becomes a cab.** Sweeping the whole cab
(L-050) made a hole nobody had to look for: the A-pillar leaves the glass at
about 26° and behind it was sky. So the cab now continues past the windscreen —
a ribbed roof with the beam's underside showing, a door post out each side with
side glass and a waist rail between, and beyond the post a **door skin** wide
enough to outlast the neck. The head pans to 86°, which at 1:1 is thousands of
pixels, and a wall that ran out first would be a hole at exactly the angle you
were curious about. The vignette at the very edge stays put on purpose: it is the
aperture, not a part.

**The vertical look was inverted against itself.** Dragging right looked left —
grab-the-world — and dragging down looked *down*. One convention, not two: both
axes drag the world now.

**The neck is sprung.** The 1.2 s hold before the view eased back put a dwell in
the middle of a glance; it now starts the instant the hand leaves the glass. The
renderer is told `hold(true/false)` rather than being given a timestamp, because
the state is *a hand is on the glass*, not *a gesture happened*. `recentre()`
went with it — opening the rack no longer has to ask for the view back, because
nothing is holding it.

**The levers are sticks.** A shaft up through a ribbed rubber boot on a bolted
plate, a moulded grip, a gate with a notch at neutral — same place, same throw,
same dead zone, and not one line of the pointer maths changed. Pulled back is
drawn 8% larger, because the seat looks *along* the machine and a fore-and-aft
lever mostly moves toward you and away from you; with no perspective at all it
reads as a grip sliding in a groove, which is the slider it stopped being.

**Found by looking, twice.** The bench pulled a lever it did not mean to: the
levers sweep with the cab, so a drag started while the cab was still out landed
on one that had slid under the pointer. That is the cab being honest and the
bench being wrong — it waits for the spring now. And `npm run cab` vanished from
`package.json` during the merge, because `git checkout --theirs` ran before the
edit that was supposed to keep both, so the edit matched nothing and said
nothing (META: a scripted edit that matches nothing fails silently). The bench
failing to start is what said so.

## 2026-08-25 — the cab is one rigid object

Cards: closed [L-050]. Opened: [L-064]. History trimmed to its gate: [L-037]
dropped, already narrated below.

The card was ready and half of it was already built — the view has recentred
itself since L-052, and the card still listed it as work. Two decisions were
genuinely unmade, and they were the whole design: **what sweeps when the pilot
looks around, and how fast.** Answered: the *whole cab*, and *1:1*.

**The whole cab.** Pods, cage, levers and dash are one welded object; the neck is
the only hinge. Anything else is incoherent the moment you look at it — a pod
clamped to a cage that does not move is a sticker. The rig's own controls (the
CAB/CHASE switch, the toasts, the debrief) stay put, which turns out to be a
usable rule: **the machine's furniture moves, the rig's does not.** One
deliberate exception, the vignette at the edge of the glass: it is the aperture,
not a part, and a dark band crossing the middle of the view reads as a bug.

**1:1, at `f·tan θ`.** A rigid object rotating past a pinhole projects that way;
anything less is a cab made of rubber. On a phone it is brutal — 390 px of glass
is 26° across and the head pans to 86°, so a glance takes the instruments off
the screen almost at once. That is the price, and it is the chase camera's
bargain again: a glance costs you the levers and the E-STOP, which you cannot
find by feel on glass. The recentring view is what pays it back. Carried to
`NOTES.md` as the one thing only a player can settle.

**One DOM write a frame.** The renderer publishes the sweep in CSS pixels — it
owns the projection, and `focalPixels` is the seam — and the app writes
`--look-x`/`--look-y` on `:root`, not on the shell, whose `style` attribute
belongs to Svelte and would overwrite it. Read as **`translate`**, never as a
second `transform`: every cab element already has a transform, and the deck's
carries a 0.28 s transition that a per-frame value must not be fed through.

**The bound became the arm.** Placement moved into cage space (screen space at
the neutral look), and a drop is refused by structure: not through a pillar, not
behind the beam or the dash, not further out than 200 px of reach. That puts the
middle of the windscreen out of reach — the occlusion budget with a *reason*
instead of a rule. Rejected: hanging every pod from the header beam, which is
tidier and says nothing about the middle of the glass. The consequence beat the
intent: a **small** instrument still reaches the centre, because a short pod on a
long arm does. Cheap in view, free to place. Nobody designed that.

The arm is **drawn**, back to its pillar, so a refusal is visible rather than
inferred. And an arm **settles** a pod that does not fit — instruments are
whatever size their maker made them, the dash grows a row as kit is fitted, and
phones get turned sideways; L-056 no longer inherits pods stranded off-glass.

**Three defects, all found by looking.** The cab bench grew an app half (`npm run
cab` boots the real thing and drags on the glass) and it paid immediately: the
KIBA nag never fired, because `lastNag = 0` means "45 s since the epoch", which
a page a minute old has already passed — the *first* nag is the one that teaches
you the view comes back. Then the cab kept photographing 25 px off centre at
2.6 s and again at 5.6 s: the recentring ease was a flat fraction **per frame**,
so a phone at 30 fps got a neck twice as slow — on the device the mobile-first
pillar is entirely about. It is a time constant now. Third, the bench itself
pressed where a pod *used* to be after moving it, which pans the view: a
placement test quietly became a camera test.

The bench also carries the check a screenshot cannot make: everything bolted to
the cab moved by the same amount as `--look-x`. Reintroduced the bug to watch it
fail (META) — it named `.levers` and exited 1.

Not added to `MEMORY.md` again, and now it is a card: the file is at 299 of 300
and two durable facts are parked in the spill files waiting for room. [L-064].

## 2026-08-25 — the horizon rolls with the machine

Cards: none. A defect in the cab camera, plus the bench that was missing to see
it with.

**The cab view was spirit-levelled and nobody had asked for that.** Lean the
machine over and the horizon stayed dead flat; only pitch and yaw followed the
hull, which is why it survived this long — the view leaned honestly into a climb
and then stayed level through a side slope. The cause was not a decision. The
camera was aimed with `camera.lookAt(aim)`, and `lookAt` produces the
orientation with *no roll about the view axis relative to its up vector*; the up
vector was world up, so the hull's roll was discarded every frame, silently.

Fixed by composing the orientation instead of aiming it: `hull · yaw(−pan) ·
pitch(−tilt) · Ry(π)`, the last term being the half turn between a camera that
looks down −Z and a machine whose nose is +Z. New file `src/render/camera.ts`,
which exists to be testable — `createViewport` needs a WebGL context and the
signs do not.

**Signs derived, not tried** (META), and checked against the aim vector they
replace: the composition reproduces the old direction exactly, so pan and tilt
could not silently mirror while roll was being added. Then the other half of
that lesson — the old implementation was pasted back in over the new one to
watch the tests fail. Four of the five passed under it and only *rolls with the
hull* failed, which is what makes that test worth having; a fifth run with a
plain `Object3D` instead of a camera failed four, because `Object3D.lookAt`
flips its convention for cameras and lights. Probe the API, do not trust the
prose.

**`npm run cab` — a bench for the view through the glass.** `npm run shots`
benches the cockpit's DOM and nothing benched the 3D. The obstacle was never the
renderer, it is that the interesting frames are transient: 25° of roll is a
thing you drive into and cannot hold. So `scripts/cab.mjs` builds the real world
and the real viewport and hands the renderer a pose set by hand — the cockpit
bench's trick, one layer down. Seven poses, gitignored output. It paid for
itself inside the same hour: the roll direction was confirmed from a screenshot
rather than argued about.

Recorded in `docs/design/cockpit.md` as its own section, with the two
consequences: screen-fixed pods now read as wrong rather than unfinished
(L-050's case just got stronger), and roll is the classic sim-sickness signal —
if it ever needs mitigation the honest form is a damped *fraction* of hull roll,
never a level horizon. Deliberately **not** added to `MEMORY.md` § 6: the file
sits at 299 of its 300 lines, and a cab with no gimbal is principle 7 (*honest
world, real machine*) applied rather than a new fact — the index entry now
points at both cameras.

## 2026-08-25 — the event channel, and the machine's voice

Cards: closed [L-040]. Opened: [L-060]. Threads closed: none. Evidence added to
[L-057] and [L-046].

**The contraction came first, and it was already earned.** Three files were
keeping their own high-water mark into `snapshot.damage` and diffing it every
frame — the live voice, the renderer repainting a write-off, and the debrief —
and two of them carried a private hack to notice a RESET, because the list
getting *shorter* was the only clue a run had restarted. Audio would have been
the fourth. `src/core/events.ts` is the discrete half of the boundary: the sim
stamps every happening with a monotonic `seq` into a bounded ring, a consumer
keeps one number and one reader, and the rewind rule lives in one place instead
of being reimplemented per list and per cause.

The channel is the notification and the ledger stays the record. That split is
why the ring can be bounded: nothing consuming it wants a thump it failed to
play thirty seconds ago, and anything that needs the whole run still reads
`snapshot.damage`.

**Two things the ledger could not say now reach it.** `assessDamage` had always
measured the joules delivered into every prop every step and thrown the number
away unless it crossed a pricing threshold — so hitting an already-written-off
cone was, to everything downstream, identical to missing it. And the machine's
own collisions had no witness at all; they do now, thresholded on a **speed**
rather than an energy, because the track model caps its impulses at `mu·N·dt` so
0.16 m/s per step is all the drivetrain can shed however hard you brake.
Anything past that was the world. L-038 wants that number.

**Found by turning it on:** the untouched generated site emits one impact at
tick 109 — a marker pole falling over on its own, 1.6 J, unbilled and until now
invisible. Nothing is wrong; that is L-057, and the channel is the first thing
in the codebase able to see it.

**Then the voices** (`src/audio/`). Five, none of them sampled: the drive note
carrying load, the grind carrying slip, impacts scaled by joules, the hull on
its own scale, and the horn as the audible half of the master lamp. The
arithmetic is in `voices.ts` with no WebAudio in it, and `engine.ts` is the only
file that knows an oscillator exists — which is what lets the graph be built on
an `OfflineAudioContext` exactly as on a live one.

**Rejected: putting the mute on the dash.** A Labor's horn has no cut-out, which
is the entire point of a horn, so a machine with a "make me quiet" switch would
be a machine nobody would certify. Volume is the *rig's* control and sits with
the camera, which is the other thing that belongs to the room rather than to the
machine. The same reasoning settled where the acknowledgement lives: it moved
out of `DashPanel` and into the shell, because the lamp and the horn have to be
one fact and the beacon will be the third to read it.

**The bench found three defects nothing else could have.** `npm run listen`
renders every scene through the real graph in Chromium and prints peak, loudness
and brightness at each end of it:

1. Its own first brightness measure was blind. Zero-crossing rate is a standard
   cheap proxy for spectral centroid and it does **not move** when a filter
   opens on a periodic waveform — a lowpassed sawtooth crosses zero twice a
   cycle at 340 Hz and at 2600 Hz alike. It reported the entire `labouring`
   sweep as six hertz. Replaced with the fraction of energy above 1500 Hz.
2. The continuous voices were loud enough to sit permanently inside the limiter,
   so a 140 kJ landing came out no louder than driving along. Halved, and the
   limiter moved from −10 dB to −4.
3. The strike's filter was tied to the ring pitch, which made the heaviest
   impacts the dullest, because the heaviest things ring lowest. The ring is the
   material and the strike is the energy; they are separate numbers now.

A fourth fell out of (2): opening a sawtooth's filter can only ever move a few
percent of its energy, so brightness alone was a cue visible in a spectrum and
inaudible across a room. Load makes the machine **louder** as well now.

**Two more found by reading the diff back adversarially**, both about lifetimes.
The live voice was unmounted whenever the rack opened, so its reader rejoined the
run at zero and re-voiced every line still on the channel the moment you closed
the cabinet — a bug that predates the channel (the old high-water mark restarted
at zero too) and was simply invisible while the whole damage list was in reach.
It is hidden now, not destroyed: a subscription belongs to a consumer's lifetime.
And the E-stop lights the master at ALARM *and* opens the debrief in one press,
so the horn was blaring under somebody explaining what you had just done. The
folder silences it. Both verified in the browser rather than in the stylesheet.

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
its § 9 Rapier paragraph to `docs/design/stack.md`, where the same text already
was, and its coding conventions to a new `docs/design/conventions.md` — each one
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

## 2026-08-25 — the KIBA-NAV-UNIT, and a panel that packs

Cards: none closed. Opened: [L-056].

**Three dials became one part.** Speed, ATT-0 and TRACTION now share one bezel,
one set of four screws, and legends engraved into their own plate. The
designation is internal and appears nowhere on the panel. The argument is not
tidiness: three separately bolted gauges claim three suppliers, three fitters and
three dates, and none of that is true of a cluster the chassis maker ships as a
unit. The counters stayed out of it — a totaliser has never shared a bezel with
a live dial, and you do not steer by one.

`Gauge`, `Attitude` and `Traction` each lost their own bezel and four screws and
gained the rim of the hole they are set into. That deleted three copies of the
same brushed-metal gradient and, more usefully, **freed the space a frame was
taking**: the dials grew about a quarter at the same footprint.

**The engraved legends are a deliberate exception to the plate rule**, and the
line is about who made the words: a plate names a control, was engraved by
whoever fitted it, unscrews, and can outlive what it names; an engraving names
part of the instrument it is cut into and cannot be wrong, because it and the
dial are one object. `Meters` already relied on that for its H and KM without
anyone writing it down. Now `substrate.css` carries it as `.mfg-engraved` with
the argument, and `tests/cockpit.test.ts` fails if a cell engraves anything — a
cell is a faceplate, so every word on one names a control (META: a rule enforced
by a document is a rule that gets violated anyway).

**The panel packs now, and the fix was structural.** Every part is its own item
in the wrapping flow; the group boxes are gone except the masters, which keep
theirs because a mushroom button you hunt for twice is one you find too late.
Groups were why the panel looked sparse: 300 px of instruments either fitted on
a row or jumped to the next one *entire*, leaving a hole as wide as everything
in it. The flow is bottom-aligned too, so every plate and every legend across a
row lands on one line with the controls ragged above it — which was already the
rule inside each group, and is a better rule outside them.

Measured, at 390 portrait: **251 px of dash before, 229 after**, with bigger
dials and one fewer row — and the same 229 whether or not any component is
fitted, where it used to grow a row for the cells. 22 px of glass back.

**Rejected: `margin-left: auto` for the seam.** It made the gap between the
machine's kit and the fitted kit *all* the slack in the row — fine at 390, a
third of the panel in landscape, empty, with the cells marooned at the far edge.
It is a fixed 12 px extra now, and the leftover steel collects at the end of the
row where it reads as what it is: room for more kit. That is the panel budget
(L-025) showing through, so it is worth seeing.

**The bench grew a landscape row**, because none of the above was decidable from
the portrait shots. The specimens render at 390 and again at 844, and
`npm run shots` writes both. Two findings from doing it: the shots viewport was
390 wide, so the first landscape shots came out silently clipped to 390 with a
green run and no error — the browser window has to hold the widest specimen —
and nothing in the cab is responsive to the window itself, so widening it is
free. That is META's *ask the browser what it computed* twice in one afternoon:
the clipped screenshot looked like a CSS bug and was not.

Not done, and carded as [L-056]: **the cab around the panel.** The dash reflows;
the glass does not. The deck's travel is in `dvh` and the rack takes 74 of them,
which is a portrait number, so turned sideways the glass is a letterbox and the
pods sit where a portrait layout left them. Camera FOV, cage geometry and deck
travel want deciding together, and not as a CSS pass.

## 2026-08-25 — GRIP and SLIP become one head

Cards: closed [L-055]. History trimmed to its gate: [L-017] dropped, already
narrated above.

**TRACTION.** The cluster now has two big heads and they are the machine's two
viewpoints: ATT-0 the horizon, seen from the side, and TRACTION the plan view,
seen from above — nose up, hull in the middle, a track channel either side. The
answer to yesterday's question was *both readings, one instrument*, which the
measurements had already forced: slip alone deletes the panel's only warning
that arrives before the failure, and GRIP alone was wrong in three regimes out
of four.

Three marks, chosen because a person reads them as separate channels: the
channel's **colour** is the fraction of the friction cone in use, its **length**
is the contact patch (hatched where samples have left the ground), and the
centre-zero **bar** is slip, growing the way the track is sliding. Contacts had
never been on the panel at all — only on the debug telemetry line — and folding
them into the channel's length is what made the outer contact rail unnecessary.

**Rejected: a separate rail for contacts.** Built it first, 2.5 units wide in a
100-unit viewBox — 1.3 px at the size this is actually bolted on at. The
screenshot settled it (META again): a reading nobody could take. Making contact
*be* the live length of the channel is one mechanism instead of two, and it
degrades into the no-contact state for free.

**Rejected: a heat ramp that runs to red.** Also settled by screenshot. At 0.94
the channel was rust-red and the red slip bar vanished into it — the two marks
this head exists to separate, collapsed. The ramp stops at amber now, and red
belongs to the things that have *happened*: the slip bar and the frame at the
limit.

**`traction` is `null`, not 0, for a track with no ground.** The type change is
the actual fix for the defect found yesterday; the instrument is downstream of
it. 0 is what a *parked* machine reports, and a dial that takes a number for
both showed the same thing for opposite conditions. Every consumer now has to
decide — `Telemetry`, the readout (which blanks to `---`), and the fixtures,
where `contacts: 0, traction: 1` used to be expressible and described a machine
that does not exist.

**Damping lives in the instrument, and the numbers say it is enough.** Undamped,
traction sat above the gauge's own danger band 21% of a flat-ground run at full
speed. The UI reads snapshots at 10 Hz and *decimating* a signal like that
rather than averaging it triples the jump between updates (0.06 → 0.19 of full
scale). Measured four pipelines: raw 60 Hz (23.0% false alarms, 1.50 σ between
flat and 40°), decimated 10 Hz (21.0%, 1.53 σ), decimated and damped at 0.6 s
(**0.0%, 2.12 σ**), sim-side window mean then damped (0.0%, 2.29 σ). The damper
alone does the work, so the sim keeps one meaning for one field; 0.17 σ is not
worth a second. A damped needle *is* the real quantity — every dial on a real
machine has oil or a shorted coil in it — and `damping.ts` carries that argument
with the table.

**Both tells point at TRACTION**, which is the fix for the mis-attachment: GND
used to light a lamp beside a dial that read 0% for a track in the air. And the
`max(left, right)` reduction is gone rather than repaired — both channels are
drawn, so a machine hanging one track over an edge no longer reads identically
to one in a hard turn. There is a bench specimen for exactly that now; it was
not previously expressible, because `snapshotOf` gave both tracks the same
contact count.

**The odometer.** Right-aligned, so the digits sit against the KM screened
beside them instead of floating in a window sized for the clock above. The
metres are their own colour (`--mfg-odo-fraction`, defaulting to the integer
colour so an unopinionated maker sees no change) — a real trip meter puts the
fractional drum on a separate wheel because it is the part always moving and the
part you are not reading. And the decimal point got a full column: it had a
quarter-width one with the glyph absolutely positioned inside it, which was a
space fix for a window this reel no longer lives in.

Not done, and deliberately: no annunciation for *low margin*. Traction pins at
1.00 for 100% of a normal hard turn — skid-steer fills the friction circle by
construction — so a lamp on it would cry wolf every time the machine turns. The
colour carries it; a lamp would need a condition that understands turning, and
that is a module's opinion, not a chassis symptom.

`MEMORY.md` is now full at 300 lines and `NOTES.md` at 100. The next durable
fact or open thread forces a spill; the log itself took a cut to make room for
this entry.

## 2026-08-25 — is GRIP the same instrument as SLIP?

Cards: none touched. Opened: [L-055]. No code changed — this was a measurement.

The question was whether the dash needs both dials or could be reduced to SLIP.
Answer: **they are different quantities, and the difference is real — but the
GRIP instrument as built delivers it in one regime and misleads in three.**
Measured headless over 7200 steps across eleven scenarios (flat cruise and
crawl, spin in place, hard turn, ramps at 10/25/40/42/55°, idle on flat and on
grade), reading the panel's own reductions rather than the raw `TrackState`.

**The quantities.** `slip` is a velocity difference at the contact — state.
`traction` is impulse wanted over impulse the ground can hold, per step —
demand over capacity. Pearson r between the two dials is **0.267**. Neither
determines the other, and the buckets show why: below the SLIP lamp's 0.4
threshold, GRIP ranges across its entire scale.

**What GRIP knows that SLIP does not: margin.** On a 40° ramp the machine
climbs cleanly — slip under the lamp threshold 89% of the time, mean 0.31 —
while GRIP sits at 0.93 (5–95 pct: 0.87–1.00). At the edge of the cone and not
yet sliding. That is the only leading indicator on the panel; everything else
is lagging. Delete it and the dash can only tell you about failures that have
already happened.

**What SLIP knows that GRIP does not: the ground is gone.** Fully airborne on
the 55° ramp, over 426 steps: GRIP reads **0.00**, SLIP pegs at 2.20 m/s, past
its 1.6 span. `summarize()` returns `traction: 0` for `contacts === 0`, which is
also what `idleTrack()` returns — so 0% means *parked* or *clawing air*, two
opposite conditions on one reading. That matters because the GND tell is bolted
to GRIP, whose comment claims the dial is "pinned, with no ground under it". It
is not. It reads zero, which looks nominal, beside a lit red lamp.

**Three more defects, all measured.** `Math.max` over the two tracks takes the
*good* side's number: on the 55° ramp with exactly one track down, the dial read
1.00 for every such step — indistinguishable from a turn. In a hard turn GRIP is
pinned at exactly 1.00 for 100% of steps (per-step jitter 0.000): skid-steer
saturates the friction circle by construction, so the dial is dead at full scale
through a normal manoeuvre. And on flat ground at full speed it spends **21.9%**
of steps above its own 0.85 danger band, jittering 0.058 per step — six dial
points a frame, crying wolf at a machine doing nothing wrong.

**Tried: smoothing.** An EMA over the raw dial, τ from 0.15 s to 1.2 s. At 0.6 s
the flat-ground false-alarm rate falls from 21.9% to **1.8%** and the ordering
stays clean and readable (flat 0.56 · 25° 0.67 · 40° 0.88). So the noise half is
a display filter and belongs in the instrument, not in the sim — but smoothing
does nothing for the zero-means-two-things overload or the turn saturation,
which are the model and the reduction, not the render.

Rejected: reducing to SLIP only. It would delete the panel's one warning that
arrives *before* the failure, and L-040 wants "a machine labouring at 90% grip
sounds like it", which needs the quantity whether or not a dial shows it.

Named but not taken: replace GRIP % with **MARGIN %** (`1 − utilization`). Same
number read the other way up, it falls toward zero as you get into trouble, and
"no ground" becomes zero margin rather than zero use — the overload disappears
by construction. A bigger change to the face than to the sim. Carded as part of
[L-055].

## Cards pushed out of `BOARD.md` history

The board keeps ten; older closed cards land here, in date order.

### [L-036] TILT-GUARD — the first safety component — **closed** (2026-08-24)
Caps drive on hull pitch and roll, limits set by two sliders on its faceplate.
Verb `AMP`, because `CAP` would clamp a positive intent into a reversing
signal's range and turn the machine around — a safety module causing the crash
it exists to prevent. Rejected: reading attitude through `asin`/`atan2` — the
sines come straight out of the quaternion and stay bit-portable. Ships enabled
and deliberately timid (25°/18° against a 43.5° climb limit), so the first
lesson is that your own machine is what stopped you.

---

## 2026-08-24 — the panel stops talking

Cards: [L-052] extended. Opened: [L-054].

**The status strip is gone.** A line of words along the bottom of the dash
naming the worst thing happening was the panel reading its own lamp out loud,
and a lamp that needs a caption has failed. What it said is now split three ways
and each part goes where it belongs: the master carries severity in colour and
rhythm, the **tells** point at the instrument that knows why, and the sentence
moved into the debrief, which is the one surface in this cab allowed to finish
one. `masterLine` did not change — only who reads it.

**Tells.** A gauge measuring a quantity that can raise a condition now carries a
small lamp on its plate's line: GRIP for a track that has lost the ground, SLIP
for tracks sliding. One master says *something is wrong* and says it once, which
is right and useless on its own, because the pilot's next question is always
which instrument to look at. `Annunciation` gained an optional `at` naming the
instrument, so a condition with no gauge — a citizen, the bill, the stop — lights
only the master, which is honest. The tells do not flash: rhythm means
unacknowledged, the master owns that, and two things blinking out of phase is a
panel arguing with itself.

**The E-STOP is the way out.** There is no menu button, because a training rig
does not have one: you stop the machine, and then somebody comes and talks to
you about it. The mushroom latches the drive dead and opens the folder in one
press; RESUME twists it back out, which makes releasing a stop the deliberate
act it is on a real machine. `toggleEstop` became `setEstop(next)` so hitting an
already-latched stop is not a release.

**Hours and distance became one instrument** — one housing, two drums, units
screened on its own face rather than engraved on panel plates, because a gauge
arrives from its supplier with its units on the dial while a plate names a
control. Two housings cost two bezels and two plates for one idea. And the cells
now float to the far end of their row: the gap is the seam between what the
machine came with and what somebody bolted on.

**The odometer had no decimal point.** It was in the DOM, the right colour, the
right size, correctly positioned — and drawn on the seam between two digit
columns, where at a monospace advance it lands on the foot of the digit to its
left and vanishes into it. Only a screenshot found it; every assertion about it
would have passed. It has a quarter-column of its own now.

**The `:global` conformance test now scans `src/ui/` as well as `src/cockpit/`.**
It was scanning only the directory whose author is already thinking about the
rule — and the first `:global` written after the ban went in was written in
`Rack.svelte`, where nothing was watching.

## 2026-08-24 — drums, and a dead slot is dead

Cards: [L-052] extended.

**A third display primitive**, adapted from an `Odometer` component handed over
for the purpose: mechanical rolling digits. The three are now a real taxonomy
rather than three skins — `Seg` shows a **reading** (a number that can fall),
`Matrix` shows a **message** (words, which segments cannot make), `Odometer`
shows a **total** (a number that only ever goes up). Hours run and ground
covered have never been displayed any other way on a piece of plant, because the
number outlives the electronics and a wheel keeps its count with the power off.

The hour meter became **TIME** (HH:MM:SS on drums — a training exercise is
measured in minutes and four digits and a tenths wheel cannot show a minute) and
gained a real **odometer** beside it. Distance is integrated in the sim at the
fixed step, multiply-and-add only, so it stays bit-portable and a recording
carries its own mileage; an odometer that reset on reload would be lying about
the machine.

**A slot with its fuse pulled is now dead, not dimmed.** Colour drains out of it,
the plate goes grey, the circuit lamp is out and NAV's LCD is a **grey**
rectangle rather than a blue one showing nothing — the backlight is what makes an
LCD blue, and getting that wrong is the clearest tell that a screen is a `<div>`.
A component running and a component switched off should not differ by *opacity*;
that is a form disabling a field.

**The latch lost its word.** It is a knurled bar across the bottom edge of the
panel with a machined thumb recess in it, and finding out what a handle does is
the whole of what a handle is. The accessible name stays, because a screen reader
cannot pull it and see.

## 2026-08-24 — marks instead of prose, and real fuses

Cards: [L-052] extended.

**The plates stopped talking.** Every faceplate carried a sentence about what its
module considers, and a rack of plates each explaining itself in prose reads as a
form rather than as equipment. A module has a manufacturer's label; it does not
have a slogan. The sentence still exists on the module and belongs in the
debrief, which is the one place this machine is allowed to use words.

**`Decal` replaces it** — a seeded generator for the small stickers and stamps a
real part accumulates: a test-house roundel, a parts-bin barcode, an inspector's
pass stamp, a rating label. Individually meaningless; together they are most of
what separates a photograph of a machine from a drawing of one, precisely
because nobody *designed* them onto it. They arrive from three different places,
in three typefaces, each stuck slightly crooked. Which kind a maker uses is
characterisation: HANSA has been to a test house and will not let you forget it,
TOWA came out of a parts bin, KIBA stamped it passed and moved on.

Seeded off the component id and never random, for the same reason the cabinet's
blown fuse was: kit that reprints its own certification between replays of one
recording makes the recording feel untrustworthy.

**Real fuses.** The slot's power rail is now a fuseway: a **blade fuse
colour-coded to the standard automotive table**, a circuit lamp beside it, and a
brass screw terminal with the wire leaving into the dark. The colour code is not
a palette decision — it is the table, and it means a component's current draw is
legible across the cabinet without printing a number anywhere: the drive controls
take the big green thirty, guidance sips five, a guard sits on ten.
Characterisation with a real referent, which is the cheapest kind.

The decorative fuse carrier at the bottom of the cabinet went with it: every slot
has a real fuse now, so a second one was saying the same thing twice. The wire
loom stays — it is the thing that anchors "under the hood", and it is where all
those terminal wires are going.

Also caught: a `:global` I had just written into `Rack.svelte` to size the decal
SVGs — against the invariant in the very contract this round is building. The
decal takes a `width` prop instead.

## 2026-08-24 — cleanup, and the slot takes back power and mode

Cards: [L-052] extended again, from a real-device screenshot.

**The bug only a phone could show.** The deck was sized in `vh`, which is the
*large* viewport — the height the page would have with the browser chrome
hidden — so on a device it translated a URL bar too far down and put the alarm
row, the strip and the latch below the glass. `dvh` tracks what is actually
visible. No desktop viewport reproduces it, which is the whole lesson.

**Reversing an earlier decision: power and mode belong to the slot.** Every
plate used to carry its own enable lamp and verb button, drawn by the rack but
sitting inside the plate as if the maker had chosen them — which reads as a
form, not as equipment. *No manufacturer ships the fuse you power it through.*
Now: a cartridge fuse and the mounting ears on the left rail, the bus tap on the
right with the mode switch **under a hinged cover** (what a fitted component
does to the drive should not change by brushing it with a thumb; the cover is
only up while the slot is powered). A module owns its style and an optional
**face** — its own interface — and nothing else. The ears took the reorder
arrows, which is where they belong: unbolting them is how you move a plate.

**A second display primitive.** `Matrix` — a 5×7 dot-matrix LCD, blue backlight,
white characters, hand-cut glyphs. Deliberately a different *technology* from
`Seg` rather than a different colour: seven segments show a number and nothing
else, so a component with something to *say* needs a matrix, and dot-matrix
character modules are the part that dates a machine. NAV-1's face is one, which
makes TOWA read a generation newer than the cab it is bolted into.

Also: the pods lost their duplicate title bars (the Draggable already carries
the name — that was the doubled bar on the device) and gained their makers'
housings, so HANSA's is machined and hex-screwed with an orange readout and
TOWA's is moulded, rounded and backlit with no visible fixings at all. A real
**cage** replaced the vignette: pillars, a header beam, welded gussets, bolts.
The view **returns to forward** after a glance, so looking costs one swipe
rather than two — otherwise the cheapest way to avoid the cost is never to look.

**Meta-labels gone**: the rack header, the actuator terminal's name, the
hands-off-the-wheel banner, and the telemetry's identity and speed lines, which
the dataplate and the gauges now carry. Show, do not tell — a rack is obviously
a rack, and signal obviously flows down it to the terminal.

One thing broke on the way: the terminal shared the per-slot `.meters` class,
so restyling those into a 74px column made it three hundred pixels tall and
pushed the cabinet furniture off the bottom. Shared class, two very different
jobs.

## 2026-08-24 — the panel, in detail

Cards: [L-052] extended. A refinement pass on the same round, from a punch list.

- **Two master lamps became one `ALARM`.** Off, yellow, red — and the *rhythm*
  carries what the second lamp did: fast unacknowledged alarm, slow
  unacknowledged caution, steady once pressed. Two lamps meant two things could
  be lit at once saying the same thing, which is a dashboard talking to itself.
- **Numbers read out in seven segments**, drawn rather than typeset. A webfont
  was the obvious move; drawing the seven bars is better on three counts — the
  unlit segments become *real* (and the ghost is what the eye reads as an LED,
  more than the digit shapes are), it costs no font file against an unmeasured
  mobile byte budget, and it is exactly what `instrument-rendering.md` says SVG
  is for. The hour meter keeps mechanical drums, because that is what an hour
  meter has.
- **The rack standardises on 1U and 2U.** A rack is a standard and a standard
  has a pitch; without one a maker can make its plate taller to get attention.
  It bit immediately and correctly: TILT-GUARD at 2U had to give up its rating
  line and one line of prose to keep its limit sliders. Tried first and rejected:
  splitting the plate identity-left / settings-right, the way a real faceplate
  with pots is arranged — it overlaps at 390px, because a bordered identity
  block will not shrink below its own text.
- **Brushed silver bezels.** The cream ones read as plastic, which is a
  different decade.
- **The cabinet got furniture** — a blurred wire loom and a fuse carrier with one
  blown fuse. Not decoration: it is the thing that says you have your head under
  the hood rather than in a menu. Fixed, never random, because a cockpit that
  reshuffles between replays of one run makes the recording untrustworthy.
- **The serial number is the world seed.** The rig stamps the machine and
  generates the site in the same breath, so the number riveted in front of the
  operator is the exercise they are about to be tested on, and two operators
  comparing serials are comparing worlds. The seed now crosses the snapshot
  boundary, which it should have done anyway — a recording that cannot rebuild
  its own world is not a recording.
- HANSA's cell became a **beacon**: a ribbed dome on a machined base, surface
  mounted where everything else is let in. Its plate is its own override of the
  panel convention — heavy border, warning mark cut in beside the name. The
  invented DIN number came out; it was a mood, and the treatment carries it.

The rule that came out of it: **every indicator carries its component's name.**
A maker may style the plate however it likes and may not omit it.

One process note worth keeping: two edits this round silently did nothing,
because `str.replace` on a file the formatter had reflowed matches nothing and
says so with silence. One of them turned the whole dash black. Scripted edits
now assert that they matched.
