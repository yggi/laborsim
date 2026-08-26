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

## 2026-08-26 — the frame fits, and the bench was wrong about why

Cards: [L-034] closed.

A Pixel 9 (Firefox 153, Android 17) ran the bench. **Every pass came back at
8.34 ms — the panel's own 120 Hz period — so the frame fits with room, and the
answer to "is mobile-first in trouble" is no.** What the run was actually worth
is the price list underneath it, in `docs/design/code/mobile-budget.md`:

- **a prop is 0.75 draw calls and 0.01 ms of render CPU.** 108 of them — the
  difference between E-01 and E-03 — are 81 calls, 1 ms of CPU, 3 ms of GPU-owed
  time. The site can roughly triple before the furniture is worth a thought,
  which is what L-039 and L-023 were waiting to hear.
- **the machine costs more draw calls than the whole site does.** Chase adds 170
  over the cab's 225: greebles, grousers, bogies, and the ink shell doubling
  every one. So the number to watch is rung 2's arm, not the prop count.
- **the ceiling is CPU, not GPU.** ~4 ms of an 8.34 ms frame is already sim,
  snapshot and render submit. Half a frame, and half of that spent.
- motion is free (5 %), and there was no thermal drift over ninety seconds.

**The device found a defect in the bench on contact, and it is the session's
lesson.** Comparing passes on frame time is worthless when the frame is pinned:
all six passes reported the refresh period, every delta read 0 %, and the fill
verdict printed *pixels are not what is costing you* about a scene where halving
the buffer removes 43 % of the GPU's work. No null test would have caught it —
the instrument could see fine, it was reading something saturated. The report
now detects the pin, says so, and falls back to GPU-owed time, which nothing
clamps; `tests/probe.test.ts` holds both branches and all three pinned
assertions were watched failing with the bug put back. `META.md` gained the
general form: **a quantity with a ceiling reports the ceiling, and it looks like
a result.**

Three smaller things the same run bought. `performance.now()` is quantized to
1 ms on Firefox, so every duration in that report is an integer — the bench now
measures and prints the clock's own resolution beside the numbers it governs. A
`cpu` column was added, timed as one span rather than summed from `sim` and
`render`, because `sim` is sampled only over frames that owed a step and a sum
of those medians describes no particular frame. And Firefox reports a spoofed
`UNMASKED_RENDERER` ("Mali-T760, or similar") — recorded as a caveat, and the
reason the next row wanted is the same phone on Chrome.

`formatReport` also stopped reading `location`; the href is passed in. That is
what made it testable at all, and its own header had been claiming it was.

## 2026-08-26 — an instrument for the pillar nobody had measured

Cards: [L-034] — the bench.

`profile.html` and `src/probe/`: a fourth entry point that builds the **real**
world and the **real** viewport on the device in your hand and times them. One
button, ninety seconds, and a block of fixed-width text to paste back — because
the numbers had to come off a phone and a phone is not where anybody reads a
console.

Six passes over the same six seconds of the same run, each changing exactly one
thing, because a single frame time says whether to worry and nothing about what
to cut: the pixel count, the prop count, the motion, the view, and last of all
nothing at all, so a minute of thermal load shows up as itself. **A pass ends on
a tick count, not a frame count, and each gets a fresh world** — that is what
makes two devices comparable at all, and the user has more devices coming.

Three decisions worth the next session's time:

- **Draw calls are counted at the driver**, by shadowing the draw entry points
  on the canvas's own context. `renderer.info` was the obvious route and would
  have meant publishing the `WebGLRenderer` out of `render/scene.ts` — a bench
  is not a reason to widen an interface. It also counts the shadow pass, which
  three.js's own figure does not present as part of a frame. A `Proxy` was
  rejected: three.js makes thousands of context calls a frame and a trap on each
  would be timing the profiler.
- **The GPU column is measured in a separate second.** `render()` returns when
  the commands are queued, so seeing what is still owed needs a fence, and a
  fence kills the CPU/GPU overlap the real loop lives on. Timing the frame with
  one in it would report a game slower than the one that ships. First cut used
  `gl.finish()` alone and read a flat **0.00 everywhere** — the instrument could
  not see the claim (META). A one-pixel `readPixels` after it cannot be faked;
  the same column then read 167 ms against a 183 ms frame, which is a software
  rasteriser telling the truth about itself.
- **`sim` is measured over the frames that owed a step.** A 120 Hz phone steps a
  60 Hz sim every other frame, so half the samples would be a snapshot and
  nothing else, and the median would report a physics engine that costs nothing.

`src/probe/` is a new seam and deliberately outside rule 3's scan: the bench
touches both halves because a profiler that could reach neither would be
profiling neither. The half that *is* enforced is the other one — nothing
outside `src/probe/` may import it, checked in `tests/architecture.test.ts`, and
verified by planting an import in `src/ui/format.ts` and watching it fail.

`npm run profile` drives the same page headlessly. Not a reading — SwiftShader
is a rasteriser, not a phone — but the thing META keeps asking for: a bench that
fails silently fails *in somebody's hand*, ninety seconds into their evening.
`--build` builds first, which is the only way it can report the payload at all.

The bytes half of the budget is answered and crystallized into
`docs/design/code/mobile-budget.md`: **1.30 MB over the wire, 1.24 MB of it one
chunk, and that chunk is Rapier.** `NOTES.md` had carried 1.25 MB gzipped for an
*empty scaffold* — so the scene, the cockpit, the audio graph and the exercises
have between them added 0.05 MB, and `-compat` inlining wasm as base64 is the
entire budget. The levers are named in order and none of them is "write less
game". The frame half stays open until a device runs it, and the budget itself
is deliberately **unset**: a budget written before a measurement is a guess with
a table around it, which is the thing the page exists to stop.

What the bench does not measure, and now says so on its own face: the cab. The
cage, the dash, the pods and the levers are DOM over the glass and none of it is
on that page. It is a `NOTES.md` thread rather than a card because measuring it
means either mounting the app in the bench or teaching `App.svelte` to time
itself, and `App.svelte` is already ten concerns (L-070).
## 2026-08-26 — doc/, and the closed cards join the pipeline

Cards: [L-074] closed. `CLAUDE.md` restructured.

**The closed cards were the same dump one level down.** `LOG.md` carried a
section holding six cards pushed out of the board's history — 56 lines, and every
one of them described something `HISTORY.md` already said: TRACTION, the
dash-as-panel, the triptych, draggable instruments. A third copy, after the
session entry and the arc.

The fix is the rule the log already follows: **history past its target folds into
`HISTORY.md` and is deleted.** A closed card is not raw material, it is *already*
a condensed session — which is exactly why parking it in a third file bought
nothing. Checked before deleting rather than assumed: of the six, only
TILT-GUARD's verb reasoning was genuinely absent from the arc — `AMP` rather than
`CAP`, because `CAP` clamps a positive intent into the arriving signal's
magnitude and would turn a reversing machine around, a safety module causing the
crash it exists to prevent. That went in, with the ordering lesson beside it (a
guard above the thing it guards is a warning light).

**And the tree moved to `doc/`, to match `yggi/robby`.** The root holds
`CLAUDE.md`, `README.md` and configuration — the two entrypoints for a reader who
has not been told where to look, one found by the agent and one by GitHub — and
every other document is in `doc/`. `docs/` became `doc/`, the six surfaces and
`LORE.md` moved into it, and `tests/docs.test.ts` became `tests/doc.test.ts`.

Getting there took two corrections worth recording, both mine.

**I checked one branch and called it the repo.** Told the core files were in
`doc/`, I cloned robby `--depth 1` on its default branch, found no `doc/` and no
`META.md`, and started reasoning about what the instruction "must" have meant
instead. That is guessing dressed as inference. Fetching every branch found
`claude/agentic-project-structure`, which had `META.md` and `docs/design/` in
four clusters — the same structure built here this morning — and re-fetching
`main` half an hour later found it merged and moved to `doc/` exactly as
described. **A shallow clone of one branch is not a look at a repository**, and
when a stated fact does not match what I see, the next move is to widen the
search, not to reinterpret the statement.

**A `cd` leaked across a here-doc.** A comparison script `cd`'d into robby and
then printed "laborsim — ROOT .md files", which listed robby's root. It was
obvious only because the output had `HANDOFF.md` in it, which laborsim has never
had. Absolute paths in anything that compares two trees.

Both went to `doc/META.md` as one Diagnosis entry — they are the same shape, a
look that was narrower than it claimed to be, and the contradiction was the
finding in each.

`CLAUDE.md` gained the section robby has and this repo lacked: **Gates — what
makes a change finished.** Four conditions, each failed here before — the suites
green *and run*, with the number printed rather than estimated; the surfaces
moved; nothing new left unverifiable, with a planted fault to prove a new check
can fail; and a measured claim re-measured, because numbers in `doc/` are
readings rather than decoration.

## 2026-08-26 — the log's downstream side learns to condense

Cards: [L-073] closed, [L-072] opened. `CLAUDE.md` changed again.

The question was whether the archive is a dump or a condensation layer. Measured
rather than argued, and it is a dump with a label on it:

- **1,577 lines, of which 33 are framing prose.** A 2% condensation. Every spill
  wrote a one-paragraph header once and never revisited it.
- **32 entry blocks holding 28 distinct entries.** Four sessions were stored in
  *two* archives at once, three byte-identical and one differing by a trailing
  separator. Nothing checked, so nothing noticed.
- **Nothing read it.** Every reference in the repo was a pointer to its
  existence — the repo map, a README row, `CLAUDE.md`'s spill rule, and
  `tests/docs.test.ts` explicitly *excluding* it from link checking. No document
  cited an archive for an answer.
- **No gate.** `doc/LOG.md` had 1000/1200; the archives had nothing and grew ~250
  lines a session.
- **The naming had already broken**: `early` / `mid` / `panel` — two periods and
  a subject, with no rule for what comes next. And the headers drift: the panel
  archive opened "Seven sessions in which the dash… became a panel" because two
  GRIP/SLIP sessions had been bolted on with an "and finally".

The argument that settles it: **git is already the dump.** Every entry is in
`doc/LOG.md`'s history and in the commit that wrote it — verified before relying on
it. So the one layer doing a job already done was the archive, while the job
nobody was doing is the one git cannot do cheaply: git hands you commits, not
periods, and changes, not changes of mind.

`doc/HISTORY.md`, at the root because it is a surface with a job and a discipline —
burying it under `doc/` is part of what let it rot. Oldest first, because it is
a story rather than a feed. One file, because per-period files would rebuild the
star topology we took apart this morning.

The property that matters is that it **converges**: a spill folds its sessions
*into the paragraph they belong to* and deletes them, so a month becomes a
section, a quarter a paragraph, a year a line. Appending is the failure mode, and
the file says so.

1,577 lines of dump became 215 lines of arc — the reversals (sequence the ladder
not the biped), the reframings (the training frame; the rack as a pipeline, which
dissolved three questions at once), the things that fell out for free (the
dead-man's throttle; a machine that flips over backwards with no tipping logic),
and the measurements that decided design (GRIP vs SLIP at r = 0.267).

The new rule got exercised the same session it was written: this entry pushed
`doc/LOG.md` to 1227, past its 1200 line, so its three oldest sessions — the horn and
the switchgear, the maker's voice, and the round that finished the triptych and
moved the cockpit/ui seam — were **folded into `doc/HISTORY.md`'s narrative and
deleted**, not moved. Three sessions, 266 lines, became a 24-line section. That is
the whole point of the layer, done once so the shape is on record.

**One honest failure worth recording.** I set the target at 200 before writing,
came in at 229, and then shaved: three passes rewording paragraphs that were fine
to claw back sixteen lines. That is precisely the pathology the band was
introduced to stop, performed by the person who introduced it eight hours
earlier. The target was wrong, not the file — 200 was picked before the content
existed. It is 250 now, on a reason that does not depend on what I happened to
write: **below `doc/MEMORY.md`'s 300, because current truth outranks how it was
arrived at**, so this can never be the longest thing in the repo.

## 2026-08-26 — the loop leaves the component

Cards: [L-070] closed, which finishes the foundation pass ([L-068], [L-069],
[L-070]).

`App.svelte` was 1082 lines and the sim lifecycle was 155 of them, in one
`$effect` in the middle: physics init, world, rack assembly, viewport, resize,
pointer capture, the frame loop, teardown. The file's own opening comment has
said since it was written that "Svelte owns the DOM; a plain module owns the
renderer and the loop". `platform/run.ts` is the module that comment was
describing, and the header now points at it instead of promising it.

**`platform/`, because almost everything the run does is where the application
meets the browser** — `requestAnimationFrame`, pointer capture, a resize
listener, one custom-property write a frame. The world and the renderer are
things it owns, not things it is. The directory had been empty since the repo
map first named it.

**The escape hatch went with it, and the fix is that the run exists
synchronously.** The old code hoisted `let setViewMode = () => {}` into the
component and reassigned it from inside the `.then()`, so pressing CHASE before
the wasm landed reached a function that did nothing and reported nothing.
`createRun` returns a `Run` immediately and *remembers* a view given during the
boot, applying it on arrival; `dispose()` is safe at any point including
mid-boot. What the shell holds is a `Run | undefined` — an absence that is typed
and handled with `?.` rather than a function that lies about being ready.

**The run has no opinion about what is fitted.** NAV-1 needs a world to read a
pose off and TILT-GUARD needs one for an attitude, which is *why* they are built
in there — but which components those are is the cab's business. So the caller
passes `fit(world)` and hands modules back. A run with `createAutonav` inside it
would be a run that knows what a machine is.

L-069 is what made this a small change rather than a fight: everything the loop
needs from the cab already arrived as one argument, so the extraction moved code
without having to *decide* anything about the boundary. Two objects cross the
seam now and nothing else does — `hands` going down, a snapshot coming back.

The scanner from L-069 failed, correctly, the moment the blocks it reads moved
out of the component: `no such block: const tick = (now: number) => {`. Its rule
is stronger now rather than gone — a plain `.ts` module cannot hold a rune at
all — so it checks the boundary instead: the pilot module (still declared in the
component, still called from inside `world.step()`) reads no rune, the component
contains no `requestAnimationFrame`, and the run declares no rune and imports no
Svelte. Each verified by breaking it.

Driven, not just typechecked. The cab bench reads `PILOT [SET] +2.20/-2.20` down
the whole chain with the clock running — identical to before the extraction — and
a separate probe pressed CHASE on the same tick as BEGIN, which is the race the
old hatch lost, and got the chase camera. 242 tests, lint, typecheck, build, 19
cab shots, 20 panel shots.

Not done, and deliberately: the shell is 984 lines and still holds the
annunciator, the E-stop, the horn, the notices, the audio lifecycle and the nag.
Those are all *cab* concerns and they belong to a component; the card was about
the sim lifecycle, and stretching it into a general decomposition would have been
a different, worse change.

## 2026-08-26 — one channel for what the loop reads

Cards: [L-069] closed. Rule 3 gained an edge in
`doc/design/code/architecture-rules.md`.

**Five values crossed into the render loop by three different mechanisms.** Two
were mirrored into plain variables by their own effects — and the second one's
comment said, in as many words, that it was "the same shape, and the same reason"
as the first, which is a duplicate noticed and then left. The horn was read raw
from inside `requestAnimationFrame`, which is precisely the untracked read those
two comments existed to avoid. The rack-open posture was read raw from inside a
pointer handler.

And the fifth, which the card had not found: **both levers, read raw by the pilot
module's `intent`, which `runRack` calls inside `world.step()`, inside the loop,
sixty times a second.** The hottest path in the application, and it had gone
unnoticed for as long as it did for a structural reason worth keeping — it does
not cross *in the loop body*, where somebody auditing the loop would look. It
crosses inside a module callback that the loop happens to invoke. Depth hid it.

`control/hands.ts` is the one channel now: one plain object, written by one
effect, read as fields by everything downstream. It is the continuous twin of
`Controls`, and deliberately shaped like it — that file's own argument is that
each command "crossed by its own private route" until there was one channel, and
this is the same sentence about values instead of commands.

**The five turn out to be one kind of thing**, which is the part that makes it a
seam rather than a bag. A clock hold, a lamp, a horn, a posture and two levers
look unrelated; every one of them is *something the operator is currently doing
or has not yet done* — they have not pressed BEGIN, they have not acknowledged
the master, they are leaning on the horn, they have the cabinet open, their
thumbs are where they left them. `audio/engine.ts` had already drawn that line
for the two fields it takes: the snapshot is what the machine did, this is what
the hands did.

Scanned rather than trusted. `tests/architecture.test.ts` extracts the three
blocks that run outside the reactive graph — the pilot module, the loop's `tick`,
the canvas drag handler — and fails on any rune name that appears in them other
than as an assignment target, because a *write* is the snapshot boundary working
(`latest = current`) and only reads have to go through the seam. Each of the
three was verified by putting the old code back and watching the right one fail.

The scanner failed on its own fix first, which was instructive: `\bleverL\b`
matches inside `hands.leverL`, so the check reported the seam as a violation of
itself. A lookbehind for `.` fixes it — a property access is not a rune read.

Verified in the real app rather than only in tests: `npm run cab` puts both
levers at opposite ends of their throw and the rack reads `PILOT [SET]
+2.20/-2.20` down the whole chain to TERMINAL, with the clock running — which is
`hands.leverL`, `hands.leverR` and `hands.seated` all doing their job through the
new channel. 242 tests, lint, typecheck, build, 19 cab shots.

Board bookkeeping: history reached 12, which is the act-at line under the new
band, so [L-048] and [L-043] went to the archive below and it is back at 10. The
band's first real trim, and it moved two whole cards rather than shaving a row.

## 2026-08-26 — a band instead of a line, and four clusters instead of a star

Cards: [L-071] closed, [L-064] closed with it. `CLAUDE.md` changed, which is
rare and deliberate.

**The gates became targets with a band.** Every surface keeps the size it had;
what changed is where you act — 20% over, so 300/150/100/1000 become 360/180/120/
1200 and the board's card counts become 4 · 12 · 48 · 12.

The reason is a habit worth naming. A hard limit at the target buys the *wrong*
work: one line over, and what happens is a sentence reflowed, a word deleted, an
entry compressed by exactly one line. This session alone did it three times —
`doc/NOTES.md` from 105 to 100 by rewording a paragraph that was fine, `doc/META.md` from
154 to 150 the same way, `doc/MEMORY.md` from 301 to 300 by shortening a sentence
about exercises that nobody had complained about. None of that condensed
anything; it cost a real edit's worth of attention each time and left the
surfaces exactly as sprawling. The band's rule is *condense to the target or
below in one pass, not to the line* — a trim landing at 359 has bought one line
and will be back next session. And sitting in the band for three sessions running
means a section wants spilling, not trimming.

Immediately visible: `doc/BOARD.md`'s history sits at 11 against a target of 10 and
nothing is owed, which under the old rule would have been a card moved to the
archive to buy one row.

**The docs were a star, and are now four clusters.** `doc/MEMORY.md`'s index named
all twenty spill files. That is one hop to everything and no distance between
anything: no page knew it had siblings, `sound.md` sat between `roadmap.md` and
`stack.md` in a table sorted by nothing in particular, and each new page made the
list worse to read. Worst, the question a reader actually has — *where does this
belong* — could only be answered by scanning twenty rows.

Four clusters of five, each with an entrypoint page:

- **machine/** — tracked-platform, machinery-ladder, physics-migration,
  load-chart, arbitration. *A limit with a person attached.*
- **cab/** — cockpit, components, instrument-rendering, theming, sound.
  *A budget: glass is finite and so is attention.*
- **rig/** — training-frame, tone, damage, missions, mechanics. *The reason
  failure is affordable.*
- **code/** — architecture-rules, conventions, stack, prototype-findings,
  roadmap. *A constraint with a receipt.*

Each cluster page says what the cluster is about, indexes its five in one line
apiece, and — the part that a flat list cannot do — carries a **go there
instead** section. "An instrument's needle is cab, the limit it reads is
machine." "The rig may read the machine; the machine knows nothing of the rig."
Those sentences had nowhere to live before. `doc/MEMORY.md` now names four things
instead of twenty and got five lines shorter doing it, which closed [L-064]
without spilling anything.

Files moved rather than only re-indexed, so the shape is on disk and not just in
a table: 145 references across docs, source comments and tests were rewritten.
`doc/LOG.md` and `doc/log/` were deliberately **not** rewritten — they are
append-only history and record paths that were right when written.

**`tests/docs.test.ts`** checks the three things that rot without a sound: a path
that no longer resolves (links and backticked prose both, because both get
followed), a page in no cluster, and a content page creeping back into the
`MEMORY` index — that last one being the star topology regrowing. Verified by
breaking each in turn.

Which is where the session's own mistake came from. Undoing the third probe with
`git checkout MEMORY.md` reverted the file to HEAD and took the entire index
rewrite with it, because the work was uncommitted — while `git checkout` on the
*untracked* cluster page failed and left its planted broken link in place. Both
were caught and redone. **A probe you undo with the VCS needs the work committed
or copied first**; on a tree with uncommitted edits, `git checkout <file>` is not
an undo, it is a discard.

## 2026-08-26 — one kit for a hand-built snapshot

Cards: [L-068] closed. Opened: [L-069] and [L-070], both found rather than
planned. Convention added to `doc/design/code/conventions.md`.

A foundation pass, and the seam it picked was the one three feature branches had
each bent in the same week.

**Three places built `Snapshot` values by hand**, and none of them was the sim:
the cockpit bench, the listening bench, and `tests/cockpit.test.ts`. Each had
grown its own `track()`, its own stage builder, and its own literal for
*standing on the ground* — one of them spelling `heave: 9.81` where `spec.ts`
exports `G`. No test imported anything from `src/sandbox/`; the three had never
shared a foundation, and it showed.

The cost was not hypothetical and it is in the history: `suspension` landed in
one commit and `goal` in another, twenty-three seconds apart on two branches,
and **each had to teach all three kits separately**. Two features, six lessons.

**Worse than the tax was the drift.** One kit had been fixed so that
`contacts: 0` with a traction reading was unrepresentable — its comment says it
"described a machine that does not exist". The other two were not fixed. So the
listening bench duly grew a scene running a track through the air at the
**parked 45% spring compression**, which no sim step can produce. Being precise
about the damage: the bogie voice reads `{ damping, bottomed }` and not
`compression`, so it was a wrong reading rather than a wrong sound — bad data in
a bench whose only job is to be right about readings.

`core/fixture.ts` is the one way now. Both invariants live in it — no contact
means no traction reading *and* no compression — after the spread, so a caller
naming them cannot reintroduce the state the function exists to refuse.

**The refactor's claim is that nothing changed, so it was measured.** All twenty
audio scenes read identically to before: `idle` 0.122, `full-ahead` 0.490,
`the-rut` 0.642 with 0.048 between channels, `everything-at-once` 0.865. Twenty
cockpit shots, 232 tests, typecheck, lint.

Getting there took one wrong turn worth keeping. The first unified `track()`
defaulted `traction` to 0.2, because that is what the *cockpit* kit did — and
`idle` came back 0.122 → 0.140 and `caution` 0.203 → 0.210. The two kits had
quietly disagreed about what a parked track's traction is, and 0.2 was a dial
reading somebody wanted to see rather than a state a stationary machine is in.
A duplicate is not only a sync you have to remember; it is two answers to a
question nobody noticed was being asked twice, and the wrong one is invisible
until they meet.

`tests/architecture.test.ts` now fails if a fourth copy appears — scoped to
`src` **and** `tests`, because the last scanner written to watch only the tree
whose author already thinks about the rule missed the first violation. Verified
by breaking it: a planted file is named in the failure with the fix in the
message. `machine: {` now occurs exactly once in the repo, in `sim/world.ts`.

Net: −252 lines across the three callers, +one kit that is mostly its own
argument. `doc/MEMORY.md`'s repo map gained `sandbox/`, which it had never listed.

Not taken, and carded instead: `App.svelte` at 1080 lines (L-070), and the three
different ways its render loop gets a reactive value across the boundary into
`requestAnimationFrame` — two mirrored through effects, one read raw, with the
comment on the second saying "same shape, and the same reason, as" the first
(L-069). That is the same defect as this one, one layer up, and it deserves its
own session rather than a rider on this.

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

**The `delete` event is not a broom, and going to sweep found out why.** Runs
share the `pages` concurrency group and GitHub keeps exactly **one** pending run
per group — so deleting three branches at once queues three cleanups and cancels
two. Those two directories would be orphaned for ever, because nothing else was
ever going to look. So the event is now an *optimisation* (removal is instant)
and the mechanism is that **every publish re-checks**: `git ls-remote` for the
live branches, and any `b/<slug>` without one goes. The site converges on the
truth however many events were dropped.

It fails safe on purpose, and the interesting part is that "safe" needed saying
twice. A failed listing means *unknown*, not *no branches* — confusing those
deletes every preview the first time the network hiccups. But an **empty**
listing is also unknown: `main` publishes the root, so it is always in that list,
and an empty one means the output did not mean what the code thought it meant.

And testing that second path is what caught a real defect. Under `set -e` a
`while` loop exits with the status of its **last iteration**, so a body ending in
a `&&` chain whose test fails makes the command substitution non-zero and kills
the script — exit 1, nothing printed, in a step whose whole job is to say what it
did. It had been passing only because `main` sorts after `gh-pages`, so the last
ref read happened to be one that was kept. A `case`/`continue` fixed it. The bug
was invisible on the happy path and on the live repo; it took building the
unhappy remote to see it at all.

**And a doc pass, because the README had been lying for a while.** It said "no
rack yet", which stopped being true around L-015's ancestors, and "watch SLIP",
which stopped being true when SLIP folded into TRACTION. `doc/META.md` and `doc/LORE.md`
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

The four doc surfaces were the real merge. Both branches had trimmed `doc/NOTES.md`
to exactly 100 lines and their union was 105; the equal-share normal-load thread
was deleted rather than reconciled, because the springs answered it and the
other branch had only reworded the question. `doc/BOARD.md` history went to eleven
and L-029 dropped off the bottom — it is in `doc/log/2026-mid.md`. `doc/LOG.md`
kept both session entries and then this one, which put it at 1024, so the two
GRIP/SLIP sessions went to `doc/log/2026-panel.md`, whose subject they finish.
`doc/META.md` gained the lesson this session cost: **green plus green is a third
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
`doc/MEMORY.md` is back to 299 of 300, which is where it started.

Missions, as far as the first two steps of `doc/design/rig/missions.md` go: reach a
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
