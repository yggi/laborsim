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

Two rows:

1. **The machine instruments** — the chassis maker's own cluster. Identity,
   master alarm, master warning, the gauges, the key. Authored per chassis.
2. **The indicator row** — every fitted component's cell, in **rack order**,
   floated left and wrapping.

The indicator row has **no budget and nothing to configure.** Fighting for space
on three fronts (glass, rack, dash) is one front too many. Cells just work.

### Cell formats

A small closed set, so auto-placement stays trivial:

- **1-cell** (the base case) — a round button/indicator combo with an old-school
  stuck-on embossed label. Combined disable-toggle and activity light.
- **small gauge** — a reading, not a control.
- **two-button** — up/down.
- **multi-position knob**.
- **status screen** — a small digital readout. Advanced components only, and it
  should feel like it cost extra.

## Severity is a number; the word is a theme decision

Today `DashPanel.svelte` reaches into TILT-GUARD's internals to light its lamp.
That does not scale past three modules and it means every new component edits the
dash.

Instead: **every module publishes its own condition**, as a number, because
`Stage.readout` crosses the one-directional snapshot boundary and stays plain
values (architecture rule 3).

```
0 nominal · 1 active · 2 warn · 3 alarm
```

- **MASTER WARNING** (yellow) lights when any stage is ≥ 2.
- **MASTER ALARM** (red) lights when any stage is ≥ 3.

Both are derived, never hand-wired. The *word* on the annunciator is not in the
snapshot — it is a theme decision, so HANSA says `STÖRUNG` where KIBA says `STOP`
and TOWA says something backlit and reassuring.

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
