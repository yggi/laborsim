# Architecture rules

**Three constraints, adopted before any production code exists.** Referenced
from `doc/MEMORY.md` § Conventions.

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

**Check:** `tests/replay.test.ts` — a recorded run replayed from its trace and
its seed yields the same damage events in the same order and the same
`world.fingerprint()`, and every part of the trace removed in turn changes the
answer. `tests/determinism.test.ts` holds the weaker half, about a run nobody
drove. The remaining half is the L-019 spike: the same trace on two different
*browsers*. Rapier's `-deterministic` build guarantees its share; this rule
guarantees ours, and the trace format is now the thing that spike compares.

**Transcendentals — settled at L-014.** JS does not require `Math.sin`, `cos`,
`exp` or `pow` to be bit-identical across engines, and the probe's `H(x,z)` was
built almost entirely from them. The answer was not to quantize around the
problem but to avoid it: terrain is **value noise from an integer hash**, so
generation uses only integer ops, multiplication, addition and `Math.sqrt` —
and IEEE-754 requires `sqrt` and `round` to be correctly rounded, so both are
portable. Heights are quantized to 1/1024 m as well, so a future accidental
transcendental cannot move a vertex.

The same discipline applies to `src/core/vec.ts` and the track model: arithmetic
and `sqrt` only, no trig.

The one licensed exception is **derived, read-only display values** — the pitch
and roll in `snapshot.ts` use `asin`/`atan2`. That is safe precisely because
nothing reads them back into the simulation. The ban is on transcendentals that
close a loop, not on arithmetic that leaves one.

## 3. One-directional snapshot boundary

The sim is **imperative, fixed-step, ~60 Hz**. The UI is **reactive,
event-driven, and reads a snapshot at ~10 Hz**.

State crosses that boundary in exactly one direction, through an explicit
snapshot. Commands cross back as discrete, queued inputs — never as shared
mutable state.

**A recording has two channels, and only one may reach the machine.**
`commands` is what reached it — the levers and the rack — and reproduces the run
exactly. `attention` is what the operator saw, heard and did about it: the horn,
the acknowledgement, the mushroom latch, the cabinet, the view they watched from,
where their head was, where they put their instruments. The rig reviews the
second and the physics must never notice it.

Half of that is structural — `createPlayback` takes `readonly Command[]` and is
never handed the other side, so a headless replay *cannot* read it. What types
cannot say is that the recording put each thing on the right side, so the check
is a scan: **the sim, the rack and the modules may read exactly three fields off
the hands** — `leverL`, `leverR`, `seated`. A fourth is a decision about what a
recording *is*, and it has to be made in `control/trace.ts` first.

The line between the channels is `doc/MEMORY.md` § 11's: a manufacturer's kit is
recorded, the training system's own furniture is not. The camera is the one
stated exception — it is the rig's, but chase takes away the levers, the pods and
the dash, and `cab/cockpit.md` already said stepping out to use it "is a thing
the rig can record".

**That last clause was aspirational until L-032.** There was no queue and no
tick: `Controls` mutated a module inside the pointer event's own turn, and it
was not even the only writer — `Rack.svelte` spliced the live rail and assigned
`module.verb`, the E-stop wrote every module's field, and the two commands the
rack is actually *about*, reorder and verb, could not be expressed through the
channel at all. A command is a `RackCommand` now, `applyRack` is the one writer,
and the frame applies it at a tick and writes it down (`control/trace.ts`). The
cost of it having been false: the ledger could price what you broke and never
say what was driving.

Concretely:

- **Instruments never subscribe to live sim state.** They read the latest
  snapshot. An instrument is a *view of a recording*, which is also why the same
  instrument code can drive a replay. **A run now literally is one**: a `Setup`
  and a trace of what the operator did, replayed through the same
  `platform/frame.ts` the game advances (`control/trace.ts`,
  `platform/replay.ts`).
- **Svelte never owns the canvas.** Svelte owns DOM UI. A plain TypeScript
  module owns the renderer, the scene graph and the loop.
- **Do not use Threlte** (or any reactive scene-graph wrapper). It inverts
  control so the scene graph becomes reactive, which fights a fixed-step
  imperative loop and quietly reintroduces per-frame reactivity cost.
- **What runs outside the reactive graph reads `hands`, never a rune.** The loop
  is a `requestAnimationFrame` callback, the rack runs inside it, and the pointer
  handlers are bound to a canvas — none of them is a reactive scope, so reading a
  rune from one is an untracked read that returns the right value and promises
  nothing. Everything the cab owes them crosses through one object written by one
  effect: `src/control/hands.ts`. It is the continuous twin of `Controls`, which
  is how a discrete command crosses the other way.

Why: Svelte 5's runes are cheap but not free, and a 30-DOF machine with a full
instrument panel updating reactively at 60 Hz on a phone is exactly the shape of
problem that kills mobile frame budgets. The boundary also happens to be the
same seam a worker would sit on, so rules 1 and 3 reinforce each other.

**Check:** grep — no `three` import under `src/ui/` or `src/cockpit/`, no Svelte
import under `src/sim/`. And **one frame**: `world.step(` appears in exactly two
files under `src/`, which are different `world`s — `sim/world.ts`, where a step
*is*, and `platform/frame.ts`, where one is *driven*. That check replaced two
regexes comparing the game's loop with the bench's copy of it, which is the
weaker form of the same rule: two files agreeing about a literal is an
approximation of one file, and the copy had drifted before the regexes were
written (L-080). A part of a component takes its slot, its style and (a
pod) the snapshot, and nothing else — the contract is `src/cockpit/contract.ts`
and commands leave through `Controls`, never through a live module. The rune
rule is scanned rather than trusted — `tests/architecture.test.ts` reads the
pilot module, the loop's `tick` and the canvas drag handler, and fails on any
rune read that is not an assignment.
