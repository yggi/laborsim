# BOARD.md — task board

One task per card. Cards carry *what* and *done-when*, never rationale — that
belongs in `MEMORY.md` or `NOTES.md`.

**Gates:** `doing` ≤ 3 · `ready` ≤ 10 · `backlog` ≤ 40 · `history` ≤ 10.
History past 10 cards moves to `LOG.md`.

Card format:

```
### [id] Title
- **what:** one or two lines
- **done-when:** the observable condition that closes the card
- **needs:** blocking card ids or open threads (omit if none)
```

---

## doing

*(empty)*

---

## ready

### [L-015] The rack — priority stack and arbitration
- **what:** ordered command layers, highest active wins the actuator bus.
  Vertical DIN rail, drag to reorder, ~8 slots. Pilot levers are a rack entry.
- **done-when:** dragging PILOT below NAV visibly changes who owns the bus.
- **needs:** L-014

### [L-017] The attribution rule
- **what:** whenever an input is ignored, the reason is on screen before the
  player asks — active/idle/overridden LEDs, a bus-owner readout, suppressed
  controls visibly disabled.
- **done-when:** no suppressed input anywhere reads as a dead control.
- **needs:** L-015

### [L-018] Acceptance test — two components, one actuator
- **what:** construct the milestone scenario on rung 1: two components fighting
  over one actuator, reachable within ten minutes of a first session.
- **done-when:** a fresh player hits the conflict in under ten minutes and can
  say which component won and why.
- **needs:** L-017

### [L-019] Replay determinism spike
- **what:** establish that a failure can be recorded and replayed identically.
  Use `@dimforge/rapier3d-deterministic` and assert on `world.takeSnapshot()`
  hashes. Must also settle our own sim code: JS transcendentals are not
  bit-portable across engines, and `H(x,z)` is built from them.
- **done-when:** the same input trace yields the same snapshot hash on two
  different browsers, and the cost of that guarantee is in `MEMORY.md`.
  Same-machine determinism already holds and is under test; this card is the
  cross-browser half.

### [L-029] The damage ledger — v0's verdict and core feedback
- **what:** itemised, named, Yen-priced damage in a condescending institutional
  voice. Never aggregated. Citizens are categorical failure, never a line item.
  Quarry (few hazards, nobody to hurt) as the easy environment tier.
- **done-when:** a run ends with a line-by-line account that says *what* and
  *why*, each line traceable to what you did and what was driving.
- **needs:** L-016, L-027

### [L-021] Load chart v0
- **what:** compute a payload-vs-reach envelope from geometry, mass, actuator
  torque and support polygon for the rung-1 machine, and show it in build.
- **done-when:** changing a part visibly moves the chart before you drive.
- **needs:** L-014

### [L-006] Part/module model
- **what:** how a component declares attachment, the signals it consumes and
  produces, its sensor dependency, latency and actuator authority — and how a
  *part* (no loop) differs from a *component* (closes a loop).
- **done-when:** a track drive and an autonav are both expressible without
  special-casing.

---

## backlog

### [L-023] Terrain — the probe's designed site features
- **what:** noise terrain and clustered site furniture exist. Still missing are
  the *designed* features from the probe: quarry benches, the graded haul road,
  the trench, spoil mounds. Those are the parts you get stuck on.
- **done-when:** a site has at least one feature that defeats a careless driver.

### [L-025] Panel budget and occlusion
- **what:** fixed glass area, instruments declare their size, installed rather
  than toggled. Chase camera as an observation mode with no vehicle control.
- **done-when:** installing an instrument measurably costs you view, and the
  chase view cannot be used to drive.

### [L-007] `autonav` as the reference dumb module
- **what:** the canonical predictable-failure component — steers to the pin,
  knows nothing about slope or ground. Needs a named rung-two successor visible
  and unaffordable from day one.
- **done-when:** it drives into a ditch it never noticed, and the cab says why.
- **needs:** L-015

### [L-009] Phantom Labor — the hazard equalizer
- **what:** attacks the sensor surface that capability created. Makes the
  ladder non-monotonic; the two-lever cage is what cannot be scrambled.
- **done-when:** a hazard event disables an instrumented machine while the
  manual one keeps working.

### [L-026] LOTO hot-patching
- **what:** lock outputs (safe, inert, behind schedule) versus rewire live
  (gambling on transient authority handoff).
- **done-when:** rewiring a stabiliser live can drop the machine.
- **needs:** L-015

### [L-027] Job site generator
- **what:** footing, clearances, load, an unsurveyed obstruction — the thing
  that makes a load chart insufficient. Landscape is scenery, not the puzzle.
- **done-when:** two generated sites demand different machines.
- **needs:** NOTES thread "What does the procedural generator generate?"

### [L-008] Cockpit editor — place the mandatory instruments
- **what:** every component ships instruments the player *must* fit into the
  viewport. Placement is authored; the manifest is not.
- **done-when:** fitting a component means fitting its instrument, and a
  component can be refused for want of glass.
- **needs:** L-025

### [L-012] Persistence
- **what:** save and load a machine — geometry, rack order, cockpit layout.
- **done-when:** a built machine survives a page reload intact.
- **needs:** L-006, L-008

### [L-028] Footstep policy port
- **what:** the probe's most valuable mechanism — world-planted stance feet,
  swing feet retargeting against predicted body position. For rung 5–6, far out.
- **done-when:** deferred; do not start before rung 4 ships.

---

## history

### [L-024] Cel pipeline port — **closed**
Stepped toon ramp, guarded fresnel rim, per-axis inverted-hull ink. Banded sky
dome. Site furniture as real colliders in `src/world/props.ts`, clustered into
work areas — world data, not decoration, because the ledger must price it.

### [L-030] Playable from GitHub Pages — **closed**
Public URL, deployed on every green push to the default branch. CI gates the
deploy on lint, typecheck and tests, so a broken machine cannot reach the site.
Base path comes from the Pages config, not hardcoded.

### [L-016] Telemetry line from frame one — **closed**
Speed, attitude, per-track command/slip/grip/contacts, and the bus owner with
its suppressed layers. Colour-coded on grip. Shipped with rung 1, not after it.

### [L-014] Rung 1 — tracked platform, drivable — **closed**
Custom track friction model (Rapier has no anisotropic friction), six ray
samples per track, one tuned constant. Climb limit `atan(MU)` ≈ 43.5°; past it
the machine rears and flips, emergently. Cab view primary, two non-centring
levers, actuator bus in from the first commit. Absorbs L-022 (Rapier on rung 1):
it tips when pushed past the limit, and nothing was hand-tuned to make it.

### [L-013] Scaffold the toolchain — **closed**
TS · Vite 8 · Svelte 5 · Vitest 4 · Biome · Three · Rapier deterministic-compat.
`dev`, `build`, `test`, `typecheck`, `lint` all green. The three architecture
rules are enforced by `tests/architecture.test.ts`, not just documented.

### [L-020] Decide: authored or derived cockpit — **closed**
Middle ground: components ship **mandatory** instruments, the player **places**
them within the panel budget. → `MEMORY.md` § 6.1.

### [L-005] Define the v0 vertical slice — **closed**
Answered by `HANDOVER.md` § 10: the acceptance test on rung 1. Became L-018.

### [L-004] Pin the control-hierarchy shape — **closed**
Answered: a linear priority stack with subsumption semantics, not a tree or a
graph. Position is priority. → `docs/design/arbitration.md`.

