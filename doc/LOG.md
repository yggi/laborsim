# LOG.md — worklog

Append-only. Newest first. What was actually done, and closed cards.
Not plans, not open questions.

**Target: 1000 lines, act at 1200** (`CLAUDE.md`). At 1200, **fold** the oldest
sessions into `doc/HISTORY.md`'s narrative and delete them here — they are not moved
intact, because a verbatim archive is what git already is. Cut back to 1000 or
under: a pass that leaves you at 1199 is one you will repeat.

The arc these entries add up to is `doc/HISTORY.md`.

Entry format:

```
## YYYY-MM-DD — title
Cards: [id] ...
What happened, in past tense. Anything tried and rejected, and why.
```

---

## 2026-08-28 — the app gets driven, and the first drive finds a bug

Cards: **[L-075] closed**. [L-087] and [L-088] opened. `CLAUDE.md` gate 1 gained
a command.

**`npm run drive` is a second Vitest project**, not a sixth bench — the card's
open question answered *assert*. `@vitest/browser-playwright` pins to the same
Vitest and peer-depends on the `playwright` the benches already use, so the cost
was one dev dependency and no second runner. Both projects live in one
`vite.config.ts` deliberately: the line between them has to be readable, and a
second config file would let a new check land on the wrong side by not noticing.
The rule dividing them is robby's, which that repo paid for — *if it needs a
browser to be true it belongs in `drive`* — because a two-minute check is one
nobody runs and the eleven-second one is only valuable while it is cheap enough
to run on a thought.

**The gate is the recording's vocabulary rather than a list of buttons**, and
that was the trap in the card's own sentence. *Drive it through its verbs*: a
hand-written list of what to press goes stale the first time somebody adds a
control, silently, in the direction of less coverage. `control/trace.ts` already
enumerates them for a different reason — `Command` is what reached the machine,
`Attention` is what the operator saw, heard and did about it — so the nine kinds
are named once in `tests/browser/verbs.ts` and **two checks share the list**: the
driver presses each and waits for it *by name*, and `tests/architecture.test.ts`
holds the list against both unions in the fast suite, in milliseconds. Neither
half can be satisfied by writing the list down twice. Planting a tenth kind fails
the fast suite in 382 ms.

**Eleven faults planted, eleven failures, each naming its own verb** — BEGIN not
seating you, the levers reaching nothing, the head sweep not reaching the
viewport, the cabinet not dropping your head, a pulled fuse that is not a
command, the stop latching unrecorded, RESET not re-racking. One of them is
**L-070's shipped bug replanted**: reading the camera rune in the run effect,
which the driver reports as *a camera press handed back a different run*. The
fast suite catches that one too, independently, which is the right kind of
redundancy — it is the bug this project has already paid for twice.

**A shipped defect fell out of the first run the driver ever made.**
`audio/engine.ts` was resuming a **closed** `AudioContext` — `dispose()` closes,
closing fires `statechange`, and the listener tested `state !== "running"` and
resumed it. An `InvalidStateError` on every dispose, so on every RESET and every
change of exercise, not merely at teardown. It is L-080's own fix over-corrected:
that session replaced `=== "suspended"` with `!== "running"` to catch
`interrupted` and the other ways a browser stops a context, and **`closed` is the
one state that is terminal**. The prose above the line reasons about all the
others and never about that one.

The reason it survived is worth more than the fix. `createAudio` takes its
context and `createSound` takes its `make`, both with comments saying they exist
so a test can drive them — and `createLiveAudio`, between the two, said
`new AudioContext()` in its body. **A path is only as reachable as its least
reachable link**, and the missing one was in the middle, where nobody notices.
It takes its context now, the condition is one function rather than two copies
that were wrong the same way, and the listener comes off *before* the close
rather than after. Five branches planted and watched.

**The shell grew its first prop**, `makeRun`, so that a run in progress is
reachable — a default parameter rather than a new module, because this call path
already answers exactly that question twice and the second answer was added the
same day. Closing it opened a hole: the guard that watches the run effect for new
dependencies matched `$state` and `$derived` and **not `$props`**, so a prop read
in the most dangerous effect in the app would have been invisible to the rule
written about that exact effect. It matches props now — planted and watched — and
the capture is `untrack`, which is the spelling that says *initial value, on
purpose* instead of the same code with a compiler warning attached.

**Three things the driver had to be told, each of which is a fact about the
game.** Nothing moves until you are seated, because `advance()` feeds the clock
`hands.seated ? elapsed : 0` — so a driver that skipped BEGIN would watch a
parked machine agree with itself, which is how the first replay test managed to
prove nothing. BEGIN *is* a new run, and so is RESET, and nothing else may be. And
a refused pod drop **tells nobody** — `Draggable` eases it back and records
nothing when the drop is outside the cage or overlapping another pod, which is
indistinguishable from a broken drag; the driver measures the glass and moves
along the axis with room in it, because guessing put it on top of the other pod.

**Two cards came out of it.** [L-087]: every bench and both suites boot a *dev*
Vite, `drive` included, so **nothing has ever loaded what actually ships** — a
`BASE_PATH` defect reaches the site green. [L-088]: the levers, which the physical
redesign improved and made harder to use — a thumb that wanders pans the viewport
or is eaten by an Android edge gesture, and the console advertises `role="slider"`
with a live `aria-valuenow` and has no key handler at all, which the driver found
while looking for a way to press it.

**Numbers.** 363 tests in 10.8 s; typecheck 881 files, 0 errors; lint clean.
`drive` is one file: 23.5 s, and 24.5 s on the run before it — a browser boot and
a swiftshader frame are not stable numbers, so treat that one as *about half a
minute* rather than as a reading. The lint run is worth recording: it was first read with
`tail -2`, which showed `Found 1 info` and hid `Found 1 error` on the line above —
the repo's own gate lesson, re-earned within the session that cites it.

## 2026-08-28 — L-075 gets an approach and six spikes, and the first thing to drive the app finds a bug

Cards: none closed. [L-075] spiked, not started.

**The session opened on whether to give this game a solver**, because `yggi/robby`
— a parallel project, a programming puzzle for pre-readers — has one as a core
component, and its `CLAUDE.md` says nothing in that codebase matters as much.
**Rejected, with reasons worth keeping.** Robby's `solve()` is 57 lines of BFS
and it earns its place through *three shipped consumers*: every level's par is
re-derived on every test run, the generator judges candidates with it, and the
editor runs it live. Two of those three are absent here **by design** — `doc/MEMORY.md`
§ 3.2 says no score, no gate, no par time, and there is no level editor. The
third, the generator, is real and open (L-027).

And the search does not transplant: robby has four discrete actions, a cheap
exact transition and a hashable state key; we have two continuous axes at 60 Hz
over minutes with a Rapier snapshot for state. Anything called a solver here
would be a planner plus a controller, and **half of that already exists in the
fiction as NAV-1**. The sharper argument is the design one: robby's subject *is*
the shortest program, so an optimal player measures the thing the game is about,
while ours is the gap between what a machine is rated to do and what it does on
the day — and an optimal driver optimises that gap away. **Robby needs an optimal
player; we need a plausible bad one.** `doc/NOTES.md` has the evidence already:
a twelve-year-old found the fun in seconds by driving at the material, and a
scripted driver went ten minutes without touching anything.

**What does transplant is the technique, and it needs no solver.** Robby's
load-bearing filter is *solve a candidate twice, once with the mechanic disabled,
and reject it unless the answer changes* — difference, not direction, which took
generator acceptance from 55% to 17%. Ours is the same shape with the reference
driver in place of the search, and **L-075 is what unlocks it**, which is a better
argument for that card than the one it was carrying.

**The approach L-075 takes: Vitest 4 browser mode, not a fifth bench.**
`@vitest/browser-playwright@4.1.11` pins to `vitest@4.1.11` exactly and
peer-depends on the `playwright` already installed, so the fifth thing is a
*suite* sharing config, fixtures and reporting with the other 355 tests rather
than a sixth hand-rolled `.mjs`. One dev dependency, no second runner, no second
browser download. The gate is general rather than a hand-list: **every kind in
the recording union must appear in the trace the session produced**, so a verb
added to `control/trace.ts` without a driver step fails the suite until it is
driven.

**Six blockers, all cleared, with numbers.** The run boots in a browser-mode
iframe — Rapier's wasm, a real WebGL2 context and the fixed-step clock — with the
world at 644 ms and the first snapshot at 801 ms; rAF is alive at ~22 fps under
swiftshader. A full shell mount plus BEGIN plus a lever is 6.41 s wall, 3.85 s
in-test. The Chromium pin the four benches carry ports over verbatim as
`launchOptions.executablePath`. And **no custom pointer command is needed**:
`userEvent.click(el, { position })` produces real pointer events, `setPointerCapture`
works, and the lever reached `aria-valuenow > 0.9` — because `grab()` sets the
value on pointerdown and `release()` deliberately does not reset it, a positioned
click *is* a lever command.

**The suite's summary lies and its exit code does not.** Three faults were
planted — a throw from a timer, an unhandled rejection, a throw from a rAF
callback. All three were reported and all three set exit code 1, under a summary
line reading `Tests 3 passed (3)` with the errors on a separate line. A human
scanning that output sees green. **The gate is the exit code**; nothing may wrap
this suite in something that reads the summary instead.

**A shipped defect, found by the first thing that ever drove the app.**
`audio/engine.ts` disposes by calling `context.close()`, which fires `statechange`
with `state === "closed"`, which the listener tests as `!== "running"` and
resumes — `InvalidStateError`, unhandled rejection, **every dispose**, so every
RESET and every exercise change and not merely teardown. The listener is also
never removed. This is L-080's own fix over-corrected: it replaced
`=== "suspended"` with `!== "running"` to catch `interrupted` and the other ways
a browser stops a context, and **`closed` is the one state that is terminal**.
The prose above it reasons about all the others and never about that one.
Invisible to all 355 tests including `tests/graph.test.ts`, which exists for this
file. It is the card's thesis demonstrating itself, and it blocks the suite's
own no-page-errors gate.

**Three findings that shape the build.** The recording union has nine kinds and a
driven session recorded seven — `levers`, `ack`, `estop`, `horn`, `pod`, `posture`,
`view` — leaving **`rack` and `look` as verbs nothing has ever driven**, so the
coverage gate has content on day one. The sim is held by `hands.seated`, because
`advance()` feeds the clock `hands.seated ? elapsed : 0` and an open schedule is a
frame owing no steps — not a bug, and the cleanest argument that the driver must
go through the shell rather than through `createRun`. And `index.html`'s page
frame (`height: 100%`, `overflow: hidden`, `touch-action: none`) is inline in the
HTML where only that file can see it, while the shell is written against it: one
fact in one place wants it in a stylesheet `main.ts` imports, so the page and the
driver cannot disagree.

## 2026-08-27 — two gates move, and the board catches up with the branch

Cards: none closed. [L-067], [L-085], [L-082] and [L-051] **absorbed** into
[L-012], [L-081] and [L-049]. [L-012] and [L-075] promoted to ready.
`CLAUDE.md` changed, which is rare and deliberate.

**The gates the last entry flagged were moved rather than met.** `doc/META.md`
had gone past its 180 line, got a real merge pass, and landed at 168 against a
target of 150 — and the entry said plainly that continuing would have meant
cutting lessons that still carried the incidents that earned them, which is that
file's own test for what may go. It handed the choice forward: *cut a lesson, or
move the line on purpose.* The line moved. **META 150 → 200, HISTORY 250 → 400**,
act-at following the band's own 20% rule at 240 and 480.

**One rationale died with the number and had to be rewritten rather than left.**
`doc/HISTORY.md`'s header said its target "sits below `doc/MEMORY.md`'s on
purpose: current truth outranks how it was arrived at, so this may never be the
longest thing in the repo". At 400 it is above MEMORY's 300, and the sentence
would have been a lie sitting at the top of the file. The replacement is the
reason the new number is defensible, and it is a better reason than the old one:
**MEMORY has somewhere to spill and HISTORY does not.** MEMORY's limit is a *hub*
limit — the fattest section moves down into a `doc/design/` cluster and the index
keeps one line, so the number governs the index rather than the material. Below
HISTORY there is nothing. Everything the project has learned that is no longer
current has to fit there or be deleted outright, and a terminal surface needs
more room than one with an outlet. The old sentence is not deleted silently; the
header says what it used to claim and why that was the wrong thing to measure.

**No test reads either number**, which was worth confirming rather than assuming:
`tests/doc.test.ts` checks doc *shape* — cluster indexes, no content page in the
MEMORY index, every markdown path resolving — and never a line count. So these
gates stay a thing a person runs `wc -l` for, which is the arrangement `doc/META.md`
already has a scar about.

**The board had six stale blockers and every one of them named a card this
branch closed.** `L-018` waited on `L-029` and `L-032`, `L-019` and `L-079` on
`L-032` — all built. Two were wrong in a more interesting way. `L-012`'s
`needs: L-006` was written for saving a *machine*, and the roadmap had already
narrowed the card to "rack order and settings"; that blocker was holding down two
cards that have nothing to do with the part model. `L-054`'s `needs: L-006`
covers only its second half — putting `considers` on the debrief needs no part
model, because the string is on every module and the debrief exists. And `L-027`
named a NOTES thread by a title it lost when the thread was rewritten.
**A `needs:` line is the one part of a card that rots without anybody reading
it**, because it is only consulted when somebody picks the card up.

**Three combinations, lowest id surviving and naming what it took.** `L-012`
absorbed `L-067` and `L-085`: three cards, one `Record` on the shell that has to
outlive the tab — the rack, the pod placements, the completed exercises. `L-081`
absorbed `L-082`: two numbers `profile.html` asserts rather than reads, one
`probe/` shadow, one trip to a phone. `L-049` absorbed `L-051`: authoring three
makers' plates inside a cab whose cage and levers are generic steel is half a
comparison pass.

**The acceptance trio was deliberately *not* combined.** `L-066`, `L-018` and
`L-033` each own a clause of `doc/MEMORY.md` § 3's acceptance sentence, and the
temptation was to make them one card because they can only be judged together.
They stay three, because each has its own observable and a card whose done-when
is three done-whens is a card nobody finishes. What they got instead is the
corrected `needs` chain and adjacency: `L-018` now needs `L-083`, because
*attributable from a replay* needs somebody able to watch one, and ready is
ordered as that sentence read left to right.

Ready 5 → 7, backlog 31 → 26, history unchanged at 10 — an absorbed card is named
inside the card that took it, not closed, so it spends no history slot.

Surfaces after: META 168/200, HISTORY 257/400, NOTES 108/120, LOG under its 1200,
BOARD 7 · 26 · 10. **`doc/MEMORY.md` is untouched at 355/360 and stays flagged** —
two sessions in the band, and its own rule says a third means a section wants
*spilling* to a cluster rather than trimming. 355 tests, lint and typecheck clean;
no code changed in this pass, so those confirm the branch rather than the work.

## 2026-08-27 — a recording is of a session, not of the physics

Cards: [L-084] — closed, opened and closed the same day. [L-085] opened (the
pod bug's other half). Follows [L-032], same branch.

**The card above was right and its edge was wrong.** It recorded the levers,
the posture and the rack, and argued the rest out on the grounds that it was
"not a sim input" — which answers the **determinism** question and is not the
**recording** question. A rig reviewing a session cares whether the operator
sounded the horn before moving off, whether they acknowledged an alarm or drove
on with it blaring, and where they were looking when they hit something. None of
that touches the physics; all of it is what the rig exists to review.

**Both cases were already written down and neither had been read.**
`doc/design/cab/sound.md`: "The horn tells nobody anything… When a citizen can,
the horn stops being a cab state and becomes a sim input, **and it joins the
recording where the levers are**" — which sorts the horn as *not-yet-a-command*,
never as *not-recorded*. `doc/design/cab/cockpit.md` on chase: "a rig plausibly
has an external observation view, and **stepping out to use it is a thing the rig
can record**." Twice in one week the design had anticipated the thing being
built and the anticipation was found *after* the wrong version shipped. The
lesson from the card above — read what the project has already written about a
thing before building it — did not stick the first time, because it was applied
to the *mechanism* and not to the *scope*.

**Two channels, and the split is structural rather than promised.** `commands`
is what reached the machine; `attention` is what the operator saw, heard and did
about it. `createPlayback` takes `readonly Command[]` and is never handed the
other side, so the headless replay cannot read it by accident — the guarantee is
in what the function is given rather than in what it remembers not to touch.
What a type cannot say is that the *recording* put each thing on the right side,
so `tests/architecture.test.ts` scans for the only `hands.` fields the sim, the
rack and the modules may read: `leverL`, `leverR`, `seated`. A fourth is a
decision about what a recording is, and it has to be made in that file first.

**The line was already drawn and cost nothing to apply.** `doc/MEMORY.md` § 11 —
if a manufacturer built it, it is `cockpit/`; if the training system built it, it
is `ui/`. Kit a maker bolted in is recorded; the schedule, the debrief and the
volume are not, and BEGIN and RESET *bound* a recording rather than sit inside
one. **The camera is the one stated exception**: it is the rig's, not a maker's,
but chase takes away the levers, the pods and the dash, and the cockpit page
says the rig records it.

**One queue, and it was never a rack queue.** The rack's four commands were its
first members and for a while its only ones, which made it look like one. It is
the channel a *press* crosses on; where the press lands afterwards is
`trace.ts`'s business. `Act` now carries the acknowledgement, the E-stop latch
and a pod placement beside the rack command, and `Controls` and `createEstop`
needed only a wider type.

**The E-stop emits the latch and the fuses, and that is not redundancy.** A rack
with every module off is a rack somebody could have emptied by hand; the mushroom
being in is a different fact. **ACK is recorded as a press and never as a
condition** — `alarm.svelte.ts` holds exactly one thing (`acked`) and derives the
lamps, the master and the unacked condition from the snapshot, so a test replays
the annunciator from the recorded snapshots plus the recorded ticks.

**The head is sampled rather than caught, and the reason is a decision nobody
should reverse casually.** The neck spring runs on `performance.now()` with a
`deterministic-exempt:` marker saying "camera feel, never sim state, so it can
use the wall clock that rule 2 keeps out of the simulation" — so *no gesture
would reproduce it*, and recording `look()` deltas would have been recording
something that replays differently. The result goes on the trace at
`SNAPSHOT_HZ`, and **in radians rather than pixels**: `viewport.head()` is
`focalPixels(fov, glassHeight)` through a tangent, so the same glance is
±10,730 px on a phone and ±13,740 px on a desktop, and a trace in pixels replays
on the wrong glass. Measured: `LOOK_TAU = 0.37 s`, the spring snaps to exactly
zero below 1e-3 rad, so a released glance is ~180 entries at 60 Hz and ~30 at 10,
after which a cab nobody is sweeping costs nothing — the same as a parked lever.

**The camera joined `hands`, and a private route went with it.** `Run.setView`,
the mode stashed during the wasm boot, and the `untrack` that existed because
reading the camera in the run effect once threw the world away are all deleted;
`run.ts` reads the field and points the viewport on an **edge**, because
`setMode` toggles a layer and zeroes the head and calling it every frame would
straighten your neck sixty times a second. The scar moved to `hands.ts`.

**A shipped bug fell out of asking where a placement lives.** `placed` was
component-local `$state` in `Glass.svelte`, which the shell mounts under
`mode === "cab" && !rackOpen` — so **every instrument placement was destroyed by
opening the cabinet or stepping outside**, while the field's own comment promised
that unfitting a component and putting it back gives you your instrument where
you left it. Nothing could have caught it: no suite mounts the glass, and the
benches pose it. Lifted to the shell, and proved both ways in a browser — put
back local, a pod dragged to (189, 70) returns to (244, 50) after a rack round
trip; lifted, it stays. Reload persistence is still L-012.

**The drop that would not land, which is the browser earning its place twice.**
Two synthetic drags in a row were silently refused and the check read green:
the first was outside the arm's 200 px reach, the second overlapped the second
pod. Both refusals are `Draggable.legal()` working exactly as designed — and a
test that asserts "it survived" after a move that never happened is the
tautology from the card above, in a new costume. Only printing the transform
each step found it.

**Four faults planted and watched to fail:** `hands.horn` read in the pilot's
`intent` (the scan), the head recorded in pixels (the radians test), the two
attention runs compared on different seeds (the equality is not trivial), and
the ACK act dropped from the queue (the annunciator round trip).

**Rejected.** *Recording the `look()` deltas and moving the neck onto the fixed
step* — five to ten times cheaper (~1 KB against ~5–10 KB per 30 s) and the
"record what the operator did" discipline everything else follows, but it
revokes a written decision and changes cab feel on a 120 Hz panel to save bytes
on a trace that is already small. *Recording the camera without moving it to
`hands`* — would have bolted it on beside a route that already existed.
*Fixing the pod bug without recording placements, or recording them without
fixing it* — the second reproduces faithfully what the live run threw away.

355 tests, 18 files. `everything-at-once` still peaks 0.922 against the 0.999
gate; 20 shots, 19 cab shots, 22 renders. Driven in Chromium: CAB/CHASE, a head
sweep and its spring, the horn's press and release, ACK, the E-stop across every
fuse, and the pod round trip. No page errors.

**A bookkeeping error from the session above, found while fixing the board.**
The previous commit's message says "L-083 opened" and **it was not**: the script
that was to remove `L-032` from `ready` and add `L-083` printed a diagnostic and
exited before writing the file, and the second script wrote a version without
either change. So `L-032` sat in `ready` *and* in `history` at once for a commit,
and a card the message announced did not exist. Both are fixed here. The lesson
is small and mechanical: **a script that edits a file and also prints something
must write the file last, or the print is a silent early return** — and a claim
in a commit message is not a check on the file it describes.

**The surfaces overflowed and this is the pass.** `doc/LOG.md` reached 1,225
against its 1,200 line, so its four oldest sessions — the deploy race, the
fixture kit, `hands`, and the band-and-clusters round — were **folded** into
`doc/HISTORY.md` and deleted: 269 lines of log into one section, which is the 9:1
the fold is supposed to be. That pushed HISTORY to 328 against its 300, so it got
the pass it exists for and went to **251**: the two oldest sections tightened,
`Instruments measured` merged into the cab section it was an instance of, and the
foundation pass merged with the recording because they are the same lesson twice.
That merge is the one worth recording — the sections were 37 and 30 lines saying
*one idea spelled as several special cases* about different code.

`doc/NOTES.md` reached 133 against its 120 and went to **108** — over its target
of 100, and stopped there deliberately. Two threads *left*: the benches-driven-by-
a-recording one folded into `L-075`'s card, where it was always really a note,
and the belt not following its own bogies became `L-086`, because half of that
thread was a question and half was a defect with a known fix. Two more merged:
whether the suspension earns an instrument is an instance of *which simulated
quantities does the player get to see*, not a separate question. The remaining
eight are all genuinely open, and cutting further would have been the
line-shaving the band was invented to stop — which is why this says 108 rather
than trimming three more sentences to say 100.

**Two surfaces are flagged rather than fixed, and saying so is the point.**
`doc/MEMORY.md` is at 355 against its 360 and has been in the band two sessions
running; the band's own rule says a third means a section wants *spilling* to a
cluster rather than trimming, and § 3 and § 6 are the fattest.

`doc/META.md` is worse and more interesting: it went **past** its 180 line when
this session added an entry, got a real pass — four entries merged, two worked
examples cut back — and landed at **168, still 18 over its target of 150**. That
is not compliance and this entry is not going to claim it is. Continuing would
have meant cutting lessons that each still carry the incident that earned them,
which is the file's own stated test for what may go. The honest reading is that
the *target* may be the thing that is wrong — fifteen hard-won lessons at 150
lines is ten lines each — but changing a number in `CLAUDE.md` is a deliberate
act and not something to do at the end of a long session to make a gate go green.
Next session inherits the choice: cut a lesson, or move the line on purpose.

`doc/BOARD.md`: history hit 12, its act-at line, so `L-069` and `L-071` were
deleted — their arc is in the HISTORY section this session wrote, which is what
"fold" means. Ready 6, backlog 31, history 10.

## 2026-08-27 — the recording was already there

Cards: [L-032] — closed. Opened [L-083] (a replay somebody can watch).

**The card was stale in its shape, not its target.** "Record and playback — one
engine" read like a feature to build. Twelve pieces of it were already in the
tree, built for other reasons, and *most of them carried a comment saying they
were there for the replay*: the seed on the snapshot ("a recording that cannot
rebuild its own world is not a recording"), the route on it, `AT_REST` ("the
honest value for a replay, whenever there is one"), `inertControls()` ("what a
replay gets"), `Clock.tick` ("sim time, and the replay's clock"), the event
channel's `rewound` flag ("a RESET, **or a replay scrubbed**"), the audio
engine's switchgear clicks ("a replay clicks too"), and every impact's entropy
drawn from a `seq` that is on the recording. Nothing had ever replayed
anything. **Before building a thing this project has been anticipating for
months, read what it has already written down about it** — the work turned out
to be closing three seams, and every one of them was a place where one idea was
spelled as several special cases.

**Seam 1: the sim's input was ambient.** `world.step()` takes no arguments and
the pilot closes over a live mutable `Hands`, so there was no moment at which
anybody said *this is what the hands did on this tick* — live and replay could
only have differed by swapping a module, which is two engines. `control/trace.ts`
is the input twin of `core/events.ts`, same shape pointing the other way: an
`Operator` supplies one tick's input, and the cab is one, a recording is
another, a script is a third.

Three of the six fields on `Hands` are **not** on the trace and each deleted
itself. `seated` gates the clock, so a tick *existing* already says the operator
was in the seat. `horn` was documented as off the recording before there was
one. `alarm` is derived by the annunciator from the snapshot. What is left is
two levers and a posture, as change-points: thirty seconds of a rampage is 53
inputs, not 1,800 frames — and the trace is the same length whether it was
driven at 30 fps or 144, because it is stamped per **tick**, not per frame.

**Seam 2: rack edits crossed by four routes and none carried a tick.** The
designed channel, `Controls`, could express neither a reorder nor a verb change
— the two decisions the rack actually *is*, and the two the ledger most needs.
So `Rack.svelte` spliced the live array and wrote `module.verb` in place, which
is precisely what `cockpit/contract.ts` claims cannot happen; the E-stop wrote
every module's field; and every one of them landed synchronously inside a
pointer event's turn. Architecture rule 3 has said commands cross back "as
discrete, **queued** inputs" since before there was production code. They did
not. One command value, one applier, queued with the tick that applies it — and
the four call sites that each bumped `rackVersion` themselves are now one bump
per frame in which anything landed.

**Seam 3: the frame was written twice, and had already drifted.**
`probe/profile.ts` kept a copy of `run.ts`'s loop and said so, naming the
reason: the game's loop owns `requestAnimationFrame`, the pointer handlers and
the `:root` writes, and "exposes no seam to time the halves of a frame
separately or to end on a tick count". All three are true of `createRun` and
none is true of a *frame* — the loop was two things wearing one name. L-080 had
already recorded the copy drifting (no `audio.render()`, so `cpu` was never the
frame's), and the guard against it was two regexes scanning both files for a
literal `0.25` and four call names in order. `platform/frame.ts` is the frame;
the callers own what advances it and when it stops, via three hooks placed at
exactly the boundaries the profiler stamps. **Two files agreeing about a literal
is an approximation of one file**: the regexes are deleted and the rule is
structural — `world.step(` appears in one place under `src/`. The bench also
stopped hand-building a chassis module (its copy had no `condition()`, so it was
timing a rack the annunciator would have read differently) and drives the real
`createPilot`.

**The test that could not fail, and the reason it could not.** The first
`replay.test.ts` was green on the claim and red on the guards, and the answer
was worse than a bug: `record()` and `replay()` both assembled the rail from
`fitRungOne` alone and **neither fitted the chassis**, so the levers reached
nothing and two parked machines agreed with each other perfectly. *A test where
both sides are built from the same wrong assumption is not a weak test, it is a
tautology* — and the thing that exposed it was the assertion that the run had
actually broken something, which is `doc/META.md`'s "prove the scenario happened
before trusting that it did" earning its place again.

So half the suite is the other direction. The levers, each of the four rack
commands, the *timing* of those commands, the seed, and the order the rail was
fitted in are each removed in turn and required to change the answer — because
damage on this site is mostly a function of the seed, and a replay that read
none of the trace would reproduce a great deal of it by accident. Two faults
were then planted and watched to fail: an off-by-one on the input tick, and an
applier that silently ignores a reorder.

**Writing a script that actually hits something took three tries**, and each
failure is the NOTES thread about generated objectives in miniature. Driving
straight went nowhere near the furniture (nearest prop: 40 m). Steering at it
put the sign the wrong way round and the machine spun in place for 30 seconds
of sim. Steering at it correctly drove *past* it and beached on the next one,
because nothing said what to do on arrival. What works is re-picking the nearest
intact thing more than 4 m away, every tick — which is a twelve-year-old's
strategy, and the first line lands at tick 1,640.

**The profile is unchanged and this container cannot say so.** `npm run profile`
before and after moves `cpu` on FULL SITE from 5.20 to 5.50 — and running it
*twice on the same tree* moves it 5.50 → 6.30, with FULL SITE against its own
control differing by 24% inside one run. The container is SwiftShader at 4 fps
with every pass saturated at the clock's 5-step cap, so its timed columns cannot
resolve a difference this size in either direction. What *is* identical across
all three runs is every deterministic column — `calls` 289/305/529/150, `nodes`,
`triangles`, `programs` — which is what a changed frame would actually move. The
device table in `code/mobile-budget.md` was taken on a Pixel 9 and has not been
re-taken; it is unchanged rather than re-measured, and that is stated here
rather than left to look like a reading.

**The four rack commands were driven through the real app**, in Chromium: a fuse
pulled, a verb cycled CAP → ADD, a slot moved to the top of the rail, a pitch
limit dragged 18 → 25, and an E-stop that took every fuse out. None of that is
reachable by any suite or bench (L-075), and the deferral is exactly the kind of
change that types and unit tests cannot see.

**Rejected.** *Applying a command eagerly and merely stamping it with the next
tick* — identical for replay purposes and it would have avoided a frame of UI
lag, but it leaves rule 3's "queued" a lie and leaves four writers of a module
instead of one. *Unifying `sandbox/scenes.ts` with playback*: `Scene.frame(t)`
and a replay's `at(t)` are the same interface and 22 hand-authored scenes are
sitting there, but they reach isolated extremes a real drive will not, and
putting audio-level regressions in the same diff as a sim seam move is the merge
`doc/META.md` warns about. It is a NOTES thread. *Recording the whole of `Hands`*:
contradicts three comments that were already right.

346 tests, 18 files. `everything-at-once` still peaks 0.922 against the 0.999
gate; 20 shots, 19 cab shots, 22 renders.

## 2026-08-26 — the graph gets tests, and the note gets its second oscillator

Cards: [L-080] — closed. Opened from a bug report that did not survive a refresh.

**Reported:** the sound cuts to complete silence for seconds, then returns,
during ordinary driving with no impacts. Android/Firefox, mute button untouched.
**It did not recur after a full page refresh** and has not since, so it is most
likely a long dev session's stale state — recorded as a thread rather than
chased. What the hunt for it turned up is the entry.

**The instrument was wrong before the code was.** Driving the real app in a
headless browser with a live context, the audio clock fell **0.27 s behind wall
time in 30 s** — which is exactly what starvation looks like, and I nearly wrote
it down. The control pass: a bare oscillator, no app at all, **0.272 s over the
same 30 s**. The container's headless audio device does not run in real time and
drift here measures the container. *Ask what clamps a quantity before comparing
on it*, again.

**`engine.ts` had no tests.** Every one of `tests/audio.test.ts`'s assertions is
about `voices.ts` — the arithmetic — and nothing anywhere constructed
`createAudio`. So the half that owns node lifetimes, automation and every path
to silence had been checked by ear only. Four defects, all found in one sitting,
all surviving for that one reason.

**The twin oscillator had never moved.** `chase()` skips a write when the target
already equals the last value it was handed, and the twin was handed `held.hz`
*one line after* `held.hz` was set to that target — so its guard passed on every
frame of every session and `twin.frequency` was never written at all. It sat at
its constructor's 56 Hz, at half the note's level, for the life of the context:
not a detune, a fixed bass drone under a moving note. The "two oscillators
`detune` cents apart" that `doc/design/cab/sound.md` calls *most of what
separates a machine from a synthesiser* has never existed until today.

Three things hid it. **At idle it was accidentally correct** — the note's idle
frequency *is* 56 Hz, so the bug only existed once you drove, and `idle`
measures identically either way. **`listen` renders the real graph**, so the
drone was in the first measurement and every one after it, with nothing to
compare against. And **`voices.ts` was right throughout**, which is the file with
the tests. Measured by silencing the twin: `idle` peak 0.122 → 0.081, so a third
of an idling machine's peak was a note nobody chose.

Fixing it raised every driving scene's peak at unchanged RMS — `labouring` 0.477
→ 0.560 — which is precisely what that file predicts a real pair does.
**Left alone.** Compensating the pair as coherent rather than incoherent was
tried and reverted: it lands `labouring` on 0.472, almost exactly the number the
level was set to, and costs a quarter of the bed's loudness, which is a milder
form of a version this file rejected once already. Worst case tightened to
**0.922** from 0.895; still inside the limiter, with less room.

**Muting destroyed the whole AudioContext.** `$effect(() => sound.open())`, and
`open()` read the mute knob to carry a volume set before the context existed
(L-072's own fix). A read is a subscription — the lesson this repo wrote down for
the run effect and gave a test to. The sound effect never got one, so SND closed
the context, rebuilt eighty nodes and a two-second noise buffer, and attached the
listeners that wake a suspended context *after* the gesture that caused it.
Applying the volume is a different job from owning a context: it is `sound.level()`
now, with an effect of its own. Both have tests, and the architecture one asserts
the context's effect stays a **one-liner** — a stronger claim than listing its
dependencies, because it cannot acquire one.

**Only one kind of stopped context was ever resumed.** `state === "suspended"`
was the whole test, and it misses iOS's `interrupted` and a browser restarting
its audio device under load — after which the only thing that ever tried again
was a `pointerdown` on the window, and a hand holding a lever produces none. Any
non-`running` state now, plus a `statechange` listener on the context itself
(the only signal that fires when the cause was not a touch) and
`visibilitychange`.

**`dt` had no finiteness guard.** NaN loses every comparison it is in, so one NaN
`simSeconds` set `lastSeconds = NaN` permanently, after which `linkPhase` could
neither advance nor reset and both chains went silent for the rest of the
session. Never seen; one line.

**A hypothesis measured and rejected.** The panel's edge detector fires a knock
on every rising condition with no rate limit, and TILT-GUARD's condition has no
hysteresis — so on paper, rocking across its ease angle produces sixty broadband
transients a second and parks the limiter. Measured before believing it: driving
at full speed for thirty seconds, on the open site **and** on a ramp at the
guard's own threshold, the condition rises **once**. It is damped by its own
doing — the guard winds the machine down, which reduces the tilt — and by the
sprung running gear (L-062). No hysteresis added; the claim is a test in
`tests/tiltguard.test.ts` instead, because the audio's guard is safe by the
sim's good behaviour rather than by construction.

**`tests/graph.test.ts`** is the layer all four came through. `createAudio`
already takes a `BaseAudioContext`, so it needed no new seam — only a context
that writes down what was asked of it. The fake synthesises nothing; it is a
transcript. **Two of its assertions proved nothing on their first draft and both
were caught by planting the fault**: the twin check counted frequency *writes*,
which every oscillator makes, so it was satisfied at four when the answer is six
(each side retunes note, twin and firing pulse); and the leak check filtered to
sources that *have* a stop time and then checked those, so deleting a `stop()`
dropped the source out of the sample. Both rewritten, both now fail.

**The voice has a number.** `profile.ts` timed `sim`, `render` and `gpu` and
called their sum `cpu` — and its copy of the loop never called `audio.render()`,
so the sum was not the frame. It is now: `audio` 0.3 ms p50, `nodes` 12 a frame
(the chain, six nodes a plate). `src/probe/ear.ts` counts them the way
`probe/gl.ts` counts draws — shadowing the instance, never widening
`createAudio` for a bench — and throws on its first frame if it counted zero.
The architecture test that pins the two loops together now pins the voice with
them; **its own first draft passed with the call deleted**, because it matched
the phrase `audio.render()` inside the bench's doc comment about
`audio.render()`. Comments blanked.

Numbers: 335 tests (was 323). Nothing clips: worst case 0.922 against a 0.999
gate. Draw calls unchanged at 289 in the cab.

## 2026-08-26 — the site is made of materials, and it comes apart

Cards: [L-039], [L-057] — both closed. Four cards opened for the overflow.

**Both cards were the same defect wearing two hats: a prop was identified by its
`kind`.** Mass and price were a table keyed on it, the collider box a second, the
voice a third, and the art an if/else chain in `render/scene.ts` **with a boulder
in its `else`** — so a kind that forgot the renderer drew a rock and nothing
type-checked it. Four places, one silent. That is why the inventory had sat at
five kinds and a scooter since it was written.

**A prop is a part list over materials.** `world/materials.ts` is the axis: nine
entries, each holding how the stuff rings, how it comes apart, and what colour it
is. `KIND` in `world/props.ts` declares a kind's solids — shape, size, offset,
turn, material, and whether it is solid at all — and five consumers read that one
declaration. Toughness is **derived** (`tough × ½·m·v_max²`) and can no longer be
typed in; the ring's pitch and decay are derived from **mass** by one law
(`size = ⁴√(m/40)`, `hz` divides, `decay` multiplies), which reproduces the old
hand-picked pole and pipe-stack voices to within ten per cent and means a new kind
needs **no audio work at all**. That last part is what had been stopping the
inventory, so six kinds became fourteen over nine materials: drum, pallet, crate,
concrete block, precast panel, floodlight, cable drum, ballast bags. Prices spread
¥300–14,000, so a careless run itemises.

Rejected: deriving **mass** from density × volume. A traffic cone is 6 kg because
of a rubber base, not because it is a solid plastic cone, and the estimate would
be wrong for exactly the objects that matter. Mass and price are facts about the
object; the material owns the rest.

**L-057 was an ordering mistake, not a number.** Terrain was made from noise and
*then* `generateProps` rolled six work-area centres of its own, so the ground and
the furniture disagreed about where the work was and the furniture lost: **46 of
102 breakables flat** before anyone touched the site, seventeen of eighteen marker
poles among them. `world/site.ts` chooses the plan first — pads in the route's own
annulus, held 13–42 m off the markers so driving between two pins takes you past
one — the ground is graded to each, and `standsOn` refuses a candidate whose own
tipping gradient (`halfBase / comHeight`, division only, no `atan`) says it cannot
stand there. **1 of 117 now.** The starting pad became the first entry of an
ordinary list with itself as the datum, which is why the site is unchanged at the
centre.

**The census passed with the footing test removed**, which is the whole reason it
got A/B'd. Pads alone leave 8 of 114 flat; the footing test alone leaves 13 **and
drops twenty props**, because without graded ground there is nowhere left to say
yes to; together, 1 of 117 with everything placed. So the assertion is pooled
across all three exercises — a per-exercise bound loose enough for E-01's 22 props
cannot tell those two apart — and it asserts the *prop count* as well, which is
what catches losing the pads. Both faults planted and watched to fail.

**Then it comes apart.** A written-off prop's body is replaced by one body per
declared piece, carrying the parent's velocity plus a shove seeded off the ledger
line's `seq`; cylinders get cylinder colliders, so a pipe stack pushed over is
four pipes that roll and tumble into each other. `snapshot.debris` addresses them
by prop and piece, so the renderer **re-parents the prop's own meshes** and coming
apart costs no new geometry and no new draw calls. Debris is landscape: never
billed, never broken twice. Budgeted at 140 pieces, past which a prop stays whole
and takes the wrecked paint, exactly as every write-off did before.

**The ear got the ledger event it had ignored since the channel existed.** A
failure is a **grain cloud** — ordinary `Knock`s through the same transient an
impact uses — and a screech, a shatter, a splinter, a crumble and a ding are one
function with four dials turned. A screech is stick–slip, so it is the *regular*
end of the same mechanism rather than a special case. It takes the **part list**,
not the line's one material: a floodlight is mostly steel and screeches, and its
glass head is a twentieth of it and still shatters.

Three measurement defects on the way there, all the same family and all in
`doc/design/cab/sound.md` now. The voice measured **identically to silence** —
peak, RMS and brightness — and a 0.9-gain probe in the same branch moved the peak
0.288 → 0.489, which proved the branch fired and the *scene* was blind: it ran the
drive at 0.9 and the bed owned every number. The third scene to fall into that.
The level itself was the old bandwidth trap, for the fourth time. And the worst
case had its write-off placed **under the horn's duck**, where it measured as
nothing at all — the duck working and the scene testing nothing.
`what-it-is-made-of` peaks 0.533 against 0.148 silenced; `everything-at-once`
0.895 against 0.863, clearing the limiter with a tenth to spare.

One dial was wrong rather than one level: **jitter has to be measured against the
spacing, not the window.** Twenty-six grains across half a second are twenty
milliseconds apart, so a tenth of the window is two and a half slots of stray and
the rasp is gone — the bench measured a `regular: 0.9` screech as no more regular
than a shatter, which is the one distinction that voice exists to make.

**Found by measuring, not by looking.** A test holding each declared collider box
against its own pieces caught two things that had shipped: a **pipe stack drawn
end-to-end** inside a box that said side-by-side — so you could hit one from half
a metre away on a side with no pipe — and a **cable drum boxed on the wrong
axis**. And driving into every kind in turn caught a **concrete block that
absorbed zero joules from a full-speed hit**: the machine climbs anything shorter
than its own tracks, so a thing it drives over is pushed downward rather than
struck and no step ever clears the floor. Lightening it changed nothing; making it
taller fixed it at once. That sweep is a test now — it says ten of thirteen kinds
are written off at full speed and a 900 kg panel, a cable drum and the ballast only
crack, which is the at-rest guard working rather than failing.

Two smaller things fell out. `world.poses()` exists because **76 of the default
seed's 130 props are asleep at tick 0**, so a scene built from the spawn list drew
sleeping furniture where it had been *asked* to go rather than where it came to
rest. And `npm run yard` is a fifth bench, because none of the other four can see
a site: `shots` has no 3D in it, `cab` is inside the machine, `listen` is the ear,
`profile` is the clock. It photographs each graded pad and then drives into
something and watches it break — and it **asks the sim when that happened** rather
than counting steps, because the first version shot the moment at step 252 and
photographed a machine that had not arrived.

Numbers: 323 tests (was 293). Draw calls **224 → 289 in the cab** against a
ceiling of 500, and 394 → 529 in chase; a prop is ~1.3 calls now rather than 0.75,
which retires the old "390 props lands the cab around 420". Nothing clips.

## 2026-08-26 — the shell lets go of six concerns, and two bugs off the side

Cards: [L-072] — closed. Plus two defects the session was asked to squash.

**The route scope was mirrored, and had been since it existed.** NAV-1's plot
put every pin on the wrong side of own ship: a route curving right read as
curving left, and the pin the module was steering toward sat opposite the way
the machine turned. The cause is the convention with the most scars here — the
machine's right-hand axis was written out **twice**, once in NAV-1's steering
and once in the instrument, and the instrument's copy had the sign flipped.
`core/vec.ts` now states it once as `bearing()`, both read it, and the two are
checked against each other on four pins rather than trusted to agree. The
geometry left the component for `cockpit/scope.ts` on the way, because that is
*why* nothing had caught it: a `.svelte` file no test mounts and no bench
asserts on is a place a sign error can live forever. Six new assertions, each
verified by planting the fault — including the mirror itself, which takes the
cross-check down with it.

**Switching to the chase camera reset the run.** `run.setView(mode)` sat inside
the effect that builds a run, so reading the camera *subscribed* to it: pressing
CHASE tore down the world and handed back an identical, untouched copy of the
site you had been driving. It looked like anything but a camera bug, because
`setView` had already pointed the camera correctly on the way past. `untrack`
fixes it in one line. The chase view is "hands off the wheel", not a reset
(`doc/MEMORY.md` § 6), and it had quietly become the most destructive button in
the cab. Driven in a real browser to confirm both directions: the rig's clock
read 0:03 → 0:00 with the bug and 0:03 → 0:04 → 0:06 without.

`tests/architecture.test.ts` now reads the effect that builds a run and lists
what it depends on — local runes, and what it takes off the session — so adding
a dependency has to be a deliberate act. It is the same shape as the checks
around the loop's extraction, and for the same reason: **a read is a
subscription, and nothing about the syntax says so.**

**L-072: six concerns out of `App.svelte`, and three the card had not found.**
The script half went 497 → 237 and the file 991 → 732. Out: the annunciator's
acknowledgement (`cockpit/alarm.svelte.ts`), the stop and its restore
(`cockpit/estop.svelte.ts`), the maker's notices (`cockpit/notices.svelte.ts`),
the chassis maker's nag (`cockpit/nag.ts`), the sound's lifetime and the room's
volume (`platform/sound.svelte.ts`). The three the card had not listed are what
made the number move: the pilot module (`modules/pilot.ts`), the rig's session —
which exercise, whether you have sat down, whether the folder is open
(`ui/session.svelte.ts`) — and what a rung-one machine is fitted with, which is
the first file in the long-empty `src/build/` and, in v0, *is* the build.

`tests/cab.test.ts` is what was bought: 27 assertions, **no component mounted**,
over machinery none of which had ever been asserted. Every one was verified by
planting the fault, and the exercise found the shape of the thing it was
checking twice — the annunciator's wind-down is a fold over *time* rather than a
`min` over the current pair (an operator who silenced an ALARM would otherwise
never hear the next WARN), and the E-stop's latch is what stops a second press
overwriting the enable-state RESUME hands back.

Two things learned about the mechanics. **An `$effect` outside a component is an
orphan and throws**, so a module that opened one would have been exactly as
unreachable as the code it replaced — every fold is a method the shell drives
with a one-line effect and a test drives by calling. And the suite runs in plain
Node on purpose, so `open()` takes the `EventTarget` the first gesture arrives
on rather than reaching for `window`. Found on the way: `Notice` was declared
twice with the same four fields, and muting during the boot was lost, because
the knob reached an `AudioContext` that did not exist yet.

Not reached: the card's "~200 lines". 237 is what honest work landed on — 27 of
those are imports and the rest is prose that is not duplicated anywhere else.
Shaving it to the number would have bought the wrong thing, which is the same
argument the surfaces' band makes one level up. Every remaining `let` in the
file is bound to the template or read by one function beside it, which was the
other half of the card and is the half that says what the file is *for*.

Measured rather than assumed, since nine module boundaries are not free: the
main entry's payload went **1.2434 → 1.2438 MB** gzipped against `main`'s build,
58.0 → 58.7 kB of it outside Rapier's wasm chunk. `doc/MEMORY.md` § 9's 1.32 MB
is quoted to two places and does not move. `src/build/.gitkeep` is gone, because
the container has contents.

Benched rather than assumed: `npm run shots` (the scope now plots pin 3 down and
to the left, where a pose at the origin facing +Z puts a pin at +61 −28),
`npm run cab`, and `npm run listen` — all twenty scenes identical to the numbers
in `doc/design/cab/sound.md`, which is the claim a refactor has to make. The app
itself was driven through BEGIN, both levers, both cameras, the cabinet, the
stop and RESUME with no console errors.

## 2026-08-26 — merged onto the restructured trunk

Cards: [L-034] — reconciled with `doc/`, `HISTORY.md` and the extracted loop.

Three things landed on `main` while the profiler was being built, and each one
had an opinion about it.

**`docs/` became `doc/`, and the root surfaces moved into it.** Mechanical, and
every path the bench writes down moved with them.

**The log's archives became `doc/HISTORY.md`.** This branch had archived its
three oldest sessions into a fourth verbatim file, `docs/log/2026-voice.md`,
under the old rule — and `main` had folded *exactly those three sessions* into
the arc instead. The archive was deleted rather than merged: the fold supersedes
it, and it is the case L-073 was arguing about. Two board-history cards went the
same way when the merge pushed history to 12: [L-063] and [L-061] are both told
in full by the arc already, which is what "a closed card is already a condensed
session" means in practice.

**The loop left `App.svelte` for `platform/run.ts` (L-070).** The bench copies
that loop, which was defensible when it lived in a 155-line `$effect` no bench
could reach, and is a plainer duplication now that it is a module. Checked: the
clamp, the clock and the step/snapshot/render order are unchanged, so the copy
is still faithful — but only its *address* was keeping it honest, and its
comment had already gone stale by naming the component. So
`tests/architecture.test.ts` now fails if the two disagree about the clamp
ceiling or the order of the four calls, verified by changing each in `run.ts`
and watching the right half fail. Calling `createRun` instead was rejected for
the reason `gl.ts` gives about the renderer: it exposes no seam to time the
halves of a frame apart or to stop on a tick count, and widening the game's API
to suit a bench is what this bench does not do.

One thread changed its answer rather than its wording. *The cab is the part of
the frame nobody has read* was a thread because timing the app meant an eleventh
concern in `App.svelte`; with the loop extracted that is a small change, and what
is undecided now is the **readout** — the app has nowhere to print a block of
text, and a debug overlay that costs a frame to display the frame is its own
joke. Still a thread, for a different reason.

## 2026-08-26 — the control belongs inside the instrument

Cards: [L-034] — the same phone on Chrome.

Chrome resolves `performance.now()` to 0.1 ms where Firefox gives 1 ms, which
was supposed to turn the bounded numbers into measured ones. It did:
**a draw call costs ~7 µs of CPU**, estimated twice and independently — chase is
+170 calls for +1.10 ms of `render` (6.5 µs), E-01 is −80 calls for −0.60 ms
(7.5 µs). A prop is ~0.75 calls and ~3.7 µs of sim per step. The budget now
stands on a measured per-call price rather than an order of magnitude.

It also broke the floor again, from the other direction. With quantization no
longer an excuse, the table still claimed that **parking the machine (+9 %) and
removing 108 props (+4 %) each made the frame slower**. Neither can happen. The
answer was already in the report: `FULL SITE 2` is identical work run a minute
later, and it came back **+6 %** — so that is the size of "nothing" on this
device today. The floor is now `max(quantum, drift) × 2`, the report names which
one is binding, and the control row is exempt from its own rule because
suppressing it would hide the number that licenses the other four. Checked
against all three runs: it suppresses exactly the impossible rows in each and
keeps `half` and `chase` where they are real. `META.md`: **put the control
inside the instrument** — the pass that changes nothing measures what nothing
looks like.

Three things about the *measurement* that the second browser exposed, none of
them about the game:

- **Firefox ran the page at 120 Hz, Chrome at 60.** Same panel. The frame budget
  is the browser's choice, so 8.3 ms is the pessimistic case and the one the
  budget is written against.
- **GPU-owed read 21 ms on Firefox and 4.7 ms on Chrome**, same chip, same
  scene. The column is timed behind a fence, so it includes the browser's
  readback path — Firefox's is several times dearer. It compares passes within
  one run and nothing else; the doc now says so in the method section as well as
  in the findings.
- **`cpu` agrees across both** (3 vs 3.4 ms), which is why it is the column the
  budget stands on. Also: Chrome's renderer string is honest
  (`ANGLE (ARM, Mali-G715, OpenGL ES 3.2)`), confirming Firefox's "Mali-T760, or
  similar" as anti-fingerprinting rather than a driver.

Chrome's first load is 337 ms cold against Firefox's 725–1118 — wasm init,
world build and shader compile each two to four times cheaper.

## 2026-08-26 — the second run is the error bar

Cards: [L-034] — the same phone again, on the fixed bench.

The repeat did the job a repeat is for. Two rows of the previous run's table —
**"motion costs 5 %" and "the chase view costs 5 %"** — came back at +0 %, and a
row that had read 0 % came back at −9 %. They were never measurements: Firefox
quantizes `performance.now()` to 1 ms, and one tick against a 21 ms GPU-owed
basis *is* a 5 % delta. Both had already been written into
`docs/design/code/mobile-budget.md` as prices. Corrected there, and the bench now
**withholds any delta smaller than two clock ticks**, prints `· · ·`, and states
its own floor in the header — with the fill verdict refusing on the same test,
because a verdict is a delta with an opinion attached. `META.md` gained the
second half of yesterday's lesson: run it twice before you write the number down.

What survives the floor is sharper than what did not. **170 draw calls cost
about 1 ms of CPU and no measurable GPU time at all** — chase's GPU-owed figure
is inside the floor and the only column that moves is `cpu`, 3 → 4 ms. And 170
is almost exactly the machine's own mesh count doubled by its ink shells (hull,
cab, frames, four wheels, two belts, 44 grousers, ~27 greebles), which the cab
view gets free *only because the camera is inside it and they frustum-cull*.
Rung 2's boom is in front of you and will not.

The measured `cpu` column also corrected yesterday's derived figure: 3 ms of an
8.34 ms frame, not 4. Summing `sim` and `render` medians overstates, because
they are taken over different frame sets — which is the reason the column was
added and, it turns out, the reason it was needed.

Also: `measureRefresh` took the *minimum* interval, reasoning that a throttled
frame pushes the middle out. Wrong for this loop — the page is idle and has drawn
nothing, so every frame is a full-rate frame and the middle *is* the period;
what the minimum caught was jitter, and the same 120 Hz phone read 120 then 121.
Median now.
