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

## The rack

Two components will want the same actuator. Who wins is the whole game.
Brooks' subsumption architecture is the honest anchor: **layers, higher
suppresses lower.**

The UI is a **vertical DIN rail**, not a free-form node graph — a node graph is
miserable on a phone, and this is mobile-first. Drag to reorder. **Position
*is* priority.** The affordance and the semantics are the same object, which is
why it survives on a small screen. Cap around **8 slots**.

The pilot's own levers are a rack entry. This is the load-bearing detail:

- Pilot **above** autonav → you override it.
- Pilot **below** autonav → autonav suppresses you. You shove the lever and the
  machine keeps grinding toward the pin.

Same two components, one drag, two completely different machines.

## The attribution rule

**Any time the machine ignores an input, the reason is on screen before the
player asks.**

Suppression that looks like a dead control is a bug report, not a lesson. This
is the mechanical form of the "fail stupidly, but predictably" pillar — the
failure is only legible if the suppression is visible at the moment it happens.

Minimum surface, all three proven in the probe:

- standardised **active / idle / overridden** LEDs on every rail slot,
- a readout naming **which layer owns the actuator bus right now**,
- the suppressed control visibly disabled, not silently inert.

## Acceptance test

Two components fighting over one actuator must be reachable **within ten minutes
of a first session**, on the **tracked platform** (ladder rung 1), and
attributable **from a replay**.

If that scenario cannot be constructed on rung one, the rack is decoration.
