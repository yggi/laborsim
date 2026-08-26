# Rung 1 — the tracked platform

Spilled from `doc/MEMORY.md` § 4.1. Built at L-014.

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

- Each track is sampled at **six points** along its contact length, and each
  sample is a **bogie**: a wheel on its own spring and damper, hanging off the
  track frame. Every one casts a ray down the machine's own up-axis — the
  direction a strut travels in — and measures how far away the ground is.
  **Contact is measured, never scheduled** — the explicit correction to the
  concept-3 probe, where gait phase decided foot contact and made
  ground-adaption failures decorative.
- **The springs hold the machine up.** The track blocks do not touch the ground
  at all (a Rapier collision group), so nothing rests on a rigid box: put one
  corner in a rut and only that corner's springs let go. They still collide with
  everything else, so a belt shoves a cone and climbs a barrier as before, and
  the hull still beaches on a ridge.
- What a bogie's spring is carrying **is** the normal load at that contact, so
  the friction it can deliver is capped at `mu · N · dt`. One quantity, measured
  once, spent by both halves of the model.
- The impulse each bogie *seeks* is the one that would null its patch's slip,
  sized against the **effective mass** at that point and divided between every
  bogie pushing at once. The cap is where sliding comes from, and it is the
  whole lesson of rung 1.

There are **two tuned constants**: `MU = 0.95` and the bogies' damping ratio
`ZETA = 0.45`. Both are quantities an engineer would name and a spec sheet would
quote. Everything else is a dimension, a mass, or derived from them — the spring
rate is the machine's weight divided by the sag it is specified to sit at, which
is how a real undercarriage is specified and is the guard against the
gain-tuning trap: a constant you cannot name physically does not belong here.

### The springs, and the ride height that did not move

`SUSPENSION` in `core/spec.ts` is two dimensions: **travel** (0.16 m, full droop
to the bump stop) and **sag** (0.072 m, what the machine's own weight uses
standing still). The rate falls out of them, and so does something worth the
trouble — press the springs down by their static sag and the wheel is exactly at
the bottom of the track, where the belt has always been drawn. **The parked
machine sits precisely where it sat before it had any suspension**, so nothing
in `render/` moved, and the sim asserts it: 0.45 of travel, both sides, and the
body origin at ground level.

Past the end of the travel there is a **bump stop**, nine times the spring rate
— rubber, not steel, so bottoming out is a thing you feel arriving rather than a
collision. It is the only reading that says *the ground won* rather than *the
ground was rough*, which is why it crosses the snapshot as its own number.

### The correction that came with them: effective mass

The old model spent an **equal share of the machine's mass** at every contact,
which ignores that a push at ground level does not only move the machine, it
*turns* it — the centre of mass is 1.3 m above the belt. The textbook effective
mass says how much of the machine one push actually shifts:

    1/m_eff = 1/m + (r × d)ᵀ · I⁻¹ · (r × d)

Here the second term is **larger than the first** (`m·h²/I ≈ 2`), so every
friction impulse over-corrected by a factor of three and each over-correction
rolled the machine into an equal and opposite slip. Nothing showed while the
belts were rigid boxes lying on the ground, because the ground would not let
them roll. Put the machine on springs and it appeared immediately: a two-step
limit cycle, ±0.14 rad/s of roll, for ever, with both tracks reporting **100% of
their grip in use while parked on a level pad**.

The fix is `m_eff` divided by the number of bogies sharing the correction, which
converges in one step. The *cap* is still `mu · N`: physics caps, the share only
relaxes.

## What falls out, rather than being scripted

| Behaviour | Why it happens |
|---|---|
| Climb limit ≈ **43.5°** | `atan(MU)`. Not tuned to feel right — it is what a friction cone does. |
| Rears, flips backwards, slides down past the limit | Contact is lost at the front; nothing holds the nose. **No tipping logic exists.** |
| Beaching on a ridge | Belly clearance is 0.42 m; ground the hull and the track samples stop hitting anything. |
| Turning scrubs and skids | Skid-steer needs lateral slip, and lateral force is capped by the same friction circle. |
| Losing one track costs the other | Springs on the side still down compress further and carry the whole machine; the correction is shared by whoever is left. |
| Weight transfers, and the unloaded end lets go first | On a climb the front bogies extend and carry less, so they saturate while the rear ones still have margin. Nothing scripts it — it is what a spring under a pitched machine does. |
| A landing is several steps, not one | The bogies absorb it. A 2.4 m drop used to lose all 6.9 m/s in a single tick; it now arrives as 1.57, 2.58 and 1.84 m/s on consecutive ones. |

Measured: 42° climbs at 95% grip; 50° grinds partway up, rears to −72°, loses
contact and ends upside down at the bottom. Pinned by tests in
`tests/machine.test.ts` so a model change has to be deliberate.

The window where the machine is **out of margin but still gripping** moved with
the springs, and that is load transfer arriving: it used to sit around 40° and
now sits at 34–36°, because the front bogies run out of grip first. The claim on
the dash is unchanged and is now tested as the two thresholds crossing — median
traction passes 0.8 at 34°, median slip passes the panel's 0.4 m/s at 38° —
rather than as a fraction of steps at one chosen grade, which was an accident of
layout waiting to happen (`doc/META.md`).

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
(`doc/design/cab/cockpit.md`).

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

## Suspension travel is a published quantity

Each side publishes what its six bogies are doing (`core/snapshot.ts`): mean
**compression** as a fraction of travel, the watts its **dampers** are
dissipating, and how many are **bottomed**. The damper rather than the spring is
what the ear gets, because a spring is loudest when the machine is heaviest —
parked — and a damper can only speak while a wheel is travelling against the
frame. Measured over 80 m of the default site: parked is exactly zero, a crawl
reaches 7 W at the ninetieth percentile, and at working speed the median step is
192 W with the ninety-ninth at 3400.

The rate the damper answers to is **differenced off the strut's own travel**,
not projected from the hull's velocity, and the difference is the point: drive
at a rut and the ground comes up to meet a wheel that is going along at a
constant height, so the strut closes fast while the hull has barely moved. The
projected version cannot feel the ground until the machine has already ridden
over it — and it also left the damper permanently carrying 6% of the weight at
rest, an artefact of where in the step the sample fell, which surfaced as a
parked machine clocking 3.7 metres a minute onto its own odometer.

**The load chart's blocker is gone.** Normal load used to be shared equally
across contacting samples, which could not express load transfer at all; it is
now measured off each spring, so a machine nose-down on a grade really does put
more of itself on one end of its tracks. That was the objection L-021 was
carrying, and it answered itself.
