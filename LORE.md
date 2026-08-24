# LORE.md — the world, its institutions, and who builds the machines

Reference, not contract. This is the fiction the game is set in: the training
regime, the firm that runs it, and the manufacturers whose kit you bolt
together. It exists so that the machines, the modules, the voice and the
cockpit all sound like they come from the same world — and so a new component
can be named and given a personality without inventing the universe again.

The rule that keeps it honest, and the reason lore is load-bearing rather than
decoration: **a manufacturer's culture predicts how its kit behaves and how it
fails.** KIBA builds stubborn, manual, unkillable machines with no opinions.
HANSA builds safety gear that is right and insufferable. TOWA builds clever
sensors that a Phantom Labor can lie to. That is not flavour laid over the
mechanics — it *is* the mechanics, wearing a wordmark (`src/ui/makers.ts`, and
principle 7 in `CLAUDE.md`).

Crystallized facts live in `MEMORY.md`; this is the connective tissue around
them. When lore and a mechanic disagree, the mechanic wins and this file is
wrong.

---

## The premise

Labors are industrial machines — construction, salvage, disaster work — that
crossed the line from *vehicle* into *thing that has to be operated like a
limb*. They are powerful, expensive, and far more dangerous to the people around
them than to anyone they might be pointed at. A Labor on a city site is a crane,
a bulldozer, a forklift and a liability, all leased by the hour.

The industry's problem is not building them. It is that a fresh operator, handed
a machine rated to lift twelve tonnes, will put it through a shopfront in the
first week and cost more in claims than the contract was worth. So the industry
does what every dangerous industry does: it builds a **simulator**, and it will
not let you near the real thing until the simulator says you are safe.

**You are in that simulator.** Everything you drive is a training rig. The
contour lines on the ground, the plotted route, the ledger that prices your
mistakes — those are the rig showing its working. The cockpit you sit in is a
faithful reproduction of a real cab, because the whole point is that the fear
transfers. This is the frame in `MEMORY.md` § 1.1, told as a story.

## L.A.B.O.R. — the institution, and the voice

The rig, the syllabus and the disapproval all belong to one body:

> **L.A.B.O.R.** — the *Licensed Assessment Board for Operational Readiness*.

A quasi-governmental certification authority, the kind that exists because an
insurance market demanded it and a regulator blessed it. It does not build
machines and it does not employ operators. It **certifies** them, and it
**bills** for damage against a standardised schedule of asset values that it
updates yearly and defends humourlessly. The scooter is ¥3,000 because a
committee decided a scooter is ¥3,000.

Its culture is the culture of the examination hall. It is patient, meticulous,
and entirely unimpressed. It is not cruel — cruelty would imply it cares how you
feel — it simply records. The voice of the ledger and the debrief is L.A.B.O.R.'s
house voice (`docs/design/tone.md`): condescending institutional politeness, the
register of a body that has watched ten thousand trainees make this exact
mistake and priced each one.

Its logo is a plain bureaucratic roundel. Its forms are numbered. Its verdicts
are final and quietly devastating.

## The manufacturers

Three exist in code today. Each has a wordmark, a house style, and — the part
that matters — a temperament that tells you how to build its next component.

### KIBA WORKS — 牙工業 · "the fang"

**What they make:** the chassis. The hull, the tracks, the levers, the drive.
Everything structural and everything you cannot buy from anyone else, because
KIBA does not sell parts — it sells *machines*, and the controls that come
bolted to them are an afterthought they are too proud to farm out.

**Who they are:** an old heavy-industry firm from a river-mouth industrial ward,
named for the fang and marked with one. Three generations of building things
that outlive their owners. Machine yellow, stamped steel, a plate that says MADE
IN JAPAN and means it. They are craftsmen and they are stubborn, and the two are
the same thing.

**Their doctrine:** *the operator is responsible.* KIBA distrusts automation on
principle — not because it cannot build it, but because it believes a machine
that drives itself teaches an operator to stop paying attention, and an operator
who has stopped paying attention is how people die. A KIBA machine does exactly
what the levers say and nothing else. It has no opinions and it will not save
you. This is a feature, and the two-lever cage at rung one is its purest
expression: unglamorous, unkillable, and completely honest about what it is
doing. When every clever module has been scrambled by a hazard, the KIBA cage is
the thing still working (`MEMORY.md` § 5).

**How its kit fails:** it doesn't, much. It beaches, it tips, it throws a track —
all things you did, legibly, and can see. Nothing lies to you because nothing on
it is smart enough to.

### TOWA DENKI — 東和電機 · navigation and sensing

**What they make:** the clever bits. NAV-1 and its route scope, and the whole
future family of eyes and ears — radar, thermal, survey, positioning. Modules,
sold separately, in nicer boxes than the machine they clip onto.

**Who they are:** a post-war electronics firm that got rich on consumer radios
and never quite lost the consumer-electronics instinct. Newer than KIBA, glossier
than HANSA, marketing-led. Their kit is centred, backlit, and photographs well.
Their brochures promise a little more than their firmware delivers, and their
engineers know it and their salespeople do not.

**Their doctrine:** *capability is a product you can buy.* TOWA believes any
problem is one more sensor away from solved, and it will happily sell you the
sensor. Its modules are genuinely good and genuinely narrow — NAV-1 steers to a
pin beautifully and considers nothing else, and TOWA would rather you not dwell
on the "nothing else" (`docs/design/arbitration.md`).

**How its kit fails:** it believes what it is told. Every TOWA sensor is a
surface a **Phantom Labor** can attack (`docs/design/mechanics.md`): spoof the
positioning, blind the radar, feed the autopilot a pin that isn't there. The
more TOWA you fit, the more capable you are and the more there is to scramble.
TOWA is why the ladder is non-monotonic. It is also why the honest, blind KIBA
cage keeps its value.

### HANSA REGELTECHNIK — control and safety engineering

**What they make:** the governors. TILT-GUARD and its kind — limiters,
interlocks, cut-outs, the load-chart enforcement to come. The components whose
job is to stop you doing the thing you were about to do.

**Who they are:** a German *Regeltechnik* (control-engineering) house, the kind
with a century of certifications and a legal department older than most of its
competitors. Safety orange, everything boxed, every faceplate stamped with a
standard number and a *Prüfzeichen*. They are correct, they are thorough, and
they are exhausting.

**Their doctrine:** *the operator is a hazard to be managed.* Where KIBA trusts
the operator and refuses to help, HANSA distrusts the operator and insists on
helping whether or not you want it. A HANSA component ships **enabled**,
conservative, and slightly in your way — TILT-GUARD stopping you halfway up a
grade the machine could have climbed is HANSA behaving exactly as designed
(`docs/design/cockpit.md`). It is usually right. It is right in a manner
calculated to make you resent being kept alive.

**How its kit fails:** by being obeyed too well, or bypassed in frustration. A
HANSA guard set too tight strands you; a HANSA guard switched off is how the
best crashes happen. The verb decision that made TILT-GUARD an `AMP` and not a
`CAP` is a HANSA safety principle in code: a governor must never be able to
*reverse* the thing it governs (`LOG.md`, 2026-08-24).

### The tension, in one sentence

KIBA gives you a machine and no help; TOWA sells you help that can be lied to;
HANSA forces help on you that you will want to switch off. The game is choosing
how much of each to bolt on, and living with the temperament you bought.

## Not yet built — candidates for later rungs

Sketches only, to keep the world coherent as it grows. None of this is committed;
each earns its place when its rung is built.

- **A hydraulics house for rung 2** (the excavator). The obvious archetype is an
  American or heavy-continental maker of arms, rams and load charts —
  loud, powerful, litigious about tipping. Working placeholder temperament:
  *raw capability, thin margins, the load chart is the law.*
- **The Phantom Labor's origin.** The antagonist that attacks TOWA's sensor
  surface needs a source in the fiction — a rogue machine, a jammer, an
  environmental hazard (radiation, EMF) that the world generates rather than a
  villain that authored it. Kept vague on purpose; it is a difficulty curve
  wearing a mask, not a plot (`docs/design/mechanics.md`).
- **The police / municipal Labor** — the "fancy" chassis opposite the KIBA
  bulldozer, and the first customer for a themed cockpit (`docs/design/cockpit.md`,
  cockpit identity). Same code path as KIBA, a completely different cab: cleaner,
  more instrumented, more to lose.

## Canon rules — so future kit stays consistent

1. **A manufacturer is a temperament first.** Before a new component gets a
   maker, decide how that maker *fails*, because that is what the player learns.
2. **Names carry origin.** KIBA and TOWA read Japanese; HANSA reads German. A new
   maker's name should place it, and its wordmark should be drawable as one SVG
   path (`src/ui/makers.ts`).
3. **L.A.B.O.R. never sells anything.** It certifies and it bills. Anything with
   a price tag or a spec sheet came from a manufacturer; anything with a verdict
   came from L.A.B.O.R.
4. **No component is strictly best.** Every maker's strength is a matched
   weakness (principle 2 in `CLAUDE.md`). If a new part has no failure mode that
   belongs to its maker, it is not finished.
5. **The world is honest; the machine is real.** Keep the fiction on the
   simulator side of principle 7. The site can admit it is a simulation. The kit
   in your hands may not.
