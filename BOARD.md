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

Order and reasoning: `docs/design/roadmap.md`. The first five cards close the
core loop once, at rung 1, over the rack as the build surface.

### [L-041] SPEED-LIM — the third dumb module
- **what:** caps track speed to a number on its faceplate. The obvious partner
  to TILT-GUARD and the first module whose right answer is *situational*: slow
  is safe near the pipe stack and useless on the far side of the site.
- **done-when:** it is in the rack with a limit slider and its own instrument,
  and the ledger can tell you it was set too high.

### [L-039] Breakables worth breaking
- **what:** the site as an inventory of expensive things. More props, more
  kinds, materials and prices — five kinds and one scooter is not an inventory.
  Quarry tier first: plenty to wreck, nobody to hurt. Also: work areas want to
  be somewhere a driver actually goes, not scattered where nothing leads.
- **done-when:** a careless run through a work area produces a list, not a line.

### [L-032] Record and playback — one engine
- **what:** an input trace plus the seed reproduces a run exactly in this
  browser. Rack state (order, verbs, enables) is part of the trace, because the
  ledger has to say what was driving. Splits off the cross-browser half (L-019).
- **done-when:** replaying a recorded run yields the same damage events in the
  same order, asserted in a test.

### [L-029] The damage ledger — the end-of-run report
- **what:** the *final* face of the ledger: an itemised, scrollable modal in the
  condescending register, with a manual **RESET SIMULATOR** button — and the
  natural first screen of the game. Never aggregated; citizens categorical. The
  live running account already exists (Ledger.svelte); L-044 turns it into the
  in-game voice.
- **done-when:** a run ends with a scrollable line-by-line account, each line
  traceable to what you did and what was driving, and a button to re-rack.
- **needs:** L-032

### [L-043] The status panel — the closed face of the rack
- **what:** the CONTROL PANEL cover becomes a live status strip at the bottom of
  the glass — fuel/oil pressure, engine key, warning lights, MASTER-ALARM — with
  a latch that opens it into the rack. It is also where the live voice (L-044)
  stacks. Themeable per chassis (bulldozer ↔ police Labor), so the interior has
  identity. See docs/design/cockpit.md.
- **done-when:** the cover shows live machine state and a raised alarm, and a
  latch reveals the rack behind it.

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

### [L-015] The rail — drag to reorder
- **what:** the pipeline model, verbs, settings and reordering all work, and the
  plates now look like equipment. What is missing is **drag**: reordering is
  still arrows. Also ~8 slots, and whether it is editable during sim (which is
  L-026, not a UX choice).
- **done-when:** you can drag a slot with a thumb and the machine changes.

---

## backlog

### [L-038] The machine breaks too, and the reset
- **what:** damage to the vehicle and destruction, and a **manual** diegetic
  reset — the rig re-racks the exercise, never yanks control. Ends on: machine
  wrecked or **unrecoverable** (flipped / high-centred, a real state to detect),
  a citizen harmed (hard to reach; NPCs dodge; may defer to an NPC round), or
  the operator calling RESET. Degradation before destruction is the strong
  version and explicitly not v0. See docs/design/damage.md.
- **done-when:** an unrecoverable machine ends the exercise and offers RESET, and
  nothing is lost but the run.
- **needs:** L-031

### [L-044] The live voice — stacking, auto-dismissing notifications
- **what:** the rig speaks as it happens: lines slide in, wait, fade; severe
  ones (citizen, master-alarm) latch until acknowledged. Same voice as L-029, at
  a different tempo. Reworks the current always-on Ledger list.
- **done-when:** breaking three things in a row produces three stacked notices
  that clear themselves, and a citizen hit stays until dismissed.
- **needs:** L-043

### [L-046] External lights and beacons
- **what:** headlights/spotlight, a red brake light, rotating warning beacons on
  the machine — feedback in the chase view and plain eye-candy. Wire them to sim
  state (braking, alarm) so they mean something, not just decoration.
- **done-when:** the beacon turns under a master-alarm and the brake light comes
  on when you reverse the tracks against motion.

### [L-047] The machine leaves a mark
- **what:** a dirt track on the ground behind the belts — a decal/trail. Ties
  the machine to the world it is tearing up, and it is the first ground evidence
  the ledger's talk of "rutted surface" can point at.
- **done-when:** driving leaves a visible trail that follows the tracks.

### [L-040] The machine symphony — synthesised sound
- **what:** engine-generated audio from the quantities the sim already
  publishes — track speed, slip, contacts, impact energy. Never sampled: a clip
  is a black box triggered by an event, a synth voice is another rendering of a
  simulated quantity.
- **done-when:** a machine labouring at 90% grip sounds like it, and an impact's
  voice follows how hard it was.
- **needs:** L-031

### [L-035] Throttle-and-steer — the rung-2 control upgrade
- **what:** the named successor to the two levers, and a component curriculum
  entry. Behind the damage work now that TILT-GUARD is the third module.
- **done-when:** driving with one thumb is available, better in some ways and
  worse in others, and the rack shows why.

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

### [L-008] Inline edit — move the instruments on the glass
- **what:** v0's edit mode is **inline, in the cab, while it runs**: drag a
  fitted instrument to where you want it. No separate screen. The rack half of
  edit mode already works; this is the other half.
- **done-when:** an instrument can be dragged to a new place with a thumb and
  stays there.
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

### [L-031] Damage model — the world can be broken — **closed**
Breakable furniture is dynamic and scatters; damage is **joules absorbed**, not
hit points, so it is a quantity the player can be shown. Lines carry what was
driving and what was bypassed. Two bugs paid for: props spawned overlapping and
destroyed each other (¥55,690 before the machine moved), and energy fed to
anything already sliding got integrated until it wrote itself off. Rejected:
Rapier's contact-force events — a solver force magnitude is not inspectable and
energy is. Learned: toughness must be a fraction of ½·m·v², or a cone rated at
22 J is indestructible by a 6.2 t machine.

### [L-036] TILT-GUARD — the first safety component — **closed**
Caps drive on hull pitch and roll, limits set by two sliders on its faceplate.
Verb `AMP`, because `CAP` would clamp a positive intent into a reversing
signal's range and turn the machine around — a safety module causing the crash
it exists to prevent. Rejected: reading attitude through `asin`/`atan2` — the
sines come straight out of the quaternion and stay bit-portable. Ships enabled
and deliberately timid (25°/18° against a 43.5° climb limit), so the first
lesson is that your own machine is what stopped you.

### [L-037] The rack as equipment — **closed**
Server rack rather than DIN rail: faceplates, ears, screws, and a house style
per manufacturer (KIBA WORKS, TOWA DENKI, HANSA REGELTECHNIK). Module settings
as bounded numbers with units — never gains. ATT-0 compass/attitude head as the
chassis instrument, TILT-GUARD's two banded gauges as its own. Rack toggle
became a control-panel cover at the seam; the camera became an item in the
instrument column. Tracks are belts wrapped round their wheels rather than
boxes, and the site is steeper.

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


