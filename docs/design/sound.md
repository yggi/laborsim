# Sound — the fourth channel, and who owns it

Spilled from `docs/design/damage.md`, which is where the machine's voice started
because the first thing worth hearing was something breaking. It has outgrown a
table in somebody else's file.

Status: **built** (L-040, L-061). The arithmetic is `src/audio/voices.ts`, the
graph is `src/audio/engine.ts`, and the manufacturers' half is
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
belong.** That rule has already refused things — a suspension knock, most
recently, because suspension travel is not simulated and inventing one would be
a sound effect wearing a simulation's clothes.

## Who owns a sound

Everything that makes a noise has an **owner**, and the owner decides its
character. This is the same arrangement as the visual theme, and deliberately
so: a manufacturer's house style is how its kit presents itself, and presenting
itself is not only a visual act.

| Owner | What it voices | Where it lives |
|---|---|---|
| **the chassis maker** | the drivetrain, the running gear, the loose fittings, the horn | that maker's `SoundHouse` |
| **a component's maker** | anything a fitted component makes a noise about | that maker's `SoundHouse` — nothing does yet |
| **the material** | everything on the site being struck | the material table in `voices.ts` |

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
| rattle | the hull's **jerk**, from the accelerometer in `MachineState.shake`. The only voice that renders the *ground* rather than the drivetrain. | chassis |
| grind | `slip`, and only where `contacts > 0` — the largest slip reading on the machine belongs to a track in mid-air, rubbing against nothing. | chassis |
| impact | joules, as **amplitude ∝ √energy**. The ring is the material, the strike is the energy, and the wobble is `seq`. | material |
| hull | the machine's own collisions, on a scale of its own — 140 kJ lands from 2.4 m and a real hit on a pipe stack is 15 J. | material |
| horn | the master condition, at the master lamp's own blink rates. Acknowledging stops the noise and leaves the light on. | chassis |

### Three consequences worth keeping

- **`traction: null` survives into the sound.** A track with no ground does not
  go quiet, it runs away — the type's whole point, rendered. The chain agrees:
  it clanks *faster* in the air, because nothing is holding the belt back.
- **The clank rate is the belt's drawn rate.** `GROUSER_PITCH` is one number in
  `core/spec.ts` and both the picture and the sound read it, so you hear what
  you see — and when the belt races under a stationary machine, the clanking
  races with it. Slip becomes audible without slip being mentioned.
- **Audio is a renderer, not a reader** (`MEMORY.md` § 12, rule 3): 60 Hz, and
  every wobble in it — grit, plate spread, impact variation — is drawn from a
  seeded generator or from `seq`, so a replay sounds identical to the run it
  recorded.

## Measuring is the only review

A sound cannot be asserted about. `listen.html` plays every scene and
`npm run listen` renders them through the real graph and prints peak, RMS and
brightness at each end, which is enough to make a claim falsifiable: *labouring
gets brighter at constant track speed*, *rough ground is louder and brighter
than smooth*, *the alarm scene gets quieter when it is acknowledged*.

It has now caught more defects than review has, and the same one three times:
**a filtered voice's level is not what you hear — its bandwidth is.** A bandpass
around a narrow band throws away almost all of white noise's energy, so the
strike, the squeak and the rattle were each written at a "sensible" number and
were each inaudible. Set a filtered voice by measuring it.

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
- **The running gear has no suspension voice** (L-062), because it has no
  suspension travel to render. The nearest honest quantity is a track's
  `contacts` changing as samples find and lose ground.
- **Nothing fitted makes a noise.** The arrangement for it exists — a component
  is voiced by its own maker's house — and no component has asked yet.
