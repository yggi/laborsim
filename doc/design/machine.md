# The machine — what it is, what it can do, and who drives it

Start here for anything about the thing on the site: what it is made of, what
stops it, how much fidelity is under it, and how your intent reaches the tracks.

The through-line is `doc/MEMORY.md` § 2's first commitment — **the load chart is the
Δv** — and its third, **the rack is a pipeline**. Everything in this cluster is
either a limit the machine has, or the argument about who gets to command it.

## Pages

| | |
|---|---|
| [`machine/tracked-platform.md`](machine/tracked-platform.md) | rung 1 in detail: the track friction model, the twelve sprung contacts, what falls out of both, and the controls |
| [`machine/machinery-ladder.md`](machine/machinery-ladder.md) | the six rungs, one new invariant each, and why the biped is last |
| [`machine/physics-migration.md`](machine/physics-migration.md) | Rapier's fidelity tiers, and the virtual-crane target |
| [`machine/load-chart.md`](machine/load-chart.md) | the Δv analogue — the shared artifact that binds build mode to the control layer |
| [`machine/arbitration.md`](machine/arbitration.md) | the rack as a pipeline: the verbs, components-as-loops, and how a failure gets attributed |

## Where to go instead

- The machine's **instruments** are not here — an instrument is a view, and
  views live in [the cab](cab.md).
- What the machine *sounds* like is [`cab/sound.md`](cab/sound.md), because a
  voice is a renderer of the recording exactly as a needle is.
- What happens when the machine **breaks something** is
  [`rig/damage.md`](rig/damage.md): the ledger belongs to the training system,
  not to the machine.
- The three rules that keep the sim headless and replayable are
  [`code/architecture-rules.md`](code/architecture-rules.md).

## The shape of it

The machine is a **limit with a person attached**. Every page here is about one
kind of limit — friction, reach, fidelity, or authority — and the game is what
happens at the edge of one. A page that stops being about a limit has probably
wandered into the cab or the rig.
