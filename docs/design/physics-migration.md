# Physics migration

Spilled from `MEMORY.md`. Source: `prototype/concept-3/HANDOVER.md` § 7.

---

## What inverts

In the probe, **the gait *is* the truth** — kinematic playback, no bodies, no
contact solver. Under physics it becomes a **reference trajectory**, and you
need something that tracks it without falling.

That is a different problem, not a port. Budget it as new work.

## Engine

**Rapier (wasm).** Chosen for motorized joints, joint limits, and **determinism
you can replay a failure with** — which is the whole point, given that
attribution is the design. It wants a real bundler; the single-file artifact is
not the target.

## Three tiers, with honest costs

| Tier | What it is | Cost | What you get |
|---|---|---|---|
| **Bodies + motorized joints** | ~14 rigid bodies, revolute joints with limits, `configureMotorPosition` | 3–5 days | A ragdoll that falls immediately and never stands. **Feels like progress; is not.** |
| **Virtual crane** | full dynamics + an external stabilising wrench on the hull, with a finite authority budget | 2–4 weeks | Walks, tips when overloaded, staggers on grade |
| **Honest** | capture-point / DCM footstep replanning + a QP whole-body controller | months | Genuinely research-grade |

## Recommendation

**The middle tier is not a compromise, it is the design.**

That external stabilising wrench **is** STAB-2. Give it a torque ceiling and a
bandwidth, and switching it off does not *fake* a fall — it removes the thing
that was holding you up.

Everything downstream falls out of the same object:

- Load compensation becomes a real CoM constraint.
- The margin bar starts reading an actual number instead of a cosmetic one.
- Foot contact becomes **measured** rather than scheduled by gait phase — which
  is what makes GND-ADPT failures diagnosable rather than decorative.

Mechanic and physics from the same object. That is the test for whether a
physics decision is the right one here.

## Sequencing

Do **not** start with the biped. Rungs 1–4 of the machinery ladder need no
balance controller; see `machinery-ladder.md`. Physics arrives on the tracked
platform, where tipping is emergent from contacts alone and there is nothing to
tune.

## Carried forward from the probe

The analytic height field `H(x,z)` becomes the Rapier heightfield source — feet
and mesh already sample the same function, so contact is exact rather than
raycast-approximate, and the site map bakes from it for free.
