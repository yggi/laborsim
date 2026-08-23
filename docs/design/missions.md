# Missions — exploratory

**Not v0, not settled.** v0 stays sandbox (`MEMORY.md` § 3). This file records a
direction that arrived from actually playing the thing, because it is coherent
enough to steer decisions and would be expensive to rediscover.

Source: play session, 2026-08-23.

---

## The shape: Zachtronics-style budgeting

Missions with an explicit, multi-axis cost, where the interesting play is
trading the axes against each other rather than maximising one.

**A progression that extends cleanly from one verb:**

1. reach a target point
2. reach several waypoints, in order
3. use a tool at a location
4. collect something
5. move X to Y

Each step reuses the last one's machinery. Step 1 is buildable on rung 1 today.

## Scoring, in three axes

| Axis | Made of |
|---|---|
| **Budget** | parts cost + damage |
| **Time** | wall-clock on site |
| **Complexity** | parts count/weight + **operator interaction** |

Budget is already half-built: the damage ledger is one of its two terms, and
the component curriculum is the other.

**Complexity is the interesting axis**, because it is the only one that puts
two goods in tension: automation costs parts, weight and money, but buys down
operator interaction. Neither end wins. That is the same trade the machinery
ladder makes, scored.

Fallback if the interaction metric proves hard to define: collapse to **two
tiers — human pilot and autopilot** — and score which one you needed. Coarse,
but it preserves the trade.

## Why this validates the chase camera

**Targeting autopilot solutions makes chase the rewarding "hands OFF" view.**

The chase camera was settled as a *cost*: you get to look, and it takes your
controls away (`docs/design/cockpit.md`). Under mission scoring that inverts.
A solution good enough to run itself is one you can watch — so the view that
punishes a hand-flown run becomes the reward for an automated one.

The same button means "I have given up control" and "I no longer need it",
and which one it is depends entirely on what you built. That is worth more
than either reading alone, and it was not designed — it fell out.

## Verification is the deep one

**Reproducible and verifiable solutions.** An autopilot mission can demand
hands-off validation of *the same configuration* across *different
environments* — solve it once, then prove it generalises.

This is where the existing architecture pays off unexpectedly:

- **Determinism** (rule 2, and card L-019) stops being only an attribution tool
  and becomes the scoring substrate. A verified run is one that replays.
- **Seeded procedural sites** mean "the same machine, a different site" is one
  integer away.
- **The rack** is the thing being scored on the complexity axis — arbitration
  was already the game, and this prices it.
- **The damage ledger** is already a budget line item.

Nothing in v0 needs redesigning to get here. Everything v0 is building is what
this needs, which is the strongest available evidence that the v0 scope was
drawn in the right place.

## Open, before any of this is real

- **What counts as "operator interaction"?** Lever changes? Seconds hands-on?
  Number of distinct inputs? It is the load-bearing metric and it is undefined.
- Does a verified-across-environments run need *identical* wiring, or identical
  wiring *and* identical gains?
- Does failing verification cost anything, or is it free to retry? Refusing a
  contract costing less than failing it was the handover's answer for tickets;
  the same question applies here.
