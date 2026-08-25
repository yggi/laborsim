# MEMORY.md — project memory

Durable, crystallized truth about `laborsim`. Facts and settled decisions only.
Status in `BOARD.md`, threads in `NOTES.md`, history in `LOG.md`, method in `META.md`.

**Gate: 300 lines.** On overflow, spill the fattest section to
`docs/design/<topic>.md` and leave a one-line index entry below.

## Index — spill files

| File | Holds |
|---|---|
| `docs/design/architecture-rules.md` | the three non-negotiable code constraints, and how each is checked |
| `docs/design/arbitration.md` | the rack as a pipeline, the verbs, components-as-loops, attribution |
| `docs/design/cockpit.md` | panel budget, occlusion, mandatory-manifest placement, the chase camera |
| `docs/design/components.md` | the triptych — plate/cell/pod, the three currencies, invariants and freedoms |
| `docs/design/theming.md` | the substrate, the token contract, the sandbox, and the brief an author is given |
| `docs/design/training-frame.md` | what the training-rig frame licenses, where it stops, who speaks |
| `docs/design/instrument-rendering.md` | why panels are DOM+SVG, and what 3D/canvas/CSS3D would cost |
| `docs/design/damage.md` | the ledger, the machine breaking, the reset, synthesised sound |
| `docs/design/load-chart.md` | the Δv analogue; the shared artifact binding build and OS |
| `docs/design/machinery-ladder.md` | the six rungs, one invariant each; build order |
| `docs/design/mechanics.md` | Phantom Labor, LOTO hot-patching, component curriculum |
| `docs/design/missions.md` | **exploratory** — Zachtronics budgeting, and why it inverts the chase camera |
| `docs/design/physics-migration.md` | Rapier tiers and the virtual-crane recommendation |
| `docs/design/prototype-findings.md` | what `concept-3` proved, faked, and cost |
| `docs/design/roadmap.md` | **forward-looking** — critical-path review and the argument behind the board's order |
| `docs/design/stack.md` | the stack, and the rejected options with their reasons |
| `docs/design/tracked-platform.md` | rung 1: the track friction model, what falls out of it, the controls |
| `docs/design/tone.md` | the operator-not-demigod inversion, the damage ledger, the voice |
| `prototype/concept-3/HANDOVER.md` | the source handover brief, verbatim, frozen |

---

## 1. Identity

**laborsim** — a 3D browser game. Patlabor-themed mecha and vehicle simulator
sandbox on a multi-layer educational physics/kinematics engine. Loop partially
KSP-inspired: **build mode** and **sim mode**, bridged by the control layer.

"Labor" = the Patlabor sense: industrial/utility machines that are tools first —
construction, salvage, disaster work. Not war machines. World-building — the
manufacturers, the L.A.B.O.R. institution, and how each maker's culture predicts
how its kit fails — is in `LORE.md`.

**What is being simulated is not combat and not locomotion. It is the gap
between what a machine is rated to do and what it does on the day.**

### 1.1 The diegetic frame — a training system

**The whole thing is, in-universe, a Labor design, operation and safety training
system.** The player is not piloting a Labor; they are using the rig that
teaches people to. Tonal anchor: the simulator sequence that opens *Patlabor 2*.

Not flavour: it is the frame that licenses inspectability, replay, affordable
failure, sandbox-as-native, procedural sites and the UI register — so check it
**before** inventing machinery to justify something. Full list, where the frame
stops, and which institution speaks: `docs/design/training-frame.md`.

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
3. **The rack is a pipeline** — order is the machine → `docs/design/arbitration.md`
4. **Panel budget and occlusion** — § 6 below

## 3. Scope of v0

v0 is **sandbox and exploration**: build a machine, take it out, see what it
does and how it breaks. Missions, progression and economy are **deferred, not
dropped** — a v0 decision that forecloses them is a bad v0 decision.

**v0's build surface is the rack, not part assembly**, and **edit mode is
inline** — no separate screen. You move instruments around the glass and you
swap, reorder and reconfigure modules in the rack, in the cab, while it runs.
Order, verb, enable and a module's settings are four real design decisions, so
the loop closes over them without a parts model. Additive later, not foreclosed.
The ordering argument: `docs/design/roadmap.md`.

The v0 target is the acceptance test, on ladder rung 1 (tracked platform):

> Two components fighting over one actuator, reachable **within ten minutes of a
> first session**, and attributable **from a replay**.

If that scenario cannot be constructed on rung one, the rack is decoration.

### 3.1 The damage ledger — v0's verdict and core feedback

**No job tickets in v0.** The failure loop needs a third beat and the damage
ledger is it: **the game's core feedback mechanism**, not a scoreboard. Damage
is **joules absorbed**, never hit points, so it is a quantity the player can be
shown; **harming a citizen is categorical failure**, never a priced line item.
Model, numbers, the two faces of the ledger and the build order:
`docs/design/damage.md`. Voice: `docs/design/tone.md`.

## 4. Core loop

1. **Build** — spec the machine; the load chart falls out of the geometry.
2. **Wire** — order the rack. Decide who wins the actuator bus.
3. **Site** — drive it. Find out where the chart lied.
4. **Diagnose** — the failure is attributable to one decision, from a replay.
5. **Back to build** — with a specific reason.

### 4.1 Rung 1 is built

Detail: `docs/design/tracked-platform.md`. The load-bearing claims:

- Rapier has no anisotropic friction and its vehicle controller models *wheels*,
  so **the track friction model is ours** — and that is the design, not a
  workaround. The friction model is the teaching layer.
- Colliders carry friction 0; six ray samples per track apply impulses capped at
  `mu · N · dt`. **One tuned constant** (`MU = 0.95`); everything else is a
  dimension or a mass.
- The climb limit is `atan(MU)` ≈ **43.5°** — what a friction cone does, not a
  number chosen to feel right. Past it the machine rears, loses contact and
  **flips over backwards.** No tipping logic exists anywhere.
- **Slip — commanded track speed minus actual ground speed — is rung 1's
  teaching quantity**, on the telemetry line from the first commit, alongside
  traction (fraction of the friction cone in use) which is **`null`, never 0,
  for a track with no ground**: nothing measured is not a low reading.

## 5. The machinery ladder

Six rungs, one new invariant (really: one new *frame*) each. Rungs 1–4 need no
balance controller — tipping is emergent from contacts alone.

1. Tracked platform · 2. Excavator · 3. Forklift · 4. Seam-following welder ·
5. Off-road hexapod · 6. Bipedal walker

**Sequence the ladder, not the biped.** The biped is the worst entry point for
physics and the best one for concept art — which is why the probe started there
and production must not. Full table: `docs/design/machinery-ladder.md`. The
ladder is non-monotonic by design: the Phantom Labor attacks the sensor surface
capability created, so the two-lever cage at rung one must stay a genuinely good
machine, never a tutorial.

## 6. The cockpit — panel budget and occlusion

Full detail: `docs/design/cockpit.md`. The load-bearing claims:

- Every instrument installed **obscures your direct view**. Fixed glass area;
  instruments declare their size. **Installed, not toggled.** This is the rare
  case where the **UX constraint *is* the game constraint.**
- **Components ship instruments; those instruments are mandatory; the player
  places them.** So the rack and the cockpit are one decision, and a component
  can be **refused for want of glass**. OS-mode is tuning, never a gate.
- **The chase camera is "hands off the wheel", not pause.** No cockpit and no
  control, but **the sim keeps stepping and nothing auto-stops** — leave the
  throttle open and the ledger will tell you what it cost.
- **Viewport budgeting is a core mechanism, not a UI style**, which couples it
  deeply to touch. This is *why* mobile-first is fixed — see § 9.
- **The rail is a server rack, not a DIN rail**: faceplates stacked vertically,
  screwed in, **each in its manufacturer's house style**. Kit from different
  makers must look like kit from different makers.

### 6.1 A component is a triptych, and each kind bills you differently

Full contract: `docs/design/components.md`. The load-bearing claims:

- A component appears in up to three places: a **plate** in the rack (hands), a
  **cell** on the dash (periphery), a **pod** on the glass (eyes). Only the plate
  is mandatory; the **manufacturer** decides the rest, never the player.
- **Three currencies.** A chassis component costs nothing and brings the cockpit;
  a **capability** component costs **glass**; a **safety** component costs
  **capability** — it strands you on the incline instead of blocking your view.
  So a safety module shipping no pod is not a discount.
- **Severity crosses the boundary as a number** (`0 nominal · 1 active · 2 warn ·
  3 alarm`). MASTER WARNING and MASTER ALARM are derived from it, never
  hand-wired. The *word* on the annunciator is a theme decision, not sim state.
- **The dash is the seam.** The only thing visible in both postures, and it
  travels: bottom of the view looking forward, top of it looking down at the
  rack. Its theme belongs to the **vehicle's** manufacturer.

## 7. Mechanics that fall out of the above

Detail: `docs/design/mechanics.md`. Each one *follows* from the core
commitments — that is the argument for keeping them.

- **Phantom Labor** — attacks the sensor surface capability created.
- **Hot-patching, anchored on LOTO** — lock outputs versus rewire live.
- **Component curriculum** — every rung-one component has a named, visible,
  unaffordable rung-two successor. Curriculum and economy in one object.

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

## 9. Stack — settled

**TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js · Rapier (wasm).**

**Mobile-first is fixed. Touch is the primary input, not a fallback.** The
reason is mechanical, not aesthetic: viewport budgeting (§ 6) is a core game
mechanism, and it is coupled deeply to touch — direct manipulation, thumb reach,
occlusion by your own hand, no hover, no pixel precision. A desktop-first
cockpit would be a different mechanic wearing the same name. This is upstream of
stack, layout and control design alike.

Use `@dimforge/rapier3d-deterministic`: it is bit-level cross-platform
deterministic and `world.takeSnapshot()` hashes identically across machines,
which makes replay a test rather than an aspiration. It costs SIMD and parallel
features. Rapier also rules out single-file HTML output — it wants a bundler.

Rejected, with reasons, in `docs/design/stack.md`: **Godot** (its web export
cannot run C# at all), **Babylon.js** (switching cost lands on the proven cel
pipeline), **Jolt** (its vehicle controller is the black box we refuse).

No further dependencies without a reason. The art direction is procedural boxes
and cylinders, so **no asset pipeline is needed for a long time** — do not build
one preemptively.

## 10. The prototype

`prototype/concept-3/` — single file, three.js r128 from CDN, no build step. It
answered *can this look and feel right in a browser, on a phone?* — yes.

It is **concept art with working mechanisms**, not an architecture sketch.
**Do not port its structure.** Do port the named mechanisms — the footstep
policy above all, then the analytic 2-bone IK, the hydraulic rams and the cel
pipeline. What it fakes, the six defects it cost and the method lessons it
taught: `docs/design/prototype-findings.md` and `META.md`.

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

### The three architecture rules

Adopted before any production code. Each is load-bearing for a pillar, each is
enforced by `tests/architecture.test.ts`, and breaking one is not a style
disagreement — say so out loud and change that file first. Rationale, the reasons
and the checks: `docs/design/architecture-rules.md`.

1. **The sim runs headless.** No `three`, no DOM, no canvas under `src/sim/`,
   `src/control/`, `src/modules/`.
2. **Fixed timestep, seeded PRNG.** Rendering interpolates and never drives; no
   `Math.random()` and no transcendental that closes a loop back into sim state.
3. **One-directional snapshot boundary.** Sim imperative at 60 Hz, UI reads a
   snapshot at 10 Hz. An instrument is a view of a recording — which is why the
   same code drives a replay. **Svelte never owns the canvas. No Threlte.**

### Coding

- **One fact, one place.** Three of the four probe defects came from keeping one
  fact in two places (heading in `body.yaw` *and* `root.rotation.y`; hull height
  from soles *and* from ground). Delete the duplicate rather than syncing it.
- **Body axes: forward is +Z, up is +Y, so right is −X and left is +X.**
  Named as `LEFT_X`/`RIGHT_X` in `core/spec.ts` rather than written inline —
  getting them the wrong way round silently mirrors the steering, which is
  invisible on a symmetric hull. It shipped that way once.
- **Write the full rotation triple** — `rotation.set(k,0,0)`, not
  `rotation.x = k` — so a hinge's one-axis constraint is explicit in the code
  rather than assumed. `Object3D.add()` returns the *parent*.
- Nothing else is established yet. Do not invent conventions here in advance.
