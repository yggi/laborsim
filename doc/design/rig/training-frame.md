# The diegetic frame — a training system

Spilled from `doc/MEMORY.md` § 1.1. The fiction that this frame is told as a story
lives in `doc/LORE.md`; this is what it *licenses*, which is the load-bearing part.

---

**The whole thing is, in-universe, a Labor design, operation and safety training
system.** The player is not piloting a Labor; they are using the rig that teaches
people to. Tonal anchor: the simulator sequence that opens *Patlabor 2*.

This is not flavour. It is the frame that licenses most of the design, and it
should be checked **before** inventing machinery to justify something. Most
"how do we get away with X?" questions are already answered here.

## What it licenses

- **Inspectability is diegetic.** An open sim layer is not a debug overlay
  breaking fiction; it is the training rig's instrumentation. The "educational
  means inspectable" pillar stops fighting the fiction and starts being it.
- **Replay is native.** Training systems record and review sessions. Attribution
  from a replay needs no in-world excuse.
- **Failure is affordable.** Killing a citizen is a training failure, not a moral
  event the game has to dramatise. It can be scored bluntly and reset.
- **Sandbox is the native mode.** A training rig has free-drive. v0 needs no
  story-shaped reason to exist.
- **Procedural sites are the point** — a rig generates exercises. Difficulty is
  the site, not a curve.
- **It sets the UI register**: industrial training software, not a game HUD.

## Where it stops

The frame covers the *world* and the *rig*. It does not cover the machine.

Principle 7 draws that line: the site may admit it is a simulation — bare contour
lines, an obvious grid, a plotted route — because in the fiction it is one. The
cab may not. The cockpit is a faithful reproduction of a real cab, because the
whole point of the exercise is that the fear transfers.

So "it's a simulation" is never an argument for a cheap-looking cockpit, and it
is always an argument for a legible world.

## Who speaks

Two institutions, two voices, and they must not blur:

- **L.A.B.O.R.** certifies and bills. The ledger, the debrief and the verdict are
  its house voice (`doc/design/rig/tone.md`) — condescending institutional
  politeness. It never sells anything.
- **A manufacturer** sells and warns. Faceplates, warranty notices and safety
  tips are its voice (`doc/design/cab/components.md`). It never issues a verdict.

Anything with a price tag or a spec sheet came from a manufacturer; anything with
a verdict came from L.A.B.O.R. (`doc/LORE.md`, canon rule 3).
