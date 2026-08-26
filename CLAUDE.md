# CLAUDE.md — agent entrypoint

`laborsim` — Patlabor-themed mecha/vehicle simulator sandbox. 3D browser game,
KSP-inspired build/sim loop, multi-layer educational physics & kinematics engine.

This file is the contract for how to work in this repo. It is short on purpose.
Everything else lives in the surfaces below, each with a target size and a line
where it gets condensed.

## Read order (every session, before touching anything)

1. `CLAUDE.md` — this file. Rules of engagement.
2. `MEMORY.md` — what the project *is*. Crystallized, durable, and the index to
   `docs/design/`'s four clusters — **machine**, **cab**, **rig**, **code**.
   Each cluster page indexes its own five and cross-links the siblings, so a
   subject is found by walking two hops, not by scanning one long list.
3. `META.md` — how the work *goes*. Method lessons, each with the scar that
   earned it. Short. Read it; it is cheaper than re-earning them.
4. `NOTES.md` — what is *unresolved right now*. Open threads only.
5. `BOARD.md` — what to *do next*. Cards in doing / ready / backlog.

`HISTORY.md` is the arc — read it once when you are new, or when a decision
looks arbitrary and you want to know what it cost. `LOG.md` is the detail behind
the last few weeks of it; read that only when you need to know why X was done or
what was tried. Neither is context by default.

## Write order (before ending a session)

1. `LOG.md` — append what you actually did and closed. Newest first. When it is
   over its line, fold its oldest sessions into `HISTORY.md` rather than moving
   them anywhere.
2. `BOARD.md` — move cards, add cards you discovered. Trim history.
3. `NOTES.md` — delete threads you closed, add threads you opened.
4. `MEMORY.md` — only if something became *durably true*. Rare. Deliberate.
5. `META.md` — only when the work taught you something about *working*, and it
   cost something to learn. Rarer still.

A change that touches code and leaves these files untouched is incomplete.

## The surfaces

| File | Holds | Never holds | Target |
|---|---|---|---|
| `MEMORY.md` | durable facts, decisions, structure, conventions | tasks, status, speculation | 300 lines |
| `META.md` | method lessons, each with its incident | project facts, tasks | 150 lines |
| `NOTES.md` | open, uncrystallized threads | anything settled, anything actionable-as-a-task | 100 lines |
| `BOARD.md` | task cards | rationale, narrative | see below |
| `LOG.md` | append-only worklog, closed cards | plans, open questions | 1000 lines |
| `HISTORY.md` | the arc — decisions, reversals, what each cost | this session's detail | 250 lines |

### Target, and the line where you act

The number above is the **target** — the size the surface should sit at. You act
when it is **20% over**, and not before:

| | target | act at |
|---|---|---|
| `MEMORY.md` | 300 | 360 |
| `HISTORY.md` | 250 | 300 |
| `META.md` | 150 | 180 |
| `NOTES.md` | 100 | 120 |
| `LOG.md` | 1000 | 1200 |
| `BOARD.md` | doing 3 · ready 10 · backlog 40 · history 10 | 4 · 12 · 48 · 12 |

**The band exists to stop line-shaving.** A hard limit at the target buys you the
wrong work: a surface one line over gets a sentence reflowed, a word deleted, an
entry compressed by exactly one line — and nothing is condensed, because nothing
*needed* condensing. Every such round costs a real edit's worth of attention and
leaves the surface as sprawling as it was. It has happened here often enough to
name it.

So: below the target, add freely. Between target and the line, you are on notice
— write what the work needs and let it sit. At the line, **condense back to the
target or below, in one deliberate pass**. Not to the line: a trim that lands you
at 359 has bought one line of room and you will be back next session.

The band is room to breathe, not a place to live. A surface that sits in it for
three sessions running is telling you a section wants spilling, not trimming.

### How each one is handled when it is time

- **MEMORY.md** → spill the fattest section to a `docs/design/` cluster page's
  tree, leave a one-line entry + link in the MEMORY index. The index never
  spills, and it indexes **cluster pages**, not every content page.
- **META.md** → entries have gone abstract. Merge or cut; an entry that has lost
  the incident that earned it has probably stopped being true.
- **NOTES.md** → threads have gone stale. Each one either crystallizes into
  MEMORY, becomes a BOARD card, or gets deleted. Nothing else.
- **BOARD.md** → history past its target moves to `LOG.md`; ready past its target
  means something goes back to backlog, not that ready is bigger now.
- **LOG.md** → fold the oldest sessions **into `HISTORY.md`'s narrative** and
  delete them. Not moved intact: a verbatim archive is what git already is, and
  the one that existed grew to 1,577 lines, condensed 2%, and was read by nothing.
- **HISTORY.md** → the older sections are too fine-grained. A month becomes a
  section, a quarter a paragraph, a year a line. It has to converge.

Never let a surface grow past the line to avoid the work. Condensing *is* the
work.

## Guiding principles (the reason the code exists)

These decide design arguments. If a change makes one weaker, say so out loud.

1. **Fail stupidly, but predictably.** The player should be able to reconstruct
   *exactly* why a thing broke from what they could see. `autonav` driving into a
   ditch is the design working, not a bug.
2. **Complexity is a trade, never a ladder.** A tracked dozer with manual levers
   must stay genuinely viable against a walker with gait stabilizer, radar and
   autopilot — different qualities, requirements, failure modes. Hazards
   (radiation, EMF attack) are the equalizer.
3. **More capability means more contention for control.** Arbitration between
   modules is a first-class player-facing system, not engine plumbing.
4. **The cockpit is the bridge.** Edit-cockpit has sim mode's view and build
   mode's tools. It is where a machine stops being a parts list and becomes a
   thing you can drive.
5. **Educational means inspectable.** Every simulated quantity must be
   surfaceable to the player. A layer you cannot open is not a teaching layer.
6. **You are an operator, not a demigod.** The fantasy is *not* an invincible
   war mecha. It is a humble, unstable, hard-to-operate contraption you are
   trying not to break everything with. Retrofuturistic forklift-operator
   training, not power. If a change makes the machine feel heroic rather than
   awkward, it is working against the game.
7. **Honest world, real machine.** The world may look like a simulation — bare
   contour lines, an obvious grid, a plotted route — because in the fiction it
   *is* one. The machine and the cockpit may not: they are the real thing the
   player sits in. So spend fidelity asymmetrically — a legible, diagrammatic
   world, and a cockpit with wear, weight, grain and the wrong kind of light.
   The player is in a simulation, but in a real cab.

## Working rules

- v0 is **sandbox and exploration**. Missions, progression and gamification are
  deferred — but no v0 decision may foreclose them. Note it when one might.
- Scope down before you scope out. Prefer a thin vertical slice that runs over a
  broad layer that doesn't.
- Uncertain about intent? Put it in `NOTES.md` as a thread and keep going on the
  parts that don't depend on it. Do not silently pick and bury the choice.
- The stack is settled (`MEMORY.md` § 9) and its rejected options are recorded
  with reasons. Do not reopen one as a side effect of another task.

## Repo map

Directory-level intent lives in `MEMORY.md` § Repo map. Keep it there, not here.
