# Rung 1 — the tracked platform

Spilled from `MEMORY.md` § 4.1. Built at L-014.

Implementation: `src/sim/tracked.ts`, dimensions in `src/core/spec.ts`.

---

## Why the friction model is ours

Rapier has **no anisotropic collider friction**, and its
`DynamicRayCastVehicleController` models *wheels* — suspension rays, per-wheel
steering angle, side-friction stiffness. A track is neither. Both facts were
checked rather than assumed.

That constraint turned out to be the right answer anyway. A black box producing
correct-looking motion would be a layer the player cannot open, which principle
5 forbids outright. **The friction model is the teaching layer**, so we write
it. This is the same argument that declined Jolt's built-in tracked-vehicle
controller during the stack decision.

## How it works

Per fixed step:

- The hull and both track blocks are real colliders with **friction 0**. Rapier
  supplies normal support and collisions; every horizontal force comes from the
  model.
- Each track is sampled at **six points** along its contact length. Each casts a
  short ray down. **Contact is measured, never scheduled** — the explicit
  correction to the concept-3 probe, where gait phase decided foot contact and
  made ground-adaption failures decorative.
- Every sample in contact takes an **equal share of the machine's weight**, and
  an impulse capped at `mu · N · dt`, applied at the contact point. The impulse
  sought is the one that would exactly null the slip for that mass share; the
  cap is where sliding comes from.

There is **exactly one tuned constant**: `MU = 0.95`. Every other number is a
dimension or a mass. That was a deliberate guard against the gain-tuning trap —
a constant you cannot name physically does not belong here.

## What falls out, rather than being scripted

| Behaviour | Why it happens |
|---|---|
| Climb limit ≈ **43.5°** | `atan(MU)`. Not tuned to feel right — it is what a friction cone does. |
| Rears, flips backwards, slides down past the limit | Contact is lost at the front; nothing holds the nose. **No tipping logic exists.** |
| Beaching on a ridge | Belly clearance is 0.42 m; ground the hull and the track samples stop hitting anything. |
| Turning scrubs and skids | Skid-steer needs lateral slip, and lateral force is capped by the same friction circle. |
| Losing one track costs the other | Weight is shared across *all* contacting samples, both tracks together. |

Measured: 42° climbs at 95% grip; 50° grinds partway up, rears to −72°, loses
contact and ends upside down at the bottom. Pinned by tests in
`tests/machine.test.ts` so a model change has to be deliberate.

## Slip, made visible

Track grousers travel at **commanded** speed, not at the speed the machine is
making over the ground. That difference *is* slip, and the belt is the only
place you can see it rather than read it: plates racing under a machine that is
not moving. The sprockets spin from the same number, and left and right run
independently.

## Slip is the teaching quantity

**Commanded track speed minus actual ground speed under the track.** Every
rung-1 failure is legible in it — spinning on a grade, skating through a turn,
clawing air when beached — and it is on the telemetry line from the first
commit, alongside traction (fraction of the friction cone in use) and contact
count.

Slip is the *lagging* half of the pair and traction is the leading one: measured
over 7200 steps their correlation is only **0.267**, and on a 40° ramp the
machine sits at 0.93 traction with slip below the slipping threshold 89% of the
time — out of margin, still gripping. Both are on the panel's TRACTION head
(`docs/design/cockpit.md`).

**`traction` is `null`, never 0, when a track has no ground.** There is no
friction cone to report a fraction of, and 0 is what a parked machine reports —
the opposite condition. The type carries that distinction so a reader cannot
lose it by forgetting to check `contacts`.

## Controls

Two independent track levers, tank steering, one per thumb. Throttle-and-steer
is deliberately *not* the default: it is a **rung-two upgrade**, which makes the
control scheme itself part of the component curriculum.

Levers do not self-centre. Grab on touch, move on drag, **stay where dropped**,
with a dead zone that snaps to a clear HALT. That is what makes "leave the
throttle open and switch to chase view" a real thing a player can do to
themselves.

## Known limitation

Normal load is shared **equally** across contacting samples, which ignores load
transfer. That is fine for rung 1 and wrong for the load chart, where payload
against reach and tipping are the point. See the NOTES thread; the fix is
contained to one function and wants doing when L-021 lands.
