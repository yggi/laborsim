# The machinery ladder

Spilled from `doc/MEMORY.md`. Source: `prototype/concept-3/HANDOVER.md` § 4, § 7.

---

## Not a difficulty ramp

Each rung introduces **exactly one new invariant** — and specifically, one new
*frame* the control software has to hold something in. That makes the ladder a
curriculum rather than a numbers curve.

It is simultaneously the **risk curve for physics**, which is why it also
dictates build order.

| # | Machine | New invariant | Notes |
|---|---|---|---|
| 1 | **Tracked platform** | body-frame velocity — no new frame | Playable with zero OS-mode. Two levers, a cage, clear view. |
| 2 | **Excavator** | task-frame IK | Cartesian bucket control is real shipping tech (Komatsu IMC, Leica) — the fantasy is documentary. |
| 3 | **Forklift** | stability as a *constraint*, not a target | First time a loop tells the pilot **no**. |
| 4 | **Seam-following welding arm** | an external feature frame | First exteroceptive loop; the world moves your setpoint. |
| 5 | **Off-road hexapod** | contact scheduling | First **discrete** layer above the continuous ones. |
| 6 | **Bipedal walker** | an inner loop you are not permitted to remove | |

## The sequencing rule

**Rungs 1–4 need no balance controller at all.** Tipping is emergent from
contacts alone.

> Sequence the ladder, not the biped.

Starting with the biped is the **worst** entry point for physics and the **best**
one for concept art. The prototype started there, correctly, because it was
buying a look. Production must not repeat that.

This overturns the intuition that the walker is the headline machine and so
should come first. The walker is the *last* rung; everything interesting about
arbitration is already reachable on rung one.

## Consequence for v0

The acceptance test — two components fighting over one actuator, within ten
minutes, attributable from a replay — is specified **on rung one**. If it can
only be built on a biped, the rack is decoration.

## Non-monotonic by design

The ladder is a ladder of *capability*, never of *correctness*. The Phantom
Labor attacks the sensor surface that capability created, so the two-lever
tracked cage at rung one is the one machine that cannot be scrambled.

Sometimes the right answer to a hot site is to bring the excavator. That is
Patlabor's thesis, arrived at from mechanics rather than script — and it is why
rung one must stay a genuinely good machine, not a tutorial.
