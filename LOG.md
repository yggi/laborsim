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

## 2026-08-23 — stack settled, architecture rules anchored

Cards: none closed · [L-013] fully specified

Stack confirmed and closed to further debate: **TypeScript · Vite · Svelte 5 ·
Vitest · Biome · Three.js · Rapier**, on `@dimforge/rapier3d-deterministic` so
replay determinism is a test rather than an aspiration. Godot, Babylon and Jolt
are recorded in `MEMORY.md` § 9 as rejected *with reasons*, so they are not
relitigated later — Godot's web export cannot run C# at all and is
Compatibility-renderer only; Babylon's switching cost lands exactly on the
already-proven cel pipeline; Jolt's tracked-vehicle controller is an
anti-feature here, because differential drive with friction *is* the teaching
layer and we write that one.

**Mobile-first is now fixed with a stated mechanical reason**, not a preference:
viewport budgeting turns out to be a core mechanism, which couples it deeply to
touch — direct manipulation, thumb reach, occlusion by your own hand, no hover,
no pixel precision. A desktop-first cockpit would be a different mechanic
wearing the same name. Recorded as upstream of stack, layout and control design.

**Chase camera resolved**, and it resolved in the same shape as everything else
in this design: available, but it costs you something real. While it is up you
see no cockpit and have no vehicle control — an observation mode, so it can
never be strictly better than the cab. Specific contexts may disable it as a
challenge condition. The last chase-camera thread closed; only panel field-
stowing survives from that cluster.

**The three architecture rules are anchored** in `docs/design/architecture-rules.md`
and cited from `MEMORY.md` § 12: the sim runs headless, fixed timestep with a
seeded PRNG and no `Math.random` sim-visible, and a one-directional snapshot
boundary (instruments read snapshots, Svelte never owns the canvas, no Threlte).
Each is written with the pillar it serves and a mechanical check, so none can
quietly rot. Breaking one now requires editing that file first, out loud.

MEMORY hit 292/300 taking this on. Spilled two sections rather than waiting for
the gate to force it: the cockpit material to `docs/design/cockpit.md` and the
downstream mechanics to `docs/design/mechanics.md`. Six spill files now.

## 2026-08-23 — diegetic frame, cockpit resolved, damage counter

Cards: closed [L-020] · added [L-029]

Three orientations landed, one of which reframes the project.

**The whole thing is, in-universe, a Labor design, operation and safety training
system** — the player uses the rig that teaches Labor operators, tonally
anchored on the *Patlabor 2* opening. Recorded as `MEMORY.md` § 1.1 because it
is not flavour: it licenses inspectability without breaking fiction (an open sim
layer is the rig's instrumentation, not a debug overlay), makes replay native,
makes failure affordable, makes sandbox the default mode, makes procedural sites
the point rather than a shortcut, and sets the UI register. Several problems that
looked like they needed machinery are now answered by the frame instead. Check it
before inventing more.

**Cockpit resolved to the middle ground** (L-020): components ship instruments,
those instruments are *mandatory*, and the player *places* them in the viewport.
This takes the best of both prior positions — the empty-cockpit failure state
that motivated "derived" becomes unreachable, while placement stays authored so
the DIN rail keeps a job. The consequence worth noting: the rack and the cockpit
collapse into one decision, and capability now literally costs sight. A component
can be refused for want of glass.

**No job tickets in v0. A damage counter is the verdict instead** — running cost
for expensive things you break, with harming a citizen as categorical failure
rather than a big number. Environment is the difficulty axis: a quarry is
simpler than a city. This supplies the failure loop's missing third beat at a
fraction of a ticket economy's cost, and it fits the training frame exactly.
Two threads closed on this; the attribution rule was carried over to it — a
counter that says what you broke without why is a score, and scores do not teach.

Stack discussion opened. Verified two facts rather than asserting them:
Godot 4's web export cannot run C# at all (the .NET runtime does not work in the
browser sandbox) and is Compatibility-renderer only, which makes GDScript the
only web-viable language on the platform where this project has to ship.
Rapier's `-deterministic` wasm build is bit-level cross-platform and
`world.createSnapshot()` hashes identically across machines — better than
assumed, and it turns replay determinism into a test we can write on day one.

That last finding exposed a new problem, now a thread: **JS transcendentals are
not bit-portable across engines**, and the probe's `H(x,z)` is built almost
entirely from `Math.sin`/`exp`/`pow`. Rapier's guarantee does not cover our own
code. Must be decided before the height field is ported, because it determines
whether terrain is code or an asset.

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
