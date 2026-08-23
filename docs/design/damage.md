# Damage — the ledger, and everything that has to be true for it to land

Spilled from `MEMORY.md` § 3.1. The voice the ledger speaks in is in
`docs/design/tone.md`; this is what it is speaking *about*.

Nothing here exists yet. It is the next thing built (`BOARD.md` L-031 onward),
and it is the missing third beat of the failure loop — see
`docs/design/roadmap.md`.

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
new one.

Open question this raises rather than answers: does damage to the machine
degrade it *before* it destroys it — a track that has lost grip, a bent frame
that pulls to one side? That would be the strongest possible version, because
it makes a damaged machine a *different machine to drive*, which is the whole
subject. It is also the most expensive. Not v0.

## Sound is the fourth channel, and it is synthesised

Not sampled. **Engine-generated**, from the same quantities the sim already
publishes — track speed, slip, contact count, impact energy, load. A machine
labouring at 90% grip should *sound* like it, and the pitch of the thing you
just hit should follow how hard you hit it.

The argument is the inspectability pillar, not audio fashion: a sampled clip is
a black box triggered by an event, and a synthesised voice is another rendering
of a simulated quantity. Slip already has a number, a bar and a belt racing
under a stationary machine; sound is the channel that reaches you when your
eyes are on the ground.

It is also, bluntly, the cheapest visceral feedback available in a browser —
no assets, no download budget, and it survives being on a phone with the screen
half covered by your own thumbs.

## What has to exist first

In order, and each one is a `BOARD.md` card:

| Card | Why it is where it is |
|---|---|
| L-031 damage model | mass, price, threshold, priced events. Nothing is felt or counted until an impact means something. |
| L-039 breakables | a site worth breaking: more props, materials, prices. The model is worthless against six crates. |
| L-032 record and playback | the ledger's *why* column. Also the only way a line can be argued with. |
| L-029 the ledger itself | itemised, named, priced, condescending. |
| L-038 machine damage and reset | the cost lands on you as well as on the site. |
| L-040 the machine symphony | the fourth channel, once there is something to sound like. |
