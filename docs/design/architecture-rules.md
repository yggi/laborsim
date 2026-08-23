# Architecture rules

**Three constraints, adopted before any production code exists.** Referenced
from `MEMORY.md` § Conventions.

They are here because each costs nothing to honour now and is brutal to
retrofit. Every one of them is load-bearing for a pillar, and every one is
mechanically checkable — so none of them can quietly rot.

Breaking one of these is not a style disagreement. If a change requires it, say
so out loud and change this file first.

---

## 1. The sim runs headless

**No renderer dependency anywhere in `src/sim/`, `src/control/` or
`src/modules/`.** Nothing under those trees may import `three`, touch the DOM,
or read from a canvas.

Why:

- It is what makes Vitest useful for a game. Sim behaviour becomes ordinary
  unit-testable code — step the world, assert on the state.
- It is the precondition for moving physics to a worker later, which is the one
  performance escape hatch a mobile-first browser game has.
- It keeps the renderer a *consumer* of simulation, which is what makes the
  "educational means inspectable" pillar tractable: if the 3D view is just one
  reader of the state, another reader is a debug panel, a replay, or a test.

**Check:** a Vitest suite that imports the whole sim and runs a scenario with no
DOM and no WebGL context. If it passes in plain Node, the rule holds.

## 2. Fixed timestep, seeded PRNG

The sim advances in **fixed steps**, decoupled from frame rate. Rendering
interpolates; it never drives.

**No `Math.random()` anywhere sim-visible, ever.** All randomness comes from an
explicit seeded generator, and the seed is part of the recorded scenario. The
probe already models this — its site furniture uses a seeded LCG precisely so
the "procedural environment" claim is testable.

Why: **attribution is the design.** A failure you cannot reproduce cannot be
blamed on a design decision, and the whole loop collapses to vibes. Replay is
not a feature bolted on later; it is the thing that makes failure teach.

**Check:** the L-019 spike — the same input trace yields the same
`world.createSnapshot()` hash on two different browsers. Rapier's
`-deterministic` build guarantees its half; this rule guarantees ours.

**Caveat, unresolved:** JS does not require `Math.sin`, `cos`, `exp` or `pow` to
be bit-identical across engines, and the probe's `H(x,z)` is built almost
entirely from them. See the NOTES thread; it must be settled before the height
field is ported, because it decides whether terrain is code or an asset.

## 3. One-directional snapshot boundary

The sim is **imperative, fixed-step, ~60 Hz**. The UI is **reactive,
event-driven, and reads a snapshot at ~10 Hz**.

State crosses that boundary in exactly one direction, through an explicit
snapshot. Commands cross back as discrete, queued inputs — never as shared
mutable state.

Concretely:

- **Instruments never subscribe to live sim state.** They read the latest
  snapshot. An instrument is a *view of a recording*, which is also why the same
  instrument code can drive a replay.
- **Svelte never owns the canvas.** Svelte owns DOM UI. A plain TypeScript
  module owns the renderer, the scene graph and the loop.
- **Do not use Threlte** (or any reactive scene-graph wrapper). It inverts
  control so the scene graph becomes reactive, which fights a fixed-step
  imperative loop and quietly reintroduces per-frame reactivity cost.

Why: Svelte 5's runes are cheap but not free, and a 30-DOF machine with a full
instrument panel updating reactively at 60 Hz on a phone is exactly the shape of
problem that kills mobile frame budgets. The boundary also happens to be the
same seam a worker would sit on, so rules 1 and 3 reinforce each other.

**Check:** grep — no `three` import under `src/ui/`, no Svelte import under
`src/sim/`. Instrument components take a snapshot object as a prop and nothing
else.
