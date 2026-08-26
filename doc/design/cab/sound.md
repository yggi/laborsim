# Sound — the fourth channel, and who owns it

Spilled from `doc/design/rig/damage.md`, which is where the machine's voice started
because the first thing worth hearing was something breaking. It has outgrown a
table in somebody else's file.

Status: **built** (L-040, L-061, L-063, L-065). The arithmetic is `src/audio/voices.ts`,
the graph is `src/audio/engine.ts`, and the manufacturers' half is
`src/makers/sound.ts`.

---

## Nothing is sampled

**Engine-generated, from the quantities the sim already publishes.** The
argument is the inspectability pillar, not audio fashion: a sampled clip is a
black box triggered by an event, and a synthesised voice is another rendering of
a simulated quantity. Slip already has a number, a bar, and a belt racing under
a stationary machine; sound is the channel that reaches you when your eyes are
on the ground.

It follows that **if a voice cannot be traced back to a quantity, it does not
belong.** That rule refused a suspension knock outright, because suspension
travel was not simulated and inventing one would have been a sound effect
wearing a simulation's clothes. The way it was eventually built is the rule
working rather than bending: **the springs were built first**, and the knock is
a rendering of the watts their dampers dissipate.

## Who owns a sound

Everything that makes a noise has an **owner**, and the owner decides its
character. This is the same arrangement as the visual theme, and deliberately
so: a manufacturer's house style is how its kit presents itself, and presenting
itself is not only a visual act.

| Owner | What it voices | Where it lives |
|---|---|---|
| **the chassis maker** | the drivetrain, the running gear, the loose fittings, the horn, the buzzer, and the cab's own switchgear | that maker's `SoundHouse` |
| **a component's maker** | its switchgear — and anything it later has to say for itself | that maker's `SoundHouse` |
| **the material** | everything on the site being struck | the material table in `voices.ts` |
| **the rig** | the exercise, and nothing else: a marker reached, the exercise complete, the exercise failed | `cueVoice` in `voices.ts` |

### The rig used to voice nothing, and that was right until it had an objective

This table said *nothing, deliberately* — the camera and the volume are the
training system's furniture, and furniture that made noises would be the rig
reaching into the cab. That reasoning still holds for furniture. It does not
hold for an **objective**.

Reaching a marker is a fact about the exercise that nothing in the world can
announce. The machine does not know what a marker is and must not; the marker is
a stake in the ground; NAV-1 may not even be fitted. Either the rig says it or
nobody does — and an exercise whose one piece of good news is silent is an
exercise you finish by squinting at a counter.

So the rule is narrowed rather than repealed: **the rig speaks about the
exercise and about nothing else.** It gets no voice for the machine, the site, or
its own controls, and the camera and the volume stay silent.

The character follows from that boundary. The cues are the only voices here made
of **intervals** — nothing on a machine plays a fifth — and the only ones whose
tone does not bend downward through its decay, because they are *generated*
rather than struck (that is what `Knock.bend` is for). They should sound like
something bolted to the outside of the world, because they are.

The machine's house is read off the **chassis slot on the recording**, exactly
as the dash reads its panel colours from it, so a replay sounds like the machine
it recorded rather than whatever is bolted in today. A KIBA does not sound like
a TOWA for the same reason its dashboard does not look like one.

The site is nobody's house. A pipe stack is steel whoever stacked it, and a
chassis manufacturer deciding what a boulder sounds like is nonsense you would
hear.

### What a house may not decide

- **Loudness.** Every number in a house is a timbre or a rate. This is the
  rack-unit rule in another medium: a maker cannot make its plate taller to get
  more attention, so it cannot make its machine louder either. Levels live in
  `voices.ts`, set once against the headroom an impact needs.
- **What a quantity means.** The mapping from `traction` to droop, from joules
  to amplitude, is the sim rendered. A house says what the machine is *made of*;
  the arithmetic says what it is *doing*.

### A house is a trade, not an upgrade

TOWA's drive is electric: it barely droops and there is nothing firing to hear.
Rendered against the same load ramp, KIBA hardens from 17% to 23% brightness and
TOWA sits flat at 12%. **A TOWA machine hides its own labour from you** — the
refinement it is sold for is the cue it takes away. That was not designed in; it
fell out of characterising an electric drive honestly, and it is the guiding
principle *complexity is a trade, never a ladder* arriving in a channel nobody
had thought to apply it to.

## The voices

| Voice | The quantity it renders | Owner |
|---|---|---|
| drive note | commanded track speed for pitch, `traction` for filter, droop and loudness. Two oscillators `detune` cents apart and cut by a firing pulse at `beats` × the note. Per track, panned to its side. | chassis |
| chain | one knock per track plate, at `commanded / GROUSER_PITCH` — the rate the renderer turns the belt at. Each plate is jittered by the maker's `clankSpread`. | chassis |
| squeak | `traction` × belt speed × **the reciprocal of speed**: stick-slip is a low-relative-speed phenomenon, so it belongs to a heavy crawl and is gone by working speed. | chassis |
| bogies | the **watts a side's dampers are dissipating**, with the count on the bump stops moving it up toward the stop's own ring. Per track: the only voice that can say *which side* took something. | chassis |
| rattle | the hull's **jerk**, from the accelerometer in `MachineState.shake`. What the ground gets through the springs, in the cab, centred. | chassis |
| horn | a **decision**, and the only voice here that renders one. A chord of trumpets on one air line: the valve chuffs, the diaphragms bend up into pitch, the tank sags when you let go. It ducks everything else by 7 dB while it is down. | chassis |
| panel | a control being operated: a **click** for the button and a **clunk** for the contactor behind it, a fraction apart. | whoever built the kit |
| buzzer | the master condition, at the master lamp's own blink rates. Acknowledging stops the noise and leaves the light on. | chassis |
| grind | `slip`, and only where `contacts > 0` — the largest slip reading on the machine belongs to a track in mid-air, rubbing against nothing. | chassis |
| impact | joules, as **amplitude ∝ √energy**. The ring is the material, the strike is the energy, the *pitch* is the mass, and the wobble is `seq`. | material |
| rubble | something being **written off**: a cloud of grains whose count, span, spread and regularity are the material's. A screech, a shatter, a splinter, a crumble and a ding are one function. | material |
| hull | the machine's own collisions, on a scale of its own — 140 kJ lands from 2.4 m and a real hit on a pipe stack is 15 J. | material |
| cue | the exercise: two notes **up** for a marker, three up and held for complete, two **down** for failed. Read off the event channel like an impact, so a replay is congratulated too. | the rig |

### The horn and the buzzer are not the same object

They shared a name until the machine got a horn, and separating them is the
clearest statement of the difference: **the buzzer is the machine talking to
you** — it sounds by itself, it is the audible half of the master lamp, and it
stops when you acknowledge it. **The horn is you talking to everyone else.** It
sounds because you pressed it, it is the loudest thing the machine can do on
purpose, and nothing acknowledges it.

An air horn is a *chord* — two or three trumpets on one air line — and that is
why it is satisfying rather than merely loud. The mechanism around the chord is
shared by every maker's horn and lives in `voices.ts`: nothing is quite in tune
with anything else, the diaphragms take a moment to speak and bend up into
pitch, the valve chuffs before the note arrives, and the tank sags through the
release. That last one is the *owp*, and it is the half people whistle.

It **ducks the rest of the machine** by about 7 dB while it is down, which is
not a mixing trick borrowed from records: three trumpets at arm's length are all
you can hear. It is also what keeps the mix inside its ceiling — see below.

### Coming apart is one mechanism with its dials turned

Five named noises — bending metal screeching, wood splintering, glass
shattering, concrete cracking, a pipe ringing — and no branch for any of them.
A failure is a **grain cloud**: some number of ordinary `Knock`s scattered over
some window, played through the same transient an impact and a track plate use.
The words fall out of four dials rather than the other way round:

| reads as | grains | window | spread | regular |
|---|---|---|---|---|
| metal screeching | many | long | narrow | **high** |
| glass shattering | very many | short | wide | none |
| wood splintering | few | medium | wide | none |
| concrete crumbling | some | medium | wide | none |
| a tube dinging | **one** | — | — | — |

A screech is stick–slip, so its grains land on a beat; that is why bending metal
belongs in the same function as breaking glass rather than beside it, and it is
the same argument the bogie knock and the chain link already make for reusing one
transient. A ding is the degenerate case: `grains: 1`.

**It takes the part list, not the material.** A floodlight is mostly steel and it
screeches; its glass head is a twentieth of it and it still shatters, because the
count is a share and never rounds to nothing. The ledger line names one material,
and while `rubbleVoice` took that, a mixed thing made one noise — which is a
scooter, sheet steel, rubber and a headlamp, sounding like a sheet. Each piece's
own mass places its own voice, so the headlamp rings an octave and a half above
the frame by arithmetic rather than by anyone choosing it.

### The second oscillator had never moved

The note is *two* sawtooths a few cents apart, and the beating between them is
what the section above calls **most of what separates a machine from a
synthesiser playing a note**. It had never happened.

`chase()` skips a write when the target already matches the last value it was
handed — and the twin was handed `held.hz`, one line *after* `held.hz` had been
set to that very target. Its guard was satisfied on every frame of every
session, so `twin.frequency` was never written at all. It sat at the 56 Hz it
was constructed with, at half the note's level, for the life of the context: not
a detune, a **fixed bass drone under a moving note**.

Three things made it invisible for as long as it was:

- **At idle it was accidentally right.** The note's idle frequency *is* 56 Hz, so
  the bug did not exist until you drove. `idle` measures identically either way.
- **`listen` renders the real graph**, so the drone was in the very first
  measurement and every one after it. There was nothing to compare against.
- **`voices.ts` was correct throughout**, and it is the half that has tests.

Measured by silencing the twin outright: `idle`'s peak went 0.122 → 0.081, so a
third of an idling machine's peak was a note nobody had chosen.

Fixing it raised the peak of every driving scene at unchanged RMS — `labouring`
0.477 → 0.560 — which is exactly what the section above predicts that adding a
real pair does, arriving four months late. **The level was left alone.**
Compensating the pair as *coherent* rather than as incoherent was tried, since a
pair fourteen cents apart is coherent at its beat peaks: it lands `labouring`
back on 0.472, almost exactly the number the level was originally set to, and
costs a quarter of the bed's loudness (RMS 0.078 → 0.060). That is a milder form
of the version this file already rejected once — *peaks matched the old note and
every RMS halved* — so the trade stands as it was written. The bed is no louder
than it was; it is crestier, which is what two detuned oscillators are for.

The worst case tightened with it: `everything-at-once` peaks **0.922**, against
0.895 before. Still inside the limiter, and less room than there was.

### A big thing rings lower, and that is why the table stopped growing

The material table used to be keyed on the **prop kind**, with a row per kind
holding an `hz`, a `decay` and a `grit` chosen by ear. It is keyed on the
*material* now, and the difference between a 24 kg marker pole and a 260 kg pipe
stack — one row of steel tube — is derived from their masses:
`size = ⁴√(m / 40 kg)`, `hz` divides by it, `decay` multiplies.

One fact, two consequences, one derivation. The old table said 300 Hz and
128 Hz, chosen separately; this says 273 and 150, chosen once. The 22 Hz the pipe
stack gained back is not a loss — a heavy landing was written at 43 Hz once and
was **silence** on the device this game is built for.

The reason it matters is not tidiness. It is that **a new kind of thing now gets
a voice of its own for free**, so growing the site from six kinds to fourteen
cost the ear nothing at all. That is what had been stopping the inventory.

### The panel is switchgear

Two events, because a real control is two events: a **click** for the button
bottoming out and a **clunk** for the contactor behind it letting go, a fraction
of a second later and much lower. The gap between them is the difference between
a panel and a website, and it is the only way to hear that a switch did *not* do
anything.

Almost all of it is heard **off the recording**. Switching a component off
changes its slot on the snapshot; the engine notices that by itself and plays
it, exactly as the scene notices that a prop moved. Nothing was added to the
event channel and no part of the cockpit tells the ear that it was pressed — and
because what you switched is on the recording, **a replay clicks too**. What is
left over is cab furniture the machine does not record: the cabinet latch, the
acknowledgement, an instrument clamping home on its arm. Those go through
`Audio.panel`, and they are voiced by the maker whose furniture it is.

### The ground now speaks twice

The springs sit between the ground and the cab, so the ground reaches you along
two paths and each has its own voice. **The bogies** are outside, per track,
keyed to the work the dampers are doing — that is the rut. **The rattle** is
inside, centred, keyed to what survives the springs.

The second half of that is measured rather than asserted. Re-running the ride
probe after the running gear was sprung, the ninetieth-percentile step fell from
a jerk of **416 m/s³ to 23** — eighteen times less — with the median almost
unchanged. The suspension is not smoothing the ride evenly, it is taking the
*knocks* out of it, which is what a suspension is for. The rattle's two
constants were refitted to the new ride rather than turned up to hide the
change: what the bogies take is what the cab does not get, and that is the thing
worth hearing.

### Three consequences worth keeping

- **`traction: null` survives into the sound.** A track with no ground does not
  go quiet, it runs away — the type's whole point, rendered. The chain agrees:
  it clanks *faster* in the air, because nothing is holding the belt back.
- **The clank rate is the belt's drawn rate.** `GROUSER_PITCH` is one number in
  `core/spec.ts` and both the picture and the sound read it, so you hear what
  you see — and when the belt races under a stationary machine, the clanking
  races with it. Slip becomes audible without slip being mentioned.
- **Audio is a renderer, not a reader** (`doc/MEMORY.md` § 12, rule 3): 60 Hz, and
  every wobble in it — grit, plate spread, impact variation — is drawn from a
  seeded generator or from `seq`, so a replay sounds identical to the run it
  recorded.

## The graph has tests now, and the arithmetic always did

`tests/audio.test.ts` is fifty-odd assertions about `voices.ts` — given a
snapshot, what numbers should a voice have — and it has caught real things.
**`engine.ts` had none.** Nothing anywhere constructed `createAudio`, so the half
that owns node lifetimes, automation and every path that can produce silence was
checked by ear alone. Four defects were found in it in one sitting and all four
had survived for the same reason.

`tests/graph.test.ts` closes that. `createAudio` already takes a
`BaseAudioContext` — which is why `listen` can render it offline — so it needed
no new seam, only a context that writes down what was asked of it. The fake
synthesises nothing; it is a **transcript**, and the tests are claims about the
transcript:

- **both oscillators of a side are retuned** when the levers move. Counted by
  *which* oscillator rather than by how many writes, because every oscillator in
  the graph has a `frequency` and the firing pulse's is chased too — a count of
  writes is satisfied with the twin doing nothing, and that is what the first
  version of the test did.
- **everything built after construction stops.** Asserted over *all* of it, not
  over the ones that happen to have a stop time: filtering to those and checking
  them passes with the leak in place, because a source with no `stop()` drops out
  of the sample.
- **no non-finite value ever reaches an AudioParam**, and a sim clock that has
  gone wrong does not silence the chains for the rest of the session.
- **a rewind plays nothing from the run that was thrown away.**

What it cannot do is say what anything sounds like, and it never will — that is
what the bench below is for. What it *can* do is catch a voice that is not being
driven, which is the shape every one of those defects had.

## Measuring is the only review

A sound cannot be asserted about. `listen.html` plays every scene and
`npm run listen` renders them through the real graph and prints peak, RMS and
brightness at each end, which is enough to make a claim falsifiable: *labouring
gets brighter at constant track speed*, *rough ground is louder and brighter
than smooth*, *the alarm scene gets quieter when it is acknowledged*.

`everything-at-once` — rutted ground, the horn down, a pipe stack at speed, the
master alarming and now the rig calling the exercise complete over the top of it
— exists because the limiter's whole justification is summed transients, and it
**clipped at 1.04 on its first run**, which is the scene doing its job. The
horn's duck and its level were set against it; the worst case still peaks 0.865
with the cues **and** a rut under the running gear, because both duck under the
horn like everything else on the bed.

The cues were set the same way. `checkpoint` peaks 0.473 and 0.367 with them
silenced; `exercise-failed` peaks 0.298 and 0.212. Both numbers exist because the
first version of `exercise-failed` measured **identically** either way: it opened
with a 180 J scooter and ran the drive note at 0.6 of full, and between them the
bang and the bed owned the peak while the cue sat underneath. Nothing was wrong
with the cue — the scene could not see its own subject. The fix was to make the
scene the thing it is actually about: a *nudged* scooter at a crawl, which is
both how anybody really clips one and how the number comes to mean something.

It has now caught more defects than review has, and the same one four times:
**a filtered voice's level is not what you hear — its bandwidth is.** A bandpass
around a narrow band throws away almost all of white noise's energy, so the
strike, the squeak, the rattle and then the panel clicks were each written at a
"sensible" number and were each inaudible — the panel measured *identical* to no
panel at all with the switches firing correctly. Set a filtered voice by
measuring it.

**A fourth time, and the worst.** The failure voices measured *identically* with
themselves silenced — peak, RMS and brightness alike — which reads as "this voice
does not exist". Two separate faults were hiding behind that one number, and each
needed its own experiment:

- **The scene was blind.** `what-it-is-made-of` ran the drive at 0.9 and the bed
  owned every number printed. A 0.9-gain probe dropped into the same branch moved
  the peak 0.288 → 0.489, which proved the branch was firing and the scene was
  not looking at it. The bed is barely idling now; `the-yard` went from full
  ahead to a crawl for the same reason, which is also how anybody actually pushes
  a stack over. That is the third scene to fall into this.
- **The level was the old bandwidth trap.** A grain is mostly grit, and grit is
  white noise through a lowpass, so almost all of what it is written at is thrown
  away by the filter that shapes it.

Set by measuring, each against the same scene silenced: `what-it-is-made-of`
peaks **0.533 against 0.148** at 22% against 14% brightness, `the-yard`
**0.578 against 0.541**, and `everything-at-once` **0.895 against 0.863**.

That last pair needed a fix of its own. The write-off had been placed *under the
horn*, where it ducked like everything else and measured identically to no
failure at all — the duck working and the scene testing nothing. Moved clear of
it, the worst case the mix has is a 550 J pipe impact, a precast panel shattering
into forty transients, a barrier, a cone, the master alarming and a rut, all
inside a third of a second. It clears the limiter with a tenth to spare.

One more, and it is about a *dial* rather than a level: **jitter has to be
measured against the spacing, not the window.** Blending a grain's slot in the
train with a uniform draw over the whole window sounds right and is not —
twenty-six grains across half a second are twenty milliseconds apart, so even a
tenth of the window is two and a half slots of stray and the rasp is gone. The
bench duly measured a `regular: 0.9` steel screech as no more regular than a
shatter, which is the one distinction that whole voice exists to make.

One caveat about the measure itself: **RMS over a fifth of a scene cannot see a
transient.** Four clicks in a 1.6-second window move it by a thousandth. For a
scene about transients the honest number is the whole-scene peak — `switchgear`
peaks 0.33 with the panel and 0.16 without — and, as ever, the file is there to
be played.

And one about what it was *blind* to. For its whole life the bench measured
channel 0, which made it unable to see the thing half these voices exist for:
the tracks are panned to the sides they are on. The bogie knock's null test —
silence it and see whether anything changes — duly reported peak 0.634 against
0.606 and an identical RMS, which reads as *this voice does not exist*. It did.
The bench now reports **the widest gap each way between the channels and when**,
in 12 ms windows, and the same pair reads 0.008 silenced against 0.048 playing,
at the exact seconds `the-rut` puts a rut under each track. A null test only
answers if the instrument can see the claim.

Two more, both about *scenes* rather than about the machine:

- A scene built out of sines cannot show a rattle, because the ride is not a
  sine. It is mostly nothing, punctuated — measured on the real machine, the
  median step at full ahead is a jerk of 4 m/s³ and the ninetieth percentile is
  416.
- A scene built out of sharp spikes in continuous time cannot show one either,
  because the bench samples at 60 Hz and most of them fall between two frames.
  The sim has no such problem: it *is* a 60 Hz signal. A scene has to be built
  at the rate the thing it imitates runs at.

## Still open

- **Impacts are centred** (L-060). The event carries a world position and
  hearing which side you clipped something on is a real cue; it wants the hull
  pose and a decision about what "left" means in the chase camera. **It is worth
  more than it was**: a shatter on your left is a bigger cue than a tick on your
  left, and there are fourteen kinds of thing to clip now rather than five.
- **The suspension has no instrument** — it is heard and felt, and read only on
  the developer's telemetry line. An instrument costs glass (`doc/design/cab/cockpit.md`),
  so what the running gear should cost the operator's view is a design decision
  rather than a line of markup.
- **Nothing fitted makes a noise of its own.** A component's *switchgear* is in
  its maker's voice now, which is the arrangement working, but no component has
  yet had something to say — a guard's servo, a relay chattering as it hunts.
  The `doc/NOTES.md` thread asks the shape question: is a voice a fourth part of the
  triptych, or a thing a component *does*?
- **The horn tells nobody anything.** Nothing on the site can hear it, because
  nothing on the site can hear. When a citizen can, the horn stops being a cab
  state and becomes a sim input, and it joins the recording where the levers
  are.
