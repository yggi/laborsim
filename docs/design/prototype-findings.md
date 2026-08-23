# Prototype findings — `concept-3`

What the feasibility probe proved, what it faked, and what it cost to build.
Source: `prototype/concept-3/HANDOVER.md` § 5–6, § 8.

The probe answered one question — *can this look and feel right in a browser, on
a phone?* — and the answer was yes. It is **concept art with working
mechanisms**, not an architecture sketch. Do not port its structure.

---

## Worth carrying forward

Ranked by value, not by order of appearance.

1. **The footstep policy.** Stance feet are planted in world space and the body
   walks over them; swing feet retarget continuously against *predicted* body
   position at touchdown. Duty factor 0.62. **Where to put the next foot is the
   hard part of any walking controller** — this is the single most valuable
   piece in the probe.

2. **Analytic 2-bone IK.** Foot-in-hip-space is
   `v = (0, −L1 − L2·cos k, −L2·sin k)` for knee rotation `+k` about local X, so
   `|v|² = L1² + L2² + 2·L1·L2·cos k` gives the knee angle in closed form, and
   the hip is the minimal rotation taking `v̂` to the target direction
   (`setFromUnitVectors`). No solver, no iteration, no sign-tuning.

3. **Analytic height field.** Feet and mesh sample the same `H(x,z)`, so contact
   is exact rather than raycast-approximate, and the site map bakes from it for
   free. Becomes the Rapier heightfield source.

4. **Hydraulic rams as two-point constraints**, re-solved per frame: barrel aims
   at anchor, rod scales to gap. The detail that reads *machine* rather than
   *character*. Cheap, high value.

5. **Cel pipeline.** 4-step gradient ramp on `MeshToonMaterial`; fresnel rim
   injected via `onBeforeCompile`, **guarded** — it skips if the varying is
   absent rather than throwing a black screen; inverted-hull ink shells with
   per-axis scaling so line weight stays constant on boxy parts.

6. **Rack arbitration**, live and legible: highest active command layer owns the
   bus, loser shows OVERRIDDEN, pilot lever greys out, banner names the owner.

7. **Heel/toe articulation** driven by leg rake.

8. **Panel occlusion**, cab view, head-pan.

## Faked — be explicit about this

- **No physics.** No rigid bodies, no contact solver, no CoM integration. The
  gait is kinematic playback.
- **STAB-2 off** tilts the hull and reddens a *cosmetic* margin bar. It does not
  fall over. This is the honest gap between the probe and the real thing.
- **Actuator load bars** are a reach-saturation proxy, not torque.
- **Foot contact is scheduled by gait phase, not measured.** Under physics it
  becomes measured — which is what makes GND-ADPT failures diagnosable rather
  than decorative.

## Defects found during the build

Recorded because **three of the four were self-inflicted by keeping one fact in
two places**, and the next agent will be tempted the same way.

1. **`renderer.setSize(w,h,false)`** — skipping the CSS size makes an
   absolutely-positioned canvas lay out at its *intrinsic* (drawing-buffer)
   size, so at DPR 2 you view the top-left quadrant of a correct render.
2. **`Object3D.add()` returns the parent, not the child.**
   `knee.add(at(cyl(...))).rotation.z = π/2` rotated the *joint group*. Both
   shins were splayed 90° permanently, and the per-frame `knee.rotation.x = k`
   never cleared it. Fix: **write the full triple** — `rotation.set(k,0,0)` — so
   the hinge constraint is explicit in the code rather than assumed.
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

Bugs 3 and 4 were **coupled**: fixing one exposed the other. Expect that again.

## Method note — instrument early

Several rounds were spent diagnosing from screenshots. That is a bad method and
it produced two wrong hypotheses. Adding a telemetry line — pitch, roll, hip
height, per-leg rake, speed — settled it immediately.

This is the "educational means inspectable" pillar pointed at ourselves: the
readout the player needs to diagnose a failure is the same readout the developer
needs, so building it early is never a detour.

## Prototype-specific notes that will not survive the port

three.js r128 quirks, recorded so nobody re-derives them:

- No `OrbitControls` in the CDN bundle.
- `MeshToonMaterial` ignores `flatShading` — split vertices with
  `toNonIndexed()` and `computeVertexNormals()` instead.
- cdnjs publishes that era under the `rNNN` tag, not `0.128.0`.
