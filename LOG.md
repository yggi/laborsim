# LOG.md — worklog

Append-only. Newest first. What was actually done, and closed cards.
Not plans, not open questions.

**Gate: 1000 lines.** On overflow, cut the oldest year into `docs/log/<year>.md`
and link it from the archive list below.

Archives:
- `docs/log/2026-early.md` — the scaffolding and rung 1, up to the first deploy.
- `docs/log/2026-mid.md` — the cab: the pipeline rack, the damage ledger, the
  dash and the triptych.
- `docs/log/2026-panel.md` — the panel: prose replaced by marks, real fuses in
  the rail, the cage, a slot that owns its own power and mode, and GRIP and SLIP
  folding into one instrument.

Entry format:

```
## YYYY-MM-DD — title
Cards: [id] ...
What happened, in past tense. Anything tried and rejected, and why.
```

---

## 2026-08-26 — a build per branch, and the one that was eating the others

Cards: none. Found while answering "how do I always get a build per branch": the
answer was *you do not, and you have not been*.

**The deploy was a race, and had been since branches were added to it.**
`pages.yml` triggered on `main` and `claude/**`, but the `deploy` job had no
branch condition and `actions/deploy-pages` replaces the entire site with one
artifact. So every branch push overwrote whatever was live, including `main`'s.
The evidence was sitting in the run list: the suspension and exercises branches
deployed twenty-three seconds apart, both green, and only one of them was on the
site afterwards. Nothing reported this, because from CI's point of view both
deploys succeeded.

**One site, one directory per branch.** `main` at the root, everything else at
`/b/<slug>/`, with `/b/` an index of what is currently up. That needs a site
that can be *modified* rather than replaced, so publishing moved off
`actions/deploy-pages` and onto the `gh-pages` branch (Pages source is now
**Deploy from a branch**, which is a one-time switch in Settings).

The read-modify-write is in `scripts/publish.sh` rather than inline in the
workflow, for one reason: its failure mode is deleting somebody else's preview.
Publishing `main` clears the root **except `b/`**, which is the whole trick and
is one line worth being able to find. `SITE_REMOTE` overrides the remote, so it
was rehearsed against a scratch bare repo instead of against the live site —
publish main, publish two branches, republish main and watch the branch
directories survive while a stale hashed asset does not, remove a branch, remove
it twice, refuse to remove the root.

`.build` is stamped from the **commit**, not the clock. With a timestamp, every
re-run produced a diff and the "nothing to push" path could never be taken; with
the commit, a workflow re-run on an unchanged commit is genuinely a no-op and
the gh-pages history is a list of real changes.

The index is a surface, so it was looked at rather than reasoned about — 390 px,
light and dark. It wraps the stamp under long branch names, which is fine.

Not done: the older `claude/**` branches still carry the previous `pages.yml`,
so a push to one of them would still try the old whole-site deploy. They are
merged or stale; the first one that is not gets rebased.

**And a doc pass, because the README had been lying for a while.** It said "no
rack yet", which stopped being true around L-015's ancestors, and "watch SLIP",
which stopped being true when SLIP folded into TRACTION. `META.md` and `LORE.md`
were missing from its own map of the repo. Worse was `roadmap.md`, whose opening
argument was *the damage ledger does not exist, in any form, not even a console
line* — the single largest gap it named has been closed for days, and the
document says in its own header to rewrite it when it stops matching the board.
Marked reviewed rather than rewritten: the loop table gained a second column,
the closed items in "Now" are marked closed, and the critical reading's first
point is struck through and answered with what the largest gap is now — that
everything the loop says, it says after the fact and in words. `L-032` is what
changes that, which is an argument for the board's existing order rather than
against it.

---

## 2026-08-26 — the springs and the exercises meet

Cards: none closed. Merged `suspension-springloaded-audio` and
`missions-waypoint-levels` — two branches taken from the same commit, each green
on its own.

The code conflicts were all seam-level and none of them was interesting: an
import line where both had added one, `generateTerrain` gaining a `relief`
parameter in the same breath as `makeRutTerrain` appearing beside it, and the
spawn height, where the suspension's *few centimetres over its own ride height*
had to take the exercise's `relief` as its argument. `heightAt` had already
grown `relief` on one side and was untouched on the other, so git took it.

**The interesting part is what merged cleanly and was wrong anyway.** Nothing
either branch could run would have caught either of these:

- `everything-at-once` exists to be the mix's worst case, and the merge gave it
  a worst case neither branch had ever rendered: a rut under the running gear
  **and** the rig calling the exercise complete, on top of the horn and a pipe
  stack. Both sides' edits to that scene landed side by side without a conflict.
  Re-measured rather than assumed: **0.865**, still inside the ceiling, because
  the bogies duck under the horn like everything else. `sound.md` said 0.88 and
  now says what the merged scene measures.
- `npm run cab` had been broken since a schedule became the app's first screen —
  it opens `/`, waits for the canvas, and reaches for NAV-1's grip, which is
  behind the briefing. It fails by timing out after thirty seconds, which is
  loud, and nobody ran it. Reproduced on the missions branch alone in a worktree
  to be sure the merge had not caused it. Fixed with an `openCab()` that presses
  BEGIN EXERCISE, which is also what starts the clock, so the shots are of a
  drive rather than of a frozen site.

Everything else agrees: 231 tests, typecheck, lint, build, 20 audio scenes and
19 cab shots. `the-rut` reads 0.048 between channels and `checkpoint` 0.473, the
numbers each branch reported, so neither change moved the other. The
end-to-end mission test — E-01 driven to completion by NAV-1 — passes against
the sprung running gear, whose grip window moved from ~40° to 34–36°; E-01 tops
out at 18°, so the ladder's first rung still clears the new model with room.

The four doc surfaces were the real merge. Both branches had trimmed `NOTES.md`
to exactly 100 lines and their union was 105; the equal-share normal-load thread
was deleted rather than reconciled, because the springs answered it and the
other branch had only reworded the question. `BOARD.md` history went to eleven
and L-029 dropped off the bottom — it is in `docs/log/2026-mid.md`. `LOG.md`
kept both session entries and then this one, which put it at 1024, so the two
GRIP/SLIP sessions went to `docs/log/2026-panel.md`, whose subject they finish.
`META.md` gained the lesson this session cost: **green plus green is a third
state nobody measured.**

---

## 2026-08-25 — the running gear is sprung, per contact point

Cards: [L-062] closed. Answers the NOTES thread on equal-share normal load, and
takes L-021's blocker with it. Opened: the suspension has no instrument and the
belt does not conform.

**Twelve springs, one per contact point.** Each track's six ray samples became a
**bogie** — a wheel on its own spring and damper, hanging off the track frame —
and the track blocks stopped touching the ground at all (a Rapier collision
group; they still shove cones and climb barriers). Nothing rests on a rigid box
any more, so a rut is something one corner of the machine finds rather than
something a 3.4 m block spans.

The spring rate is **derived, not chosen**: a suspension is specified by the ride
height it settles at, so `spec.ts` carries travel (0.16 m) and static sag
(0.072 m) and the rate is the weight divided by the sag. That has a property
worth the trouble — press the springs down by their sag and the wheel is exactly
at the bottom of the track, where the belt has always been drawn, so the parked
machine sits *precisely* where it sat before and nothing in `render/` moved.
`ZETA = 0.45` is the second number in the file that is not a dimension, and it
is a damping ratio; the coefficient follows as `2ζ√(km)`.

**Three defects surfaced, and all three were in the old model.**

- *The friction model over-corrected by a factor of three.* It spent an equal
  share of the machine's mass at each contact, which ignores that a push at
  ground level also *turns* the machine — the centre of mass is 1.3 m up, and
  `m·h²/I ≈ 2`, so the second term is bigger than the first. Rigid belts lying
  on the ground hid it; on springs it appeared instantly as a two-step limit
  cycle, ±0.14 rad/s of roll, for ever, with both tracks reporting **100% grip
  in use while parked on a level pad**. The fix is the textbook **effective
  mass** at the contact, divided between the bogies sharing the correction.
  Physics still caps at `mu · N`; the share only relaxes.
- *The damper answered to the wrong thing.* Projecting the hull's velocity onto
  the suspension axis cannot feel the ground coming up to meet a wheel, and it
  left the damper permanently carrying 6% of the weight at rest — a half-step
  gravity artefact that surfaced as a **parked machine clocking 3.7 metres a
  minute onto its own odometer**. Differencing the strut's own travel, which is
  what a travel sensor measures, fixed both.
- *The spring had to be a force, not an impulse.* Rapier integrates a force in
  the same breath as gravity; an impulse lands half a step away from it, which
  is where that phantom velocity came from.

**The voice, at last.** L-062 was refused when the machine got its voice, on the
grounds that a knock with no quantity behind it is a sound effect wearing a
simulation's clothes — the right call, and the way out was to build the springs
rather than to relent. The quantity is **the watts a side's dampers dissipate**:
zero parked (a spring is loudest when the machine is heaviest, a damper only
speaks while a wheel is travelling), 7 W at the ninetieth percentile at a crawl,
192 W median and 3400 W at the ninety-ninth at working speed, measured over 80 m
of the default site. Per side, so the ear can hear which track took it — the one
thing no other voice on the machine can say. Bottoming out moves the pitch
toward the stop's own ring and **never** the level: how hard you were hit is
already the watts.

**The bench was blind to it, and the null test said so wrongly.** Silencing the
new voice changed peak 0.606 → 0.634 and left RMS identical — which reads as
*this voice does not exist*. It did; the bench had measured channel 0 for its
whole life, and a scene's loudest instant is loud on both channels. It now
reports **the widest gap each way between the channels, and when**, over 12 ms
windows: 0.008 silenced against 0.048 playing, at the exact seconds `the-rut`
puts a rut under each track. A null test only answers if the instrument can see
the claim.

**The cab got quiet, and that is the suspension working.** Re-measuring the ride
afterwards: the ninetieth-percentile hull jerk fell from **416 m/s³ to 23**,
eighteen times less, with the median unchanged. So the rattle's two constants
were refitted to the new ride rather than turned up to hide the change, and the
`rough-ground` fixture was refitted with them — the ground now speaks twice,
loudly at the running gear and faintly in the cab, filtered by the thing that
separates them.

Consequences elsewhere, each measured rather than assumed: a 2.4 m landing is
three hull events (1.57, 2.58, 1.84 m/s) instead of one, because the bogies take
it over three steps; the out-of-margin-but-still-gripping window moved from
around 40° to 34–36°, because weight transfers off the front bogies on a climb
and they saturate first; and two tests that had encoded accidents were rewritten
to state their claims — the margin/grip one as two thresholds crossing rather
than a fraction of steps at one grade (it read 0.78 at 34°, 0.04 at 35° and 0.77
at 36°, a coin toss on `SLIPPING`), and the teleport helpers as the five
centimetres they always claimed rather than the metre of fall they were.

Also: `makeRutTerrain` — flat ground with one bank under one track, the sibling
of the ramp, because a claim about sides needs ground with a known shape.

---

## 2026-08-25 — the rig asks for something, and can be satisfied

Cards: [L-065] closed. [L-064] made room for this entry but is **not** closed —
`MEMORY.md` is back to 299 of 300, which is where it started.

Missions, as far as the first two steps of `docs/design/missions.md` go: reach a
marker, then reach all of them. The interesting decisions were nearly all about
what *not* to build.

**One objective verb.** An `ObjectiveKind` enum ("reach one" / "reach all") was
written first and deleted within the hour: those are the same sentence with a
different pin count. So an `Exercise` carries a `RouteSpec` and the ladder is
`count: 1` → `3` → `5`, which meant the second level cost nothing at all — it was
already built by the first. Steps 3–5 (use a tool, collect, move X to Y) each
genuinely are a new verb and will each cost one. Rejected with it: requiring the
markers in order. NAV-1 walks a route in order and a pair of levers has no way of
being told to, so the objective is order-free and the debrief records the order
you actually took as split times.

**The ladder is the ground, not the task.** `relief` scales every octave of the
terrain generator, so the first site is the same site turned down rather than a
different generator — 18° steepest against a 43.5° climb limit, climbable
everywhere. That is in the test as an angle rather than as an adjective, along
with the full site being *above* the limit: a trainee who cannot get up a hill
has to be finding out something about their driving.

**"You can already see the flag" is a cone**, `z > 0 ∧ |x| ≤ 0.34·z`, not a hope
about a seed. A first exercise you can fail by facing the wrong way teaches the
wrong thing.

**The rig got a voice, and `sound.md` had said it would never have one.** That
rule was written when the only things the rig owned were the camera and the
volume — furniture, and furniture making noises would be the training system
reaching into the cab. An objective is not furniture: nothing in the world can
announce a marker, because the machine does not know what a marker is, the marker
is a stake in the ground, and NAV-1 may not be fitted. So the rule was narrowed
rather than repealed — **the rig speaks about the exercise and nothing else** —
and the cues are the only voices made of intervals and the only ones whose tone
does not bend downward, because they are generated rather than struck. That last
part is `Knock.bend`, one optional field, and it is the whole graph change: a cue
is a short tone, which `knock()` already builds.

**The bench earned its keep again, in the way META keeps describing.**
`exercise-failed` measured **identically** with the cues silenced on its first
run — peak 0.351 either way. Nothing was wrong with the cue; the scene opened
with a 180 J scooter and ran the drive note at 0.6 of full, and between them the
bang and the bed owned the peak. Fixing the *scene* rather than the voice also
made it truer: a scooter **nudged** at 30 J from a crawl, which is how anybody
actually clips one, and categorical failure for it. It now reads 0.298 against
0.212 silenced. `checkpoint` reads 0.473 against 0.367. `everything-at-once` took
both cues on top of everything else and still peaks 0.884, because they duck
under the horn like the rest of the bed.

**Where the objective is drawn matters.** The strip is `src/ui/`, does not sweep
with the cab, and costs no glass — the panel budget prices what a *manufacturer*
bolted into your cab, and the rig is not a manufacturer. Had it gone on the dash,
the machine would have had to know what a marker is.

**The debrief can say yes.** It had exactly one verdict and it was always a bill.
There is an outcome band, an objective block with split times, a stopped clock,
SCHEDULE, and NEXT — which is the only green thing in the folder and only appears
after a success. RESUME still comes first on every outcome, including a completed
one: a finished exercise is still a site, and the rig does not confiscate it.

Two things found by driving it rather than by testing it. The debug telemetry
column and the new objective strip both owned the top-left corner and overlapped;
the debug one moved, because one of them is for a player. And **turning NAV-1 on
by itself does nothing** — it sits below the pilot with verb `CAP`, so parked
levers cap guidance to zero. That is the dead-man's throttle and the acceptance
scenario working perfectly, met by a first-timer with nothing to tell them
whether they are looking at arbitration or at a fault. Carded as L-066 and
deliberately *not* fixed by changing the rack default, which would repeal the
best thing in it.

---

## 2026-08-25 — the lever gets a gasket, and starts pivoting

Cards: none. [L-051] narrowed again — the levers are hardware now and still
have no maker.

**A rod that changes length is not a lever.** The stick had a fixed foot and a
grip that travelled the whole control, so the shaft stretched from 19 px to
160 px across the throw — at full back the grip arrived at the deck with no
shaft left under it, which is a telescope, not a lever. Three changes, and the
third is the one that mattered:

- **The foot moves.** A lever pivots under the deck, so the crossing point at
  the floor travels too — a fifth as far as the grip, same direction. That
  parallax is what says pivot. It slides in a **gasket**: a rubber slot cover
  elongated along the throw, dark inside, with the shaft's cut end visible in it
  so there is something to watch move.
- **It leans.** A lever at the edge of the glass moves toward the vanishing
  point as it goes away, so the left one leans right going forward and the right
  one leans left. The component takes a `side` now; the rod is drawn as a
  rotation about its foot, which is why its length is geometry rather than a
  box's height.
- **The drawn swing is a third of the drag.** The thumb keeps the full 196 px,
  because a control wants a comfortable drag. The lever draws 44. Everything
  above follows from separating those two numbers, and the collapse at full back
  was entirely the cost of confusing them.

Found by measuring, not by squinting: a foot crop kept looking like the gasket
floated above the dash. Reading the actual pixel column said otherwise — the
shaft ends exactly where the maths puts it and the gasket does tuck behind the
panel; what was wrong was that the hole was barely wider than the shaft, so the
rim never showed. The bench now shoots both levers at opposite ends of their
throw in one frame, and crops the feet, because a gasket is 50 px of an 844 px
screen and a full-frame shot of one is a smudge.

Also fixed: `npm run cab -- app-lever` ran the whole app section and took no
shots, because the section's gate only knew about the look shots.

## 2026-08-25 — the levers lose their box, and a hand that never let go

Cards: none. [L-051] narrowed again. Merged branches cleaned up — see below.

**A bezel is the last thing left of a widget.** The levers had a housing: a box
with a border, a background and a slot milled into it. Against a photograph of a
real cab it is obvious what is wrong — a travel lever stands in the open, in
front of the glass, bolted to the console it comes out of. So the box is gone.
The sticks now rise out of the dashboard with their feet behind the panel (the
deck paints over them, which is the whole trick: a stick that stops cleanly above
the panel is a stick *resting* on it), the gate went with the housing since there
is nothing left to cut a slot into, and what remains is shaft, grip, boot and a
machined mark at neutral so HALT is still a place rather than a number.

The per-lever readout went too. The throw is legible as a position now, the dash
carries what the tracks are doing, and a label floating on the glass was the last
piece of UI in a view that is trying to be a cockpit. Longer travel while we were
here — a housing wants to be compact and a lever wants to be long.

**Found by looking, again, and it was a real defect.** The bench pressed a lever
and panned the view instead. The cause was not the lever: the *previous* gesture
had dragged off the left edge of the window, so the canvas never saw its
`pointerup` and went on believing a hand was on the glass. Before the neck was
sprung that only meant a look you had to undo. Sprung, it means the cab is parked
over your shoulder permanently, and a thumb leaving the glass mid-swipe is not an
edge case on a phone — it is how swipes end. The canvas captures the pointer now,
and treats a lost capture as a released hand.

Every branch in the repo is merged into `main`; four are dead and this
environment's git proxy answers 403 to a ref delete, so they need deleting from
the GitHub UI or a machine with credentials.

## 2026-08-25 — a cab that goes round you, and levers you can hold

Cards: none closed. [L-051] narrowed — the cab furniture has geometry now and
still has no maker. Merged the audio branch in; see the merge commit for what
had to be reconciled.

**The cage stops being a frame and becomes a cab.** Sweeping the whole cab
(L-050) made a hole nobody had to look for: the A-pillar leaves the glass at
about 26° and behind it was sky. So the cab now continues past the windscreen —
a ribbed roof with the beam's underside showing, a door post out each side with
side glass and a waist rail between, and beyond the post a **door skin** wide
enough to outlast the neck. The head pans to 86°, which at 1:1 is thousands of
pixels, and a wall that ran out first would be a hole at exactly the angle you
were curious about. The vignette at the very edge stays put on purpose: it is the
aperture, not a part.

**The vertical look was inverted against itself.** Dragging right looked left —
grab-the-world — and dragging down looked *down*. One convention, not two: both
axes drag the world now.

**The neck is sprung.** The 1.2 s hold before the view eased back put a dwell in
the middle of a glance; it now starts the instant the hand leaves the glass. The
renderer is told `hold(true/false)` rather than being given a timestamp, because
the state is *a hand is on the glass*, not *a gesture happened*. `recentre()`
went with it — opening the rack no longer has to ask for the view back, because
nothing is holding it.

**The levers are sticks.** A shaft up through a ribbed rubber boot on a bolted
plate, a moulded grip, a gate with a notch at neutral — same place, same throw,
same dead zone, and not one line of the pointer maths changed. Pulled back is
drawn 8% larger, because the seat looks *along* the machine and a fore-and-aft
lever mostly moves toward you and away from you; with no perspective at all it
reads as a grip sliding in a groove, which is the slider it stopped being.

**Found by looking, twice.** The bench pulled a lever it did not mean to: the
levers sweep with the cab, so a drag started while the cab was still out landed
on one that had slid under the pointer. That is the cab being honest and the
bench being wrong — it waits for the spring now. And `npm run cab` vanished from
`package.json` during the merge, because `git checkout --theirs` ran before the
edit that was supposed to keep both, so the edit matched nothing and said
nothing (META: a scripted edit that matches nothing fails silently). The bench
failing to start is what said so.

## 2026-08-25 — the cab is one rigid object

Cards: closed [L-050]. Opened: [L-064]. History trimmed to its gate: [L-037]
dropped, already narrated below.

The card was ready and half of it was already built — the view has recentred
itself since L-052, and the card still listed it as work. Two decisions were
genuinely unmade, and they were the whole design: **what sweeps when the pilot
looks around, and how fast.** Answered: the *whole cab*, and *1:1*.

**The whole cab.** Pods, cage, levers and dash are one welded object; the neck is
the only hinge. Anything else is incoherent the moment you look at it — a pod
clamped to a cage that does not move is a sticker. The rig's own controls (the
CAB/CHASE switch, the toasts, the debrief) stay put, which turns out to be a
usable rule: **the machine's furniture moves, the rig's does not.** One
deliberate exception, the vignette at the edge of the glass: it is the aperture,
not a part, and a dark band crossing the middle of the view reads as a bug.

**1:1, at `f·tan θ`.** A rigid object rotating past a pinhole projects that way;
anything less is a cab made of rubber. On a phone it is brutal — 390 px of glass
is 26° across and the head pans to 86°, so a glance takes the instruments off
the screen almost at once. That is the price, and it is the chase camera's
bargain again: a glance costs you the levers and the E-STOP, which you cannot
find by feel on glass. The recentring view is what pays it back. Carried to
`NOTES.md` as the one thing only a player can settle.

**One DOM write a frame.** The renderer publishes the sweep in CSS pixels — it
owns the projection, and `focalPixels` is the seam — and the app writes
`--look-x`/`--look-y` on `:root`, not on the shell, whose `style` attribute
belongs to Svelte and would overwrite it. Read as **`translate`**, never as a
second `transform`: every cab element already has a transform, and the deck's
carries a 0.28 s transition that a per-frame value must not be fed through.

**The bound became the arm.** Placement moved into cage space (screen space at
the neutral look), and a drop is refused by structure: not through a pillar, not
behind the beam or the dash, not further out than 200 px of reach. That puts the
middle of the windscreen out of reach — the occlusion budget with a *reason*
instead of a rule. Rejected: hanging every pod from the header beam, which is
tidier and says nothing about the middle of the glass. The consequence beat the
intent: a **small** instrument still reaches the centre, because a short pod on a
long arm does. Cheap in view, free to place. Nobody designed that.

The arm is **drawn**, back to its pillar, so a refusal is visible rather than
inferred. And an arm **settles** a pod that does not fit — instruments are
whatever size their maker made them, the dash grows a row as kit is fitted, and
phones get turned sideways; L-056 no longer inherits pods stranded off-glass.

**Three defects, all found by looking.** The cab bench grew an app half (`npm run
cab` boots the real thing and drags on the glass) and it paid immediately: the
KIBA nag never fired, because `lastNag = 0` means "45 s since the epoch", which
a page a minute old has already passed — the *first* nag is the one that teaches
you the view comes back. Then the cab kept photographing 25 px off centre at
2.6 s and again at 5.6 s: the recentring ease was a flat fraction **per frame**,
so a phone at 30 fps got a neck twice as slow — on the device the mobile-first
pillar is entirely about. It is a time constant now. Third, the bench itself
pressed where a pod *used* to be after moving it, which pans the view: a
placement test quietly became a camera test.

The bench also carries the check a screenshot cannot make: everything bolted to
the cab moved by the same amount as `--look-x`. Reintroduced the bug to watch it
fail (META) — it named `.levers` and exited 1.

Not added to `MEMORY.md` again, and now it is a card: the file is at 299 of 300
and two durable facts are parked in the spill files waiting for room. [L-064].

## 2026-08-25 — the horizon rolls with the machine

Cards: none. A defect in the cab camera, plus the bench that was missing to see
it with.

**The cab view was spirit-levelled and nobody had asked for that.** Lean the
machine over and the horizon stayed dead flat; only pitch and yaw followed the
hull, which is why it survived this long — the view leaned honestly into a climb
and then stayed level through a side slope. The cause was not a decision. The
camera was aimed with `camera.lookAt(aim)`, and `lookAt` produces the
orientation with *no roll about the view axis relative to its up vector*; the up
vector was world up, so the hull's roll was discarded every frame, silently.

Fixed by composing the orientation instead of aiming it: `hull · yaw(−pan) ·
pitch(−tilt) · Ry(π)`, the last term being the half turn between a camera that
looks down −Z and a machine whose nose is +Z. New file `src/render/camera.ts`,
which exists to be testable — `createViewport` needs a WebGL context and the
signs do not.

**Signs derived, not tried** (META), and checked against the aim vector they
replace: the composition reproduces the old direction exactly, so pan and tilt
could not silently mirror while roll was being added. Then the other half of
that lesson — the old implementation was pasted back in over the new one to
watch the tests fail. Four of the five passed under it and only *rolls with the
hull* failed, which is what makes that test worth having; a fifth run with a
plain `Object3D` instead of a camera failed four, because `Object3D.lookAt`
flips its convention for cameras and lights. Probe the API, do not trust the
prose.

**`npm run cab` — a bench for the view through the glass.** `npm run shots`
benches the cockpit's DOM and nothing benched the 3D. The obstacle was never the
renderer, it is that the interesting frames are transient: 25° of roll is a
thing you drive into and cannot hold. So `scripts/cab.mjs` builds the real world
and the real viewport and hands the renderer a pose set by hand — the cockpit
bench's trick, one layer down. Seven poses, gitignored output. It paid for
itself inside the same hour: the roll direction was confirmed from a screenshot
rather than argued about.

Recorded in `docs/design/cockpit.md` as its own section, with the two
consequences: screen-fixed pods now read as wrong rather than unfinished
(L-050's case just got stronger), and roll is the classic sim-sickness signal —
if it ever needs mitigation the honest form is a damped *fraction* of hull roll,
never a level horizon. Deliberately **not** added to `MEMORY.md` § 6: the file
sits at 299 of its 300 lines, and a cab with no gimbal is principle 7 (*honest
world, real machine*) applied rather than a new fact — the index entry now
points at both cameras.

## 2026-08-25 — the event channel, and the machine's voice

Cards: closed [L-040]. Opened: [L-060]. Threads closed: none. Evidence added to
[L-057] and [L-046].

**The contraction came first, and it was already earned.** Three files were
keeping their own high-water mark into `snapshot.damage` and diffing it every
frame — the live voice, the renderer repainting a write-off, and the debrief —
and two of them carried a private hack to notice a RESET, because the list
getting *shorter* was the only clue a run had restarted. Audio would have been
the fourth. `src/core/events.ts` is the discrete half of the boundary: the sim
stamps every happening with a monotonic `seq` into a bounded ring, a consumer
keeps one number and one reader, and the rewind rule lives in one place instead
of being reimplemented per list and per cause.

The channel is the notification and the ledger stays the record. That split is
why the ring can be bounded: nothing consuming it wants a thump it failed to
play thirty seconds ago, and anything that needs the whole run still reads
`snapshot.damage`.

**Two things the ledger could not say now reach it.** `assessDamage` had always
measured the joules delivered into every prop every step and thrown the number
away unless it crossed a pricing threshold — so hitting an already-written-off
cone was, to everything downstream, identical to missing it. And the machine's
own collisions had no witness at all; they do now, thresholded on a **speed**
rather than an energy, because the track model caps its impulses at `mu·N·dt` so
0.16 m/s per step is all the drivetrain can shed however hard you brake.
Anything past that was the world. L-038 wants that number.

**Found by turning it on:** the untouched generated site emits one impact at
tick 109 — a marker pole falling over on its own, 1.6 J, unbilled and until now
invisible. Nothing is wrong; that is L-057, and the channel is the first thing
in the codebase able to see it.

**Then the voices** (`src/audio/`). Five, none of them sampled: the drive note
carrying load, the grind carrying slip, impacts scaled by joules, the hull on
its own scale, and the horn as the audible half of the master lamp. The
arithmetic is in `voices.ts` with no WebAudio in it, and `engine.ts` is the only
file that knows an oscillator exists — which is what lets the graph be built on
an `OfflineAudioContext` exactly as on a live one.

**Rejected: putting the mute on the dash.** A Labor's horn has no cut-out, which
is the entire point of a horn, so a machine with a "make me quiet" switch would
be a machine nobody would certify. Volume is the *rig's* control and sits with
the camera, which is the other thing that belongs to the room rather than to the
machine. The same reasoning settled where the acknowledgement lives: it moved
out of `DashPanel` and into the shell, because the lamp and the horn have to be
one fact and the beacon will be the third to read it.

**The bench found three defects nothing else could have.** `npm run listen`
renders every scene through the real graph in Chromium and prints peak, loudness
and brightness at each end of it:

1. Its own first brightness measure was blind. Zero-crossing rate is a standard
   cheap proxy for spectral centroid and it does **not move** when a filter
   opens on a periodic waveform — a lowpassed sawtooth crosses zero twice a
   cycle at 340 Hz and at 2600 Hz alike. It reported the entire `labouring`
   sweep as six hertz. Replaced with the fraction of energy above 1500 Hz.
2. The continuous voices were loud enough to sit permanently inside the limiter,
   so a 140 kJ landing came out no louder than driving along. Halved, and the
   limiter moved from −10 dB to −4.
3. The strike's filter was tied to the ring pitch, which made the heaviest
   impacts the dullest, because the heaviest things ring lowest. The ring is the
   material and the strike is the energy; they are separate numbers now.

A fourth fell out of (2): opening a sawtooth's filter can only ever move a few
percent of its energy, so brightness alone was a cue visible in a spectrum and
inaudible across a room. Load makes the machine **louder** as well now.

**Two more found by reading the diff back adversarially**, both about lifetimes.
The live voice was unmounted whenever the rack opened, so its reader rejoined the
run at zero and re-voiced every line still on the channel the moment you closed
the cabinet — a bug that predates the channel (the old high-water mark restarted
at zero too) and was simply invisible while the whole damage list was in reach.
It is hidden now, not destroyed: a subscription belongs to a consumer's lifetime.
And the E-stop lights the master at ALARM *and* opens the debrief in one press,
so the horn was blaring under somebody explaining what you had just done. The
folder silences it. Both verified in the browser rather than in the stylesheet.

---

## 2026-08-25 — the horn, and a panel that clicks

Cards: closed [L-063]. Threads: narrowed "does a component ship a voice?".

**The machine had a horn and it was the wrong one.** What was called `horn` is
the annunciator's **buzzer**: it sounds by itself, it is the audible half of the
master lamp, and it stops when you acknowledge it — the machine talking *to
you*. A truck horn is you talking to everyone else. They were sharing a name and
a slot in the sound house, and separating them is most of the design.

An air horn is a **chord**: two or three trumpets on one air line, tuned to an
interval and blown together, which is why it is satisfying rather than merely
loud. So a house declares a root and the ratios stacked on it — KIBA gets a
major triad off 214 Hz, HANSA the two-tone fifth every European klaxon has used
since the war, TOWA a moulded sounder an octave apart with no air in it at all,
which carries about as far as a doorbell. The mechanism around the chord is the
same on everybody's horn and lives in `voices.ts`: the trumpets are never quite
in tune with each other, the diaphragms take a moment to speak and bend up into
pitch, the valve chuffs before the note arrives, and the tank sags through the
release. That last one is the *owp*.

It is the only voice in the game that renders a **decision** rather than a
simulated quantity, which is what earns it the loudest level on the machine —
every other number in `voices.ts` leaves room for the site and this one takes
the room. It also **ducks everything else** about 7 dB while it is down: three
trumpets at arm's length are all you can hear.

That duck arrived from a new bench scene rather than from taste.
`everything-at-once` — rutted ground, the horn down, a pipe stack at speed and
the master alarming, all inside a second — **clipped at 1.04 on its first run**,
which is the scene's whole job, the limiter's justification being summed
transients. With the duck and the horn's level set against it the worst case
peaks 0.88 and the horn alone 0.81.

**The panel is switchgear now.** Two events, because a real control is two: a
**click** for the button bottoming out and a **clunk** for the contactor behind
it letting go, a fraction later and much lower. The gap between them is the
difference between a panel and a website, and it is the only way to hear that a
switch did *not* do anything. KIBA is sprung steel with a fist-sized contactor
behind it; TOWA is a membrane over a dome switch with a solid-state relay that
makes no noise at all, which is either refinement or a machine that will not
tell you what it did.

The part worth keeping is **where it comes from**. Almost every switch on the
machine is already on the recording — flipping a component off changes its slot
on the snapshot — so the engine notices the change itself and plays it, exactly
as the scene notices that a prop moved. Nothing was added to the event channel
and nothing in the cockpit tells the ear it was pressed, and because it is on
the recording **a replay clicks too**. Only cab furniture the machine does not
record needs a direct channel: the cabinet latch, the acknowledgement, an
instrument clamping home on its arm. The shell already owned every one of those
callbacks, so `Audio.panel` was the whole of the plumbing.

The camera and the volume stay **silent**, and that is a decision rather than an
omission: they are the training rig's furniture, and the rig does not reach into
the cab and make noises.

**The panel was inaudible when it was finished, and the bench said so.** The
`switchgear` scene measured *identical* to a scene with the panel's gain set to
zero — five switch events firing correctly at the right moments, and not one of
them loud enough to matter. Fourth time the same lesson has been paid for here:
a click is a few milliseconds of filtered noise and almost all of it is thrown
away by the filter that shapes it. At three times the level it peaks 0.33 where
the same scene without the panel peaks 0.16.

Two things that came out of chasing it:

- **The null test is the check.** Setting the new voice's gain to zero and
  re-rendering is what turned "it sounds fine to me" into a number. It took
  about a minute and it was the only thing that would have caught this.
- **RMS over a fifth of a scene cannot see a transient.** Four clicks move it by
  a thousandth. For a scene about transients the honest column is the
  whole-scene peak, and the file is there to be played.

`Audio.render` takes a `CabState` — the acknowledgement and the horn — rather
than a bare condition. Both are things the *hands* did and neither is on the
recording: nothing on the site can hear a horn, because nothing on the site can
hear. When a citizen can, the horn becomes a sim input and joins the recording
where the levers are.

192 tests, seventeen bench scenes, nothing clipping, and the cell toggles, the
latch, the acknowledgement and the stop all checked in the browser with a live
context.

## 2026-08-25 — the machine gets a maker's voice, and three more of its own

Cards: closed [L-061]. Opened: [L-062]. Threads: opened "does a component ship a
voice?", closed "pods on arms" (it had crystallized into `components.md` and
L-050 and was being kept in three places).

**Sound got an owner.** A manufacturer was already three things — how its kit
looks, what words it uses, what it says to you — and it is four now. The
machine's drivetrain, running gear, loose fittings and horn are voiced by the
house of whoever built the **chassis**, read off the chassis slot on the
recording exactly as the dash reads its panel colours, so a replay sounds like
the machine it recorded. Nothing in `src/audio/` names a manufacturer.

The other two owners were written down because they are the ones that get got
wrong later: a **component** is voiced by its own maker rather than by the
chassis, and the **site** is voiced by materials and belongs to nobody. A pipe
stack is steel whoever stacked it.

**The house moved out of the cockpit** to `src/makers/`. `cockpit/` holds what
the manufacturers made; a house is who they are, and it now has two readers. One
house per maker rather than one table per surface — three places to edit a
manufacturer into existence is three places for it to drift, and it is also what
L-049 hands a blind author: one object is one manufacturer.

**A house may set timbre and rate; it may not set level**, and it may not decide
what a quantity means. That is the rack-unit rule in another medium — a maker
cannot make its plate taller to get more attention, so it cannot make its machine
louder either.

All three houses are complete, including HANSA, which does not build chassis. The
bench renders a TOWA chassis that does not exist, and the result was better than
the argument for it: TOWA's drive is electric, so against the same load ramp KIBA
hardens 17% → 23% brightness while TOWA sits flat at 12% → 11%. **A TOWA machine
hides its own labour from you.** Refinement as a trade rather than an upgrade,
and it fell out of characterising an electric drive honestly rather than being
designed in.

**Depth, and four voices.** The drone got a detuned twin and a firing pulse; the
machine got a **chain** (one knock per track plate at `commanded / GROUSER_PITCH`
— the rate the renderer already turns the belt at, so you hear what you see and
a racing belt under a stationary machine makes slip audible), a **squeak** (a
dry bearing under load at a crawl), and a **rattle** (the cab, answering to the
hull rather than to the drivetrain — the only voice that renders the *ground*).
Impacts stopped being identical: the wobble is drawn from `seq`, so a line of
cones is eight different cones and a replay still hits them the same way twice.

**Everything above was measured into place, and nearly everything was wrong
first.** The bench earned its keep four times over:

- The twin at full level doubled every driving peak at unchanged RMS. Halving it
  matched the peaks and *halved* every RMS — two detuned oscillators are briefly
  in phase and spend the rest of the beat cancelling, so they add in power and
  not in amplitude. Same shape of bug in the pulse: a square-cut note is quieter
  than a held one by `hypot(1−d, d)`, and `idle` fell 0.037 → 0.016 RMS at an
  unchanged peak until that was divided back out.
- The squeak and the rattle were both written at "sensible" levels and were both
  inaudible, for the third time in this file's history: **a filtered voice's
  level is not what you hear, its bandwidth is.** The strike was a bandpass once
  and made a 140 kJ landing quieter than a cone. They are set nine and ten times
  the drive note's level and are *not* nine times as loud.
- The rattle keyed off the accelerometer reading, and no function of a reading
  can tell "standing still" from "in free fall" — they read 1 g and 0 g, and
  both are silent. What shakes a toolbox is the floor changing under it, so the
  sim publishes **jerk** as well, differenced at the fixed step. A machine
  flying off a bank is now quiet, and arrives loudly.
- The `rough-ground` scene measured identically to smooth ground twice: first
  built out of sines, which is a wobble and not a ride; then out of sharp spikes
  in continuous time, which the 60 Hz bench sampled straight past. The sim is
  itself a 60 Hz signal, and a probe over the real site says what it looks like —
  median jerk 4 m/s³ at full ahead, ninetieth percentile 416, tail to 5000 —
  so the scene now draws one reading per frame from a curve fitted to that.

`MachineState` gained an accelerometer (`shake`: surge, heave, sway, and the
jerk between two readings). Nothing shows it, and it is a real measurement a
G-meter could read tomorrow, which is the test of whether a quantity was
published honestly. `GROUSERS`/`GROUSER_PITCH` and gravity moved into
`core/spec.ts`, where the picture, the physics and the sound read one number.

Rejected: a **suspension** voice, which is what "clanking suspension" would
literally want. Suspension travel is not simulated, and a voice with nothing
behind it is a sound effect wearing a simulation's clothes. The nearest honest
quantity is a track's `contacts` rising and falling, and the reason that was not
used instead is that no scene can vary it over time yet — so it would have
shipped unheard. Carded as L-062.

The architecture test caught `Math.hypot` in the jerk calculation: it is not
required to be correctly rounded and the value crosses to a renderer a replay
has to reproduce. Rewritten with `sqrt`, which is.

183 tests (169 before), thirteen bench scenes, nothing clipping, and six seconds
of real driving in the browser with the live context and no errors.

## 2026-08-25 — the pod joins the registry, and the seam moves

Cards: closed [L-059]. Opened: [L-057], [L-058]. Threads closed: "props seem to
float".

**The triptych was two-thirds built.** `parts.ts` registered a component's plate
and its cell; the pod — the instrument on the glass, the part that costs you view
— was hand-wired into `App.svelte` as a branch per component, a named position
variable per component, a title spelled out as a string, and a live `Autonav`
reference held so the route scope could call `setTarget`. Fitting a component
with an instrument therefore meant editing the application shell, which is the
exact defect the registry was built to kill. L-049 has been sitting in `ready`
asking three blind authors for a maker's plate, cell **and pod**, with nowhere
for the third one to go.

**One packet per component, not one table per part.** Cells, faces, rack units
and fuse ratings each had their own `Record` keyed by the same id. They are one
`Packet` now: what you unpack when you buy the kit, what an author is asked to
produce, and the single place a component is registered. Unregistered kit still
gets the base-case cell and now explicitly *no* pod — a dash missing a component
is lying, but the registry may not invent an instrument on a maker's behalf.

**One contract for all three postures.** Every part is handed the slot it is
drawn from and the style it is drawn in. Both pods were doing that work
themselves — `stages.find(s => s.id === "NAV")` and a hardcoded
`styleOf("TOWA DENKI")` — so neither could be drawn for anything but itself, and
no maker could re-skin its own instrument. Greps now fail if a part asks for
either.

**Commands cross back through one channel.** `Controls` is `toggle` and
`setParam`, handed to a part exactly as its stage is, and inert for a component
that is not in the live rack — which is what a replay gets. NAV-1's target was
the last control reachable only by holding the module, so it became what it
always was: a bounded number with a name and a unit. `setTarget` is gone. The
visible cost is a TARGET slider on NAV-1's faceplate, and that is the honest
consequence — the scope is a faster way to do what the plate does, not a second
wire into the module.

Rejected on the way: giving `FaceProps` a `controls` for symmetry. A face has
nothing to command — settings are the slot's business — and a container before
its contents is furniture (META).

**The seam moved.** `MEMORY.md` § 11 claimed `cockpit/` held the instruments and
`ui/` the shell; in fact every instrument lived in `ui/` while its own
primitives sat in `cockpit/`. The line is now **the machine against the rig**:
manufacturers' work in `cockpit/`, the training system's work — debrief, live
voice, debug telemetry, shell — in `ui/`. Eight files moved; three stayed, now
for a reason.

That exposed two scanners scoped by accident, which is the `META.md` lesson
about the `:global` ban landing where nothing was watching. Both style bans now
scan all of `src/`; the `--mfg-` rule became **two namespaces and no more**
(`--mfg-` a maker's token, `--cab-` the machine's own structure), because Svelte
scopes classes and not custom properties. And the half that bites: every
property something *reads* must be defined, unless it is a `--mfg-` offer with a
fallback — renaming `--dash-h` had already left a stale `var(--dash-h, 128px)`
in the toasts, which reads as working.

Bookkeeping, all of it forced rather than chosen: `MEMORY.md` hit 309 and lost
its § 9 Rapier paragraph to `docs/design/stack.md`, where the same text already
was, and its coding conventions to a new `docs/design/conventions.md` — each one
now carries the bug that earned it, which the four-bullet version had lost.
`META.md` hit 152, so *look at the numbers* and *ask what ran before your first
observation* merged into **suspect the probe before the system** — they are the
same lesson and the second one is the harder instance — and *one fact, one
place* left for `conventions.md`, where both its incidents live. `LOG.md` hit
1055 and the cab's fortnight went to `docs/log/2026-mid.md`.

**Measured the "props float" thread instead of arguing about it.** The rest gap
under a settled prop is **1 mm at the median** (n=102, lowest oriented corner
against the terrain sample beneath it), so the float is not a gap and never was:
what is left is the ground seam, which is rendering, and is now L-058.

The probe found something much worse on the way, and three wrong turns getting
there. First reading said poles were being *launched* — flipped over and moved
40 cm in a single step — which is impossible, and was: `createWorld` runs 120
settle steps before anything is observable, so "after one step" was never the
spawn state. Second, the obvious cause — furniture placed by sampling the ground
under its *centre*, so a 2.4 m barrier on a 15° bank is born 32 cm inside the
hill — was fixed, measured, and **made it worse**: standing a box on the highest
point of its own footprint drops it onto one corner, and cones toppled 10 → 23.
Reverted. What is actually happening is the boring answer: everything stands for
ten steps and then falls over, because a 3 m pole with a 0.16 m base cannot
stand on 20° noise. **Seventeen of eighteen marker poles, sixteen of
twenty-two barriers and ten of forty-five cones are lying flat before the
exercise begins**, inside the settle window where nobody could see them. Carded
as L-057; the fix is footing in the site generator, not a number in the sim, and
the comment in `world.ts` that called this "a small settling twitch" now says
what it really is.

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

## Cards pushed out of `BOARD.md` history

The board keeps ten; older closed cards land here, in date order.

### [L-008] Inline edit — draggable instruments — **closed** (2026-08-25)
Instruments move by a titlebar, free to place but refused if they leave the
glass or overlap another; they snap back to the last legal spot. All three rules
(free move, no-overlap, in-bounds) verified in the browser. The scope for L-025
(a real glass budget) is now visible.

### [L-036] TILT-GUARD — the first safety component — **closed** (2026-08-24)
Caps drive on hull pitch and roll, limits set by two sliders on its faceplate.
Verb `AMP`, because `CAP` would clamp a positive intent into a reversing
signal's range and turn the machine around — a safety module causing the crash
it exists to prevent. Rejected: reading attitude through `asin`/`atan2` — the
sines come straight out of the quaternion and stay bit-portable. Ships enabled
and deliberately timid (25°/18° against a 43.5° climb limit), so the first
lesson is that your own machine is what stopped you.
