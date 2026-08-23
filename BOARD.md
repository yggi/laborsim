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

Order and reasoning: `docs/design/roadmap.md`. The first four cards close the
core loop once, at rung 1, over the rack as the build surface.

### [L-031] Damage model — the world can be broken
- **what:** world objects get mass, a price and a destruction threshold. Contact
  energy above it destroys the object and emits a priced, named event on the sim
  side. No presentation — that is L-029.
- **done-when:** driving into the scooter destroys it and the sim records what,
  where, how hard and what it cost.

### [L-032] Record and playback — one engine
- **what:** an input trace plus the seed reproduces a run exactly in this
  browser. Rack state (order, verbs, enables) is part of the trace, because the
  ledger has to say what was driving. Splits off the cross-browser half (L-019).
- **done-when:** replaying a recorded run yields the same damage events in the
  same order, asserted in a test.

### [L-029] The damage ledger — v0's verdict and core feedback
- **what:** itemised, named, Yen-priced damage in a condescending institutional
  voice. Never aggregated. Citizens are categorical failure, never a line item.
  Quarry (few hazards, nobody to hurt) as the easy environment tier.
- **done-when:** a run ends with a line-by-line account that says *what* and
  *why*, each line traceable to what you did and what was driving.
- **needs:** L-031, L-032

### [L-018] The acceptance scenario, made legible
- **what:** levers and NAV-1 under `CAP` already are two components fighting
  over one actuator. The machinery exists; nothing records the conflict, prices
  it, or names it. Make it land.
- **done-when:** a player can say what each module did to the signal, from a
  replay, after breaking something because of it.
- **needs:** L-029, L-032

### [L-033] First run — the ten-minute path
- **what:** the other half of the acceptance criterion, which no card owned. A
  first session opens on two unlabelled levers; nothing walks anyone to the
  conflict. Diegetic register: induction briefing, not a tutorial overlay.
- **done-when:** someone who has never seen the game reaches the conflict in
  under ten minutes without being told how.
- **needs:** L-018

### [L-034] Measure the mobile frame
- **what:** frame time and draw-call count on a real mid-range phone, with the
  current scene (~130 props, ink shells doubling meshes, greebles, grousers).
  Mobile-first is a pillar we have never measured.
- **done-when:** a number exists, and a written first-load and frame budget with
  it.

### [L-015] The rail — drag to reorder, and the DIN-rail treatment
- **what:** the pipeline model, verbs and reordering all work; what is missing
  is the *rail*. Drag rather than arrows, slot styling, ~8 slots, and deciding
  whether it is editable during sim (which is L-026, not a UX choice).
- **done-when:** you can drag a slot with a thumb and the machine changes.

### [L-035] Throttle-and-steer — the third module
- **what:** the named rung-2 successor to the two levers, and the first
  component curriculum entry. Turns the rack from a two-slot demo into an
  ordering problem.
- **done-when:** three modules contend for one actuator and order changes which
  one you feel.

---

## backlog

### [L-019] Cross-browser determinism — the other half
- **what:** bit-identical `world.takeSnapshot()` hashes across engines. The
  architecture that makes it possible is enforced by test already; this is the
  verification. Deferred: it needs a second engine to check against, and nothing
  in v0 depends on it — shared or cross-site verified solutions do, and those
  are missions.
- **done-when:** the same input trace yields the same snapshot hash on two
  different browsers, and the cost of that guarantee is in `MEMORY.md`.
- **needs:** L-032

### [L-021] Load chart v0
- **what:** compute a payload-vs-reach envelope from geometry, mass, actuator
  torque and support polygon, and show it in build. Belongs with rung 2, where
  payload against reach is the point and equal-share normal load gives out.
- **done-when:** changing a part visibly moves the chart before you drive.
- **needs:** L-006

### [L-006] Part/module model
- **what:** how a component declares attachment, the signals it consumes and
  produces, its sensor dependency, latency and actuator authority — and how a
  *part* (no loop) differs from a *component* (closes a loop). Not v0: v0's
  build surface is the rack, and this gets easier once rung 2 exists as code.
- **done-when:** a track drive and an autonav are both expressible without
  special-casing.

### [L-023] Terrain — the probe's designed site features
- **what:** noise terrain and clustered site furniture exist. Still missing are
  the *designed* features from the probe: quarry benches, the graded haul road,
  the trench, spoil mounds. Those are the parts you get stuck on.
- **done-when:** a site has at least one feature that defeats a careless driver.

### [L-025] Panel budget and occlusion
- **what:** NAV-1's route scope is the first mandatory instrument and already
  costs view. Still missing is the *budget*: a fixed glass area, instruments
  declaring their size, and a component refusable for want of it.
- **done-when:** fitting a component can fail because its instrument will not
  fit.

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

### [L-007] `autonav` as the reference dumb module — **closed**
NAV-1 steers on bearing and distance to the pin and considers nothing else,
which is the design rather than a limitation. Heading error from a dot and a
cross product, so no transcendental closes a loop back into the sim.

### [L-017] The attribution rule — **closed for rung 1**
Under a pipeline there is no owner to name, so the chain is shown stage by
stage down to the terminal, with active/idle/bypassed LEDs and each module's
one-sentence statement of what it considers.

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

