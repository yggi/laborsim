# Damage — the ledger, and everything that has to be true for it to land

Spilled from `doc/MEMORY.md` § 3.1. The voice the ledger speaks in is in
`doc/design/rig/tone.md`; this is what it is speaking *about*.

The model is **built** (L-031): furniture is dynamic, impacts are measured in
joules, and lines are priced and attributed. So is the end-of-run report (L-029),
the live voice (L-044) and the sound (L-040). More things worth breaking is built
too (L-039), and with it the second beat of the order of experience below — the
thing **comes apart**. Machine damage (L-038) is still ahead.

---

## The ledger

**No job tickets in v0.** The loop still needs a verdict, and the damage ledger
is it, at a fraction of a ticket economy's cost. It is **the game's core
feedback mechanism**, not a scoreboard.

- You operate through an environment full of **expensive things to break**.
- **Itemised, named, priced**, never aggregated:
  `citizen asset (scooter) damaged −¥3,000`.
- **Harming a citizen is categorical failure**, not a line item. Never give a
  person a price.
- Environments are the difficulty axis: **a quarry is simpler than a city.**

The attribution rule applies in full: a ledger that says *what* without *why* is
a score, and scores do not teach. Every line has to be traceable to what you did
and what was driving at the time — which is why replay comes before the ledger
rather than after it.

**The ledger has two faces.** A *live* one and a *final* one, and they are the
same voice at two tempos:

- **Live** (L-044): the rig speaks as it happens, as **stacking, auto-dismissing
  notifications** — a scooter goes down, a line slides in, waits, fades. Severe
  ones latch (a citizen, a master-alarm) until acknowledged. This is the channel
  that reaches you mid-drive, alongside the warning lights on the status panel.
- **Final** (L-029): at the end of a run, an **itemised, scrollable report** as a
  modal — the full account, in register, with a manual **RESET SIMULATOR**
  button. This is the debrief, and it is the natural first screen of the game:
  you arrive at the rig, you read the last trainee's account, you reset.

## How an impact is measured

**Joules absorbed**, not hit points. Every step, a breakable body's kinetic
energy is compared with its energy last step, and the increase is what was
delivered into it. That works for anything hit by anything — the machine, or a
barrier the machine has just thrown — without the model knowing what hit what,
and it is a quantity the player can be shown. "The cone took 15 J and it is
rated for 5" is a diagnosis; "the cone lost 40 HP" is a number we made up.

Two guards, both paid for:

- **An impact must clear a floor set by the body's mass**, expressed as a speed
  (0.35 m/s). A flat joule threshold means opposite things to a 6 kg cone and a
  260 kg pipe stack.
- **A body must have been at rest to be hit.** Without this, anything already
  sliding integrates the energy gravity feeds it and eventually writes itself
  off. The site billed itself ¥9,540 for its own hillside before the machine
  had moved. The cost of the guard: a prop hit *again* while still moving is
  not billed for the second hit, so the ledger under-counts — which is the
  right way round for something that is accusing the player of things.

And the site settles at construction before anyone is accountable for it.

## A prop is a part list over materials

**The axis that was missing.** Everything about a piece of furniture used to be
a lookup keyed on its *kind*: mass and price in one table, a collider box in a
second, a voice in a third, and its art as a branch of an if/else chain in the
renderer — a chain with no exhaustiveness check, so a kind that forgot the
renderer silently drew a boulder. Four places, one of them silent, and that cost
is the whole reason the inventory sat at five kinds and a scooter.

A kind now declares **what it is made of and what shape those parts are**
(`src/world/props.ts`), and five consumers read that one declaration: the
collider, the art, the voice, the toughness, and what it comes apart into.
Adding a kind is a part list. Adding a material is one row in
`src/world/materials.ts`.

The material owns the three things a kind should never state for itself:

- **how it rings when struck** — and a *big* body of the same stuff rings lower
  and longer, so a marker pole and a pipe stack are one row and two voices. That
  is one derivation used twice (`hz` divides by size, `decay` multiplies), which
  is what makes a fourteen-kind inventory cost the ear nothing.
- **how it comes apart** — see below.
- **what colour it is.** The site is nobody's house, so the stuff owns its look
  for the same reason it owns its voice.

Mass and price stay declared: they are facts about the *object*, not about the
stuff. Deriving mass from density × volume was tried and rejected — a traffic
cone is 6 kg because of a rubber base, not because it is a solid plastic cone,
and the estimate would be wrong for exactly the objects that matter.

## Toughness is a fraction of what the machine can actually deliver

The numbers are not free, and getting them wrong is not a balance nit. A heavy
machine hitting a light object cannot put more than about **½·m·v²** into it —
the object simply leaves at roughly the machine's speed — so a 6 kg cone can
absorb at most 15 J from a 6.2 t machine at its 2.2 m/s top speed, and rating
that cone at 22 J made it **indestructible by any means the game has**.

So toughness is **derived and can no longer be typed in**: it is
`MaterialSpec.tough × ½·m·v_max²`, a fraction of exactly that ceiling. The
mistake is not expressible any more. A full-speed hit writes the thing off; a
crawl scuffs it. The choice the player has is not how hard to hit something —
the machine only has one speed worth using — it is whether to be anywhere near
it.

A fraction above 1 therefore means *this does not break*, deliberately and
visibly. Ballast is the one, so that "everything here breaks" is a claim the
site can be seen to falsify.

### Deriving the rating does not stop the shape being wrong

The other half, and it cost a second measurement to find. Every kind is now
driven into at full speed and the ledger read (`tests/site.test.ts`), because a
rating can be perfectly derived and still unreachable. A concrete block absorbed
**zero joules** from a full-speed hit: **the machine climbs anything shorter
than its own tracks**, and a thing it drives over is pushed downward rather than
struck, so no step's energy gain ever clears the floor. Lightening it changed
nothing; making it taller than 1 m fixed it at once.

The same sweep showed a real and correct pattern: the heavier a thing is, the
smaller the fraction of the theoretical ceiling that actually reaches it,
because **a heavy body gets pushed rather than struck** and the at-rest guard
stops counting. Ten of thirteen kinds are written off at full speed; a 900 kg
precast panel, a 340 kg cable drum and the ballast only crack. That is the model
working. A block that cannot be touched at all was it failing.

## It comes apart, and the residue has three renderings

The order of experience below says you should **see the thing come apart** before
you are told what it cost, and that beat is now built. A written-off prop stops
being one box and becomes the solids its part list says it is made of, each with
a body of its own — so a pipe stack pushed over is four pipes that roll down the
slope and tumble into each other, and a pallet lets go of its boards, from the
same eight lines.

One description, seeded off the ledger line, rendered three ways:

| | where | what it is |
|---|---|---|
| **bodies** | the sim | one rigid body per declared piece, carrying the parent's velocity plus a seeded shove. Cylinders roll. |
| **grains** | the ear | a cloud of transients: `doc/design/cab/sound.md` |
| **motes** | the eye | flat-shaded chunks that expand and **pop**, in the material's own colour |

Three rules hold it together:

- **Debris is landscape.** It is not in the prop list, so nothing bills it and it
  cannot be written off twice — the existing rule *hitting the wreck again is
  free*, arriving where it was always going.
- **There is a budget** (`DEBRIS_BUDGET`). Past it a prop stays whole and takes
  the wrecked paint, exactly as every write-off did before pieces existed: the
  site gives up the spectacle rather than the frame.
- **The eye costs nothing extra.** The renderer re-parents the prop's own piece
  meshes rather than making any, because the art was already built out of exactly
  these pieces in exactly this order. Dust is one instanced mesh per material.

Dust is **render-side only**, and that is not a shortcut. It is not a simulated
quantity — nothing can be measured off it — so putting it in the sim would be
inventing state to justify a picture. It is a rendering of a discrete event,
which is what an impact's *sound* already is, and it sits on the same side of the
boundary for the same reason.

The *damaged* tier is drawn now too. It has been a number in the ledger for as
long as the ledger has existed and appeared on no surface at all.

## Why it goes deep rather than wide

The temptation is a toast that says −¥3,000 and a number in a corner. That is
the version that does not work, because breaking something has to be *felt*
before it is *counted*. The order of experience is:

1. you feel the impact,
2. you see the thing deform, topple or come apart,
3. you hear it,
4. and only then does the rig tell you what it cost, in writing, patiently.

Steps 1–3 are the game. Step 4 is the lesson. A ledger without them is
paperwork; the impacts without the ledger are a physics toy.

## The machine is not exempt

The machine takes damage too, and can be destroyed. This is what stops the
ledger from reading as a tax on other people's property: the cost of driving
badly is partly *your* machine, and a wrecked machine ends the exercise.

That needs a **reset**, and the reset should be diegetic — the training rig
re-racks the exercise, it does not "respawn" you. The frame already licenses
it (`doc/MEMORY.md` § 1.1): a rig that records sessions is a rig that can start a
new one. **The reset is always manual** — the rig never yanks control away; it
tells you the exercise is over and waits for you to press RESET SIMULATOR.

What ends an exercise (L-038):

- **The machine is wrecked** — destroyed, or **unrecoverable**: on its back or
  high-centred with no way to drive out. "Unrecoverable" is a real state to
  detect, not a health bar hitting zero.
- **A citizen is harmed.** Categorical failure, and *deliberately hard to
  reach*: citizens try to get out of the way. Doing them justice needs NPCs who
  see the machine and dodge, which is a round of its own and may be deferred —
  until then the scooter (a citizen *asset*, not a person) carries the weight.
- **The operator calls it** — RESET at any time.

Open question this raises rather than answers: does damage to the machine
degrade it *before* it destroys it — a track that has lost grip, a bent frame
that pulls to one side? That would be the strongest possible version, because
it makes a damaged machine a *different machine to drive*, which is the whole
subject. It is also the most expensive. Not v0.

## Sound is the fourth channel, and it is synthesised — **built** (L-040)

Not sampled: engine-generated, from the same quantities the sim already
publishes, because a sampled clip is a black box triggered by an event and a
synthesised voice is another rendering of a simulated quantity. Slip already has
a number, a bar and a belt racing under a stationary machine; sound is the
channel that reaches you when your eyes are on the ground.

It grew past a section in this file. The voices, who owns each one, and what a
manufacturer's sound house may and may not decide: `doc/design/cab/sound.md`.

**The machine should become a lemon.** As it takes abuse it should slip, pull to
one side, buckle; smoke and leak oil; set off alarms and warning lights. Two
tiers, and they can land apart: the *symptoms* (smoke and oil as particles,
alarms and lights on the status panel, a rougher engine note) are feedback and
eye-candy that need no new physics and can ship early; true *degradation* — a
track that has genuinely lost grip, a frame that genuinely pulls — is the
expensive, load-bearing version (see the NOTES thread) and comes later. Ship the
symptoms first; they teach the player to listen before the physics makes it
matter.

It is also, bluntly, the cheapest visceral feedback available in a browser —
no assets, no download budget, and it survives being on a phone with the screen
half covered by your own thumbs.

## What has to exist first

In order, and each one is a `doc/BOARD.md` card:

| Card | Why it is where it is |
|---|---|
| L-031 damage model | **built.** Mass, price, toughness, priced and attributed events; furniture is dynamic and scatters. |
| L-039 breakables | **built.** Fourteen kinds over nine materials, on ground graded to hold them, each coming apart into what it is made of. |
| L-032 record and playback | **built.** A run is a `Setup` plus a trace of what the operator did, and it replays exactly — so `driving` and `bypassed` on a line are re-derivable rather than merely recorded. Watching one back is L-083. |
| L-029 the ledger itself | itemised, named, priced, condescending. |
| L-038 machine damage and reset | the cost lands on you as well as on the site. |
| L-040 the machine symphony | **built.** The fourth channel, and it arrived early because there was already something to sound like. |
