# The load chart

Spilled from `MEMORY.md`. Source: `prototype/concept-3/HANDOVER.md` § 2.1.

---

## The claim

**The load chart is this game's Δv.**

KSP does not work because of parts or physics. It works because of a
**diagnosable failure loop**: you predict, it breaks, and the break is legible
enough to blame on one design decision. Δv is what makes the VAB a real
optimisation problem *before* you ever fly — one scalar you can reason about on
the ground.

The industrial equivalent is not invented, it is documentary: real cranes and
excavators publish **payload as a function of reach and slew angle**. That chart
is the operator's Δv, and it already carries the right emotional freight — it is
a promise the machine makes that the day can break.

## Where it comes from

Build mode computes the envelope from:

- geometry (reach, the moment arm at every pose),
- mass and mass distribution,
- actuator torque,
- support polygon.

The site is where you find out **the chart lied** — soft ground, a slew that was
too fast, a footing you did not survey.

## Four attributable failure modes

The value of the chart is that a breach of it is *specific*. It yields four
distinct failure modes, each blamable on a different design decision:

| Mode | Blames |
|---|---|
| Tipping | support polygon / ballast / where you parked |
| Actuator stall | torque spec at that pose |
| Hydraulic pressure ceiling | the power pack |
| Structural moment at the shoulder | the arm you chose |

## Why it is the keystone

**The load chart is the shared artifact that keeps build mode and OS mode from
drifting into separate fictions.**

- **Build** computes the envelope.
- **The control software degrades it** — phase lag, saturation, authority
  conflicts all eat headroom.

One number that both modes move. Without it, wiring the rack is a decorative
minigame with no consequence a builder can feel, and building is a spec sheet
with no consequence a pilot can feel.

It is also what makes the component curriculum an economy rather than a tech
tree: a slope-aware autonav variant is worth buying because **the load chart
moves by a number you can read.**
