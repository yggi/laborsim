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
| impact | joules, as **amplitude ∝ √energy**. The ring is the material, the strike is the energy, and the wobble is `seq`. | material |
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
  pose and a decision about what "left" means in the chase camera.
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
