# LOG.md — worklog

Append-only. Newest first. What was actually done, and closed cards.
Not plans, not open questions.

**Gate: 1000 lines.** On overflow, cut the oldest year into `docs/log/<year>.md`
and link it from the archive list below.

Archives: `docs/log/2026-early.md` — the scaffolding and rung 1, up to and
including the first deploy.

Entry format:

```
## YYYY-MM-DD — title
Cards: [id] ...
What happened, in past tense. Anything tried and rejected, and why.
```

---

## 2026-08-25 — the KIBA-NAV-UNIT, and a panel that packs

Cards: none closed. Opened: [L-056].

**Three dials became one part.** Speed, ATT-0 and TRACTION now share one bezel,
one set of four screws, and legends engraved into their own plate. The
designation is internal and appears nowhere on the panel. The argument is not
tidiness: three separately bolted gauges claim three suppliers, three fitters and
three dates, and none of that is true of a cluster the chassis maker ships as a
unit. The counters stayed out of it — a totaliser has never shared a bezel with
a live dial, and you do not steer by one.

`Gauge`, `Attitude` and `Traction` each lost their own bezel and four screws and
gained the rim of the hole they are set into. That deleted three copies of the
same brushed-metal gradient and, more usefully, **freed the space a frame was
taking**: the dials grew about a quarter at the same footprint.

**The engraved legends are a deliberate exception to the plate rule**, and the
line is about who made the words: a plate names a control, was engraved by
whoever fitted it, unscrews, and can outlive what it names; an engraving names
part of the instrument it is cut into and cannot be wrong, because it and the
dial are one object. `Meters` already relied on that for its H and KM without
anyone writing it down. Now `substrate.css` carries it as `.mfg-engraved` with
the argument, and `tests/cockpit.test.ts` fails if a cell engraves anything — a
cell is a faceplate, so every word on one names a control (META: a rule enforced
by a document is a rule that gets violated anyway).

**The panel packs now, and the fix was structural.** Every part is its own item
in the wrapping flow; the group boxes are gone except the masters, which keep
theirs because a mushroom button you hunt for twice is one you find too late.
Groups were why the panel looked sparse: 300 px of instruments either fitted on
a row or jumped to the next one *entire*, leaving a hole as wide as everything
in it. The flow is bottom-aligned too, so every plate and every legend across a
row lands on one line with the controls ragged above it — which was already the
rule inside each group, and is a better rule outside them.

Measured, at 390 portrait: **251 px of dash before, 229 after**, with bigger
dials and one fewer row — and the same 229 whether or not any component is
fitted, where it used to grow a row for the cells. 22 px of glass back.

**Rejected: `margin-left: auto` for the seam.** It made the gap between the
machine's kit and the fitted kit *all* the slack in the row — fine at 390, a
third of the panel in landscape, empty, with the cells marooned at the far edge.
It is a fixed 12 px extra now, and the leftover steel collects at the end of the
row where it reads as what it is: room for more kit. That is the panel budget
(L-025) showing through, so it is worth seeing.

**The bench grew a landscape row**, because none of the above was decidable from
the portrait shots. The specimens render at 390 and again at 844, and
`npm run shots` writes both. Two findings from doing it: the shots viewport was
390 wide, so the first landscape shots came out silently clipped to 390 with a
green run and no error — the browser window has to hold the widest specimen —
and nothing in the cab is responsive to the window itself, so widening it is
free. That is META's *ask the browser what it computed* twice in one afternoon:
the clipped screenshot looked like a CSS bug and was not.

Not done, and carded as [L-056]: **the cab around the panel.** The dash reflows;
the glass does not. The deck's travel is in `dvh` and the rack takes 74 of them,
which is a portrait number, so turned sideways the glass is a letterbox and the
pods sit where a portrait layout left them. Camera FOV, cage geometry and deck
travel want deciding together, and not as a CSS pass.

## 2026-08-25 — GRIP and SLIP become one head

Cards: closed [L-055]. History trimmed to its gate: [L-017] dropped, already
narrated above.

**TRACTION.** The cluster now has two big heads and they are the machine's two
viewpoints: ATT-0 the horizon, seen from the side, and TRACTION the plan view,
seen from above — nose up, hull in the middle, a track channel either side. The
answer to yesterday's question was *both readings, one instrument*, which the
measurements had already forced: slip alone deletes the panel's only warning
that arrives before the failure, and GRIP alone was wrong in three regimes out
of four.

Three marks, chosen because a person reads them as separate channels: the
channel's **colour** is the fraction of the friction cone in use, its **length**
is the contact patch (hatched where samples have left the ground), and the
centre-zero **bar** is slip, growing the way the track is sliding. Contacts had
never been on the panel at all — only on the debug telemetry line — and folding
them into the channel's length is what made the outer contact rail unnecessary.

**Rejected: a separate rail for contacts.** Built it first, 2.5 units wide in a
100-unit viewBox — 1.3 px at the size this is actually bolted on at. The
screenshot settled it (META again): a reading nobody could take. Making contact
*be* the live length of the channel is one mechanism instead of two, and it
degrades into the no-contact state for free.

**Rejected: a heat ramp that runs to red.** Also settled by screenshot. At 0.94
the channel was rust-red and the red slip bar vanished into it — the two marks
this head exists to separate, collapsed. The ramp stops at amber now, and red
belongs to the things that have *happened*: the slip bar and the frame at the
limit.

**`traction` is `null`, not 0, for a track with no ground.** The type change is
the actual fix for the defect found yesterday; the instrument is downstream of
it. 0 is what a *parked* machine reports, and a dial that takes a number for
both showed the same thing for opposite conditions. Every consumer now has to
decide — `Telemetry`, the readout (which blanks to `---`), and the fixtures,
where `contacts: 0, traction: 1` used to be expressible and described a machine
that does not exist.

**Damping lives in the instrument, and the numbers say it is enough.** Undamped,
traction sat above the gauge's own danger band 21% of a flat-ground run at full
speed. The UI reads snapshots at 10 Hz and *decimating* a signal like that
rather than averaging it triples the jump between updates (0.06 → 0.19 of full
scale). Measured four pipelines: raw 60 Hz (23.0% false alarms, 1.50 σ between
flat and 40°), decimated 10 Hz (21.0%, 1.53 σ), decimated and damped at 0.6 s
(**0.0%, 2.12 σ**), sim-side window mean then damped (0.0%, 2.29 σ). The damper
alone does the work, so the sim keeps one meaning for one field; 0.17 σ is not
worth a second. A damped needle *is* the real quantity — every dial on a real
machine has oil or a shorted coil in it — and `damping.ts` carries that argument
with the table.

**Both tells point at TRACTION**, which is the fix for the mis-attachment: GND
used to light a lamp beside a dial that read 0% for a track in the air. And the
`max(left, right)` reduction is gone rather than repaired — both channels are
drawn, so a machine hanging one track over an edge no longer reads identically
to one in a hard turn. There is a bench specimen for exactly that now; it was
not previously expressible, because `snapshotOf` gave both tracks the same
contact count.

**The odometer.** Right-aligned, so the digits sit against the KM screened
beside them instead of floating in a window sized for the clock above. The
metres are their own colour (`--mfg-odo-fraction`, defaulting to the integer
colour so an unopinionated maker sees no change) — a real trip meter puts the
fractional drum on a separate wheel because it is the part always moving and the
part you are not reading. And the decimal point got a full column: it had a
quarter-width one with the glyph absolutely positioned inside it, which was a
space fix for a window this reel no longer lives in.

Not done, and deliberately: no annunciation for *low margin*. Traction pins at
1.00 for 100% of a normal hard turn — skid-steer fills the friction circle by
construction — so a lamp on it would cry wolf every time the machine turns. The
colour carries it; a lamp would need a condition that understands turning, and
that is a module's opinion, not a chassis symptom.

`MEMORY.md` is now full at 300 lines and `NOTES.md` at 100. The next durable
fact or open thread forces a spill; the log itself took a cut to make room for
this entry.

## 2026-08-25 — is GRIP the same instrument as SLIP?

Cards: none touched. Opened: [L-055]. No code changed — this was a measurement.

The question was whether the dash needs both dials or could be reduced to SLIP.
Answer: **they are different quantities, and the difference is real — but the
GRIP instrument as built delivers it in one regime and misleads in three.**
Measured headless over 7200 steps across eleven scenarios (flat cruise and
crawl, spin in place, hard turn, ramps at 10/25/40/42/55°, idle on flat and on
grade), reading the panel's own reductions rather than the raw `TrackState`.

**The quantities.** `slip` is a velocity difference at the contact — state.
`traction` is impulse wanted over impulse the ground can hold, per step —
demand over capacity. Pearson r between the two dials is **0.267**. Neither
determines the other, and the buckets show why: below the SLIP lamp's 0.4
threshold, GRIP ranges across its entire scale.

**What GRIP knows that SLIP does not: margin.** On a 40° ramp the machine
climbs cleanly — slip under the lamp threshold 89% of the time, mean 0.31 —
while GRIP sits at 0.93 (5–95 pct: 0.87–1.00). At the edge of the cone and not
yet sliding. That is the only leading indicator on the panel; everything else
is lagging. Delete it and the dash can only tell you about failures that have
already happened.

**What SLIP knows that GRIP does not: the ground is gone.** Fully airborne on
the 55° ramp, over 426 steps: GRIP reads **0.00**, SLIP pegs at 2.20 m/s, past
its 1.6 span. `summarize()` returns `traction: 0` for `contacts === 0`, which is
also what `idleTrack()` returns — so 0% means *parked* or *clawing air*, two
opposite conditions on one reading. That matters because the GND tell is bolted
to GRIP, whose comment claims the dial is "pinned, with no ground under it". It
is not. It reads zero, which looks nominal, beside a lit red lamp.

**Three more defects, all measured.** `Math.max` over the two tracks takes the
*good* side's number: on the 55° ramp with exactly one track down, the dial read
1.00 for every such step — indistinguishable from a turn. In a hard turn GRIP is
pinned at exactly 1.00 for 100% of steps (per-step jitter 0.000): skid-steer
saturates the friction circle by construction, so the dial is dead at full scale
through a normal manoeuvre. And on flat ground at full speed it spends **21.9%**
of steps above its own 0.85 danger band, jittering 0.058 per step — six dial
points a frame, crying wolf at a machine doing nothing wrong.

**Tried: smoothing.** An EMA over the raw dial, τ from 0.15 s to 1.2 s. At 0.6 s
the flat-ground false-alarm rate falls from 21.9% to **1.8%** and the ordering
stays clean and readable (flat 0.56 · 25° 0.67 · 40° 0.88). So the noise half is
a display filter and belongs in the instrument, not in the sim — but smoothing
does nothing for the zero-means-two-things overload or the turn saturation,
which are the model and the reduction, not the render.

Rejected: reducing to SLIP only. It would delete the panel's one warning that
arrives *before* the failure, and L-040 wants "a machine labouring at 90% grip
sounds like it", which needs the quantity whether or not a dial shows it.

Named but not taken: replace GRIP % with **MARGIN %** (`1 − utilization`). Same
number read the other way up, it falls toward zero as you get into trouble, and
"no ground" becomes zero margin rather than zero use — the overload disappears
by construction. A bigger change to the face than to the sim. Carded as part of
[L-055].

## 2026-08-24 — the panel stops talking

Cards: [L-052] extended. Opened: [L-054].

**The status strip is gone.** A line of words along the bottom of the dash
naming the worst thing happening was the panel reading its own lamp out loud,
and a lamp that needs a caption has failed. What it said is now split three ways
and each part goes where it belongs: the master carries severity in colour and
rhythm, the **tells** point at the instrument that knows why, and the sentence
moved into the debrief, which is the one surface in this cab allowed to finish
one. `masterLine` did not change — only who reads it.

**Tells.** A gauge measuring a quantity that can raise a condition now carries a
small lamp on its plate's line: GRIP for a track that has lost the ground, SLIP
for tracks sliding. One master says *something is wrong* and says it once, which
is right and useless on its own, because the pilot's next question is always
which instrument to look at. `Annunciation` gained an optional `at` naming the
instrument, so a condition with no gauge — a citizen, the bill, the stop — lights
only the master, which is honest. The tells do not flash: rhythm means
unacknowledged, the master owns that, and two things blinking out of phase is a
panel arguing with itself.

**The E-STOP is the way out.** There is no menu button, because a training rig
does not have one: you stop the machine, and then somebody comes and talks to
you about it. The mushroom latches the drive dead and opens the folder in one
press; RESUME twists it back out, which makes releasing a stop the deliberate
act it is on a real machine. `toggleEstop` became `setEstop(next)` so hitting an
already-latched stop is not a release.

**Hours and distance became one instrument** — one housing, two drums, units
screened on its own face rather than engraved on panel plates, because a gauge
arrives from its supplier with its units on the dial while a plate names a
control. Two housings cost two bezels and two plates for one idea. And the cells
now float to the far end of their row: the gap is the seam between what the
machine came with and what somebody bolted on.

**The odometer had no decimal point.** It was in the DOM, the right colour, the
right size, correctly positioned — and drawn on the seam between two digit
columns, where at a monospace advance it lands on the foot of the digit to its
left and vanishes into it. Only a screenshot found it; every assertion about it
would have passed. It has a quarter-column of its own now.

**The `:global` conformance test now scans `src/ui/` as well as `src/cockpit/`.**
It was scanning only the directory whose author is already thinking about the
rule — and the first `:global` written after the ban went in was written in
`Rack.svelte`, where nothing was watching.

## 2026-08-24 — drums, and a dead slot is dead

Cards: [L-052] extended.

**A third display primitive**, adapted from an `Odometer` component handed over
for the purpose: mechanical rolling digits. The three are now a real taxonomy
rather than three skins — `Seg` shows a **reading** (a number that can fall),
`Matrix` shows a **message** (words, which segments cannot make), `Odometer`
shows a **total** (a number that only ever goes up). Hours run and ground
covered have never been displayed any other way on a piece of plant, because the
number outlives the electronics and a wheel keeps its count with the power off.

The hour meter became **TIME** (HH:MM:SS on drums — a training exercise is
measured in minutes and four digits and a tenths wheel cannot show a minute) and
gained a real **odometer** beside it. Distance is integrated in the sim at the
fixed step, multiply-and-add only, so it stays bit-portable and a recording
carries its own mileage; an odometer that reset on reload would be lying about
the machine.

**A slot with its fuse pulled is now dead, not dimmed.** Colour drains out of it,
the plate goes grey, the circuit lamp is out and NAV's LCD is a **grey**
rectangle rather than a blue one showing nothing — the backlight is what makes an
LCD blue, and getting that wrong is the clearest tell that a screen is a `<div>`.
A component running and a component switched off should not differ by *opacity*;
that is a form disabling a field.

**The latch lost its word.** It is a knurled bar across the bottom edge of the
panel with a machined thumb recess in it, and finding out what a handle does is
the whole of what a handle is. The accessible name stays, because a screen reader
cannot pull it and see.

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
