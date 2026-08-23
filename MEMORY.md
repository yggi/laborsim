# MEMORY.md — project memory

Durable, crystallized truth about `laborsim`. Facts and settled decisions only.
Status goes in `BOARD.md`, open questions in `NOTES.md`, history in `LOG.md`.

**Gate: 300 lines.** On overflow, spill the fattest section to
`docs/design/<topic>.md` and leave a one-line index entry below.

## Index — spill files

| File | Holds |
|---|---|
| `docs/design/architecture-rules.md` | the three non-negotiable code constraints, and how each is checked |
| `docs/design/arbitration.md` | the rack, subsumption, components-as-loops, the attribution rule |
| `docs/design/cockpit.md` | panel budget, occlusion, mandatory-manifest placement, the chase camera |
| `docs/design/load-chart.md` | the Δv analogue; the shared artifact binding build and OS |
| `docs/design/machinery-ladder.md` | the six rungs, one invariant each; build order |
| `docs/design/mechanics.md` | Phantom Labor, LOTO hot-patching, component curriculum |
| `docs/design/physics-migration.md` | Rapier tiers and the virtual-crane recommendation |
| `docs/design/prototype-findings.md` | what `concept-3` proved, faked, and cost |
| `docs/design/tone.md` | the operator-not-demigod inversion, the damage ledger, the voice |
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

### 1.1 The diegetic frame — a training system

**The whole thing is, in-universe, a Labor design, operation and safety training
system.** The player is not piloting a Labor; they are using the rig that
teaches people to. Tonal anchor: the simulator sequence that opens *Patlabor 2*.

This is not flavour — it is the frame that licenses most of the design, and it
should be checked before inventing machinery to justify something:

- **Inspectability is diegetic.** An open sim layer is not a debug overlay
  breaking fiction; it is the training rig's instrumentation. The "educational
  means inspectable" pillar stops fighting the fiction and starts being it.
- **Replay is native.** Training systems record and review sessions. Attribution
  from a replay needs no in-world excuse.
- **Failure is affordable.** Killing a citizen is a training failure, not a
  moral event the game has to dramatise. It can be scored bluntly and reset.
- **Sandbox is the native mode.** A training rig has free-drive. v0 needs no
  story-shaped reason to exist.
- **Procedural sites are the point** — a rig generates exercises. Difficulty is
  the site, not a curve.
- **It sets the UI register**: industrial training software, not a game HUD.

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

### 3.1 The damage ledger — v0's verdict and core feedback

**No job tickets in v0.** The failure loop still needs a third beat, and the
damage ledger is it — at a fraction of a ticket economy's cost, and it is
**the game's core feedback mechanism**, not a scoreboard.

- Operate through a procedural environment full of **expensive things to break**.
- **Itemised, named, priced**, never aggregated:
  `citizen asset (scooter) damaged −¥3,000`.
- **Harming a citizen is categorical failure**, not a line item. Never give a
  person a price.
- Environments are the difficulty axis: **a quarry is simpler than a city.**

Delivered in a **condescending institutional voice** — the rig is disappointed,
patiently, and writing it down. Voice, register and worked examples:
`docs/design/tone.md`. The attribution rule applies in full: a ledger that says
*what* without *why* is a score, and scores do not teach.

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

## 6. The cockpit — panel budget and occlusion

Full detail: `docs/design/cockpit.md`. The load-bearing claims:

- Every instrument installed **obscures your direct view**. Fixed glass area;
  instruments declare their size. **Installed, not toggled.** This is the rare
  case where the **UX constraint *is* the game constraint.**
- **Components ship instruments; those instruments are mandatory; the player
  places them.** So the rack and the cockpit are one decision, and a component
  can be **refused for want of glass**. OS-mode is tuning, never a gate.
- **The chase camera is "hands off the wheel", not pause.** No cockpit, no
  vehicle control — but **the sim keeps stepping and the vehicle does not
  auto-stop.** Leave the throttle open and go sightseeing, and the ledger will
  tell you what it cost. Some contexts disable it as a challenge.
- **Viewport budgeting is a core mechanism, not a UI style**, which couples it
  deeply to touch. This is *why* mobile-first is fixed — see § 9.

## 7. Mechanics that fall out of the above

Detail: `docs/design/mechanics.md`. They are listed there rather than here
because each one *follows* from the core commitments — that is the argument for
keeping them.

- **Phantom Labor** — attacks the sensor surface capability created. Antagonist
  and difficulty curve become the same object.
- **Hot-patching, anchored on LOTO** — lock outputs (safe, inert, late) versus
  rewire live (gambling on transient authority handoff).
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

Rejected, with reasons, so they are not relitigated:

- **Godot** — its web export cannot run C# at all (no .NET in the browser
  sandbox) and is Compatibility-renderer only, so GDScript would be the only
  option for a control-loop-heavy sim on the one platform that must ship. Add an
  order-of-magnitude larger first load, and the fact that half this game is 2D
  UI where the DOM wins. *Would be reconsidered only if mobile-first browser
  stopped being a requirement — and it will not.*
- **Babylon.js** — genuinely competitive (TS-native, built-in inspector, Havok),
  but the switching cost lands exactly on the cel pipeline, which is Three-
  specific, already proven, and the artful part. Do not rewrite the proof.
- **Jolt** — better articulated-body support and it ships a tracked-vehicle
  controller, which rung 1 could use. Declined deliberately: **a black-box
  vehicle controller is an anti-feature here.** Differential drive with friction
  *is* the teaching layer; we write that one.

No further dependencies without a reason. The art direction is procedural boxes
and cylinders, so **no asset pipeline is needed for a long time** — do not build
one preemptively.

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

### The three architecture rules

Adopted before any production code. Each is load-bearing for a pillar and each
is mechanically checkable. Rationale and checks: `docs/design/architecture-rules.md`.

1. **The sim runs headless.** No renderer dependency in `src/sim/`,
   `src/control/` or `src/modules/` — no `three`, no DOM, no canvas. This is
   what makes Vitest useful for a game and what keeps a worker possible.
2. **Fixed timestep, seeded PRNG.** The sim advances in fixed steps; rendering
   interpolates and never drives. **No `Math.random()` sim-visible, ever** — the
   seed is part of the recorded scenario. Attribution is the design, and a
   failure you cannot reproduce cannot be blamed on a decision.
3. **One-directional snapshot boundary.** Sim is imperative at ~60 Hz; UI reads
   a snapshot at ~10 Hz. Instruments never subscribe to live sim state — an
   instrument is a view of a recording, which is why the same code drives a
   replay. **Svelte never owns the canvas. Do not use Threlte.**

Breaking one of these is not a style disagreement. Say so out loud, and change
that file first.

### Coding

- **One fact, one place.** Three of the four probe defects came from keeping one
  fact in two places (heading in `body.yaw` *and* `root.rotation.y`; hull height
  from soles *and* from ground). Delete the duplicate rather than syncing it.
- **Write the full rotation triple** — `rotation.set(k,0,0)`, not
  `rotation.x = k` — so a hinge's one-axis constraint is explicit in the code
  rather than assumed. `Object3D.add()` returns the *parent*.
- Nothing else is established yet. Do not invent conventions here in advance.
