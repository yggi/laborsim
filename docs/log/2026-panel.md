# LOG 2026 — the panel

Archived from `LOG.md` when it reached its 1000-line gate. Newest first, as
it was there. Four sessions in which the dash stopped explaining itself and
became a panel: prose replaced by marks, real fuses and a bus tap in the rail,
the cage, and a slot that owns its own power and mode.

---

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
