# LOG archive — 2026, the scaffolding and rung 1

Cut from `LOG.md` each time it reaches its 1000-line gate. Newest first, as in
the live log. Two cuts so far:

1. Everything up to and including the round that settled the stack — the
   architecture rules, the diegetic frame, and the prototype handover.
2. The rounds that got the machine driving and shipped: rung 1 on two levers,
   the toolchain, and the first deploy to Pages.
3. The rest of that shipping era — the steering fix, the machine's first face,
   and the Pages workflow itself.
4. The cel pipeline and the first site worth driving through.
5. The round that made the rack a pipeline and gave NAV-1 the wheel.

The gate says to cut the oldest *year*, but there has only been one year so far,
so the cut is by era instead.

---

## 2026-08-23 — the rack is a pipeline, and NAV-1 drives

Cards: closed [L-007] [L-017] · [L-015] retargeted · arbitration model replaced

**The rack stopped being a priority stack and became a pipeline**, on a
proposal that turned out to be strictly better than what was settled. Each
module takes the signal from the module above, folds in its own intent by its
**verb**, and passes it down to an actuator terminal at the bottom of the rail.

That reframing dissolved three open questions in one move. Per-actuator
granularity stops needing a mechanism — a module transforms what it cares about
and passes the rest through. Suppress-versus-inhibit stops needing two entry
kinds — rung 3's forklift constraint is just `clamp(input, envelope)`, an
ordinary stage. And suppression itself survives as the verb `SET`, so nothing
built was lost. Three problems, one model: usually the sign you have found the
right shape rather than a cleverer one.

Verbs are **SET, CAP, ADD, AMP**, and the three-letter rule is the good part.
It makes a fifth verb typographically awkward on purpose — a complexity budget
that enforces itself, aimed squarely at the node-graph-by-accretion danger. The
verb is a property of the module and switchable on it; every module also has a
disable toggle, and **a disabled module is a pass-through, not a hole**.

`CAP` produced a mechanic nobody designed: a lever at rest caps to zero, so
parking the levers above a CAP module stops the machine whatever is driving it.
A dead-man's throttle, falling out of the verb rather than being a special case.
Pinned by a test.

**NAV-1 exists** and considers bearing and distance to the pin and nothing
else — the honesty is the design, not a limitation. Its heading error comes
from a dot and a cross product rather than `atan2`, because a transcendental
there would close a loop straight back into sim state; rule 2 doing real work
rather than being decoration. The sign was derived and pinned by tests before
running it, having shipped a mirrored control once already.

**Attribution had to be rethought and came out better.** Under a pipeline there
is no owner to name — everyone shaped the signal — so instead of a banner
naming a winner, the chain is shown stage by stage down to the terminal:
`PILOT [SET] +2.20/+2.20 ↓ NAV-1 [CAP] +1.79/+2.20 ↓ TERMINAL`. That is the
multi-layer inspectability pillar landing where it counts, and it reads the
same live or in replay.

Built the rail as a working panel rather than the full DIN-rail treatment:
order, verb and enable all functional, reordering by arrows rather than drag.
L-015 is retargeted to the drag-and-styling work, which is worth designing once
there is more than one thing to drag. Each slot carries its module's
one-sentence statement of what it considers, which turned out to be the most
valuable thing on it.

Grounding note, since the question was asked before building: what the rack was
*needed* for was never the rail — it was the second module. A rack with one
entry is furniture. Building NAV first was right, and it immediately paid: the
props and terrain added last session became the things a blind autopilot drives
into.

## 2026-08-23 — cel pipeline, a site worth driving through

Cards: closed [L-024] · [L-023] narrowed · history trimmed to its gate

Ported the probe's cel pipeline as mechanism rather than structure: a stepped
gradient ramp on MeshToonMaterial, a fresnel rim injected via `onBeforeCompile`
— **kept guarded**, so a future three.js dropping the varying renders without a
rim instead of a black screen — and inverted-hull ink shells scaled **per axis**
from each geometry's own bounds, so a thin plate and a chunky block get the same
apparent line weight. Added a banded gradient sky dome; anime skies are flat
washes with visible steps, and the same quantize-and-blend trick as the cel ramp
does it.

The ink immediately broke the cab view to solid black, which was instructive.
Ink shells are BackSide, and the operator's eye sits *inside* the cab box — so
where backface culling used to hide the cab for free, the shell's interior
became an opaque wall. Fixed with a dedicated layer the cab camera disables,
which reproduces exactly what culling did and keeps ink lines everywhere else.
Worth remembering as a general hazard: inverted-hull outlining and interior
cameras do not mix without a plan.

**Site furniture went in as world data, not decoration** — cones, marker poles,
pipe stacks, barriers and rock outcrops in `src/world/props.ts`, deterministic
from the seed, with real static colliders in the sim. That placement was
deliberate: a cone painted on by the renderer could never become
`site fixture (cone) damaged −¥400`, and the ledger is the point. They cluster
into work areas rather than scattering evenly, because a site reads as *worked*
when things gather and as litter when they do not. Rocks are the exception —
they are landscape, so they stay scattered.

**Recorded a play-session direction as `docs/design/missions.md`, marked
exploratory and explicitly not v0**: Zachtronics-style budgeting, scored on
budget, time and complexity, where complexity trades parts and weight against
operator interaction.

Two things in it are worth more than the missions themselves. It **inverts the
chase camera** — settled as a cost, it becomes a reward, because a solution good
enough to run itself is one you can watch, and the same button then means both
"I gave up control" and "I no longer need it" depending on what you built. And
it makes **determinism the scoring substrate** rather than only an attribution
tool: an autopilot mission can demand the same configuration verified across
different seeded sites.

The striking part is that none of it asks v0 to change. The rack is the
complexity axis, the damage ledger is a budget line, determinism is the
verifier, seeded sites are one integer apart. That convergence is the best
evidence so far that the v0 scope was drawn in the right place. The open core
is the metric: **what counts as operator interaction** is undefined, and it is
load-bearing.

## 2026-08-23 — mirrored steering, and giving the machine a face

Reported from the live build: steering went the wrong way, and — the more
useful half of the report — it was impossible to say *which* thing was
mirrored, left/right or forward/back, because the hull is a symmetric box with
no moving parts.

**The bug was real and derivable rather than guessable.** Forward is +Z and up
is +Y, and in a right-handed frame `forward = up × right`, which gives right =
−X and left = +X. Check against three.js if that looks wrong: a camera's
forward is −Z, up +Y, right +X, and `(0,1,0) × (1,0,0) = (0,0,−1)` ✓. The code
placed `offsets.left` at −GAUGE/2, i.e. on the machine's *right* side, so the
left lever drove the right track. The sides are now named constants `LEFT_X`
and `RIGHT_X` in `core/spec.ts`, used by the sim and the renderer alike, with
the derivation written above them.

Also corrected a latent misnomer: the `right` vector in the track model came
from `cross(normal, forward)`, which points **left**. It caused no bug because
lateral damping is symmetric in that axis, but a wrongly-named axis in a file
full of cross products is a trap. It is `cross(forward, normal)` now.

**The existing tests could not have caught this.** They asserted that yaw
*changed*, never which way. Four direction tests now pin it, and I verified
they actually bite by reintroducing the bug: three fail with it, all pass
without. A test that passes either way is worthless.

The second half of the report was the more interesting one, so the machine got
**sprockets and idlers** — a large drive sprocket at the rear, small idler at
the front, spinning at commanded track speed. They do three jobs at once: they
make the facing unmistakable, they make left and right visibly independent so
this class of bug can never be silent again, and they turn **slip into
something you can see** — a track spinning under a stationary machine, rather
than a number you have to read. That last one is the inspectability pillar
getting a free win. Spin integrates from snapshot time, not wall time, so a
replay turns them exactly as the live run did.

Headlamps and a bumper at the nose finish the job: the front now reads at any
angle, which a painted stripe would not.

Housekeeping: MEMORY had drifted to 307 against its 300 gate — I called the
gates clear in an earlier session when they were not. The stack section's
rejected-options block spilled to `docs/design/stack.md`.

## 2026-08-23 — playable from GitHub Pages

Cards: closed [L-030]

The machine is now one tap away at https://yggi.github.io/laborsim/, which
matters more than it sounds: mobile-first is a hard pillar and the cockpit
cannot be judged honestly on a desktop. Being able to open it on an actual
phone closes the loop between deciding a control feels right and finding out.

Deploy runs on every push to the default branch, but **gated on lint, typecheck
and the full test suite** — a broken machine cannot reach the site. The repo is
public, so Pages costs nothing, and the workflow provisions the site itself via
`configure-pages` with `enablement: true` rather than needing someone to click
through Settings.

The base path is taken from the Pages config rather than hardcoded, because a
project site serves from `/<repo>/` and a rename would otherwise 404 every
asset silently. Verified by building with the base set, serving the output from
a real subdirectory, and driving the machine in a browser there: no 404s, no
console errors, telemetry live.

Caught one bug before it shipped: the workflow used `$default-branch`, which is
a placeholder GitHub only substitutes in starter templates. In a real workflow
file it is a literal string that matches nothing. The `claude/**` pattern covers
the current default branch anyway, and `main` is there for later.

No COOP/COEP headers are needed, which is worth recording as a dividend of the
stack choice: Rapier runs single-threaded so nothing wants SharedArrayBuffer,
and plain static hosting is enough. Godot's web export would have needed
cross-origin isolation configured.

## 2026-08-23 — L-014: rung 1 drives

Cards: closed [L-014] [L-016] · absorbed [L-022]

The tracked platform exists and you can drive it on a phone. Four decisions
came in first: two independent track levers (tank steering, two thumbs — with
throttle-and-steer demoted to a rung-two *upgrade*, which is the component
curriculum working); levers that do not self-centre, grabbing on touch and
staying where dropped, with a dead zone that snaps to a clear HALT; cab view as
the primary sim view; and no blade, on the grounds that a tank can do plenty of
damage to a construction site without one.

**The track model is ours, and that is the design.** Rapier has no anisotropic
collider friction and its vehicle controller models wheels with suspension, so
neither shortcut applies — verified rather than assumed. Hull and track
colliders carry friction 0, Rapier supplies normal support and collisions only,
and six ray samples per track apply impulses capped at `mu · N · dt`. A black
box producing correct-looking motion would have been a layer the player cannot
open, which principle 5 forbids outright.

One tuned constant, `MU = 0.95`. Everything else is a dimension or a mass, and
the behaviour falls out rather than being scripted. The climb limit measured at
`atan(MU)` ≈ 43.5°: it climbs 42° at 95% grip and fails past that. Push it to
50° and it grinds partway up, rears to −72°, loses contact, **flips over
backwards and slides to the bottom.** There is no tipping logic anywhere. That
is the "fail stupidly, but predictably" pillar arriving for free, and it is now
pinned by tests so a model change has to be deliberate.

Profiling caught what the green tests did not. The first grade probe reported
zero climb at every angle — the ramp started 30 m away and the machine covers
11 m in five seconds, so it never reached it. Worth remembering: 10 passing
tests said the machine was fine, and it *was* fine; the probe was wrong. Look
at the numbers, not only at the ticks.

Verified Rapier's heightfield indexing empirically instead of guessing: the
slow-varying index is X and the fast one is Z, which is the opposite of what
the generator assumed. Both the collider and the terrain mesh are built from
that one verified fact.

**The transcendental thread is closed, by avoiding the problem rather than
managing it.** Terrain is value noise from an integer hash — integer ops,
multiply, add and `Math.sqrt`, which IEEE-754 requires to be correctly rounded.
Heights are quantized to 1/1024 m as belt and braces. One licensed exception is
recorded: pitch and roll for display use `asin`/`atan2`, and that is safe
precisely because nothing reads them back into the sim. The ban is on
transcendentals that close a loop.

The actuator bus went in from the first commit even though only the levers
write to it, because the acceptance test needs two components fighting over one
actuator *on rung 1*. It already reports its owner and who it suppressed, and a
test drives NAV over PILOT to prove it.

The chase camera cost almost nothing to implement, which is a good sign about
the decision: hiding the levers *is* "hands off the wheel". The bus keeps
carrying whatever the levers were last set to and the machine keeps doing it.
No pause, no auto-stop, no special case in the sim at all.

Two smaller things found by looking at real screenshots rather than trusting
the build: the operator's eye was inside the hull box, so the cab view showed
none of the machine — moved into the cab so the hood is visible as a reference;
and the windscreen was an opaque box 0.47 m from the eye, i.e. a cyan wall, now
actual transparent glass.

## 2026-08-23 — L-013: toolchain up, architecture rules made executable

Cards: closed [L-013]

Scaffold stands: TypeScript, Vite 8, Svelte 5, Vitest 4, Biome, Three 0.185,
Rapier 0.20 deterministic-compat. `dev`, `build`, `test`, `typecheck` and `lint`
are all green, and the commands are in `README.md`.

The part worth recording is that **the three architecture rules are now
executable rather than aspirational.** `tests/architecture.test.ts` reads the
source tree and fails the build on a violation: no renderer import under
`src/sim`, `src/control`, `src/modules` or `src/core`; no DOM access in sim
code; no `Math.random` anywhere in `src`; no renderer or physics import under
`src/ui`; no reactive scene-graph wrapper in dependencies. Breaking a rule now
has to be a deliberate act that edits `docs/design/architecture-rules.md` first.

That test caught itself on the first run — `rng.ts` has to name `Math.random` in
order to forbid it, and the scan flagged its own doc comment. Fixed by stripping
comments before scanning, which is the right answer anyway: the rules are about
code, not prose.

`tests/determinism.test.ts` proves the other half: 15 tests, the sim stepping in
plain Node with `document` undefined, and identical `takeSnapshot()` fingerprints
across two separate runs of 180 steps. Replay determinism is now a standing test
rather than a claim, which was the point of choosing the deterministic build.
A deliberate counter-test asserts that different run lengths *do* diverge, so a
constant fingerprint cannot make the suite pass while proving nothing.

Corrected a documentation error carried in from the Rapier docs: the JS API is
`world.takeSnapshot()`, not `createSnapshot()`. Fixed in `MEMORY.md`, `BOARD.md`
and `architecture-rules.md`. Found by probing the actual API rather than
trusting the prose — worth repeating for anything load-bearing.

Two smaller decisions. Biome excludes `prototype/` so the frozen probe is never
reformatted, and disables the unused-import rules for `.svelte` files because
Biome parses only the `<script>` block and cannot see template usage —
`svelte-check` covers that properly. The dev server binds to `0.0.0.0` so the
cockpit can be opened on a real phone from day one.

New thread on first-load weight: the *empty* scaffold is already 3.44 MB raw /
1.25 MB gzipped, with Three and Rapier roughly comparable and the `-compat`
flavour inlining wasm as base64 at about a third overhead. Mobile-first is a
hard pillar, so a first-load budget should be set before the bundle grows enough
to make the choice for us.

## 2026-08-23 — tone crystallized, chase view is hands-off-the-wheel

Cards: [L-029] reshaped

A sixth guiding principle went into `CLAUDE.md`, which is a rare thing to add:
**you are an operator, not a demigod.** The fantasy is not an invincible war
mecha; it is a humble, unstable, hard-to-operate contraption you are trying not
to break everything with. Retrofuturistic forklift-operator training, not power.
It earns principle status because it *decides arguments* — if a change makes the
machine feel heroic rather than awkward, it is working against the game, and
that is now a check anyone can apply without asking.

`docs/design/tone.md` carries the detail, including a working-with / working-
against table for proposals, because this is the kind of decision that erodes
quietly rather than being overturned.

**The damage counter was promoted to the damage ledger** and reclassified: it is
the game's *core feedback mechanism*, not a verdict it happens to also provide.
Itemised, named, Yen-priced, never aggregated — `citizen asset (scooter)
damaged −¥3,000`. Delivered in a condescending institutional voice: the rig is
not angry, it is disappointed, patiently, and writing it down. Harming a citizen
stays categorical failure and never gets a price.

The voice turns out to do structural work rather than just being funny. The same
speaker that reports `citizen asset (scooter) damaged −¥3,000` can report
`NAV-1 retained bus authority; pilot input suppressed` without changing gear —
so the attribution rule and the comedy come out of one mouth, and the training
frame licenses both.

**Chase view resolved to "hands off the wheel"**, which is stronger than the
stop-and-survey reading I had been leaning toward. It is not a pause and not an
auto-stop: the sim keeps stepping and the machine keeps doing whatever it was
last told. Leave the throttle locked open and go sightseeing, and the ledger
will explain the consequences afterwards. Last chase-camera thread closed; only
panel field-stowing survives from that cluster.

## 2026-08-23 — stack settled, architecture rules anchored

Cards: none closed · [L-013] fully specified

Stack confirmed and closed to further debate: **TypeScript · Vite · Svelte 5 ·
Vitest · Biome · Three.js · Rapier**, on `@dimforge/rapier3d-deterministic` so
replay determinism is a test rather than an aspiration. Godot, Babylon and Jolt
are recorded in `MEMORY.md` § 9 as rejected *with reasons*, so they are not
relitigated later — Godot's web export cannot run C# at all and is
Compatibility-renderer only; Babylon's switching cost lands exactly on the
already-proven cel pipeline; Jolt's tracked-vehicle controller is an
anti-feature here, because differential drive with friction *is* the teaching
layer and we write that one.

**Mobile-first is now fixed with a stated mechanical reason**, not a preference:
viewport budgeting turns out to be a core mechanism, which couples it deeply to
touch — direct manipulation, thumb reach, occlusion by your own hand, no hover,
no pixel precision. A desktop-first cockpit would be a different mechanic
wearing the same name. Recorded as upstream of stack, layout and control design.

**Chase camera resolved**, and it resolved in the same shape as everything else
in this design: available, but it costs you something real. While it is up you
see no cockpit and have no vehicle control — an observation mode, so it can
never be strictly better than the cab. Specific contexts may disable it as a
challenge condition. The last chase-camera thread closed; only panel field-
stowing survives from that cluster.

**The three architecture rules are anchored** in `docs/design/architecture-rules.md`
and cited from `MEMORY.md` § 12: the sim runs headless, fixed timestep with a
seeded PRNG and no `Math.random` sim-visible, and a one-directional snapshot
boundary (instruments read snapshots, Svelte never owns the canvas, no Threlte).
Each is written with the pillar it serves and a mechanical check, so none can
quietly rot. Breaking one now requires editing that file first, out loud.

MEMORY hit 292/300 taking this on. Spilled two sections rather than waiting for
the gate to force it: the cockpit material to `docs/design/cockpit.md` and the
downstream mechanics to `docs/design/mechanics.md`. Six spill files now.

## 2026-08-23 — diegetic frame, cockpit resolved, damage counter

Cards: closed [L-020] · added [L-029]

Three orientations landed, one of which reframes the project.

**The whole thing is, in-universe, a Labor design, operation and safety training
system** — the player uses the rig that teaches Labor operators, tonally
anchored on the *Patlabor 2* opening. Recorded as `MEMORY.md` § 1.1 because it
is not flavour: it licenses inspectability without breaking fiction (an open sim
layer is the rig's instrumentation, not a debug overlay), makes replay native,
makes failure affordable, makes sandbox the default mode, makes procedural sites
the point rather than a shortcut, and sets the UI register. Several problems that
looked like they needed machinery are now answered by the frame instead. Check it
before inventing more.

**Cockpit resolved to the middle ground** (L-020): components ship instruments,
those instruments are *mandatory*, and the player *places* them in the viewport.
This takes the best of both prior positions — the empty-cockpit failure state
that motivated "derived" becomes unreachable, while placement stays authored so
the DIN rail keeps a job. The consequence worth noting: the rack and the cockpit
collapse into one decision, and capability now literally costs sight. A component
can be refused for want of glass.

**No job tickets in v0. A damage counter is the verdict instead** — running cost
for expensive things you break, with harming a citizen as categorical failure
rather than a big number. Environment is the difficulty axis: a quarry is
simpler than a city. This supplies the failure loop's missing third beat at a
fraction of a ticket economy's cost, and it fits the training frame exactly.
Two threads closed on this; the attribution rule was carried over to it — a
counter that says what you broke without why is a score, and scores do not teach.

Stack discussion opened. Verified two facts rather than asserting them:
Godot 4's web export cannot run C# at all (the .NET runtime does not work in the
browser sandbox) and is Compatibility-renderer only, which makes GDScript the
only web-viable language on the platform where this project has to ship.
Rapier's `-deterministic` wasm build is bit-level cross-platform and
`world.createSnapshot()` hashes identically across machines — better than
assumed, and it turns replay determinism into a test we can write on day one.

That last finding exposed a new problem, now a thread: **JS transcendentals are
not bit-portable across engines**, and the probe's `H(x,z)` is built almost
entirely from `Math.sin`/`exp`/`pow`. Rapier's guarantee does not cover our own
code. Must be decided before the height field is ported, because it determines
whether terrain is code or an asset.

## 2026-08-23 — concept-3 prototype and handover folded in

Cards: closed [L-001] [L-002] [L-003 partial] [L-004] [L-005]

Took delivery of the feasibility prototype (`labor-sim-concept.html`) and its
handover brief. Froze both at `prototype/concept-3/`, verbatim and unedited,
with `prototype/README.md` stating the rule: port named mechanisms, never the
structure, and never patch a probe — write a new one.

MEMORY.md blew its 300-line gate on the way in, as expected. Spilled five
sections to `docs/design/`: `arbitration.md`, `load-chart.md`,
`machinery-ladder.md`, `physics-migration.md`, `prototype-findings.md`. The
index in MEMORY carries the one-liners. First real exercise of the gate; it
worked as designed.

Closed the stack card: Vite · Svelte 5 · Vitest · Three.js · Rapier (wasm),
mobile-first, touch primary. Rapier came from the handover rather than the
brief, so it is recorded with a caveat rather than as settled.

Four of the seven open threads closed against the handover. The control
hierarchy is a **linear priority stack with subsumption semantics** — not a
tree, not a graph; position on the rail *is* priority, cap ~8 slots. Legible
failure resolves to the **attribution rule** plus deterministic replay. The
hazard equalizer is attack-shaped: the Phantom Labor scrambles the sensor
surface that capability created. The minimum machine is the **tracked
platform**, rung 1 of the ladder.

Reversed a prior assumption: **sequence the ladder, not the biped.** The walker
is rung 6, and the acceptance test — two components fighting over one actuator,
within ten minutes, attributable from a replay — is specified on rung 1. The
probe started at the biped, correctly, because it was buying a look; production
must not repeat that. The board was rebuilt around this and now runs
scaffold → tracked platform → telemetry → rack → attribution → acceptance test.

Three conflicts recorded rather than resolved, because they are not mine to
settle. The largest: the brief's **authored** cockpit (player places widgets)
against the handover's **derived** cockpit (components ship instruments,
OS-mode collapses into build). Both keep the DIN rail; they disagree on what
gets dragged onto it, and it is upstream of a whole mode — so it got its own
decision card. Also open: whether v0 needs the job ticket as the failure loop's
third beat despite missions being deferred, and whether Rapier is confirmed.

Kept from the handover as a working method, not just a note: **instrument
early.** Rounds were lost on that prototype diagnosing from screenshots; a
telemetry line settled it immediately. Telemetry is now a card of its own,
scheduled before the rack rather than after the first bug.

## 2026-08-23 — repo initialized

Cards: none (pre-board)

Set up `laborsim` as an empty core structure: directory skeleton under `src/`,
plus `assets/`, `docs/`, `tests/`. No stack, tooling or renderer chosen — that
is deliberate and is card [L-001].

Established the four memory surfaces and their size gates: `CLAUDE.md` as the
agent entrypoint, `MEMORY.md` for durable truth, `NOTES.md` for open threads,
`BOARD.md` for tasks, this file for history.

Wrote down the design vision as given: Patlabor-themed mecha/vehicle sandbox,
KSP-inspired build/sim loop, multi-layer educational physics. Captured the five
guiding principles (predictable stupid failure, complexity-as-trade, control
contention, cockpit-as-bridge, inspectability) in `CLAUDE.md`, and the
supporting detail — `autonav`, the dozer/walker pair, the DIN-rail edit cockpit
— in `MEMORY.md`.

Seven questions surfaced while writing this down and were left open in
`NOTES.md` rather than answered: the meaning of "multi-layer", where
inspectability surfaces, the shape of the control hierarchy, whether legible
failure needs recorded causality, how blunt the hazard equalizer is, what the
minimum machine that proves the loop is, and what browser scale costs.
