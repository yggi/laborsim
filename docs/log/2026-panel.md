# LOG 2026 — the panel

Archived from `LOG.md` when it reached its 1000-line gate, and added to at the
next one. Newest first, as it was there. Seven sessions in which the dash stopped
explaining itself and became a panel: prose replaced by marks, real fuses and a
bus tap in the rail, the cage, a slot that owns its own power and mode, and
finally GRIP and SLIP folding into one instrument.

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
