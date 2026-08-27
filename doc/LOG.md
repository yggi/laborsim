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
