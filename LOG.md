# LOG.md — worklog

Append-only. Newest first. What was actually done, and closed cards.
Not plans, not open questions.

**Gate: 1000 lines.** On overflow, cut the oldest year into `docs/log/<year>.md`
and link it from the archive list below.

Archives: `docs/log/2026-early.md` — the scaffolding, up to the stack decision.

Entry format:

```
## YYYY-MM-DD — title
Cards: [id] ...
What happened, in past tense. Anything tried and rejected, and why.
```

---

## 2026-08-24 — marks instead of prose, and real fuses

Cards: [L-052] extended.

**The plates stopped talking.** Every faceplate carried a sentence about what its
module considers, and a rack of plates each explaining itself in prose reads as a
form rather than as equipment. A module has a manufacturer's label; it does not
have a slogan. The sentence still exists on the module and belongs in the
debrief, which is the one place this machine is allowed to use words.

**`Decal` replaces it** — a seeded generator for the small stickers and stamps a
real part accumulates: a test-house roundel, a parts-bin barcode, an inspector's
pass stamp, a rating label. Individually meaningless; together they are most of
what separates a photograph of a machine from a drawing of one, precisely
because nobody *designed* them onto it. They arrive from three different places,
in three typefaces, each stuck slightly crooked. Which kind a maker uses is
characterisation: HANSA has been to a test house and will not let you forget it,
TOWA came out of a parts bin, KIBA stamped it passed and moved on.

Seeded off the component id and never random, for the same reason the cabinet's
blown fuse was: kit that reprints its own certification between replays of one
recording makes the recording feel untrustworthy.

**Real fuses.** The slot's power rail is now a fuseway: a **blade fuse
colour-coded to the standard automotive table**, a circuit lamp beside it, and a
brass screw terminal with the wire leaving into the dark. The colour code is not
a palette decision — it is the table, and it means a component's current draw is
legible across the cabinet without printing a number anywhere: the drive controls
take the big green thirty, guidance sips five, a guard sits on ten.
Characterisation with a real referent, which is the cheapest kind.

The decorative fuse carrier at the bottom of the cabinet went with it: every slot
has a real fuse now, so a second one was saying the same thing twice. The wire
loom stays — it is the thing that anchors "under the hood", and it is where all
those terminal wires are going.

Also caught: a `:global` I had just written into `Rack.svelte` to size the decal
SVGs — against the invariant in the very contract this round is building. The
decal takes a `width` prop instead.

## 2026-08-24 — cleanup, and the slot takes back power and mode

Cards: [L-052] extended again, from a real-device screenshot.

**The bug only a phone could show.** The deck was sized in `vh`, which is the
*large* viewport — the height the page would have with the browser chrome
hidden — so on a device it translated a URL bar too far down and put the alarm
row, the strip and the latch below the glass. `dvh` tracks what is actually
visible. No desktop viewport reproduces it, which is the whole lesson.

**Reversing an earlier decision: power and mode belong to the slot.** Every
plate used to carry its own enable lamp and verb button, drawn by the rack but
sitting inside the plate as if the maker had chosen them — which reads as a
form, not as equipment. *No manufacturer ships the fuse you power it through.*
Now: a cartridge fuse and the mounting ears on the left rail, the bus tap on the
right with the mode switch **under a hinged cover** (what a fitted component
does to the drive should not change by brushing it with a thumb; the cover is
only up while the slot is powered). A module owns its style and an optional
**face** — its own interface — and nothing else. The ears took the reorder
arrows, which is where they belong: unbolting them is how you move a plate.

**A second display primitive.** `Matrix` — a 5×7 dot-matrix LCD, blue backlight,
white characters, hand-cut glyphs. Deliberately a different *technology* from
`Seg` rather than a different colour: seven segments show a number and nothing
else, so a component with something to *say* needs a matrix, and dot-matrix
character modules are the part that dates a machine. NAV-1's face is one, which
makes TOWA read a generation newer than the cab it is bolted into.

Also: the pods lost their duplicate title bars (the Draggable already carries
the name — that was the doubled bar on the device) and gained their makers'
housings, so HANSA's is machined and hex-screwed with an orange readout and
TOWA's is moulded, rounded and backlit with no visible fixings at all. A real
**cage** replaced the vignette: pillars, a header beam, welded gussets, bolts.
The view **returns to forward** after a glance, so looking costs one swipe
rather than two — otherwise the cheapest way to avoid the cost is never to look.

**Meta-labels gone**: the rack header, the actuator terminal's name, the
hands-off-the-wheel banner, and the telemetry's identity and speed lines, which
the dataplate and the gauges now carry. Show, do not tell — a rack is obviously
a rack, and signal obviously flows down it to the terminal.

One thing broke on the way: the terminal shared the per-slot `.meters` class,
so restyling those into a 74px column made it three hundred pixels tall and
pushed the cabinet furniture off the bottom. Shared class, two very different
jobs.

## 2026-08-24 — the panel, in detail

Cards: [L-052] extended. A refinement pass on the same round, from a punch list.

- **Two master lamps became one `ALARM`.** Off, yellow, red — and the *rhythm*
  carries what the second lamp did: fast unacknowledged alarm, slow
  unacknowledged caution, steady once pressed. Two lamps meant two things could
  be lit at once saying the same thing, which is a dashboard talking to itself.
- **Numbers read out in seven segments**, drawn rather than typeset. A webfont
  was the obvious move; drawing the seven bars is better on three counts — the
  unlit segments become *real* (and the ghost is what the eye reads as an LED,
  more than the digit shapes are), it costs no font file against an unmeasured
  mobile byte budget, and it is exactly what `instrument-rendering.md` says SVG
  is for. The hour meter keeps mechanical drums, because that is what an hour
  meter has.
- **The rack standardises on 1U and 2U.** A rack is a standard and a standard
  has a pitch; without one a maker can make its plate taller to get attention.
  It bit immediately and correctly: TILT-GUARD at 2U had to give up its rating
  line and one line of prose to keep its limit sliders. Tried first and rejected:
  splitting the plate identity-left / settings-right, the way a real faceplate
  with pots is arranged — it overlaps at 390px, because a bordered identity
  block will not shrink below its own text.
- **Brushed silver bezels.** The cream ones read as plastic, which is a
  different decade.
- **The cabinet got furniture** — a blurred wire loom and a fuse carrier with one
  blown fuse. Not decoration: it is the thing that says you have your head under
  the hood rather than in a menu. Fixed, never random, because a cockpit that
  reshuffles between replays of one run makes the recording untrustworthy.
- **The serial number is the world seed.** The rig stamps the machine and
  generates the site in the same breath, so the number riveted in front of the
  operator is the exercise they are about to be tested on, and two operators
  comparing serials are comparing worlds. The seed now crosses the snapshot
  boundary, which it should have done anyway — a recording that cannot rebuild
  its own world is not a recording.
- HANSA's cell became a **beacon**: a ribbed dome on a machined base, surface
  mounted where everything else is let in. Its plate is its own override of the
  panel convention — heavy border, warning mark cut in beside the name. The
  invented DIN number came out; it was a mood, and the treatment carries it.

The rule that came out of it: **every indicator carries its component's name.**
A maker may style the plate however it likes and may not omit it.

One process note worth keeping: two edits this round silently did nothing,
because `str.replace` on a file the formatter had reflowed matches nothing and
says so with silence. One of them turned the whole dash black. Scripted edits
now assert that they matched.

## 2026-08-24 — the dash stops being a screen

Cards: [L-052] closed. [L-040] sound raised to ready; [L-041] demoted behind it.

A visual round on the dashboard, against one instruction: *industrial machine,
not a website.* Three rules came out of it, and they decide more arguments than
anything else in `theming.md`:

1. **The label is a separate object** — an engraved plate bolted near the
   control, never text set inside or beside it.
2. **A plate never changes.** TILT-GUARD's plate says TILT-GUARD whether the
   guard is working, limiting or bypassed. A label that rewrites itself is a
   screen pretending to be a panel. (I had it swapping to ÜBERBRÜCKT; the
   screenshot made it obvious that was a UI habit, not a machine.)
3. **The lens is the state** — colour and position, not words.

Three registers, one job each: the plate names, the lens reports, and the strip
says the one sentence when there is one. Everything else on the dash shut up.

Structurally: the pinned right-hand column is gone, so no horizontal split and
no scrolling — one wrapping flow, things bolted where they fit. The rack toggle
became **the latch it always was**: full width along the bottom seam, which is
the top edge of the cabinet below it, and the rack's own duplicate CLOSE button
went with it. One hood, one handle.

The masters are now **push-to-acknowledge**, the way an annunciator panel works
— new conditions flash, pressing makes them steady, and they go dark only when
the condition clears. Acknowledging is not dismissing. The E-STOP moved in
beside them and latches like a real mushroom: cap sinks, flushes, locks.

Dropped the SLIP/GND/¥ legend row. Those conditions still feed the masters and
name the strip; what they no longer do is make the panel explain itself in
words, which is the thing a panel does not do.

**Found rather than built**, from a remark in the brief: *a guard ordered above
the thing it guards becomes a warning light.* TILT-GUARD scales what reaches it,
so above the pilot it scales HALT and the pilot's SET overwrites the result — no
authority at the terminal — while its condition still lights the dash. Guard,
bypass or advise, chosen by ordering alone, with no new verb, setting or
mechanism. Zero lines of implementation; it is under test now.

Two bugs the screenshots caught, both invisible to CI:

- an enabled, healthy component showed a **dark lamp**, identical to a switched
  off one — the panel telling you nothing at a glance, which is the only thing
  it is for. Enabled and fine is a *lit* lamp.
- the alarm strip named a bypassed HANSA guard in KIBA's word.

Sound (L-040) moved to ready. It was already linked to damage, symptoms and the
lemon; the alarms landing mute is what settled it — an annunciator you cannot
hear is half an annunciator, and the acknowledge gesture has nothing to silence.

Also: the deploy has been failing since this branch started. The build is green
every time — lint, typecheck, tests, artifact — and the *deploy* job is rejected
in one second, because the `github-pages` environment only accepts the default
branch. Nothing pushed here has been publishable, which is why the live site is
still this morning's. Needs one settings change or a merge; recorded so the next
session does not re-diagnose it.

## 2026-08-24 — the triptych: plate, cell, pod

Cards: [L-048] closed. Opened [L-049] [L-050] [L-051].

A component is now one thing seen from three postures — a **plate** in the rack
(hands), a **cell** on the dash (periphery), a **pod** on the glass (eyes) — and
only the plate is mandatory. Its manufacturer decides the rest; the player never
moves a part between surfaces, which is what keeps the panel budget honest.

The idea that made it a mechanic rather than a layout system was **three
currencies**: a chassis component costs nothing and brings the cockpit, a
capability component costs *glass*, and a safety component costs *capability* —
it strands you on an incline instead of blocking your view. So TILT-GUARD
shipping no pod is not a discount, it is a different bill.

Started by spilling, because MEMORY was at exactly 300 and NOTES at exactly 100
— both at their gates, so anything this round crystallized would have overflowed.
The diegetic frame went to `docs/design/training-frame.md`, which also settled
something that had been implicit: the frame covers the world and the rig and
never the cab, and **L.A.B.O.R. certifies and bills while a manufacturer sells
and warns**. That split turned out to be load-bearing an hour later.

The refactor that pays regardless of the theming: **severity crosses the
snapshot boundary as a number** (0..3). `DashPanel` had been reaching into
TILT-GUARD's private readout to light a lamp, which meant every new component
was an edit to the dash. Now MASTER WARNING and MASTER ALARM derive over the
whole machine and nothing is wired to a named module. A number rather than a
word specifically so the *word* stays a theme decision — HANSA says `STÖRUNG`
where KIBA says `STOP`, and a theme decision has no business in sim state.

`src/cockpit/` finally exists, which the repo map reserved on day one. It holds
the registry, the makers and the annunciator; modules still declare only what
they publish, so rule 1 never came under pressure.

**The dash became the seam.** It no longer fades when the rack opens — it
travels, bottom of the view to top of it, because that is where it physically
sits between the windscreen and the cabinet. Dash and rack are one deck now.
Falling out of that: the levers go with the glass, since looking down puts your
hands in the cabinet. The bus keeps carrying what they last held.

ATT-0 moved from the glass onto the panel, replacing the incline bubble.
This overruled `cockpit.md`, and the consequence beat the motivation: **the bare
cage now has completely clear glass**, so the first component you fit is the
first view you lose. L-025 has a zero to price against for the first time.

Rejected, with reasons:

- **A budget for the indicator row.** Proposed rack-unit-style cells competing
  for dash space. Cut on the grounds that fighting for space on three fronts
  (glass, rack, dash) is one front too many. Cells just work, float left, wrap.
  Better call than mine.
- **Making a bypassed guard quiet.** A disabled safety module stands at WARN
  until it goes back in, rather than reporting nominal. Four lines in `runRack`
  that make the pop-the-hood bargain structural instead of remembered.
- **Naming a component's condition in words on the alarm strip.** There is no
  honest word: TILT-GUARD taking the drivetrain to zero is not a *fault*, the
  module is working exactly as designed. The strip carries the component's name
  and the colour carries the severity.
- **The ignition key.** `aria-hidden` decoration duplicating the ident, on a
  panel where everything else reads a real simulated quantity. The hour meter
  does its job and reads `simSeconds`.

Slip finally got a face — centre-zero, per track, because the sign is the
diagnosis and the difference between the sides is the thing. It is rung 1's
teaching quantity and it had been living on the debug line and one lamp.

**The sandbox is the other half of the round.** `sandbox.html` renders every
component in every state at phone width from hand-built snapshots, with no
Rapier and no renderer, and `npm run shots` screenshots it and fails on a page
error. It earned its cost within the hour: the dash was authored blind, looked
right in code, and the first screenshot showed the whole instrument cluster
scrolled off at 390px leaving nothing but a speedometer. Two more bugs came out
of the same loop — the strip naming a bypassed HANSA guard in KIBA's word, and
a fixture that exercised no GND condition.

Three tests were bite-checked by reintroducing the bugs and watching them fail,
per the method rule. Conformance for the coming themes is by **accessible name**
rather than CSS review, plus greps for `:global` and for unprefixed custom
properties — the `.bar` collision cost a faceplate once, and independent authors
make that likelier rather than less.

Pods-on-arms was designed and then deliberately **split off** rather than built:
it needs look angle in the DOM without Svelte reactivity, placement moved from
screen space into cage space, and the recentring QoL, which is three decisions
wearing one hat.

The experiment itself is **pre-registered** in `docs/design/theming.md` — the
conditions under which the blind-author round counts as a failure are written
down before it runs, so `META.md` gets whichever entry it earns.

## 2026-08-24 — the dash, the voice, the debrief, and a world

Cards: [L-043] [L-044] [L-029] [L-008] closed · LORE.md written

Four UI pieces the user asked to see, plus world-building.

**L-043 — the industrial dash.** The rack's closed face is now a live control
panel styled on a Caterpillar generator dash (the reference the user sent):
yellow sheet steel, hazard trim, white-bezel needle gauges built from a new
reusable `Gauge.svelte`, an incline bubble, annunciator lamps, a master alarm,
an ignition key, and a red E-STOP. The layout lesson: at 412 px the full panel
is wider than the glass, so the **critical controls are pinned to a fixed right
column** (E-STOP, rack latch) while the instrument strip scrolls — a real
industrial pattern, and it means OPEN RACK is never off-screen.

**L-044 — the live voice.** Damage lines arrive as stacking toasts that fade;
citizens latch. Replaces the always-on ledger corner. Survives a reset by
watching the damage list shrink.

**L-029 — the debrief + RESET.** Itemised scrollable modal in the L.A.B.O.R.
register with a closing verdict ("you also accomplished nothing"). RESET rebuilds
the world by **re-keying the sim `$effect`** on a `runId` — the cleanest reset
available — and resets the rack *in place* so the pushed modules do not
duplicate. Verified the canvas is reused for the new renderer without a black
frame.

**L-008 — draggable instruments.** Titlebar drag, with the cockpit's rules
enforced: wholly on the glass, never overlapping, snap back otherwise. All three
verified in the browser. One good bug: the first drag test failed silently
because the instruments' default positions sat *under* the camera control (z
above them), which ate the pointerdown. Moving the defaults clear fixed it — and
it is a preview of what the panel budget (L-025) will formalise.

**LORE.md** — the world: the L.A.B.O.R. certification board (the ledger's
voice), and the three manufacturers as *temperaments that predict how their kit
fails* — KIBA (stubborn, manual, unkillable, no opinions), TOWA (clever sensors
a Phantom Labor can lie to), HANSA (safety gear that is right and insufferable).
The canon rule: a component without a failure mode that belongs to its maker is
not finished.

## 2026-08-24 — feel fixes, and a face for the cockpit

Cards: [L-043] [L-046] [L-047] [L-044] opened · [L-029] [L-038] reshaped ·
CLAUDE principle 7 added

**Playtest feedback, acted on.** From a session where a twelve-year-old found
the fun immediately (drive at the construction material) and then flipped the
machine by bypassing TILT-GUARD:

- *Flipped machine skated on ice.* The hull collider was friction 0 — right for
  upright driving, where the track model owns all horizontal force, but it left
  a wreck nothing to stop it. Gave the hull real friction with a Max combine
  rule; it is inert during normal driving (0.42 m belly clearance) and bites
  only on its back or bellied. A wreck shoved at 5 m/s now stops in a few
  seconds. Verified in Node.
- *The grouser belt ran backwards.* Its ground-contact run travelled forward
  under a machine driving forward, disagreeing with its own sprockets. A track's
  bottom plates move rearward. One-line sign flip; the wheels were the correct
  reference.
- *Grousers oversized*, count thinned, for legibility and a chunkier read.

**The modules got physical.** Raised plates with lit top edges and drop shadows,
glossy embossed keys and LEDs, and a feTurbulence film-grain overlay at
soft-light — generated, not sampled. This is the first application of a new
principle.

**CLAUDE principle 7 — "honest world, real machine."** The world may look like a
simulation (contour lines, a plotted route) because in the fiction it *is* one;
the machine and cockpit may not. Spend fidelity asymmetrically. This is the
user's "core idea," and it decides design arguments, so it earned a place in the
contract rather than a doc.

**Crystallized from a design dump** (`docs/design/cockpit.md`, `damage.md`):

- The rack cover becomes **the machine's status panel** — a live strip (fuel,
  oil, engine key, MASTER-ALARM) with a latch that opens the rack. It is where
  the live voice will stack. Themeable per chassis, giving the cockpit identity
  (L-043).
- The ledger has **two faces**: live stacking notifications (L-044) and an
  end-of-run scrollable modal with RESET SIMULATOR (L-029), which is also the
  game's first screen.
- **Reset is always manual**, triggered by wreck / unrecoverable-flip /
  citizen-harm (deferred to NPCs who dodge) / operator (L-038).
- The **lemon**: symptoms (smoke, oil, warning lights, rough note) ship as
  feedback before the expensive drive-degradation physics.

Still open: props seem to **float** — not diagnosed, measure the rest gap first.

## 2026-08-24 — the world can be broken

Cards: [L-031] closed · [L-041] opened · [L-039] [L-029] reshaped

**Damage is measured in joules absorbed**, not in hit points. That is the load-
bearing decision and it comes straight from the inspectability pillar: energy is
a quantity the machine already has and can be shown. "The cone took 15 J and it
is rated for 5" is a diagnosis; "the cone lost 40 HP" is a number we made up.

Every breakable is now a **dynamic body**, so hitting things scatters them —
the visceral half, and it cost one word (`dynamic()` instead of `fixed()`) plus
`CoefficientCombineRule.Max` so props get friction against ground the track
model deliberately left frictionless. Lines carry price, energy, speed, **and
what was driving and what was bypassed**.

**Rejected: Rapier's contact-force events.** They exist and were probed. A
solver force magnitude is not a quantity the player can be shown, and it cannot
explain a prop hit by another prop. Energy can do both.

**Three bugs, all worth writing down.**

- *The site billed itself ¥55,690 before the machine had moved.* Dynamic props
  spawned overlapping and shoved each other apart hard enough to self-destruct.
  Fixed with spawn separation and a settling phase at construction.
- *Then it billed itself ¥9,540.* Anything already sliding integrates the energy
  gravity feeds it until it writes itself off. Fixed by requiring a body to have
  been **at rest** to be hit. The cost, stated in the code: a prop hit again
  while still moving is not billed for the second hit, so the ledger
  under-counts — the right way round for something accusing the player.
- *A cone rated at 22 J was indestructible.* A heavy machine cannot put more
  than ½·m·v² into a light object, and 6 kg at 2.2 m/s is 15 J. Every toughness
  is now a fraction of what the drivetrain can actually deliver into that mass.

**The nastiest one was a green test.** The first "drives into a cone" test
passed, and failed when the damage code was disabled — both signals green. It
had never hit anything: `world.step()` re-runs the rack and overwrote the test's
`drive` with an empty rack's HALT, and what it detected was the spawn bug. Now
in META as *a test can pass by measuring the bug*.

**Panel rendering, discussed and settled** — `docs/design/instrument-rendering.md`.
Stay in the DOM: tokens for structure, inline SVG for character. Rejected a UI
library (adds weight, makes industrial kit look like a web app), canvas
textures and 3D geometry (hit-testing becomes ours, and mobile frame time is
still unmeasured), and `CSS3DRenderer` — it can anchor real DOM to a three.js
camera, but there is no shared depth buffer, so DOM cannot be occluded by WebGL.
For a cockpit whose subject *is* occlusion, that is the wrong tool. Rendering
DOM into a WebGL texture is not possible at all; do not go looking.

Also: maker marks and silkscreen ratings per manufacturer, and an
**undercarriage** — the 0.42 m belly clearance is real, and with nothing drawn
in it the tracks read as detached, which is exactly how the first roll-over
screenshot looked.

## 2026-08-23 — TILT-GUARD, and the rack becomes equipment

Cards: [L-036] [L-037] closed · [L-039] [L-038] [L-040] opened · [L-035]
demoted · [L-008] [L-015] reworded

**v0's build surface is the rack — confirmed**, and with it the shape of edit
mode: **inline, in the cab, while it runs.** Instruments moved around the glass;
modules swapped, reordered and reconfigured in the rack. No separate build
screen in v0. The NOTES thread closed into `MEMORY.md` § 3.

**TILT-GUARD** — the first safety component, and the second honestly stupid one.
Caps drive on hull pitch and roll; limits are two sliders on its faceplate.

- Verb **AMP**, and the reasoning is the interesting part. `CAP` clamps a
  positive intent into the arriving signal's *magnitude*, so a reversing machine
  would come out going forward — the safety module causing the crash it exists
  to prevent. `AMP` scales what arrived and keeps the sign. Both directions are
  under test, and reverting the verb makes the test fail.
- Attitude comes out of the quaternion as **sines**, not through `asin` — pure
  arithmetic, so rule 2 holds without an exemption. The one exemption is the
  degrees→sine conversion of the slider value, quantized to 1e-6 exactly as
  `makeRampTerrain` does.
- It ships **enabled** and deliberately timid: 25° pitch against a 43.5° climb
  limit. Discovering that the thing which stopped you halfway up a hill is your
  own machine being careful — and then finding its LED — is the best first
  lesson rung 1 has.

**Module settings** are now a thing modules can have: bounded numbers with
units, on the faceplate. Explicitly *not* gains — the parameter model cannot
express one, which is the gain-tuning trap (NOTES) being closed off by
construction rather than by discipline.

**The rack is a server rack**, not a DIN rail: ears, screws, and a house style
per manufacturer — KIBA WORKS (chassis yellow), TOWA DENKI (navigation, centred)
and HANSA REGELTECHNIK (safety, orange, boxed). Cosmetic, and it does real work:
you find the orange plate, not the third row down.

Also: **ATT-0**, a combined compass/attitude head, the one instrument the bare
chassis ships. TILT-GUARD's two banded gauges, whose red/amber/green *are* its
limits rather than a mood. The rack toggle became a **control-panel cover** at
the seam it opens. The camera became an **item in the instrument column** rather
than chrome. Tracks are belts wrapped round their wheels instead of boxes — the
collider stays a box, deliberately, and the mismatch is documented where it is.
Terrain is steeper.

**One bug worth the entry.** The PILOT faceplate rendered 7 px tall with lint,
types and 71 tests green. Two rounds of re-reading the stylesheet found nothing;
one `getComputedStyle` dump found it instantly — the KIBA layout class was named
`bar` and collided with the meter's `.bar` in the same scoped stylesheet. In
META as *ask the browser what it computed*.

## 2026-08-23 — META.md, and a fresh look at the critical path

Cards: none closed · board reordered · [L-031] [L-032] [L-033] [L-034] [L-035]
opened · [L-019] split and demoted · [L-006] [L-021] demoted

**`META.md` — a fifth surface.** Method lessons, each tied to the incident that
earned it, in four sections (diagnosis, verification, design, bookkeeping). Gate
150. The rule that keeps it honest: an entry that loses its incident has
probably stopped being true, because an abstract rule nobody paid for is advice.
Registered in `CLAUDE.md`'s read and write order. Two stale lines in `CLAUDE.md`
went with it — the "four surfaces" count, and "no stack is committed yet", which
had been false since L-013.

**The critical-path review** — `docs/design/roadmap.md`. Four findings drove the
reordering:

- *Nothing has consequences.* The damage ledger is named in `MEMORY.md` § 3.1 as
  the core feedback mechanism and does not exist in any form. Everything else is
  tuning a loop with a missing beat.
- *The acceptance scenario is already half-built.* Levers and NAV-1 under `CAP`
  **are** two components fighting over one actuator. So L-018 is not "build the
  scenario", it is "make it legible" — a smaller, better-defined card.
- *The ten-minute clause is an onboarding requirement* that no card owned. Now
  L-033.
- *L-019 bundled two different things.* Same-engine record/playback is cheap and
  needed now; cross-browser bit-determinism is expensive, unverifiable in this
  sandbox (Chromium only, and Node is V8 too), and needed only by missions. Split
  into L-032 (ready) and L-019 (backlog).

**Rejected: build mode as part assembly in v0.** It drags four non-small cards
in before the loop closes once. The rack is already a build surface — order,
verb, enable — so "back to build with a reason" can mean *move NAV-1 below the
levers*. Recorded as a NOTES thread rather than as MEMORY, because it is a
recommendation awaiting confirmation, and it is the call that decides whether v0
finishes. L-006 and L-021 went to backlog behind it.

Also opened L-034: mobile-first is a hard pillar and no frame has ever been
timed on a phone, with ink shells doubling every mesh. Folded the two overlapping
NOTES budget threads into one, since bytes, frames and world size are one
question.

## 2026-08-23 — the dark area was the contour code

Cards: none closed · [L-025] narrowed

**Found it, on the fourth attempt.** The dark slab across the site was the
contour shader, and the tell was one I should have used first: it appeared
exactly when `terrainMaterial` landed, and survived every lighting change.

The mechanism is worth writing down. Contours are drawn where the distance to
the nearest contour multiple, divided by that value's screen-space derivative,
is under about a pixel. On **perfectly flat ground both terms vanish**: the
derivative goes to zero *and* the distance goes to zero, if the ground happens
to sit exactly on a multiple. The graded starting pad is at exactly 0 m, which
is a multiple of both the 1 m and 5 m spacings — so the entire pad passed the
line test at once and rendered as one enormous contour line, darkened twice.

Fixed by gating contours on relief, which is also cartographically right: flat
ground has no contours. Three earlier diagnoses — shadow frustum, hill shading,
ramp darkness — were all wrong, and each was disproved by an experiment I
should have run before proposing the next hypothesis. The isolating test
(`receiveShadow = false`) took one build and settled the shadow question
permanently; I ran it third instead of first.

**Track grousers** now travel at commanded speed on both runs of the belt, so
slip is something you *see* — plates racing under a machine that is not moving —
rather than a number you read. Left and right run independently.

**The rack became a posture rather than a panel.** Looking down slides the
viewport up until only a strip of windscreen remains, and the rack fills the
rest. You have dropped your eyes from the glass to the cabinet between your
knees, the machine keeps running, and reconfiguring on the move costs exactly
what it should. That makes hot-patching (L-026) a posture rather than a menu.

**Strength meters** on every module slot and both actuator terminals, filled by
fraction of drivetrain capacity and coloured for direction. The numbers are
demoted to debug telemetry: a number is something you read, a bar is something
you notice, and that difference matters when your attention is on the ground.

**NAV-1 ships a route scope**, the machine's first mandatory instrument, and it
already occludes the windscreen — the panel budget biting for the first time.
Deliberately not a map: no terrain, no obstacles, just the route and where you
are on it, nose-up. It shows exactly what the module knows, because an
instrument that drew the ground would be lying about the component behind it,
and the player would blame the autopilot for something the *panel* implied it
could see. Pins are selectable, which is the pilot's one lever on the autopilot
short of switching it off.

To wire that without breaking rule 3, modules gained a `readout()` of plain
numbers that travels inside their stage. Instruments read it from the snapshot
rather than holding a live module, so the boundary holds and the same
instrument code will drive a replay.

## 2026-08-23 — determinism audit, survey ground, greebles

Cards: none closed · rule 2 now enforced by test

Thinking about L-019 before building it turned up **two live rule-2 violations
already shipped**. Site furniture was placed with `Math.sin`/`cos` on its yaw,
which wrote non-portable values straight into collider transforms, and NAV-1's
route was generated the same way. Both are sim state; both would have broken
cross-browser replay silently. Neither had been caught by having the rule
written down and read.

So the rule is now **enforced by a test** rather than documented. It scans
`src/sim`, `control`, `modules`, `world` and `core` for non-portable maths, with
`sqrt` and `round` allowed because IEEE-754 requires them to be correctly
rounded, and a `deterministic-exempt:` comment to justify a line — used twice:
the quantized ramp slope, and the display-only pitch/roll. The scanner blanks
comments while preserving line numbers, since the naive strip collapsed them and
reported the wrong place.

Fixes: prop headings now come from `randomYawQuat`, which rejection-samples a
unit vector and uses the half-angle identities, so only `sqrt` is involved.
Waypoints are rejection-sampled from an annulus and ordered by a **pseudo-angle**
— the diamond-angle trick, monotone in true bearing but pure arithmetic — rather
than stepping `cos`/`sin` around a circle.

Moving the pins broke an autonav test, which turned out to be the test's fault:
it asserted raw displacement in a short window, and the new route can start with
the first pin *behind* the machine, so it spends four seconds turning. Rewritten
to assert the range to the pin closes, which is what "it navigates" actually
means and does not encode an accident of layout.

**Visuals.** Ground gets survey contours (minor at 1 m, major at 5 m, `fwidth`
keeping them a pixel wide at any distance) and slope-based hill shading. The
contours are the training-rig register showing through, and they do real work: a
cel-shaded slope otherwise gives almost no cue how steep it is, and steepness is
the whole of rung 1. The machine gets procedural greebles — deck plates, flank
ribs, grab rails, exhaust stacks, a dorsal pack, a roof beacon — which matter
because a bare box has no scale, and hatches and rails are things a human body
uses.

Two real bugs found on the way. The chase camera had no ground clamp, so
dragging down put it *under* the heightfield. And hill shading used three's
fragment-stage `normal`, which is **view space** — so "slope" was measuring
"faces the camera", and hillsides darkened as the camera tilted. Now derived
from the world position's screen-space derivatives, which also avoids depending
on a vertex chunk name.

Worth recording honestly: a dark wedge across the site got diagnosed as a
shadow-frustum problem, then as hill shading, then as the ramp — three wrong
calls. Disabling `receiveShadow` on the terrain settled it: the wedge survived,
so it was never a shadow. It is simply ground facing away from the key light
landing on the cel ramp's dark band, with the ridge as the boundary — cel
shading working. Lifted the sky fill so the shade side reads as slope rather
than hole. The lesson is the one from the probe: an isolating experiment beats
three plausible hypotheses, and I should have run it first.

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
