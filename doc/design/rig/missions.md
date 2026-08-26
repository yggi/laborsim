# Missions — steps 1–2 built, the rest exploratory

The scoring half is **not v0 and not settled**; v0 stays sandbox
(`doc/MEMORY.md` § 3), and the open site is on the schedule to keep it that way.
What *is* built (L-065) is the first two steps of the progression below and the
machinery underneath them: exercises, goal track-keeping, a successful stop
condition, and a debrief that can say yes.

Source: play session, 2026-08-23. Built 2026-08-25.

---

## The shape: Zachtronics-style budgeting

Missions with an explicit, multi-axis cost, where the interesting play is
trading the axes against each other rather than maximising one.

**A progression that extends cleanly from one verb:**

1. reach a target point ✅
2. reach several waypoints, in order ✅ (order-free — see below)
3. use a tool at a location
4. collect something
5. move X to Y

Each step reuses the last one's machinery. Step 1 was buildable on rung 1 and is.

### What steps 1–2 turned out to be

**One verb, not two.** "Reach a target point" and "reach several waypoints" are
the same sentence with a different number of pins, so there is no objective kind
and no enum — an `Exercise` carries a `RouteSpec` and the ladder is `count: 1`
then `count: 3` then `count: 5`. An `ObjectiveKind` was written and deleted. Each
of steps 3–5 *is* a new verb and will cost one; none of them is this one in a hat.

**Order-free.** A route is drawn in order and NAV-1 walks it in order, but the
objective does not require it. The operator is not obliged to take the route the
survey drew, and a pair of levers has no way to be told to. The split times in
the debrief record the order you actually took, which is the interesting half
anyway.

**The ladder is the ground, not the task.** The first exercise is the same
terrain generator turned down — `relief: 0.3` — so its steepest grade is 18°
against a 43.5° climb limit, and it is climbable everywhere. A trainee who
cannot get up a hill must be finding out something about their driving, never
something about the hill. `tests/mission.test.ts` holds that as an angle rather
than as an adjective.

**"You can already see the flag" is a cone.** The first route confines its one
pin to `z > 0, |x| ≤ 0.34·z` — a cone about the machine's start heading — so it
opens on a marker you are facing. A first exercise you can fail by facing the
wrong way teaches the wrong thing.

**The verdict got a second axis.** The damage ledger's only verdict was a bill,
which is to say the loop's third beat could only ever be negative. `Goal` on the
snapshot is the other half: `running` / `success` / `failed`, settled once, with
a tick on it. Failure is still exactly one thing — a citizen involved — and it
outranks completion on the same step.

**The rig got a voice**, narrowly and for the first time: see
`doc/design/cab/sound.md`. Nothing else could announce a marker.

### What is deliberately still missing

- **No score.** Nothing is ranked, nothing is starred, and the axes below are
  not computed. The exercise is passed or not passed.
- **No gate.** Every exercise is on the schedule from the first session. A
  curriculum that locked its own later entries would be the rig withholding a
  site, and v0 is sandbox.
- **No time limit and no par time.** The clock is recorded because it is the
  substrate of the time axis below; it costs nothing to record and it commits to
  nothing.

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
controls away (`doc/design/cab/cockpit.md`). Under mission scoring that inverts.
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
- **Turning NAV-1 on is not, by itself, enough to finish an exercise**, and that
  is the dead-man's throttle working exactly as designed: NAV sits below the
  pilot with verb `CAP`, so a parked lever caps guidance to zero. Driving is
  therefore *levers*, or *levers and NAV together* — never NAV alone. It is the
  best thing about the rack and it is also the first thing a trainee meets, with
  nothing telling them which of the two they are looking at. Carded as L-066;
  the answer is a rack decision, not an exercise one, so no exercise here
  quietly repeals it.
- Does a verified-across-environments run need *identical* wiring, or identical
  wiring *and* identical gains?
- Does failing verification cost anything, or is it free to retry? Refusing a
  contract costing less than failing it was the handover's answer for tickets;
  the same question applies here.
