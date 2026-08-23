# MEMORY.md — project memory

Durable, crystallized truth about `laborsim`. Facts and settled decisions only.
Status goes in `BOARD.md`, open questions in `NOTES.md`, history in `LOG.md`.

**Gate: 300 lines.** On overflow, spill the fattest section to
`docs/design/<topic>.md` and leave a one-line index entry below.

## Index — spill files

| File | Holds |
|---|---|
| `docs/design/arbitration.md` | the rack, subsumption, components-as-loops, the attribution rule |
| `docs/design/load-chart.md` | the Δv analogue; the shared artifact binding build and OS |
| `docs/design/machinery-ladder.md` | the six rungs, one invariant each; build order |
| `docs/design/physics-migration.md` | Rapier tiers and the virtual-crane recommendation |
| `docs/design/prototype-findings.md` | what `concept-3` proved, faked, and cost |
| `prototype/concept-3/HANDOVER.md` | the source handover brief, verbatim, frozen |

---

## 1. Identity

**laborsim** — a 3D browser game. Patlabor-themed mecha and vehicle simulator
sandbox, built on a multi-layer educational physics/kinematics engine.
Gameplay loop partially KSP-inspired: **build mode** and **sim mode**, with the
control-software layer bridging them.

"Labor" = the Patlabor sense: industrial/utility machines that are tools first —
construction, salvage, disaster work. Not war machines. You spec a Labor in a
workshop, wire its control software, take it to a site, and discover which of
your assumptions was wrong.

**What is being simulated is not combat and not locomotion. It is the gap
between what a machine is rated to do and what it does on the day.**

## 2. The design thesis

KSP does not work because of parts or physics. It works because of a
**diagnosable failure loop**: you predict, it breaks, and the break is legible
enough to blame on *one design decision*.

Everything in this project either serves that loop or is decoration and should
be cut. This is the sharpest available statement of the guiding principles in
`CLAUDE.md`, and it is the test to apply first.

Four load-bearing commitments follow from it:

1. **The load chart is the Δv** → `docs/design/load-chart.md`
2. **Arbitration is the game** → `docs/design/arbitration.md`
3. **The rack** — position is priority → `docs/design/arbitration.md`
4. **Panel budget and occlusion** — § 6 below

## 3. Scope of v0

v0 is **sandbox and exploration**: build a machine, take it out, see what it
does and how it breaks. Missions, progression and economy are **deferred, not
dropped** — a v0 decision that forecloses them is a bad v0 decision.

The v0 target is the acceptance test, on ladder rung 1 (tracked platform):

> Two components fighting over one actuator, reachable **within ten minutes of a
> first session**, and attributable **from a replay**.

If that scenario cannot be constructed on rung one, the rack is decoration.

## 4. Core loop

1. **Build** — spec the machine; the load chart falls out of the geometry.
2. **Wire** — order the rack. Decide who wins the actuator bus.
3. **Site** — drive it. Find out where the chart lied.
4. **Diagnose** — the failure is attributable to one decision, from a replay.
5. **Back to build** — with a specific reason.

## 5. The machinery ladder

Six rungs, one new invariant (really: one new *frame*) each. Rungs 1–4 need no
balance controller — tipping is emergent from contacts alone.

1. Tracked platform · 2. Excavator · 3. Forklift · 4. Seam-following welder ·
5. Off-road hexapod · 6. Bipedal walker

**Sequence the ladder, not the biped.** The biped is the worst entry point for
physics and the best one for concept art — which is exactly why the probe
started there and production must not. Full table:
`docs/design/machinery-ladder.md`.

The ladder is non-monotonic by design: the Phantom Labor attacks the sensor
surface that capability created, so the unscrambleable two-lever cage at rung
one must stay a genuinely good machine, never a tutorial.

## 6. Panel budget and occlusion

Every instrument you install **obscures your direct view**. In the basic tracked
cage you sit behind two levers with a clear windscreen; in a high-tech Labor you
can barely see out — map, thermal, radar — powerful, and blind when they fail.

This is the rare case where the **UX constraint *is* the game constraint**.
Fixed glass area; instruments declare their size. Adding autonav means giving up
a gauge you wanted. Real cabs are cramped for the same reason.

**Panels must be installed, not toggled.** If they can be tapped away, players
run naked-cage and peek at the map on demand, and the mechanic is gone.

Occlusion only bites **if the pilot camera is the only camera** — see `NOTES.md`,
this is unresolved and upstream of a lot of UI.

## 7. Mechanics that fall out of the above

- **Phantom Labor.** The antagonist attacks the sensor surface that capability
  created — scrambling instruments, not armour. Difficulty curve and antagonist
  become the same object: no separate balance pass, no bolted-on villain.
- **Hot-patching, anchored on LOTO.** Lockout–tagout is a real procedure with a
  real cost. Locking outputs parks the actuator and holds state: safe, inert,
  behind schedule. Rewiring live gambles on transient authority handoff — get
  the order wrong on a stabiliser and the Labor goes limp and falls. Prices
  field repair without arbitrary fragility dice. More dangerous the more
  advanced the Labor.
- **Component curriculum.** Every rung-one component needs a named rung-two
  successor visible on the shelf from day one and unaffordable. Waypoint-drives-
  into-a-ditch is funny once; it is a *game* when the ditch sends you back to
  build for a slope-aware variant **and the load chart moves by a number you can
  read.** Curriculum and economy in the same object.

## 8. Simulation — multi-layer

The engine is **multi-layer** and **educational**: the player can open a layer
and see the quantities it works with, not just their result. **Every simulated
quantity must be surfaceable.** A layer the player cannot open is not a teaching
layer and does not belong.

The engine of record is **Rapier (wasm)**, chosen for motorized joints, joint
limits, and **determinism you can replay a failure with** — attribution is the
design, so replay is not a nice-to-have.

Target tier is the **virtual crane**: full dynamics plus an external stabilising
wrench on the hull with a finite authority budget. That wrench **is** STAB-2 —
switching it off does not fake a fall, it removes the thing that was holding you
up. Mechanic and physics from the same object. See
`docs/design/physics-migration.md` for the tier costs and what inverts.

## 9. Stack

**Vite · Svelte 5 · Vitest · Three.js · Rapier (wasm).**

**Mobile-first. Touch is the primary input, not a fallback.** This is not a
polish note — it is why the rack is a DIN rail and not a node graph.

Single-file HTML output is a proven pattern in this codebase family, but **not
for the Rapier build** — Rapier wants a real bundler.

## 10. The prototype

`prototype/concept-3/` — single file, three.js r128 from CDN, no build step. It
answered *can this look and feel right in a browser, on a phone?* — yes.

It is **concept art with working mechanisms**, not an architecture sketch.
**Do not port its structure.** Do port the named mechanisms — the footstep
policy above all, then the analytic 2-bone IK, the analytic height field, the
hydraulic rams, and the cel pipeline. What it fakes (no physics at all, cosmetic
margin bar, scheduled rather than measured contact) and the six defects it cost
are in `docs/design/prototype-findings.md`.

**Method, learned the hard way: instrument early.** Rounds were lost diagnosing
from screenshots; a telemetry line settled it immediately. The readout the
player needs to diagnose a failure is the readout the developer needs.

## 11. Repo map

```
src/
  core/      kernel: entity/part model, sim clock, event bus, units
  sim/       simulation driver
    layers/  the individual simulation layers
  modules/   rack components: loops that hold one invariant in one frame
  control/   the rack: ordering, arbitration, actuator-bus ownership
  build/     build mode: assembly, load-chart computation
  cockpit/   pilot viewport: instruments, panel budget, occlusion
  render/    three.js scene, cel pipeline
  world/     terrain, job sites, hazards (radiation, EMF)
  ui/        application shell, mode switching
  platform/  input (touch-first), persistence, config
assets/      models, textures, data
docs/design/ MEMORY.md spill files
docs/log/    LOG.md yearly archives
prototype/   frozen feasibility probes — evidence, never a starting point
tests/
```

The tree is a claim about seams, not a promise about files. Move a seam if it
turns out to be wrong, and record the move here.

## 12. Conventions

- **One fact, one place.** Three of the four probe defects came from keeping one
  fact in two places (heading in `body.yaw` *and* `root.rotation.y`; hull height
  from soles *and* from ground). Delete the duplicate rather than syncing it.
- **Write the full rotation triple** — `rotation.set(k,0,0)`, not
  `rotation.x = k` — so a hinge's one-axis constraint is explicit in the code
  rather than assumed. `Object3D.add()` returns the *parent*.
- Nothing else is established yet. Do not invent conventions here in advance.
