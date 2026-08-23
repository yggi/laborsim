# Arbitration — the rack

Spilled from `MEMORY.md` § Control. Durable design truth.

Source: `prototype/concept-3/HANDOVER.md` § 2.2–2.3, demonstrated live in
`prototype/concept-3/index.html` § 7.

---

## Why arbitration is the game, not plumbing

A rocket has one control input. A Labor has ~30 DOF, and legged manipulation is
the hardest problem in robotics. Two consequences follow, and they corner the
design:

- The player **cannot** hand-fly it. So there must be controllers.
- A hidden black-box controller makes the workshop irrelevant — every failure
  gets blamed on "the AI" instead of on a design decision.

Therefore: **the controller is something the player specs, and controller/body
mismatch is the bug.** This is Patlabor's actual plot — a Labor OS defect — and
it is the decision that separates a game from a ragdoll toy.

## Components are loops, not features

A component is *a loop that holds one invariant, in one frame, so the pilot does
not have to.* That definition is a generator, not a list:

| Component | Invariant it holds | Frame |
|---|---|---|
| Stabiliser | attitude | body |
| Load compensation | CoM inside support polygon | ground |
| Target assistance | end-effector pose despite base motion | world |
| Autonav | path | map |

The generator does three jobs at once:

- **Gives the design axis** — *which frame* is the interesting variable.
- **Prices a component** — sensor dependency, latency, actuator authority.
- **Says what is not a component.** Anything that does not close a loop is a
  *part*, and belongs in build mode. This is the line that keeps the rack from
  degenerating into an inventory screen.

## The rack — a pipeline, not a priority stack

Two modules will want the same actuator. How that resolves is the whole game.

**The rack is a pipeline.** Each module takes the signal from the module above
it, folds in its own intent according to its **verb**, and passes the result
down. The bottom of the rail is the actuator terminal — one per actuator. Signal
flows down, and further down is closer to the machine.

This supersedes an earlier "highest active layer wins the bus" model, which was
a pure priority stack. The pipeline is strictly more expressive and it dissolved
three separate open questions at once:

- **Granularity.** A module transforms what it cares about and passes the rest
  through, so per-actuator arbitration needs no separate mechanism.
- **Suppress versus inhibit.** Rung 3's forklift needs a loop that tells the
  pilot *no* — a constraint, not a replacement. Pure suppression cannot express
  it; a pipeline stage is `clamp(input, envelope)` and needs no second entry
  kind.
- **Suppression itself survives** as the verb `SET`, which ignores its input.

### The verbs

**Three letters, always.** That rule is a deliberate cost on extension: the
vocabulary has to stay small enough to hold a whole chain in your head, and a
naming constraint that makes a fifth verb awkward is a complexity budget that
enforces itself. This is where the node-graph danger reappears in a new coat.

| Verb | Effect |
|---|---|
| `SET` | ignore the input, emit intent — plain suppression |
| `CAP` | emit intent, never exceeding the magnitude that arrived |
| `ADD` | add intent to the input |
| `AMP` | multiply the input by intent, read as a gain |

The verb is a **property of the module**, switchable on it. Advanced modules may
carry parameters or presets beyond that; the verb is the part the rail shows.

**Every module has a disable toggle**, and a disabled module is a
**pass-through, not a hole** — the signal still reaches the terminal. That is
the default hot-patchable control, and the safest one.

### Order is the machine

The rail is a **vertical DIN rail**, not a free-form node graph — a node graph
is miserable on a phone, and this is mobile-first. Drag to reorder. Cap around
**8 slots**.

The pilot's levers are a rack entry. Put them **above** autonav with autonav on
`CAP` and your thumbs become a governor on it — including a dead-man's throttle,
because a lever at rest caps to zero and that falls out of the verb rather than
being a special case. Put them **below** on `ADD` and autonav drives while you
trim.

Same two modules, one drag, two genuinely different machines — and unlike a
priority stack, *both* of them use *both* modules. Neither result is a mode.

## The attribution rule

**Any time the machine ignores an input, the reason is on screen before the
player asks.**

Suppression that looks like a dead control is a bug report, not a lesson. This
is the mechanical form of the "fail stupidly, but predictably" pillar — the
failure is only legible if the suppression is visible at the moment it happens.

Under a pipeline there is no owner to name — everyone shaped the signal. The
answer is better than a banner: **show the value at every stage.**

```
PILOT [SET] +2.20/+2.20  →  NAV-1 [CAP] +1.79/+2.20  →  TERMINAL
```

That is the multi-layer inspectability pillar landing where it matters most,
and it reads the same live or in replay. Minimum surface:

- standardised **active / idle / bypassed** LEDs on every rail slot,
- the signal at each stage, down to the terminal,
- every module's one-sentence statement of what it considers, on the slot,
- a module that has nothing to say marked **idle**, never silently absent.

## Acceptance test

Two components fighting over one actuator must be reachable **within ten minutes
of a first session**, on the **tracked platform** (ladder rung 1), and
attributable **from a replay**.

If that scenario cannot be constructed on rung one, the rack is decoration.
