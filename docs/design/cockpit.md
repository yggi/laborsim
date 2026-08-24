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

## Instruments are placed on the glass, and the glass has rules (built, L-008)

Edit mode for the instruments is **inline, in the cab, while it runs**: each
instrument has a titlebar you drag it by. But the placement is not free-for-all,
because occlusion is a budget spent on purpose — an instrument must sit **wholly
within the viewport** and must **not overlap** another. A drop that breaks
either rule is refused and the instrument **snaps back** to where it last legally
sat. You arrange the glass; you never lose one off the edge or bury one under
another. This is the mechanism the panel budget (L-025) will price: today it
enforces *don't overlap*; tomorrow it enforces *there isn't room for that*.

## A server rack, not a DIN rail

The rail turned out to be vertical, so it is a **server rack**: faceplates
stacked one above the other between two uprights, each screwed in, signal
flowing down the stack to the actuator terminal at the bottom.

And each plate is in **its manufacturer's house style** — its own colours, its
own wordmark, its own arrangement of the same parts. KIBA WORKS builds the
chassis and its own controls, in machine yellow. TOWA DENKI sells navigation
electronics, lighter and newer and centred. HANSA REGELTECHNIK sells safety
gear, orange and boxed and slightly smug.

This is cosmetic and it is doing real work. A uniform grid of identical rows
reads as a menu the game drew; a rack of mismatched kit reads as equipment
somebody bolted in, which is what it is meant to be. It also makes the rack
*legible at a glance while driving* — you find the orange plate, not the third
row down.

## ALARM is the bridge, and you acknowledge it (built, L-052)

**One** annunciator, where the machine's own thresholds and every fitted
component's condition arrive together. It is the prototypical labelled indicator
— a lens and a plate, in the chassis maker's house style — and it is the only
thing on the dash that speaks for parts it does not own.

Off, yellow, red, and the **rhythm** carries what a second lamp would have: fast
for an unacknowledged alarm, slow for an unacknowledged caution, steady once
pressed. Two lamps meant two things could be lit at once saying the same thing,
which is a dashboard talking to itself.

It is **push-to-acknowledge**, the way an annunciator panel works: a new
condition flashes, pressing makes it steady, and it goes dark only when the
condition actually clears. **Acknowledging is not dismissing.** You cannot make
the panel stop telling you; you can only tell it you have heard.

The E-STOP sits with them, because it is the same conversation, and it latches
in the way a real mushroom does — down and locked until it is released.

Consequence worth recording: **a guard moved above the thing it guards becomes a
warning light.** TILT-GUARD scales what reaches it, so above the pilot it scales
HALT and the pilot's SET overwrites the result — no authority at the terminal —
while its condition still lights the masters. Guard, bypass, or advise, chosen by
*ordering alone*, with no new verb, setting or mechanism. Nobody designed it; it
fell out of the rack being a pipeline, and it is under test.

## The cage, and the eyes that come back to the road (built, L-052)

You are not looking through a windscreen, you are sitting inside a **cage**: a
welded frame with pillars at the corners of your vision, a header beam overhead
and gussets where they meet. It is the cheapest way to make the glass read as an
*opening* rather than as the edge of a screen, and it is chassis-maker structure,
so it belongs to KIBA the way the dash does.

And the view **returns to forward on its own**. A swipe is a glance, not a new
heading: hold still for a moment and the neck eases back. Without it, every look
costs a second deliberate swipe to undo — and the cheapest way to avoid that cost
is to never look, which is the opposite of what a glance is for.

## The dash is the seam, and it travels (built, L-048)

The dash is the **only thing visible in both postures**, and it does not fade
out and back in — it moves. Bottom of your view while you are driving, top of
your view once you have dropped your eyes to the cabinet.

That is honest cab geometry rather than a transition: the dash physically sits
between the windscreen and the rack, so looking past it puts it overhead. It is
one object at one height, and the dash and the rack together are one deck.

The consequence worth keeping: **the levers go with the glass.** Looking down
puts your hands in the cabinet, not on the controls. The bus keeps carrying
whatever they last held and the machine keeps doing it — you simply cannot reach
them while you are reading. The same bargain as the chase camera, made with a
different part of the body.

## The cover is the machine's status panel (built, L-043)

The cover over the rack is not a button — it is **the closed face of the rack,
and a live instrument in its own right.** It is a strip of yellow industrial
sheet metal at the bottom of the glass, in view while you drive: white-bezel
needle gauges (speed, grip), an incline bubble, annunciator lamps
(slip / tilt / ground / yen), a master-alarm that opens the debrief, an
ignition key for identity, and a red mushroom **E-STOP** that kills the drive by
disabling every module. A **latch** opens the rack — the panel drops, the rack
comes up. Same bargain as the chase camera, made with your hands not your eyes.

Two rules that survived contact with a phone: the critical controls (E-STOP and
the latch) are **pinned** to a fixed right column so they never scroll off a
narrow screen, while the instrument strip may scroll; and **every gauge reads a
real simulated quantity**, because a gauge that lied about the machine would
break the inspectability pillar as surely as a hidden sim layer.

The live half of the ledger stacks above it (L-044), and the thing you glance
at constantly is the machine's health, not a menu.

## Cockpit identity — the interior is not exchangeable

The status panel, the gauges, the key, the frame around the glass are **themed
per chassis**, the same way the rack modules are themed per manufacturer. A
rugged municipal bulldozer and a fancy police Labor share a code path and share
nothing else: different gauge faces, different warning-light language, different
furniture. The maker-styling system already proved this works for the rack;
extending it to the cab is what stops the interior from being a sterile,
exchangeable box. The cockpit having an *identity* is part of feeling real
(principle 7).

## Modules carry settings, and settings are not gains

A module may put **bounded numbers with units** on its faceplate — TILT-GUARD's
two limit sliders are the first. That is deliberately as far as it goes: a
setting is a knob on a component you bought, not a tuning parameter on the
simulation. The gain-tuning trap (NOTES) is exactly what this must not become,
so there is no way to express a gain in the parameter model and no plan to add
one. Topology, order and limits are the game; PID tuning is not.

## Instruments carry LEDs, not just numbers

Every module slot and every actuator terminal shows **output strength as a
meter**, filled by fraction of drivetrain capacity and coloured for direction.
That is the reading you take at a glance while driving.

The numeric values stay, but demoted to **debug telemetry**. A number is
something you read; a bar is something you notice, and the difference matters
when your attention is on the ground rather than the panel.

## ATT-0 is on the dash, and the bare cage has clear glass

Heading and attitude in one head — a compass card round an attitude ball —
because the pilot reads them as one question: *which way am I pointing, and how
level am I?* Two instruments side by side would cost twice the space to answer
it.

**It lives on the dashboard, not on the glass** (2026-08-24, overruling this
file's earlier claim that it was the one instrument shipping with the bare
chassis). It is not a component's pod. It is part of what the vehicle came with,
like the speedo, and the chassis maker built it into the panel — where it
replaced the incline bubble, which was reading the same two quantities with less
to say.

The consequence is better than the motivation, and it is now the reference point
for the budget: **the bare cage has completely clear glass.** The first
component you fit is the first view you lose, which is the sharpest statement of
KIBA's doctrine the cab has made — a machine, and no help, and nothing between
you and the ground. Everything on the glass after that is a trade you made, and
L-025 now has a zero to price against.

Nothing on it is advice. It shows where north is and where the horizon is, and
it never colours anything. The module with an opinion is TILT-GUARD, and it
brings its own gauges.

## TILT-GUARD's instrument: two gauges that show the module's own thresholds

Red–amber–green–amber–red, one bar per axis. The bands are not a mood: green is
where the module passes your command through untouched, amber is where it has
started winding you down, red is where it has taken the drivetrain to zero.
Move the limit sliders on the faceplate and the bands move with them, because
they **are** the limits.

So the gauge shows exactly what the module will do and nothing about whether it
is right to do it. Sitting nose-high in the red with no drive, halfway up a
grade the machine could have climbed, is the instrument telling the truth about
a component that is wrong.

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
