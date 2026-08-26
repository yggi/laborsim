# Tone — the operator, and the ledger

Spilled from `doc/MEMORY.md`. This is a design document, not a style guide: the
tone *is* a mechanic here, and getting it wrong breaks the feedback loop.

---

## The inversion

**The fantasy is not being a demigod in an invincible war mecha. It is being a
humble operator trying not to break everything with an unstable, hard-to-operate
contraption.**

The reference is a **retrofuturistic forklift-operator training simulator**, not
a mecha action game. Patlabor supplies the world; the *verb* comes from
industrial training.

This is guiding principle 6 in `CLAUDE.md`, and it is the fastest test to apply
to a proposal:

| Working with the game | Working against it |
|---|---|
| the machine is awkward, heavy, reluctant | the machine is responsive and powerful |
| you succeeded by not breaking anything | you succeeded by doing something impressive |
| the cab is cramped and you cannot see | the view is cinematic |
| failure is embarrassing and itemised | failure is dramatic |
| competence feels earned and boring | competence feels heroic |

If a change makes the machine feel heroic rather than awkward, it is working
against the game. Say so out loud.

## The damage ledger

**Meticulous, itemised damage tracking is the core feedback mechanism** — not a
score, a *ledger*. It is the thing the player actually reads, and the reason
they go back to build.

Form: named asset, named damage, priced consequence.

```
citizen asset (scooter) damaged      −¥3,000
site fixture (barrier, 2x) damaged   −¥1,400
surface (haul road) rutted           −¥800
```

Requirements that make it work:

- **Itemised, never aggregated.** "You caused ¥5,200 of damage" teaches nothing.
  A list of *what*, each priced, is a diagnosis.
- **Named, specific, mundane.** A scooter, a barrier, a fence, somebody's wall.
  The specificity is the comedy and the sting at once. Nothing is epic.
- **Priced in Yen**, which sets the register instantly: this is an institution
  accounting for you, not a game scoring you.
- **The attribution rule applies.** Each line must be traceable to what you did
  and, ideally, which component was driving at the time. A ledger that says
  *what* without *why* is a score, and scores do not teach.
- **Harming a citizen is not a line item.** It is categorical failure. Never
  give a person a price.

## The voice

**Condescending institutional politeness.** The training system is not angry
with you; it is *disappointed*, patiently, and it is writing it down.

It should read like automated safety software written by people who have seen
every possible mistake and priced each one. Dry, formal, faintly weary, entirely
unimpressed. Never sarcastic-cruel, never zany, never a quip — the comedy comes
from the *register* being applied to catastrophe, not from jokes.

The training frame (`doc/MEMORY.md` § 1.1) is what licenses this: the rig is
institutional software, so institutional voice is diegetic rather than a gag.

It also does real work — the same voice that says
`citizen asset (scooter) damaged: −¥3,000` is the voice that can say
`NAV-1 retained bus authority; pilot input suppressed` without changing gear.
**Attribution and comedy come out of the same speaker.**
