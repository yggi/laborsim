# Damage — the ledger, and everything that has to be true for it to land

Spilled from `MEMORY.md` § 3.1. The voice the ledger speaks in is in
`docs/design/rig/tone.md`; this is what it is speaking *about*.

The model is **built** (L-031): furniture is dynamic, impacts are measured in
joules, and lines are priced and attributed. So is the end-of-run report (L-029),
the live voice (L-044) and the sound (L-040). More things worth breaking (L-039)
and machine damage (L-038) are still ahead.

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

## Toughness is a fraction of what the machine can actually deliver

The numbers are not free, and getting them wrong is not a balance nit. A heavy
machine hitting a light object cannot put more than about **½·m·v²** into it —
the object simply leaves at roughly the machine's speed. A 6 kg cone can absorb
at most 15 J from a 6.2 t machine at its 2.2 m/s top speed, so rating the cone
at 22 J made it **indestructible by any means the game has**.

So every toughness is set as a fraction of `½·m·v_max²` for that mass. A
full-speed hit writes the thing off; a crawl scuffs it. The choice the player
has is not how hard to hit something — the machine only has one speed worth
using — it is whether to be anywhere near it.

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
it (`MEMORY.md` § 1.1): a rig that records sessions is a rig that can start a
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
manufacturer's sound house may and may not decide: `docs/design/cab/sound.md`.

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

In order, and each one is a `BOARD.md` card:

| Card | Why it is where it is |
|---|---|
| L-031 damage model | **built.** Mass, price, toughness, priced and attributed events; furniture is dynamic and scatters. |
| L-039 breakables | a site worth breaking: more props, materials, prices. The model is worthless against six crates. |
| L-032 record and playback | the ledger's *why* column. Also the only way a line can be argued with. |
| L-029 the ledger itself | itemised, named, priced, condescending. |
| L-038 machine damage and reset | the cost lands on you as well as on the site. |
| L-040 the machine symphony | **built.** The fourth channel, and it arrived early because there was already something to sound like. |
