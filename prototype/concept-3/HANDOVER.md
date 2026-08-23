# Type 7B — Labor Simulator

**Handover brief.** Accompanies `labor-sim-concept.html`, a single-file feasibility
prototype. Read this first; the prototype is evidence, not specification.

---

## 1. The pitch

A browser-based mecha simulator in the spirit of Kerbal Space Program, with
Patlabor's premise: mechs are **industrial machines**, not characters. You spec a
Labor in a workshop, wire its control software, take a job, and discover on site
which of your assumptions was wrong. Cel-shaded, mobile-first, Vite / Svelte 5 /
Three.js / Rapier.

The thing being simulated is not combat and not locomotion. It is **the gap
between what a machine is rated to do and what it does on the day.**

---

## 2. Design thesis

KSP does not work because of parts or physics. It works because of a
**diagnosable failure loop**: you predict, it breaks, and the break is legible
enough to blame on one design decision. Everything below either serves that loop
or is decoration and should be cut.

Four load-bearing commitments:

### 2.1 The load chart is the Δv

KSP gives you one scalar that makes the workshop a real optimisation problem
before you ever fly. The industrial equivalent already exists: real cranes and
excavators publish payload as a function of reach and slew angle. The workshop
computes that envelope from geometry, mass, actuator torque and support polygon.
The site is where you find out the chart lied — soft ground, a slew that was too
fast, a footing you did not survey.

It yields four distinct, attributable failure modes: tipping, actuator stall,
hydraulic pressure ceiling, structural moment at the shoulder.

**The load chart is also the shared artifact that keeps build and OS from
drifting into separate fictions.** Build computes the envelope; the control
software *degrades* it — phase lag, saturation, authority conflicts eating
headroom. One number both modes move.

### 2.2 Arbitration is the game

A rocket has one control input. A Labor has ~30 DOF, and legged manipulation is
the hardest problem in robotics. The player cannot hand-fly it, and a hidden
black-box controller would make the workshop irrelevant — every failure gets
blamed on "the AI".

So: **the controller is something the player specs, and controller/body mismatch
is the bug.** This is Patlabor's actual plot (a Labor OS defect), and it is the
decision that determines whether this is a game or a ragdoll toy.

Components are not a feature list. Every one is *a loop that holds one invariant
in one frame so the pilot does not have to*:

| Component | Invariant | Frame |
|---|---|---|
| Stabiliser | attitude | body |
| Load compensation | CoM inside support polygon | ground |
| Target assistance | end-effector pose despite base motion | world |
| Autonav | path | map |

That generator gives the design axis (*which frame*), tells you what a component
costs (sensor dependency, latency, actuator authority), and tells you what is
**not** a component — anything that does not close a loop is a part and belongs
in build.

Two components will want the same actuator. Who wins is the whole game. Brooks'
subsumption architecture is the honest anchor: layers, higher suppresses lower.

### 2.3 The rack

Not a free-form node graph — miserable on a phone. A **vertical DIN rail**:
drag to reorder, position *is* priority. The affordance and the semantics are the
same object. Cap around 8 slots.

The pilot's own levers are a rack entry. Above autonav, you override it. Below
it, autonav suppresses you — you shove the lever and the machine keeps grinding
toward the pin. Same two components, one drag, two completely different machines.

**Attribution rule:** any time the machine ignores an input, the reason is on
screen before the player asks. Suppression that looks like a dead control is a
bug report, not a lesson. Standardised active / idle / overridden LEDs on the
rail, plus a readout naming which layer owns the actuator bus right now.

### 2.4 Panel budget and occlusion

Every instrument you install obscures your direct view. In the basic tracked
cage you sit behind two levers with a clear windscreen. In a high-tech Labor you
can barely see out — map, thermal, radar, advanced controls — powerful, and
blind when they fail.

This is the rare case where the UX constraint *is* the game constraint. Fixed
glass area; instruments declare their size. Adding autonav means giving up a
gauge you wanted. Real cabs are cramped for the same reason.

**Panels must be installed, not toggled.** If they can be tapped away, players
run naked-cage and peek at the map on demand, and the mechanic is gone. If field
stowing is allowed at all, it costs hands or seconds.

**Occlusion only bites if the pilot camera is the only camera.** The prototype
has an external chase view and it is strictly better than the cab whenever
panels are installed. Decide this deliberately — see §9.

---

## 3. Mechanics that fall out of the above

**Phantom Labor.** The antagonist attacks the sensor surface that capability
created — scrambling instruments, not armour. Difficulty curve and antagonist
become the same object: no separate balance pass, no bolted-on villain. It also
makes the machinery ladder **non-monotonic** — the two-lever tracked cage is the
one machine that cannot be scrambled, so the right answer to a hot site is
sometimes to bring the excavator. That is Patlabor's thesis, arrived at from
mechanics rather than script.

**Hot-patching, anchored on LOTO.** Lockout–tagout is a real procedure with a
real cost. Locking outputs parks the actuator and holds state: safe, inert,
behind schedule. Rewiring live gambles on transient authority handoff — get the
order wrong on a stabiliser and the Labor goes limp and falls. Prices field
repair without arbitrary fragility dice, exactly the trade a real field tech
makes. Gets more dangerous the more advanced the Labor.

**Job tickets, not sandbox.** KSP is called a sandbox but always answers one
question: did you make orbit. Without a verdict the failure loop has no third
beat. The ticket is the verdict — the load chart says you can, the site says
whether you did. **Refusing a contract costs less than failing it.** Then the
sandbox is real: you are not gated, you are *quoting*. Which machine, which
rack, which risk, for this ticket.

**Component curriculum.** Every rung-one component needs a named rung-two
successor visible on the shelf from day one and unaffordable. Waypoint-drives-
into-a-ditch is funny once; it is a *game* when the ditch sends you back to build
for a slope-aware variant and the load chart moves by a number you can read.
Curriculum and economy in the same object.

---

## 4. The machinery ladder

Not a difficulty ramp — one new invariant per rung. This is also the **risk
curve for physics** (§7).

1. **Tracked platform** — body-frame velocity. No new frame. Playable with zero
   OS-mode. Two levers, a cage, clear view.
2. **Excavator** — task-frame IK. Cartesian bucket control is real shipping tech
   (Komatsu IMC, Leica), so the fantasy is documentary.
3. **Forklift** — stability as a *constraint*, not a target. First time a loop
   tells the pilot no.
4. **Seam-following welding arm** — an external feature frame. First
   exteroceptive loop; the world moves your setpoint.
5. **Off-road hexapod** — contact scheduling. First discrete layer above the
   continuous ones.
6. **Bipedal walker** — an inner loop you are not permitted to remove.

Rungs 1–4 need no balance controller. Tipping is emergent from contacts alone.

---

## 5. What the prototype is

`labor-sim-concept.html` — single file, three.js r128 from CDN, no build step.
It exists to answer "can this look and feel right in a browser on a phone", and
it does. It is **concept art with working mechanisms**, not an architecture
sketch. Do not port its structure.

### Real

- **Analytic 2-bone IK.** Foot-in-hip-space is `v = (0, −L1 − L2·cos k, −L2·sin k)`
  for knee rotation `+k` about local X, so `|v|² = L1² + L2² + 2·L1·L2·cos k`
  gives the knee angle in closed form, and the hip is the minimal rotation
  taking `v̂` to the target direction (`setFromUnitVectors`). No solver, no
  iteration, no sign-tuning. Worth keeping.
- **Terrain-adaptive gait.** Stance feet are planted in world space and the body
  walks over them; swing feet retarget continuously against predicted body
  position at touchdown. Duty factor 0.62. **This footstep policy is the piece
  most worth carrying forward** — where to put the next foot is the hard part of
  any walking controller.
- **Analytic height field.** Feet and mesh sample the same `H(x,z)`, so contact
  is exact rather than raycast-approximate, and the site map bakes from it for
  free. Becomes the Rapier heightfield source.
- **Heel/toe articulation** driven by leg rake.
- **Hydraulic rams as two-point constraints**, re-solved per frame: barrel aims
  at anchor, rod scales to gap. The detail that reads *machine* rather than
  *character*. Cheap and high value.
- **Cel pipeline.** 4-step gradient ramp on `MeshToonMaterial`; fresnel rim
  injected via `onBeforeCompile` (guarded — skips if the varying is absent
  rather than throwing a black screen); inverted-hull ink shells with per-axis
  scaling so line weight stays constant on boxy parts.
- **Rack arbitration**, live: highest active command layer owns the bus, loser
  shows OVERRIDDEN, pilot lever greys out, banner names the owner. Swap
  PILOT/NAV to see the same two components produce two different machines.
- **Panel occlusion**, cab view, head-pan.

### Faked — be explicit about this

- **No physics.** No rigid bodies, no contact solver, no CoM integration. The
  gait is kinematic playback.
- **STAB-2 off** tilts the hull and reddens a *cosmetic* margin bar. It does not
  fall over. The honest gap between this and the real thing.
- Actuator load bars are a reach-saturation proxy, not torque.
- Foot contact is *scheduled by gait phase*, not measured. Under physics it
  becomes measured, which is what makes GND-ADPT failures diagnosable rather
  than decorative.

---

## 6. Defects found during the build, and what they cost

Recorded because three of the four were self-inflicted by keeping one fact in
two places, and the next agent will be tempted the same way.

1. **`renderer.setSize(w,h,false)`** — skipping the CSS size makes an
   absolutely-positioned canvas lay out at its *intrinsic* (drawing-buffer)
   size, so at DPR 2 you view the top-left quadrant of a correct render.
2. **`Object3D.add()` returns the parent, not the child.**
   `knee.add(at(cyl(...))).rotation.z = π/2` rotated the *joint group*. Both
   shins were splayed 90° permanently, and the per-frame `knee.rotation.x = k`
   never cleared it. Fix: **write the full triple** — `rotation.set(k,0,0)` —
   so the hinge constraint is explicit in the code rather than assumed.
3. **Rig datum.** The model origin is at the soles with hips at `+HIPY`, so
   `root.y = hipHeight` floated the machine 4.4 m and saturated both legs.
4. **Rotation pivot.** After (3), `pelvis.rotation` pivoted the hull about the
   *sole plane* 4.4 m below the hips — a 14° pitch translated the hip axle over
   a metre horizontally, the legs chased the feet, and it read as a heavy
   backward lean. Fixed by setting `pelvis.position = P − R·P`.
5. **Support height from `sole.y`** fed the swing leg's lift back into hull
   height; the machine hoisted itself every step. Support must come from the
   *ground* under each foot.
6. **Two sources of truth for heading** — `body.yaw` for the feet,
   `root.rotation.y` for the hull. Deleted the duplicate: feet now read the
   root's world quaternion.

Bugs 3 and 4 were coupled: fixing one exposed the other. Expect that again.

**Method note.** Several rounds were spent diagnosing from screenshots, which is
a bad method and produced two wrong hypotheses. Adding a telemetry line (pitch,
roll, hip height, per-leg rake, speed) settled it immediately. **Instrument
early.**

---

## 7. Migration to physics

Rapier (wasm) — motorized joints, joint limits, and determinism you can replay a
failure with, which is the whole point. It wants a real bundler; the single-file
artifact is not the target.

**What inverts:** right now the gait *is* the truth. Under physics it becomes a
reference trajectory and you need something that tracks it without falling. That
is a different problem, not a port.

Three tiers, with honest costs:

- **Bodies + motorized joints** (~14 rigid bodies, revolute joints with limits,
  `configureMotorPosition`): **3–5 days.** Yields a ragdoll that falls
  immediately and never stands. Feels like progress; is not.
- **Virtual-crane tier** — full dynamics plus an external stabilising wrench on
  the hull with a finite authority budget: **2–4 weeks.** Walks, tips when
  overloaded, staggers on grade.
- **Honest tier** — capture-point / DCM footstep replanning plus a QP whole-body
  controller: **months**, genuinely research-grade.

**Recommendation: the middle tier is not a compromise, it is the design.** That
external wrench *is* STAB-2. Give it a torque ceiling and a bandwidth, and
switching it off does not fake a fall — it removes the thing that was holding
you up. Load compensation becomes a real CoM constraint. The margin bar starts
reading an actual number. Mechanic and physics from the same object.

**Sequence the ladder, not the biped.** Rungs 1–4 need no balance controller at
all. Starting with the biped (as the prototype did) is the worst entry point for
physics and the best one for concept art.

---

## 8. Stack

Vite, Svelte 5, Vitest, Three.js, Rapier (wasm). Mobile-first; touch is the
primary input, not a fallback. Single-file HTML output is a proven pattern in
this codebase family, but not for the Rapier build.

Prototype-specific notes that will not survive the port: three.js r128 has no
`OrbitControls` in the CDN bundle, `MeshToonMaterial` ignores `flatShading`
(split vertices with `toNonIndexed()` instead), and cdnjs publishes that era
under the `rNNN` tag, not `0.128.0`.

---

## 9. Open decisions

1. **Does an external chase camera exist in the shipped game?** Occlusion is a
   core mechanic and the chase view defeats it. Cab-only is coherent but harsh
   on mobile. Unresolved, and it is upstream of a lot of UI.
2. **Field stowing of panels** — allowed at cost, or not at all?
3. **Gain tuning is a trap.** Tedious, and it lets players brute-force past the
   interesting choice. Make topology, priority and sensor selection the game;
   expose gains as one slider with a visible margin readout.
4. **Three modes is a stall risk.** KSP has two, and flight teaches the VAB. The
   current answer — OS-mode is *inside* build but wears the sim's pilot viewport,
   and components ship their own instruments so the cockpit is derived rather
   than authored — collapses this to two. Every chassis must ship with stock
   wiring that works. OS-mode is tuning, never a gate.
5. **What the procedural generator generates.** Landscape is scenery. **Job
   sites** — footing, clearances, load, an unsurveyed obstruction — are the
   puzzle, and the thing that makes a load chart insufficient.

---

## 10. Acceptance test for the next milestone

Two components fighting over one actuator should be reachable **within ten
minutes of a first session**, on the tracked platform, and attributable from a
replay. If that scenario cannot be constructed on rung one, the rack is
decoration.
