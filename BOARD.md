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

### [L-001] Choose the stack
- **what:** pick language, build tooling, and 3D renderer. Decide as one call —
  they constrain each other. Record the decision and the rejected options.
- **done-when:** `MEMORY.md` § Conventions names the stack with a one-line
  reason per choice; `NOTES.md` carries any residual doubt.

### [L-002] Hello-viewport
- **what:** the smallest thing that runs in a browser and draws a 3D scene with
  a ground plane and a camera you can move.
- **done-when:** one documented command starts it and it renders.
- **needs:** L-001

### [L-003] Pin the layer axis
- **what:** resolve the domain-stack vs fidelity-ladder question and write the
  answer down. Shape of `src/sim/layers/` follows from it.
- **done-when:** `MEMORY.md` § 6 states the axis; the NOTES thread is deleted.
- **needs:** NOTES thread "What does multi-layer cut along?"

### [L-004] Pin the control-hierarchy shape
- **what:** decide whether control is a tree, a graph, or a priority stack with
  vetoes. Sketch how two modules contending for one actuator resolve.
- **done-when:** the shape is in `MEMORY.md` with a worked two-module example.
- **needs:** NOTES thread "Is the control hierarchy a tree, a graph...?"

### [L-005] Define the v0 vertical slice
- **what:** name the one machine and one scenario that v0 delivers end to end,
  through build → wire → cockpit → sim.
- **done-when:** the slice is written into `MEMORY.md` § Scope of v0 and broken
  into backlog cards.
- **needs:** NOTES thread "What is the smallest machine that proves the loop?"

---

## backlog

### [L-006] Part/module model
- **what:** how a module declares its attachment points, the signals it consumes
  and produces, its power/thermal draw, and its failure modes.
- **done-when:** two dissimilar modules (a track drive and an `autonav`) are
  expressible in it without special-casing.

### [L-007] `autonav` as the reference dumb module
- **what:** implement the canonical predictable-failure module — drives toward a
  waypoint, considers nothing else, states so honestly.
- **done-when:** it can drive a machine into an obstacle it never noticed, and
  the player can see why from the cockpit.
- **needs:** L-006

### [L-008] DIN-rail cockpit editor
- **what:** place widgets on rails in the sim viewport and bind them to machine
  signals.
- **done-when:** a widget placed in edit cockpit reads a live value in sim mode.
- **needs:** L-004, L-006

### [L-009] Hazard model — radiation / EMF
- **what:** the equalizer that makes the dozer correct. Decide blunt vs
  degrading vs attack-shaped, then implement one.
- **done-when:** a hazard event disables an electronics-dependent machine while
  a manual one keeps working.
- **needs:** NOTES thread "Hazards as equalizer — how blunt?"

### [L-010] Failure legibility machinery
- **what:** determine whether reconstructing a failure needs recorded causality,
  and if so what the sim must record.
- **done-when:** a decision is in `MEMORY.md`, with a card or a deletion.
- **needs:** NOTES thread "How does a machine fail legibly?"

### [L-011] Terrain and world
- **what:** ground the machines can get stuck on. Scale to be decided.
- **done-when:** terrain exists with slopes, ditches and obstacles enough to
  defeat `autonav`.
- **needs:** L-002

### [L-012] Persistence
- **what:** save and load a machine — geometry, wiring, cockpit layout.
- **done-when:** a built machine survives a page reload intact.
- **needs:** L-006, L-008

---

## history

*(empty — closed cards land here, then age out to `LOG.md`)*
