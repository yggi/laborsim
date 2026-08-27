# CLAUDE.md — agent entrypoint

`laborsim` — Patlabor-themed mecha/vehicle simulator sandbox. 3D browser game,
KSP-inspired build/sim loop, multi-layer educational physics & kinematics engine.

This file is the contract for how to work in this repo. It is short on purpose.
Everything else lives in `doc/`, in surfaces that each have one job, a target
size, and a line where they get condensed.

**The repository root holds this file, `README.md` and configuration.** Those
two are the entrypoints for a reader who has not been told where to look — this
one is found by the agent, that one by GitHub. Every other document is in
`doc/`, for readers who have been told.

## Read order (every session, before touching anything)

1. `CLAUDE.md` — this file. Rules of engagement.
2. `doc/MEMORY.md` — what the project *is*. Crystallized, durable, and the index to
   `doc/design/`'s four clusters — **machine**, **cab**, **rig**, **code**.
   Each cluster page indexes its own five and cross-links the siblings, so a
   subject is found by walking two hops, not by scanning one long list.
3. `doc/META.md` — how the work *goes*. Method lessons, each with the scar that
   earned it. Short. Read it; it is cheaper than re-earning them.
4. `doc/NOTES.md` — what is *unresolved right now*. Open threads only.
5. `doc/BOARD.md` — what to *do next*. Cards in doing / ready / backlog.

`doc/HISTORY.md` is the arc — read it once when you are new, or when a decision
looks arbitrary and you want to know what it cost. `doc/LOG.md` is the detail behind
the last few weeks of it; read that only when you need to know why X was done or
what was tried. Neither is context by default.

## Write order (before ending a session)

1. `doc/LOG.md` — append what you actually did and closed. Newest first. When it is
   over its line, fold its oldest sessions into `doc/HISTORY.md` rather than moving
   them anywhere.
2. `doc/BOARD.md` — move cards, add cards you discovered. Trim history.
3. `doc/NOTES.md` — delete threads you closed, add threads you opened.
4. `doc/MEMORY.md` — only if something became *durably true*. Rare. Deliberate.
5. `doc/META.md` — only when the work taught you something about *working*, and it
   cost something to learn. Rarer still.

## Gates — what makes a change finished

Not a checklist to feel good about. Four conditions, each of which has been
failed here before, and each cheap to check and expensive to miss.

**1. The suites are green, and you ran them.** `npm test`, `npm run typecheck`
and `npm run lint`, plus the bench that covers what you touched — `npm run
shots` or `npm run cab` for anything visual, `npm run listen` for anything
audible. **Print the number rather than estimating it**: a gate you do not check
is not a gate, and this repo has shipped "within its limit" at 307 of 300.

**2. The surfaces moved.** A change that touches code and leaves `doc/` alone is
incomplete. The minimum is a `doc/LOG.md` entry; anything that closed or opened
work also touches `doc/BOARD.md` and `doc/NOTES.md`.

**3. Nothing new is unverifiable.** If the change adds a rule, a claim about
appearance or sound, or a fact about the tree, something has to fail when it
stops being true. If it adds a check, **the check must be able to fail** — plant
the fault and watch it, every branch of it. A bench has no assertion to fail, so
a bench that stops reaching its subject stays silent: run it.

**4. A measured claim is re-measured.** Numbers in `doc/` are readings, not
decoration. If the change can move one — a peak level, a percentile, a line
count — take it again and write what it now says.

## The surfaces

| File | Holds | Never holds | Target |
|---|---|---|---|
| `doc/MEMORY.md` | durable facts, decisions, structure, conventions | tasks, status, speculation | 300 lines |
| `doc/META.md` | method lessons, each with its incident | project facts, tasks | 200 lines |
| `doc/NOTES.md` | open, uncrystallized threads | anything settled, anything actionable-as-a-task | 100 lines |
| `doc/BOARD.md` | task cards | rationale, narrative | see below |
| `doc/LOG.md` | append-only worklog, closed cards | plans, open questions | 1000 lines |
| `doc/HISTORY.md` | the arc — decisions, reversals, what each cost | this session's detail | 400 lines |

### Target, and the line where you act

The number above is the **target** — the size the surface should sit at. You act
when it is **20% over**, and not before:

| | target | act at |
|---|---|---|
| `doc/MEMORY.md` | 300 | 360 |
| `doc/HISTORY.md` | 400 | 480 |
| `doc/META.md` | 200 | 240 |
| `doc/NOTES.md` | 100 | 120 |
| `doc/LOG.md` | 1000 | 1200 |
| `doc/BOARD.md` | doing 3 · ready 10 · backlog 40 · history 10 | 4 · 12 · 48 · 12 |

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

- **MEMORY.md** → spill the fattest section to a `doc/design/` cluster page's
  tree, leave a one-line entry + link in the MEMORY index. The index never
  spills, and it indexes **cluster pages**, not every content page.
- **META.md** → entries have gone abstract. Merge or cut; an entry that has lost
  the incident that earned it has probably stopped being true.
- **NOTES.md** → threads have gone stale. Each one either crystallizes into
  MEMORY, becomes a BOARD card, or gets deleted. Nothing else.
- **BOARD.md** → ready past its target means something goes back to backlog, not
  that ready is bigger now. **History past its target folds into
  `doc/HISTORY.md` and is deleted**, exactly as a log session does — a closed
  card is already a condensed session, so parking it in a third file was the
  same dump one level down: 56 lines of cards describing things the arc already
  said.
- **LOG.md** → **fold** the oldest sessions into the paragraph of
  `doc/HISTORY.md` they belong to, and delete them. Not moved intact: a verbatim
  archive is what git already is, and what git cannot give you cheaply is the
  arc — it hands you commits rather than periods, and changes rather than
  changes of mind. The one that existed grew to 1,577 lines, condensed 2%,
  duplicated four entries between its own files, and was read by nothing.
- **HISTORY.md** → the older sections are too fine-grained. A month becomes a
  section, a quarter a paragraph, a year a line. It has to converge.

Never let a surface grow past the line to avoid the work. Condensing *is* the
work.

`tests/doc.test.ts` checks the shape, not the prose: every cluster page indexes
its own tree, no content page creeps into the MEMORY index, and every markdown
path written down anywhere resolves. It runs in `npm test`. `doc/LOG.md` is
exempt from path resolution because it is append-only and records paths that
were correct when written; `doc/HISTORY.md` is **not** exempt, because it is
rewritten rather than appended to.

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
- Uncertain about intent? Put it in `doc/NOTES.md` as a thread and keep going on the
  parts that don't depend on it. Do not silently pick and bury the choice.
- The stack is settled (`doc/MEMORY.md` § 9) and its rejected options are recorded
  with reasons. Do not reopen one as a side effect of another task.

## Git

- **Push any branch freely.** Branch, commit, push, iterate.
- **`main` requires explicit instruction**, every time. A standing permission to
  push branches is not permission to push `main`.
- **Pushing a branch publishes it.** `.github/workflows/pages.yml` builds every
  `main` and `claude/**` push and puts it on the web: `main` at the site root,
  every other branch at `/b/<slug>/`, indexed at `/b/`. A branch's build is
  withdrawn when the branch is deleted, and every publish also prunes any
  directory whose branch is gone — the delete event is an optimisation, not the
  mechanism. A push is not a private act.

CI gates the publish on lint, typecheck and the suite, so a red branch does not
reach the site. Run them before pushing rather than finding out in the log.

## Repo map

Directory-level intent lives in `doc/MEMORY.md` § Repo map. Keep it there, not
here.
