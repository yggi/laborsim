# MEMORY.md — project memory

Durable, crystallized truth about `laborsim`. Facts and settled decisions only.
Status in `doc/BOARD.md`, threads in `doc/NOTES.md`, history in `doc/LOG.md`, method in `doc/META.md`.

**Target: 300 lines**, act at 360 (`CLAUDE.md`). On overflow, spill the fattest
section into the cluster it belongs to and leave the index below untouched.

## Index — four clusters

**This index names clusters, not pages.** It used to name all twenty spill files,
which made the docs a star with a long list at the centre: everything one hop
from here and nothing near anything else. Each cluster page below indexes its own
pages, one line each, and cross-links the siblings — so *where does this belong* is
answered one level down, by a page that knows the subject, rather than by a row in
a table that has to be re-read in full every time it grows.

| Cluster | Ask it about |
|---|---|
| [`doc/design/machine.md`](doc/design/machine.md) | the thing on the site: what it is made of, what stops it, how much fidelity is under it, and who commands the tracks |
| [`doc/design/cab.md`](doc/design/cab.md) | the glass and the kit bolted to it — the panel budget, the triptych, how instruments are drawn, how the machine sounds |
| [`doc/design/rig.md`](doc/design/rig.md) | the training system: what the frame licenses, the tone it speaks in, the ledger, the exercises |
| [`doc/design/code.md`](doc/design/code.md) | how the code is written and in what order — the three rules, the conventions, the stack, the prototype, the roadmap |

Two pages are marked in their cluster as not-yet-settled: `rig/missions.md` is
**exploratory** and `code/roadmap.md` is **forward-looking**. Everything else in
`doc/design/` is as durable as this file.

---

## 1. Identity

**laborsim** — a 3D browser game. Patlabor-themed mecha and vehicle simulator
sandbox on a multi-layer educational physics/kinematics engine. Loop partly
KSP-inspired: **build mode** and **sim mode**, bridged by the control layer.

"Labor" = the Patlabor sense: industrial/utility machines that are tools first —
construction, salvage, disaster work. Not war machines. World-building — the
manufacturers, the L.A.B.O.R. institution, and how each maker's culture predicts
how its kit fails — is in `doc/LORE.md`.

**What is being simulated is not combat and not locomotion. It is the gap
between what a machine is rated to do and what it does on the day.**

### 1.1 The diegetic frame — a training system

**The whole thing is, in-universe, a Labor design, operation and safety training
system.** The player is not piloting a Labor; they are using the rig that
teaches people to. Tonal anchor: the simulator sequence that opens *Patlabor 2*.

Not flavour: it licenses inspectability, replay, affordable failure,
sandbox-as-native, procedural sites and the UI register — so check it **before**
inventing machinery to justify something. Where the frame stops and which
institution speaks: `doc/design/rig/training-frame.md`.

## 2. The design thesis

KSP does not work because of parts or physics. It works because of a
**diagnosable failure loop**: you predict, it breaks, and the break is legible
enough to blame on *one design decision*.

Everything in this project either serves that loop or is decoration and should
be cut. This is the sharpest available statement of the guiding principles in
`CLAUDE.md`, and it is the test to apply first. Four commitments follow:

1. **The load chart is the Δv** → `doc/design/machine/load-chart.md`
2. **Arbitration is the game** → `doc/design/machine/arbitration.md`
3. **The rack is a pipeline** — order is the machine → `doc/design/machine/arbitration.md`
4. **Panel budget and occlusion** — § 6 below

## 3. Scope of v0

v0 is **sandbox and exploration**: build a machine, take it out, see what it
does and how it breaks. Progression and economy are **deferred, not dropped** —
a v0 decision that forecloses them is a bad v0 decision. **The open site is on
the schedule** so that adding exercises could not quietly repeal this.

**v0's build surface is the rack, not part assembly**, and **edit mode is
inline** — no separate screen. You move instruments around the glass and you
swap, reorder and reconfigure modules in the rack, in the cab, while it runs.
Order, verb, enable and a module's settings are four real design decisions, so
the loop closes over them without a parts model. Additive later, not foreclosed
(`doc/design/code/roadmap.md`).

The v0 target is the acceptance test, on ladder rung 1 (tracked platform):

> Two components fighting over one actuator, reachable **within ten minutes of a
> first session**, and attributable **from a replay**.

If that scenario cannot be constructed on rung one, the rack is decoration.

### 3.1 The damage ledger — v0's verdict and core feedback

**No job tickets in v0.** The failure loop needs a third beat and the damage
ledger is it: **the game's core feedback mechanism**, not a scoreboard. Damage is
**joules absorbed**, never hit points, so it is a quantity the player can be
shown — and now hear; **harming a citizen is categorical failure**, never a
priced line item. Model, numbers and build order: `doc/design/rig/damage.md`.

**A prop is a part list over materials.** The site's axis is what a thing is
*made of*, not what it is called: a kind declares its solids and their stuff, and
five consumers read that one declaration — the collider, the art, the voice, the
toughness (derived, never typed) and what it comes apart into when it is written
off. It is the reason the inventory could grow from six kinds to fourteen without
touching the renderer or the ear. **Toughness is a fraction of `½·m·v_max²`**, so
a thing rated beyond what the machine can deliver is not expressible; whether it
can be *reached* is a separate question and is answered by driving into it.

### 3.2 An exercise is a site plus an objective, and the verdict can say yes

**One objective verb — reach the markers you were given** — so "reach a marker"
and "reach all of them" are one sentence with a different pin count, and the
ladder is the *ground* rather than the task. `Exercise` is world data
(`src/world/exercises.ts`); `Goal` is on the snapshot, settles once, and is the
first thing the third beat can say **yes** with. Failure stays one thing: a
citizen involved. **No score, no gate, no par time** — every exercise is on the
schedule from session one. Steps 3–5 each cost a verb: `doc/design/rig/missions.md`.

## 4. Core loop

1. **Build** — spec the machine; the load chart falls out of the geometry.
2. **Wire** — order the rack. Decide who wins the actuator bus.
3. **Site** — drive it. Find out where the chart lied.
4. **Diagnose** — the failure is attributable to one decision, from a replay.
5. **Back to build** — with a specific reason.

### 4.1 Rung 1 is built

**The running gear is ours** — Rapier has no anisotropic friction and its
vehicle controller models wheels — so it is the teaching layer. **Two tuned
constants**: `MU = 0.95` and the bogies' damping ratio; the rest are dimensions
and masses, and the 43.5° climb limit is `atan(MU)`. **All twelve contact points
are sprung**, so a contact's normal load is measured off its own spring, not
shared equally. **Slip is rung 1's teaching quantity**, alongside traction and
now suspension travel; traction is **`null` and never 0 for a track with no
ground** — nothing measured is not a low reading, and every consumer has to
decide what to show for it. Detail: `doc/design/machine/tracked-platform.md`.

## 5. The machinery ladder

Six rungs, one new invariant (really: one new *frame*) each. Rungs 1–4 need no
balance controller — tipping is emergent from contacts alone.

1. Tracked platform · 2. Excavator · 3. Forklift · 4. Seam-following welder ·
5. Off-road hexapod · 6. Bipedal walker

**Sequence the ladder, not the biped.** The biped is the worst entry point for
physics and the best for concept art, which is why the probe started there and
production must not (`doc/design/machine/machinery-ladder.md`). The ladder is
non-monotonic by design — the Phantom Labor attacks the sensor surface capability
created — so the two-lever cage at rung one stays a good machine, not a tutorial.

## 6. The cockpit — panel budget and occlusion

Full detail: `doc/design/cab/cockpit.md`. The load-bearing claims:

- Every instrument installed **obscures your direct view**. Fixed glass area;
  instruments declare their size. **Installed, not toggled.** This is the rare
  case where the **UX constraint *is* the game constraint.**
- **Components ship instruments; those instruments are mandatory; the player
  places them.** So the rack and the cockpit are one decision, and a component
  can be **refused for want of glass**. OS-mode is tuning, never a gate.
- **The chase camera is "hands off the wheel", not pause.** No cockpit and no
  control, but **the sim keeps stepping and nothing auto-stops** — leave the
  throttle open and the ledger will tell you what it cost.
- **The rail is a server rack, not a DIN rail**: faceplates stacked vertically
  and screwed in, each in its maker's house style. Viewport budgeting is a core
  mechanism rather than a UI style, which is *why* mobile-first is fixed (§ 9).
- **The rig's own surfaces are not fitted kit and cost no glass** — the debrief,
  the live voice, the objective strip. The budget prices what a manufacturer
  bolted into your cab; the training system is not a manufacturer (§ 3.2).

### 6.1 A component is a triptych, and each kind bills you differently

Spilled in full to `doc/design/cab/components.md` (index). What must stay here:

- **Three currencies.** A chassis component costs nothing and brings the
  cockpit; a **capability** component costs **glass**; a **safety** component
  costs **capability**. A safety module shipping no pod is not a discount.
- **Severity crosses the boundary as a number** (`0 nominal · 1 active · 2 warn ·
  3 alarm`); the masters are derived from it, never hand-wired.
- **A manufacturer is one house** (`src/makers/`): colours, words **and sound**.
  The machine's voice is its **chassis maker's**, a component's is its own, the
  site's belongs to materials, and **the rig's is the exercise and nothing
  else**. A house sets timbre, never level (`doc/design/cab/sound.md`).

## 7. Mechanics that fall out of the above

Detail: `doc/design/rig/mechanics.md`. Each *follows* from a core commitment, which
is the argument for keeping it.

- **Phantom Labor** — attacks the sensor surface capability created.
- **Hot-patching, anchored on LOTO** — lock outputs versus rewire live.
- **Component curriculum** — every rung-one component has a named, visible,
  unaffordable rung-two successor. Curriculum and economy in one object.

## 8. Simulation — multi-layer

The engine is **multi-layer** and **educational**: the player can open a layer
and see the quantities it works with, not just their result. **Every simulated
quantity must be surfaceable** — as a number, a needle or a voice. A layer the
player cannot open is not a teaching layer.

The engine of record is **Rapier (wasm)**, chosen for motorized joints, joint
limits, and **determinism you can replay a failure with** — attribution is the
design, so replay is not a nice-to-have. Target tier is the **virtual crane**:
full dynamics plus a stabilising wrench on the hull with a finite authority
budget. That wrench **is** STAB-2 — switching it off does not fake a fall, it
removes the thing that was holding you up: `doc/design/machine/physics-migration.md`.

## 9. Stack — settled

**TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js · Rapier (wasm).**

**Mobile-first is fixed. Touch is the primary input, not a fallback.** The
reason is mechanical, not aesthetic: viewport budgeting (§ 6) is a core game
mechanism, and it is coupled deeply to touch — direct manipulation, thumb reach,
occlusion by your own hand, no hover, no pixel precision. A desktop-first
cockpit would be a different mechanic wearing the same name. This is upstream of
stack, layout and control design alike.

**It is measured, not asserted** — `profile.html` times the real world through
the real renderer on the device in your hand, and the budget is in
`doc/design/code/mobile-budget.md`. Two findings so far. **The payload is
Rapier**: 1.32 MB over the wire, 1.26 MB of it one chunk, and everything built
since the empty scaffold added 0.05 MB. **The frame fits** — a Pixel 9 holds its
panel's refresh through every pass on two browsers — so the ceiling is the
**CPU**, at 3–3.4 ms of a frame that may be 8.34 ms, and **draw calls at ~7 µs
each are what spend it**. The object to watch is the *machine*: ~170 of the
cab's 224 calls, free today only because the camera sits inside it and they
cull. A prop is ~0.75 calls, so the site can grow and the machine cannot.

Use `@dimforge/rapier3d-deterministic`, which makes replay a test rather than an
aspiration. What that costs, and the rejected options with their reasons —
**Godot**, **Babylon.js**, **Jolt** — are in `doc/design/code/stack.md`.

No further dependencies without a reason, and **no asset pipeline** — the art is
procedural boxes and cylinders and the sound is synthesised, so there is nothing
to load. Do not build one preemptively.

## 10. The prototype

`prototype/concept-3/` — one file, three.js from a CDN, no build. It answered
*can this look and feel right in a browser, on a phone?* — yes. It is **concept
art with working mechanisms**: **do not port its structure**, do port the named
mechanisms — the footstep policy above all, then the analytic 2-bone IK, the
hydraulic rams, the cel pipeline: `doc/design/code/prototype-findings.md`.

## 11. Repo map

```
src/
  core/      kernel: entity/part model, sim clock, event bus, units, and
             `fixture.ts` — the one way to build a Snapshot by hand
  sim/       simulation driver
    layers/  the individual simulation layers
  modules/   rack components: loops that hold one invariant in one frame
  control/   the rack: ordering, arbitration, actuator-bus ownership;
             `Controls`, the one channel a command crosses back through,
             `hands`, the one the loop reads the cab through, and `trace.ts` —
             the input twin of the event channel, where a command gets its tick
  build/     build mode: assembly, load-chart computation — and, in v0, what a
             machine is *fitted with*, which is the whole of the build here
  cockpit/   everything the machine's manufacturers made: the cab, the dash,
             the rack's rail, and each component's three parts —
             cells/ faces/ pods/, registered as one packet in `parts.ts`
  makers/    who built the kit: one house per manufacturer, read by both renderers
  render/    three.js scene, cel pipeline, and the dust a write-off leaves
  audio/     the machine's voice: `voices.ts` is arithmetic, `engine.ts` the graph
  world/     terrain, job sites, exercises, hazards (radiation, EMF);
             `materials.ts` is the site's one axis — what a thing is made of,
             how it rings, how it fails, what colour it is — and `site.ts` is
             the plan the ground is graded to before anything is put on it
  ui/        everything the rig made: the shell, the schedule, the objective
             strip, the debrief, the live voice
  sandbox/   the benches that read a recording: every component in every
             state, every voice — downstream of the sim, like the cab is
  probe/     the bench that drives the real thing: builds a world, builds a
             viewport, and times them. Above every layer, not inside one
  platform/  where the app meets the browser: `run.ts` owns one run — the
             world, the fitted kit, the viewport, the input and the loop —
             over `frame.ts`, which is one turn of it and belongs to nobody:
             the game, the bench and `replay.ts` all advance the same object
assets/      models, textures, data
doc/         every document but CLAUDE.md and README.md: the surfaces, and
             design/ in four clusters
prototype/   frozen feasibility probes — evidence, never a starting point
tests/
```

The tree is a claim about seams, not a promise about files. Move a seam if it
turns out to be wrong, and record the move here.

**The cockpit/ui line is the machine against the rig**, moved once (2026-08-25)
because it had drifted. If a manufacturer built it — the cage, the dash, an
instrument, a rack plate — it is `cockpit/`. If the training system built it —
the debrief, the live voice, the shell, the volume control — it is `ui/` or the
shell. The rig may read the machine; the machine knows nothing of the rig.
**`makers/` is who they are rather than what they made**: colours, words and
sound in one object per manufacturer, above both renderers that read it.

**`probe/` is the one directory allowed to touch both halves**, because a
profiler that could reach neither the sim nor the renderer would be profiling
neither. It is not an exemption from rule 3, it is the other side of it: the
bench reads everything, and **nothing reads the bench** — which is the half a
test enforces.

## 12. Conventions

### The three architecture rules

Adopted before any production code. Each is load-bearing for a pillar, each is
enforced by `tests/architecture.test.ts`, and breaking one is not a style
disagreement — say so out loud and change that file first. Rationale, the reasons
and the checks: `doc/design/code/architecture-rules.md`.

1. **The sim runs headless.** No `three`, no DOM, no canvas under `src/sim/`,
   `src/control/`, `src/modules/`.
2. **Fixed timestep, seeded PRNG.** Rendering interpolates and never drives; no
   `Math.random()` and no transcendental that closes a loop back into sim state.
3. **One-directional snapshot boundary.** An instrument is a view of a
   recording, which is why the same code drives a replay — and since L-032 that
   is a fact rather than an aspiration: **a run is a `Setup` plus a trace of what
   the operator did**, and the frame cannot tell the cab from a recording.
   **Svelte never owns the canvas. No Threlte.** Two halves: a sampled *state*
   for anything an instrument shows, and an *event channel* (`core/events.ts`)
   for anything that *happens* — the channel notifies, the ledger records. Its
   twin (`control/trace.ts`) is how a command crosses back: **queued, and stamped
   with the tick that applies it**, which the rule had claimed for a year and four
   separate writers of the rack had made untrue. **Renderers** (`render/`,
   `audio/`) read at 60 Hz; **readers** (`ui/`, `cockpit/`) at 10.

### Coding

**One fact, one place** — three of the four probe defects came from keeping one
fact in two. The rest, each with the bug that earned it — body axes, the
rotation triple, the two custom-property namespaces:
`doc/design/code/conventions.md`. Do not invent conventions there in advance.

**A concern with state of its own is a `.svelte.ts` module beside the component,
never a clump inside it.** Runes work in one, so a concern moves without becoming
a plain-object state machine — and a module can be built, stepped and asserted
without mounting anything, which is the whole reason to move it. The one rule
that follows: **it may not open an `$effect`**, because an `$effect` outside a
component is an orphan and throws, so a fold is a method the component drives
with a one-line effect and a test drives by calling. `App.svelte` held six such
clumps and none had ever been asserted (L-072).
