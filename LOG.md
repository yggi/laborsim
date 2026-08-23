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

## 2026-08-23 — concept-3 prototype and handover folded in

Cards: closed [L-001] [L-002] [L-003 partial] [L-004] [L-005]

Took delivery of the feasibility prototype (`labor-sim-concept.html`) and its
handover brief. Froze both at `prototype/concept-3/`, verbatim and unedited,
with `prototype/README.md` stating the rule: port named mechanisms, never the
structure, and never patch a probe — write a new one.

MEMORY.md blew its 300-line gate on the way in, as expected. Spilled five
sections to `docs/design/`: `arbitration.md`, `load-chart.md`,
`machinery-ladder.md`, `physics-migration.md`, `prototype-findings.md`. The
index in MEMORY carries the one-liners. First real exercise of the gate; it
worked as designed.

Closed the stack card: Vite · Svelte 5 · Vitest · Three.js · Rapier (wasm),
mobile-first, touch primary. Rapier came from the handover rather than the
brief, so it is recorded with a caveat rather than as settled.

Four of the seven open threads closed against the handover. The control
hierarchy is a **linear priority stack with subsumption semantics** — not a
tree, not a graph; position on the rail *is* priority, cap ~8 slots. Legible
failure resolves to the **attribution rule** plus deterministic replay. The
hazard equalizer is attack-shaped: the Phantom Labor scrambles the sensor
surface that capability created. The minimum machine is the **tracked
platform**, rung 1 of the ladder.

Reversed a prior assumption: **sequence the ladder, not the biped.** The walker
is rung 6, and the acceptance test — two components fighting over one actuator,
within ten minutes, attributable from a replay — is specified on rung 1. The
probe started at the biped, correctly, because it was buying a look; production
must not repeat that. The board was rebuilt around this and now runs
scaffold → tracked platform → telemetry → rack → attribution → acceptance test.

Three conflicts recorded rather than resolved, because they are not mine to
settle. The largest: the brief's **authored** cockpit (player places widgets)
against the handover's **derived** cockpit (components ship instruments,
OS-mode collapses into build). Both keep the DIN rail; they disagree on what
gets dragged onto it, and it is upstream of a whole mode — so it got its own
decision card. Also open: whether v0 needs the job ticket as the failure loop's
third beat despite missions being deferred, and whether Rapier is confirmed.

Kept from the handover as a working method, not just a note: **instrument
early.** Rounds were lost on that prototype diagnosing from screenshots; a
telemetry line settled it immediately. Telemetry is now a card of its own,
scheduled before the rack rather than after the first bug.

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
