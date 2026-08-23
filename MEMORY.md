# MEMORY.md — project memory

Durable, crystallized truth about `laborsim`. Facts and settled decisions only.
Status goes in `BOARD.md`, open questions in `NOTES.md`, history in `LOG.md`.

**Gate: 300 lines.** On overflow, spill the fattest section to
`docs/design/<topic>.md` and leave a one-line index entry below.

## Index — spill files

*(none yet — everything still fits here)*

---

## 1. Identity

**laborsim** — a 3D browser game. Patlabor-themed mecha and vehicle simulator
sandbox, built on a multi-layer educational physics/kinematics engine.
Gameplay loop partially KSP-inspired: **build mode** and **sim mode**, with
**edit cockpit** as the bridge between them.

"Labor" = the Patlabor sense: industrial/utility walkers and machines that are
tools first, doing construction, salvage, disaster work. Not war machines.

## 2. Scope of v0

v0 is **sandbox and exploration**: build a machine, take it out, see what it
does and how it breaks. No missions, no progression, no economy, no scoring.

Gamification, missions and progression are **deferred, not dropped**. They are
held in mind as guiding constraints: a v0 decision that would foreclose them is
a bad v0 decision and must be flagged.

## 3. Core loop

1. **Build** — assemble a machine from modules on a chassis.
2. **Wire** — set the control hierarchy; decide what commands what, and who
   wins when two things want the same actuator.
3. **Cockpit** — place UI controls and widgets into the viewport as the pilot's
   instrument panel.
4. **Sim** — drive it. Watch it succeed, or fail in a way you can explain.
5. **Back to build** — with a specific reason.

## 4. Design pillars

Full statements live in `CLAUDE.md` § Guiding principles. Summary:

1. Fail stupidly, but predictably — failure must be reconstructable.
2. Complexity is a trade, never a ladder — the dozer stays viable.
3. More capability means more contention for control.
4. The cockpit is the bridge between build and sim.
5. Educational means inspectable — no closed layers.

### 4.1 Predictable stupid failure — the canonical example

The `autonav` module pilots toward a waypoint. It ignores terrain, clearance and
obstructions. It is not broken; it is *exactly as smart as it says it is*. The
player learns its envelope by watching it drive a walker into a trench, and then
learns to fence it with other modules — not by reading a tooltip.

Every automation module should be legible this way: a short, honest statement of
what it considers, and visible blindness to everything else.

### 4.2 Complexity as trade — the canonical pair

| | Tracked dozer | Bipedal walker |
|---|---|---|
| Locomotion | tracks, always statically stable | dynamic gait stabilizer |
| Control | manual levers, direct | autopilot, layered |
| Sensing | eyeballs | radar, thermal |
| Work | dump bed, loading arm | multi-use manipulators |
| Fails by | getting stuck, tipping slowly | falling over, losing stabilizer |
| Survives | radiation, EMF attack, blackout | nothing that kills its electronics |

High-radiation events and Phantom-Labor-style EMF attacks are the equalizer that
makes the dumb machine the *correct* machine. This asymmetry is load-bearing.

### 4.3 Control contention

Capability is bought with contention. A walker with gait stabilizer + autopilot +
manipulator IK has three systems that all want the leg and torso actuators.
Resolving that is the player's job, and it is the KSP-staging-analogue of this
game: a structure the player authors, inspects, and gets wrong in visible ways.

The control hierarchy is therefore a **player-facing artifact**, not engine
internals. It must be viewable, editable, and diagnosable during sim.

## 5. Modes

### Build mode
Assemble modules onto a chassis. Structural, mechanical and electrical
attachment. No time; no physics beyond what assembly needs.

### Edit cockpit — the bridge
**Sim mode's view, build mode's tools.** Sits between the two and belongs to
neither. Here the player:

- sets the control hierarchy and arbitration between modules,
- places and connects UI controls and widgets into the viewport,
- binds inputs to the machine's actual signals.

Widget layout uses a **DIN-rail-style component view**: instruments and controls
snap onto rails, are wired to signals, and are grouped like real industrial
control-cabinet hardware. The metaphor is deliberate — it makes the panel feel
built rather than configured, and it makes wiring visible.

### Sim mode
Drive it. Full simulation, no editing. Instruments read live. Failures happen.

## 6. Simulation — multi-layer

The engine is **multi-layer** and **educational**: the player can open a layer
and see the quantities it works with, not just their result.

The layer axis is not yet pinned. Two readings are live and probably both true —
a *domain stack* (structure / mechanics / power / thermal / signal) and a
*fidelity ladder* (selectable simplification per subsystem). See `NOTES.md`.

Fixed regardless of that: **every simulated quantity must be surfaceable.**
A layer the player cannot open is not a teaching layer, and does not belong.

## 7. Repo map

```
src/
  core/      kernel: entity/part model, sim clock, event bus, units
  sim/       simulation driver
    layers/  the individual simulation layers
  modules/   installable parts: chassis, actuators, sensors, autonav, tools
  control/   control hierarchy, arbitration, signal routing between modules
  build/     build mode: assembly, attachment, constraints
  cockpit/   edit cockpit: DIN-rail widgets, signal bindings, panel layout
  render/    3D scene and view
  world/     terrain, environment, hazards (radiation, EMF)
  ui/        application shell, mode switching
  platform/  input, persistence, config
assets/      models, textures, data
docs/
  design/    MEMORY.md spill files
  log/       LOG.md yearly archives
tests/
```

The tree is a claim about seams, not a promise about files. Empty dirs are
intentional placeholders; move a seam if it turns out to be wrong, and record
the move here.

## 8. Conventions

*(to be filled as they are established — do not invent them here in advance)*

- Language / stack / renderer: **not chosen yet.** See `BOARD.md`.
