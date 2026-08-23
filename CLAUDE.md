# CLAUDE.md — agent entrypoint

`laborsim` — Patlabor-themed mecha/vehicle simulator sandbox. 3D browser game,
KSP-inspired build/sim loop, multi-layer educational physics & kinematics engine.

This file is the contract for how to work in this repo. It is short on purpose.
Everything else lives in the four surfaces below, each with a hard size gate.

## Read order (every session, before touching anything)

1. `CLAUDE.md` — this file. Rules of engagement.
2. `MEMORY.md` — what the project *is*. Crystallized, durable, index to `docs/`.
3. `NOTES.md` — what is *unresolved right now*. Open threads only.
4. `BOARD.md` — what to *do next*. Cards in doing / ready / backlog.

Read `LOG.md` only when you need history (why was X done, what was tried).
Do not read it as context by default.

## Write order (before ending a session)

1. `LOG.md` — append what you actually did and closed. Newest first.
2. `BOARD.md` — move cards, add cards you discovered. Trim history.
3. `NOTES.md` — delete threads you closed, add threads you opened.
4. `MEMORY.md` — only if something became *durably true*. Rare. Deliberate.

A change that touches code and leaves all four files untouched is incomplete.

## The four surfaces

| File | Holds | Never holds | Gate |
|---|---|---|---|
| `MEMORY.md` | durable facts, decisions, structure, conventions | tasks, status, speculation | 300 lines |
| `NOTES.md` | open, uncrystallized threads | anything settled, anything actionable-as-a-task | 100 lines |
| `BOARD.md` | task cards | rationale, narrative | see below |
| `LOG.md` | append-only worklog, closed cards | plans, open questions | 1000 lines |

Gate overflow is a signal, not an error. Handle it:

- **MEMORY.md > 300** → spill the fattest section to `docs/design/<topic>.md`,
  leave a one-line entry + link in the MEMORY index. The index never spills.
- **NOTES.md > 100** → threads have gone stale. Each one either crystallizes
  into MEMORY, becomes a BOARD card, or gets deleted. Nothing else.
- **BOARD.md** → `doing` ≤ 3 cards, `ready` ≤ 10, `backlog` ≤ 40,
  `history` ≤ 10 most-recent cards; older history moves to `LOG.md`.
- **LOG.md > 1000** → cut the oldest year into `docs/log/<year>.md`, link it.

Never let a surface grow past its gate to avoid the trim. Trimming *is* the work.

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

## Working rules

- v0 is **sandbox and exploration**. Missions, progression and gamification are
  deferred — but no v0 decision may foreclose them. Note it when one might.
- Scope down before you scope out. Prefer a thin vertical slice that runs over a
  broad layer that doesn't.
- Uncertain about intent? Put it in `NOTES.md` as a thread and keep going on the
  parts that don't depend on it. Do not silently pick and bury the choice.
- No stack, engine or renderer is committed yet. See `BOARD.md`. Do not
  introduce one as a side effect of another task.

## Repo map

Directory-level intent lives in `MEMORY.md` § Repo map. Keep it there, not here.
