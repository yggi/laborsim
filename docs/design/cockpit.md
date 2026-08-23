# The cockpit — panel budget, occlusion, cameras

Spilled from `MEMORY.md` § 6. Source: `HANDOVER.md` § 2.4, § 9.1–9.2, plus the
decisions of 2026-08-23.

---

## The budget

Every instrument you install **obscures your direct view**. In the basic tracked
cage you sit behind two levers with a clear windscreen; in a high-tech Labor you
can barely see out — map, thermal, radar — powerful, and blind when they fail.

This is the rare case where the **UX constraint *is* the game constraint**.
Fixed glass area; instruments declare their size. Adding autonav means giving up
a gauge you wanted. Real cabs are cramped for the same reason.

**Panels are installed, not toggled.** If they can be tapped away, players run
naked-cage and peek at the map on demand, and the mechanic is gone.

## Authored placement, mandatory manifest

Settled between the authored cockpit of the brief and the derived cockpit of
`HANDOVER.md` § 9.4: **components ship instruments, those instruments are
mandatory, and the player places them in the viewport.**

Why this beats both parents:

- **The rack and the cockpit become one decision.** Fitting a component means
  fitting its instrument. Capability literally costs you sight.
- **An empty or incoherent cockpit is unreachable** — the whole case for
  deriving it. Every chassis ships stock wiring that works.
- **The budget gets teeth.** A component can be **refused for want of glass**.
  That is a real design failure the player sees coming and can argue with.
- **Placement stays authored**, so the DIN rail keeps a job and the cockpit is
  still where a parts list becomes a thing you can drive.

OS-mode is tuning, never a gate.

## Why this forces mobile-first, rather than merely suiting it

Viewport budgeting is **a core mechanism, not a UI style**, and it is therefore
coupled deeply to touch interaction. The cockpit is a fixed area of glass that
the player physically arranges and then reaches into while driving. That is a
touch problem — direct manipulation, thumb reach, occlusion by the hand itself,
no hover state, no pixel precision.

So mobile-first is **fixed**, and it is upstream of stack, layout and control
design alike. A desktop-first cockpit would be a different mechanic wearing the
same name.

## Looking down at the rack

The rail is not a panel that opens over the view — **you look down at it.** The
viewport slides up so only a strip of windscreen remains at the top, and the
rack fills what is left.

That is the posture it describes: you have dropped your eyes from the glass to
the cabinet between your knees, and while you are reading it you are not
watching where you are going. The machine keeps running throughout. It is the
same bargain as the chase camera, made with a different part of the body, and
it means *reconfiguring on the move costs you exactly what it should*.

Consequence worth noting: this makes hot-patching (L-026) a posture rather than
a menu. Rewiring live already costs you the view; LOTO will price the rest.

## Instruments carry LEDs, not just numbers

Every module slot and every actuator terminal shows **output strength as a
meter**, filled by fraction of drivetrain capacity and coloured for direction.
That is the reading you take at a glance while driving.

The numeric values stay, but demoted to **debug telemetry**. A number is
something you read; a bar is something you notice, and the difference matters
when your attention is on the ground rather than the panel.

## NAV-1's instrument: the route scope

The first mandatory instrument on the machine, and it is deliberately **not a
map**. No terrain, no contours, no obstacles — a radar-style plot of the route,
the pins, and where you are on it, nose-up.

That restraint is the point. It shows exactly what NAV-1 knows and nothing
more, so the instrument cannot imply a competence the module does not have. An
instrument that drew the ground would be lying about the component behind it,
and the player would rightly blame the autopilot for driving into something the
*panel* appeared to see.

Pins are selectable: tapping one retargets the module. That is the pilot's one
lever on the autopilot short of switching it off.

## The chase camera — "hands off the wheel"

**Available — but you cannot drive from it, and the world does not wait.**

While the chase view is up you do not see the cockpit and have no control over
the vehicle. Critically, this is **not a pause and not an auto-stop**: the sim
keeps stepping and the machine keeps doing whatever you last told it to. Leave
the throttle locked open and go sightseeing, and you will return to an itemised
account of what that cost.

That is what makes it a real trade rather than a free look. The chase view
cannot be *strictly better* than the cab, because it cannot drive and it cannot
protect you — the same shape as every other capability here: a real gain at a
real price, legible before you pay it.

The intended texture: you come to a stop, get out, walk around the machine, see
that you have wedged it — exactly what an operator actually does — and the
discipline of stopping *first* is a thing you learn by not doing it once.

Specific contexts may disable it entirely as a challenge condition.

It sits comfortably in the training frame: a rig plausibly has an external
observation view, and stepping out to use it is a thing the rig can record.

Still open: **field stowing of panels** — allowed at a cost in hands or seconds,
or not at all?
