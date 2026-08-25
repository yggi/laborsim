# Components — the triptych, and what a manufacturer may change

A **component** is one thing you bought, and it shows up in the cockpit in up to
three places at once. This file is the contract: what every manufacturer must
honour, and what each is free to invent.

Status: **built** (L-048), except pods-on-arms, which is deliberately split off
(`NOTES.md`). The crystallized half is `MEMORY.md` § 6.1; how to *make* a theme
is `docs/design/theming.md`.

---

## The three parts

Each part is the same component seen from a different **posture**, and each
posture has a different price in attention.

| part | posture | where | what looking costs | interaction |
|---|---|---|---|---|
| **plate** — rack module | hands | the rack, looked *down* at | your eyes leave the glass | everything: order, verb, enable, settings |
| **cell** — dashboard indicator | periphery | the dash, always in view | nothing | minimal, or none |
| **pod** — viewport instrument | eyes | on the glass, on an arm | permanent view | medium (NAV pins) |

The plate is mandatory: a component in the rack has a faceplate. The cell and the
pod are **optional**, and which ones a component ships is decided by its
manufacturer, never by the player. Moving a part between surfaces is not a
feature.

Naming: `plate` / `cell` / `pod` name the physical objects, so "component" stays
free for the game sense and does not collide with Svelte's.

## Three assembly languages

Each surface is assembled differently, in the fiction and therefore in the CSS.
This is where "an assembly of independent components" is actually visible.

- **Racked** — the rack is a *standard*. Uprights, ears, screws, a fixed pitch.
  Anyone's plate drops in cleanly and squarely. Character lives inside the
  plate's own border; the mounting is neutral.
- **Bolted** — the dash is the *chassis maker's panel*, and every other maker's
  cell is bolted onto it. A cell is visibly an addition to somebody else's
  property: its own bracket, its own screws, its own idea of what a label is.
  The clash is the point.
- **Armed** — pods are not overlays. They are **on arms clamped to the cage**,
  and they move on screen as you look around (see below). Free shape, free size,
  placed by the pilot within the reach of the arm.

### Bolted does not mean botched

HANSA is **precise** aftermarket, not a hackjob. Its cell arrives with a machined
bracket, a gasket, a stamped standard number and a screw pattern that is correct
and completely unlike KIBA's. It clashes by being *too* right — a laboratory
instrument bolted to a farm implement.

The scruffy version — drilled holes, mismatched fixings, a label written on tape
— belongs to the grey-market maker that does not exist yet. Do not spend it here.

## What each kind of component costs you

The three makers in `LORE.md` are three different currencies, and this is the
part that makes the triptych a mechanic rather than a layout system.

- **The chassis component** (KIBA's `PILOT`) costs nothing and brings
  everything: the dashboard itself, the cage, the glass. It has a plate and
  **no cell** — you do not need a lamp to tell you the levers are fitted.
- **A capability component** (TOWA's `NAV-1`) costs **glass**. It ships a pod,
  the pod is mandatory once fitted, and it permanently occludes the world. More
  capability, less sight. This is the L-025 budget.
- **A safety component** (HANSA's `TILT-GUARD`) costs **capability**. It need not
  cost glass at all. It pays by limiting what the machine will do — winding you
  down halfway up a grade, stranding you on an incline, and quietly inviting you
  to switch it off for one quick push.

So a safety module is not "cheap because it has no pod". It is expensive in the
only currency that matters to it.

## The dashboard is the seam

The dash is the **only thing visible in both postures**, and it physically
travels between them:

- looking forward — the dash is the **bottom** of your view, below the glass.
- looking down at the rack — the dash is the **top** of your view, above the
  rack.

That is honest cab geometry: the dash sits between the windscreen and the
cabinet, so dropping your eyes past it puts it overhead. It never disappears and
it never fades; it slides, because it is a real object at a real height.

Its theme belongs to **the vehicle's manufacturer**, not to the game. A KIBA
tracked platform has a KIBA dashboard; another chassis from another maker has a
different dashboard with a different layout. Other makers' cells are bolted onto
whatever panel the vehicle came with.

### Layout of the dash

One wrapping flow. No columns, no scrolling — things are bolted where they fit,
and a panel that has run out of room grows another row.

1. **The dataplate**, and **the chassis maker's instrument cluster as one part**
   — the KIBA-NAV-UNIT, arranged the way aircraft settled it. An instrument
   measuring something that can raise a condition carries a **tell**: a small
   lamp on its own housing, lit when that condition is the master's source.
2. **The counters**, in a housing of their own. You steer by the cluster and you
   never steer by a totaliser, so they are not the same part.
3. **`ALARM` and the stop** — the two things the chassis says about the machine
   as a whole, bolted together because they are the same conversation. The one
   group on the panel that stays a group.
4. **Every fitted component's cell**, in rack order, behind a **seam**: a gap
   wider than the one between any two of the machine's own parts. Everything
   before it came with the machine, everything after it was bolted on.
5. **The latch**, pinned along the bottom edge, which is the top of the cabinet.

Everything above is **one wrapping flow of parts, bottom-aligned** — no columns,
no scrolling, no pinning but the latch. Two consequences worth stating, because
both were got wrong first:

- **A part is an item in that flow, never a group of items.** Wrapping the
  cluster and the counters in one box meant 300 px of kit either fitted on a row
  or jumped to the next one *entire*, leaving a hole as wide as everything in
  it. Only the masters are still a group, and only because a mushroom button you
  have to hunt for twice is one you find too late.
- **The seam is a fixed gap, not the leftover slack.** Floating the cells to the
  far end of the row made the seam *all* the width the row did not use — a third
  of the panel, empty, in landscape. Leftover panel belongs at the end of the
  row, where it reads as what it is: room for more kit.

There is **no status line**. The panel does not caption its own lamps; the words
live in the debrief (`docs/design/cockpit.md`).

The cells have **no budget and nothing to configure.** Fighting for space on
three fronts (glass, rack, dash) is one front too many. Cells just work.

### Rack units

Faceplates come in whole **units**: **1U** for a component with nothing to
configure, **2U** for one with settings. A rack is a standard and a standard has
a pitch — without one the rail reads as a list that happens to have rows, and a
maker can make its plate taller to get more attention.

Height is fixed and content is clipped, so a plate that does not fit its unit has
too much on it. That constraint has already paid: at 2U, TILT-GUARD's rating line
gives way to its limit sliders, and its sentence goes to one line. A third size
needs an argument, the same way a fifth verb does.

Where it lives: `src/cockpit/parts.ts`, not on `Module` — panel geometry is a
cockpit fact and nothing under `src/modules/` should know how tall it is drawn.

## Cell formats

A small closed set, so a component of a kind you have never seen still reads.
The table and the panel-language rules behind it: `docs/design/theming.md`. The
base case is **one illuminated pushbutton and one engraved plate**; everything
else retrofits that.

## Severity is a number; the word is a theme decision

`DashPanel` used to reach into TILT-GUARD's internals to light a lamp. That does
not scale past three modules, and it meant every new component edited the dash.

Instead: **every module publishes its own condition**, as a number, because it
crosses the one-directional snapshot boundary and everything that crosses stays a
plain value (architecture rule 3).

```
0 nominal · 1 active · 2 warn · 3 alarm
```

**One** annunciator, not two: off, yellow at ≥ 2, red at ≥ 3, over the chassis
and every fitted component at once. The *rhythm* carries what a second lamp
would have — fast for an unacknowledged alarm, slow for an unacknowledged
caution, steady once pressed. It is **push-to-acknowledge**, so you can tell the
panel you have heard it but not make it stop: the lamp goes dark only when the
condition clears.

The *word* is never in the snapshot — it is a theme decision, so HANSA says
`ÜBERBRÜCKT` where KIBA says `OFF`.

### A maker has a lexicon and a voice

Extending the theme past colour. Each manufacturer supplies:

- **a lexicon** — how it labels the same states. `ON/OFF`, `EIN/AUS`, `入/切`.
- **a voice** — short house strings. Two consumers already exist: the warranty
  toast when a safety component is bypassed, and the "keep your eyes on the road"
  safety tips. L.A.B.O.R. keeps its own voice (`docs/design/tone.md`); this is
  the first time a *manufacturer* speaks.

A maker's toast wears that maker's plate style. That is a third theme surface for
almost no extra work, and it is the cheapest demonstration that the theming
system is real.

## Popping the hood

A component flagged safety-critical cannot be disabled from its cell. Its cell
has no toggle at all — unlike the base case, which is a toggle. To bypass it you
must open the rack, which costs you the glass.

Bypassing it then:

1. fires a toast **in the manufacturer's voice** about voiding the warranty;
2. latches a line into the run report;
3. leaves the cell in a distinct **BYPASSED** state — not an alarm, but
   permanently, deliberately nagging.

**Trap:** `toggleEstop` disables every module in the rack. An E-stop must not
void anybody's warranty. The flag has to distinguish a deliberate bypass from a
system-level stop.

## Pods are on arms — designed, deferred

**Not built, and split off on purpose** — it is a different problem from "what
does a component look like", and it drags in three decisions of its own. The
thread is in `NOTES.md`. What follows is the design as it stands, so the next
round starts from here rather than from scratch.

Instruments are **not viewport-fixed overlays.** They are clamped to the cage, so
they translate on screen as the pilot looks around, and they swing back as the
view recentres.

Consequences, all of them good:

- **Placement is in cage space, not screen space.** The legality rules from L-008
  (wholly on the glass, no overlap) are evaluated in cage coordinates at the
  neutral look. The bound stops being "the screen edge" and becomes **the reach
  of the arm**, which is a better reason.
- This is **not** `CSS3DRenderer` and does not reopen
  `docs/design/instrument-rendering.md`. It is a 2D parallax translate driven by
  look angle — no second renderer, no depth buffer, no perspective.
- **It must not go through Svelte reactivity.** The viewport writes two custom
  properties (`--look-x`, `--look-y`) on one container, imperatively, once per
  frame; every arm reads them in a CSS `transform`. One DOM write per frame, the
  compositor moves the rest. Per-instrument runes at 60 Hz is exactly the shape
  architecture rule 3 exists to prevent.

## The view recentres itself — designed, deferred with the arms

After the pilot stops looking around, the view eases back to forward. A swipe is
a quick check, and normal returns by itself.

It is a QoL fix and it is also a theming opportunity: the nag that accompanies it
("keep your eyes on the road") is house voice, per manufacturer. The `voice.tips`
slot exists and is populated for all three makers; **nothing consumes it yet**,
because this is its trigger and this is deferred.

Open: whether it applies in chase view. Probably not — in chase you are outside
the machine and free look is the whole point.

---

## Invariants — true for every manufacturer

These are the contract. A theme that breaks one is wrong, not distinctive.

1. **The plate is mandatory. The cell and the pod are optional**, and the
   manufacturer decides which exist. The player never moves a part between
   surfaces.
2. **Every plate offers the same affordances**: enable, verb, order, output
   meters per side, and a settings control per declared param. Arrangement is
   free; presence is not.
3. **Conformance is by accessible name, not by CSS review.** Every plate renders
   a control named `enable {label}`, etc. A test asserts it for every maker.
   A rule enforced by a test, not by a document (`META.md`).
4. **Severity crosses the boundary as a number.** No strings in `readout`.
5. **Every reading is a real simulated quantity.** A gauge that lies breaks the
   inspectability pillar as surely as a hidden sim layer.
6. **No new dependencies. No `:global`. No unprefixed custom properties.**
   Character comes from tokens, the maker's own scoped components, and inline
   SVG — in that order of preference (`docs/design/instrument-rendering.md`).
7. **The substrate is shared.** Screws, grain, the proud-plate lighting recipe,
   meters and lamps are house-neutral primitives. Themes vary *character*, never
   the physics of a panel. One maker inventing flat design reads as a different
   game.
8. **It must survive a phone.** Authored and reviewed at 390×844. Mobile-first is
   a pillar, and agents add padding.

## Freedoms — what a manufacturer may invent

1. **Palette, wordmark, mark, silkscreen** — the existing `MakerStyle` axes.
2. **The arrangement of the plate.** Not a variant class on a shared plate: the
   maker ships its own component, and its layout is whatever it wants inside the
   rack's standard mounting.
3. **Which cell format it uses**, and the fiction of how it is bolted on.
4. **Whether it ships a pod at all**, and what the pod looks like — shape, size,
   bezel, arm.
5. **Lexicon and voice** — its words for the same states, and its house strings.
6. **Wear, era and manufacture.** KIBA is stamped steel from three generations
   ago; TOWA is injection-moulded and backlit; HANSA is machined and certified.
   The materials should read as different decades.

---

## Settled since

- **`PILOT` brings no instrument.** It brings the cage, the windscreen and the
  dashboard. The bare KIBA cage is **clear glass**, and the first component you
  fit is the first view you lose. `cockpit.md` is rewritten to match; ATT-0
  replaced the incline bubble rather than sitting beside it.
- **`UNMARKED` merged into KIBA.** An unknown maker renders as OEM kit, because
  the chassis builder is the house default. When the grey-market maker arrives it
  takes that slot with a character of its own — hackjob is a *style*, not the
  absence of one — and the fallback stays KIBA.
- **The cage and the levers are themed too.** They are the chassis component's
  parts as much as the dashboard is, so they belong in that maker's packet.
  Not yet done: the cage is still a plain inset shadow.

## Still open

- Whether a component may ship a pod its maker designed to be *dash-only* — a
  compact variant that trades detail for glass. Reads as a TOWA product; HANSA
  would never. Probably a component-curriculum hook (`MEMORY.md` § 7) rather
  than a general capability.
- What the second chassis is. Everything here says the dashboard's layout is the
  vehicle maker's, and nothing has tested that claim against a second vehicle.
