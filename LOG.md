# LOG.md — worklog

Append-only. Newest first. What was actually done, and closed cards.
Not plans, not open questions.

**Gate: 1000 lines.** On overflow, cut the oldest year into `docs/log/<year>.md`
and link it from the archive list below.

Archives: *(none yet)*

Entry format:

```
## YYYY-MM-DD — title
Cards: [id] ...
What happened, in past tense. Anything tried and rejected, and why.
```

---

## 2026-08-23 — repo initialized

Cards: none (pre-board)

Set up `laborsim` as an empty core structure: directory skeleton under `src/`,
plus `assets/`, `docs/`, `tests/`. No stack, tooling or renderer chosen — that
is deliberate and is card [L-001].

Established the four memory surfaces and their size gates: `CLAUDE.md` as the
agent entrypoint, `MEMORY.md` for durable truth, `NOTES.md` for open threads,
`BOARD.md` for tasks, this file for history.

Wrote down the design vision as given: Patlabor-themed mecha/vehicle sandbox,
KSP-inspired build/sim loop, multi-layer educational physics. Captured the five
guiding principles (predictable stupid failure, complexity-as-trade, control
contention, cockpit-as-bridge, inspectability) in `CLAUDE.md`, and the
supporting detail — `autonav`, the dozer/walker pair, the DIN-rail edit cockpit
— in `MEMORY.md`.

Seven questions surfaced while writing this down and were left open in
`NOTES.md` rather than answered: the meaning of "multi-layer", where
inspectability surfaces, the shape of the control hierarchy, whether legible
failure needs recorded causality, how blunt the hazard equalizer is, what the
minimum machine that proves the loop is, and what browser scale costs.
