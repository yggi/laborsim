# BOARD.md — task board

One task per card. Cards carry *what* and *done-when*, never rationale — that
belongs in `doc/MEMORY.md` or `doc/NOTES.md`.

**Targets:** `doing` 3 · `ready` 10 · `backlog` 40 · `history` 10.
**Act at** 4 · 12 · 48 · 12 (`CLAUDE.md`). Ready past its target means a card
goes back to backlog, not that ready is bigger now. **History past its target
folds into `doc/HISTORY.md` and is deleted** — a closed card is already a
condensed session, so a third file holding it was a dump one level down.

Card format:

```
### [id] Title
- **what:** one or two lines
- **done-when:** the observable condition that closes the card
- **needs:** blocking card ids or open threads (omit if none)
```

---

## doing

*(empty)*

---

## ready

Order and reasoning: `doc/design/code/roadmap.md`. These close the core loop at rung
1 over the rack as the build surface. The verdict, its voice, the dash and the
exercises are built; what remains is more to break, replay, and the path to the
conflict.

**A run is a recording now**, in full: what reached the machine and what the
operator saw, heard and did about it, exactly reproducible from a seed. So the
order below is the acceptance sentence in `doc/MEMORY.md` § 3, taken one clause at
a time — a viewer first, because *attributable from a replay* needs somebody to
be able to watch one; then the conflict made legible, then the same conflict met
by a newcomer, then the path that gets them there unaided. Those three are one
sentence and stay three cards, because each has its own observable.

Behind them: the two smallest things that unblock everything else. Persistence,
which was held down by a blocker meant for a different card, and a driver for the
shipped app, which this branch built by hand twice and threw away twice.

### [L-083] A replay somebody can watch
- **what:** the engine records and replays; nothing shows you one. Every part of
  the cab already takes `inertControls()` and reads a snapshot, the audio clicks
  switchgear off the recording, and the trace now carries the horn, the
  acknowledgement, the mushroom, the view you watched from and where your head
  was — so a viewer has everything it needs and no new channel to invent. What
  is missing is a way in, a way out, and an answer to what the levers show while
  something else is driving them. `EventReader`'s `rewound` flag is the scrub.
  Diegetic register: the rig playing a session back, not a video player.
- **done-when:** after a run, you can watch the moment you broke something, and
  see on the rack what was driving when you did.
- **needs:** L-032, L-084 (both built)

### [L-018] The acceptance scenario, made legible
- **what:** levers and NAV-1 under `CAP` already are two components fighting
  over one actuator. The machinery exists; nothing records the conflict, prices
  it, or names it. Make it land.
- **done-when:** a player can say what each module did to the signal, from a
  replay, after breaking something because of it.
- **needs:** L-083 — L-029 and L-032 are both built, and what is left of "from a
  replay" is somebody being able to watch one.

### [L-066] Turning NAV on does nothing, and that is the best thing in the rack
- **what:** NAV-1 sits below the pilot with verb `CAP`, so parked levers cap
  guidance to zero — the dead-man's throttle, and the acceptance scenario in one
  slot. It is also the first thing a new operator meets: they flip the switch,
  nothing moves, and nothing on any surface distinguishes *this is arbitration
  working* from *this is broken*. Do not fix it by changing the rack default;
  the fix is that the machine can be *read*. Candidates: the rack's stage chain
  already shows `NAV-1 [CAP] +0.00/+0.00` and nobody looks at the debug column;
  the NAV cell's lamp is lit while the module is contributing nothing.
- **done-when:** somebody who flips NAV on with the levers parked can tell, from
  the cab and without being told, that their thumbs are the reason.
- **needs:** L-018 — the same conflict, met earlier, which is why it sits
  directly below it here.

### [L-033] First run — the ten-minute path
- **what:** the other half of the acceptance criterion, which no card owned. A
  first session opens on two unlabelled levers; nothing walks anyone to the
  conflict. Diegetic register: induction briefing, not a tutorial overlay.
- **done-when:** someone who has never seen the game reaches the conflict in
  under ten minutes without being told how.
- **needs:** L-018

### [L-012] Persistence, narrowed — three things that must survive a reload
- **what:** absorbs **L-067** (the schedule remembers nothing) and **L-085** (a
  pod comes back at its default). All three are one `Record` on the shell that
  outlives the tab: the rack's order, verbs, enables and settings; where each pod
  was put (already lifted out of `Glass.svelte` and already on the recording);
  and which exercises have been completed and in what time. Explicitly **not** a
  gate — every exercise stays available from the first session — and explicitly
  **not** the part model: the old `needs: L-006` was for saving a *machine*, and
  `doc/design/code/roadmap.md` had already narrowed this to "rack order and
  settings". That wrong blocker is what had been holding the other two down.
- **done-when:** a rack you reordered, a pod you moved and an exercise you
  finished are all still there after a reload, and the schedule shows the time.

### [L-015] The rail — drag to reorder
- **what:** the pipeline model, verbs, settings and reordering all work, and the
  plates now look like equipment. What is missing is **drag**: reordering is
  still arrows. Also ~8 slots, and whether it is editable during sim (which is
  L-026, not a UX choice).
- **done-when:** you can drag a slot with a thumb and the machine changes.

---

## backlog

### [L-087] Nothing checks the thing that actually ships
- **what:** every bench and both suites boot a **dev** Vite — `drive` included,
  because browser mode serves source through its own server. What `pages.yml`
  publishes is a rollup build of four entries with `BASE_PATH` rewritten into
  every asset URL, and **no check has ever loaded it**. A base-path defect, a
  broken entry or a chunk that only fails minified reaches the site green.
  Cheap: `vite preview` and a page-error gate on each of the four entries. Do
  not grow it into a second driver — the wiring is `drive`'s job, and this asks
  only whether the built thing boots at all.
- **done-when:** a build whose `index.html` cannot find its own assets fails
  before it is published.

### [L-088] The levers, as a thing a thumb has to find
- **what:** the physical redesign bought a lever that reads as a lever and cost
  usability that nothing has been written down about. Reported: players want to
  move it to the side, where the drag **pans the viewport** instead — or worse,
  is eaten by an Android edge gesture, which the cab cannot see coming and cannot
  refuse. Also found while building the driver: the console is `role="slider"`
  with `tabindex="0"`, a label and a live `aria-valuenow`, and **no key handler**
  — focusable and not operable. Mobile-first says touch is primary, not that a
  named slider should lie about being one.
  The three are one subject: where the lever's travel *is*, what else claims that
  region of glass, and what a lever is when the thumb is not on it.
- **done-when:** a thumb that starts on the lever and wanders keeps the lever,
  the edge gesture cannot take a drag that started inside the cab, and the
  console is either operable by the affordance it advertises or stops
  advertising it.

### [L-049] The makers reach the whole cab — the agentic round
- **what:** one author per manufacturer, each given only its own `doc/LORE.md`
  entry, `cab/components.md`, `cab/theming.md` and the KIBA reference — blind to the
  other makers' work. Each produces that maker's plate, cell and pod. Then a
  **non-blind** adversarial comparison pass over all three side by side.
  Absorbs **L-051**: the chassis component brings the cab furniture, and the
  cage, the door posts, the side glass and the levers-in-a-gate are all still
  generic steel. That is KIBA's packet exactly as the dashboard is, and running
  the round without it authors three racks of plates inside a cab nobody made —
  which is also half a comparison pass.
- **done-when:** three racks read as kit from three suppliers *and* as one game;
  the cage and the levers are recognisably the same maker's as the panel behind
  them; and the pre-registered failure conditions in `cab/theming.md` are answered
  either way — including the one where a person cannot pick the maker of an
  unlabelled plate.
- **needs:** L-048 (built)

### [L-081] The profile page measures the two things it asserts
- **what:** absorbs **L-082**. Two numbers `profile.html` currently states rather
  than reads, and both want the same `probe/` shadow beside `ear.ts` and `gl.ts`
  and the same trip to a real phone.
  **The audio thread:** `profile.ts` times `audio.render()` and counts the nodes
  it builds, which is what the *frame* pays for scheduling. Whether the browser's
  own thread keeps up — the only place a dropout can happen — is not observable
  from `ear.ts`, and not from this container either: a bare oscillator drifts
  0.272 s in 30 s here, so drift measured in this environment measures the
  environment. Candidates that survive that: `baseLatency`/`outputLatency`,
  `AudioContext.state` transitions with timestamps, live scheduled-source count.
  **The cab:** the cage, dash, pods and levers are DOM and cost, *by assertion*,
  one custom property on `:root` plus a 10 Hz reactive pass. Nothing has ever
  read it, and the loop is a plain module with a snapshot hook, so it is a shadow
  rather than an eleventh concern in the shell.
- **done-when:** one `profile.html` pass on a phone reports what a frame spends
  on the cab *and* something that would differ during a dropout, and
  `doc/design/code/mobile-budget.md` says whether the assumption held.
- **needs:** thread in `doc/NOTES.md` (the dropout that did not survive a refresh)

### [L-076] Fire, and the things that carry it
- **what:** a drum of fuel and a scooter's tank are the two things on site that
  should not merely break. Fire is a **hazard with a lifetime** — it starts, it
  spreads, it threatens the machine — which makes it a system rather than a
  residual, and it is the reason the residue work stopped where it did.
  `MaterialSpec` is where a `volatile` flag lands; nothing forecloses it.
- **done-when:** driving into a fuel drum at speed starts something that is still
  happening ten seconds later, and the machine has a reason to be elsewhere.
- **needs:** L-038 (the machine has to be able to be hurt by it)

### [L-077] Smoke, and the machine's own symptoms
- **what:** dust is a puff that is over in a second and has no state. Smoke is a
  thing with a lifetime, a rise and a drift — and its first customer is not the
  site but the *machine*: `doc/design/rig/damage.md` asks for smoke and oil as the
  cheap tier of the lemon, before any degradation is simulated. One mechanism,
  two consumers. The mote pool in `render/residue.ts` is the shape to extend.
- **done-when:** an abused machine trails smoke that outlives the frame it
  started in, and a concrete panel's dust hangs rather than popping.

### [L-078] Deformation — the tier between painted and in pieces
- **what:** a written-off thing repaints and comes apart; there is nothing in
  between. Metal that *bends* — a barrier folded round the hull, a drum stove in —
  is the strongest version of "you can see what you did" and the only one that
  needs the mesh to move rather than the material to change.
- **done-when:** a thing hit hard and not written off is visibly the wrong shape.

### [L-079] Debris that is worth something
- **what:** wreckage is landscape: never billed, never broken again. A pipe rolled
  down a slope into a scooter is therefore free, which is right for v0 and wrong
  eventually — it is the clearest case of *the thing you did, two steps later*,
  and the ledger's attribution column is exactly what would have to carry it.
- **done-when:** a line in the ledger names something you hit with something else.
- **needs:** nothing — L-032 is built, so a second-order line is arguable from a
  replay now.

### [L-060] Impacts you can hear the side of
- **what:** an impact's voice is centred. It knows where it happened — the event
  carries a world position — and hearing that you clipped something on your left
  is a real cue on a machine you steer with two independent tracks. Wants the
  hull pose, a body-frame transform, and a decision about what "left" means when
  the camera is behind the machine rather than in it.
- **done-when:** clipping a cone on one side is audibly on that side, in the cab,
  and the chase camera does not lie about which side it was.

### [L-086] The belt does not follow its own bogies
- **what:** the running gear is sprung at twelve contact points and the belt is
  still one rigid loop bolted to the hull, so the bogies move underneath a track
  that does not — and a big enough hit passes the belt through the ground. A real
  track drapes over its wheels; the honest fix is a bottom run that follows the
  six compressions. Promoted out of `doc/NOTES.md`, where it had been sitting as
  half of a question whose other half (whether compression earns an instrument at
  all) is still genuinely open.
- **done-when:** a hard landing shows the belt taking up the travel rather than
  the hull sinking through it.

### [L-058] The ground seam
- **what:** props read as hovering, and it is not a gap: the rest gap under a
  settled prop is **1 mm at the median** (n=102). So this is rendering — a
  contact shadow, or the toon material flattening the seam where a box meets the
  ground, or both. Measure the drawn seam, not the physics.
- **done-when:** a prop at a phone's size reads as sitting on the ground.

### [L-056] The glass in landscape — cage, viewport and perspective
- **what:** the panel reflows in both orientations now; the cab around it does
  not. The deck's travel is in `dvh` and the rack takes 74 of them, which is a
  portrait number — turned sideways the glass is a letterbox and the rack
  overshoots. Camera FOV, cage geometry and the deck's travel want deciding
  together rather than patching one at a time. Do not start it as a CSS pass.
  Also: 200 px of arm reach is a phone number, and a landscape glass has a much
  bigger unreachable middle.
- **done-when:** a phone turned sideways gives a cab worth driving from, with the
  same instruments, no clipped cage and no geometry that only works at one
  aspect ratio.


### [L-041] SPEED-LIM — the third dumb module
- **what:** caps track speed to a number on its faceplate. The obvious partner
  to TILT-GUARD and the first module whose right answer is *situational*: slow
  is safe near the pipe stack and useless on the far side of the site.
- **done-when:** it is in the rack with a limit slider and its own instrument,
  and the ledger can tell you it was set too high.

### [L-054] What a module considers — and what it is wired to
- **what:** `considers` ("your two thumbs", "the route and the hull's heading")
  is on every module and rendered on **no surface** since the plates stopped
  talking — it belongs in the debrief, where words are allowed. Then extend it:
  a module considers things because it is **wired to sensors**, so the sentence
  becomes a list of named inputs a component declares and the machine either
  supplies or does not. That makes an unwired module a real state, makes a
  bypassed sensor visible, and is the surface L-009's hazards attack.
- **done-when:** the debrief can say what each module was considering, and a
  module's inputs are declared data rather than a prose string.
- **needs:** L-006 for the **second** half only. `considers` is already a string
  on every module and the debrief already exists, so putting the sentence on a
  surface is unblocked; it is turning the sentence into declared inputs that
  wants the part model.

### [L-053] The second chassis — a TOWA tracked platform
- **what:** the same machine in a new dress. Identical mechanics, tuned only
  (lighter, smaller, faster, more agile, more brittle) — **no new rung and no new
  mechanic**, because the point is to prove the dashboard's layout belongs to the
  vehicle's manufacturer, and nothing has tested that claim against a second
  vehicle. Rounded, backlit, smooth: Colani-truck retrofuturism inside and out.
  Also needs: how the player switches chassis at all, which nothing answers yet.
- **done-when:** two chassis exist, each brings its own dashboard *layout* rather
  than its own palette, and NAV-1 looks at home in one and wrong in the other.
- **needs:** L-049 (the panel language has to be settled before it is dialects)

### [L-038] The machine breaks too, and the reset
- **what:** damage to the vehicle and destruction, and a **manual** diegetic
  reset — the rig re-racks the exercise, never yanks control. Ends on: machine
  wrecked or **unrecoverable** (flipped / high-centred, a real state to detect),
  a citizen harmed (hard to reach; NPCs dodge; may defer to an NPC round), or
  the operator calling RESET. Degradation before destruction is the strong
  version and explicitly not v0. See doc/design/rig/damage.md.
- **done-when:** an unrecoverable machine ends the exercise and offers RESET, and
  nothing is lost but the run.
- **needs:** L-031

### [L-046] External lights and beacons
- **what:** headlights/spotlight, a red brake light, rotating warning beacons on
  the machine — feedback in the chase view and plain eye-candy. Wire them to sim
  state (braking, alarm) so they mean something, not just decoration. Cheaper
  now: the master condition and its acknowledgement live in the shell, so the
  beacon is the third consumer of a fact rather than a fourth derivation of it.
- **done-when:** the beacon turns under a master-alarm and the brake light comes
  on when you reverse the tracks against motion.

### [L-047] The machine leaves a mark
- **what:** a dirt track on the ground behind the belts — a decal/trail. Ties
  the machine to the world it is tearing up, and it is the first ground evidence
  the ledger's talk of "rutted surface" can point at.
- **done-when:** driving leaves a visible trail that follows the tracks.

### [L-035] Throttle-and-steer — the rung-2 control upgrade
- **what:** the named successor to the two levers, and a component curriculum
  entry. Behind the damage work now that TILT-GUARD is the third module.
- **done-when:** driving with one thumb is available, better in some ways and
  worse in others, and the rack shows why.

### [L-019] Cross-browser determinism — the other half
- **what:** bit-identical `world.takeSnapshot()` hashes across engines. The
  architecture that makes it possible is enforced by test already; this is the
  verification. Deferred: it needs a second engine to check against, and nothing
  in v0 depends on it — shared or cross-site verified solutions do, and those
  are missions.
- **done-when:** the same input trace yields the same snapshot hash on two
  different browsers, and the cost of that guarantee is in `doc/MEMORY.md`.
- **needs:** nothing — L-032 is built, and the trace this would compare across
  engines is now a real format (`control/trace.ts`). Still deferred for its own
  reason: it needs a second engine, and nothing in v0 depends on it.

### [L-021] Load chart v0
- **what:** compute a payload-vs-reach envelope from geometry, mass, actuator
  torque and support polygon, and show it in build. Belongs with rung 2, where
  payload against reach is the point and equal-share normal load gives out.
- **done-when:** changing a part visibly moves the chart before you drive.
- **needs:** L-006

### [L-006] Part/module model
- **what:** how a component declares attachment, the signals it consumes and
  produces, its sensor dependency, latency and actuator authority — and how a
  *part* (no loop) differs from a *component* (closes a loop). Not v0: v0's
  build surface is the rack, and this gets easier once rung 2 exists as code.
- **done-when:** a track drive and an autonav are both expressible without
  special-casing.

### [L-023] Terrain — the probe's designed site features
- **what:** noise terrain and clustered site furniture exist. Still missing are
  the *designed* features from the probe: quarry benches, the graded haul road,
  the trench, spoil mounds. Those are the parts you get stuck on.
- **done-when:** a site has at least one feature that defeats a careless driver.

### [L-025] Panel budget and occlusion
- **what:** NAV-1's route scope is the first mandatory instrument and already
  costs view. Still missing is the *budget*: a fixed glass area, instruments
  declaring their size, and a component refusable for want of it.
- **done-when:** fitting a component can fail because its instrument will not
  fit.

### [L-009] Phantom Labor — the hazard equalizer
- **what:** attacks the sensor surface that capability created. Makes the
  ladder non-monotonic; the two-lever cage is what cannot be scrambled.
- **done-when:** a hazard event disables an instrumented machine while the
  manual one keeps working.

### [L-026] LOTO hot-patching
- **what:** lock outputs (safe, inert, behind schedule) versus rewire live
  (gambling on transient authority handoff).
- **done-when:** rewiring a stabiliser live can drop the machine.
- **needs:** L-015

### [L-027] Job site generator
- **what:** footing, clearances, load, an unsurveyed obstruction — the thing
  that makes a load chart insufficient. Landscape is scenery, not the puzzle.
- **done-when:** two generated sites demand different machines.
- **needs:** NOTES thread "Can a generator be given an objective?"

### [L-028] Footstep policy port
- **what:** the probe's most valuable mechanism — world-planted stance feet,
  swing feet retargeting against predicted body position. For rung 5–6, far out.
- **done-when:** deferred; do not start before rung 4 ships.

---

## history

### [L-075] Nothing drives the app — **closed**
The card asked whether it asserts or reports and the answer was **assert**:
`npm run drive` is a second Vitest project — browser mode, the pinned Chromium
the benches already carry, one dev dependency and no second runner. The two
projects sit in one `vite.config.ts` so the line between them is readable, under
robby's rule, which it paid for: *if it needs a browser to be true it belongs in
`drive`*, because a two-minute check is one nobody runs.

**The gate is the recording's own vocabulary, not a list of buttons.** *Its
verbs* was the trap in the card's own sentence — a hand-written list goes stale
silently, in the direction of less coverage. `control/trace.ts` already
enumerates them for another reason, so nine kinds across `Command` and
`Attention` are named once in `tests/browser/verbs.ts` and two checks share it:
the driver presses each and waits for it **by name**, and the fast suite holds
the list against both unions in milliseconds. Neither half can be satisfied by
writing the list down twice.

**Eleven faults were planted and every one failed by name** — BEGIN not seating
you, the levers reaching nothing, the cabinet not dropping your head, a fuse that
is not a command, the stop latching unrecorded, RESET not re-racking. Among them
**L-070's shipped bug, replanted**: reading the camera in the run effect, which
the driver catches as *a camera press handed back a different run*.

**And a shipped defect fell out of the first run it ever made.**
`audio/engine.ts` resumed a **closed** `AudioContext` on every dispose — so every
RESET and every change of exercise — because L-080's fix had replaced
`=== "suspended"` with `!== "running"` to catch `interrupted`, and `closed` is
the one state that is terminal. Invisible to all 355 tests including the suite
written for that file, because `createLiveAudio` built its own context: the only
link on that path without a seam, between a `createAudio(context)` and a
`createSound(make)` that both have one. It takes its context now, five branches
were planted, and the listener comes off before the close rather than after.

The shell grew its first prop — `makeRun`, so a run in progress is reachable —
and closing that opened a hole in the guard that watches the run effect, which
matched `$state` and `$derived` and not `$props`. It matches props now, and the
capture is `untrack`. 363 tests in 11.1s; `drive` is 24.5s.

### [L-084] A recording is of a session, not of the physics — **closed**
L-032's edge was wrong. It recorded the levers, the posture and the rack and
argued the rest out as "not a sim input" — the **determinism** question, not the
**recording** one. A rig reviewing a session cares about the horn before moving
off, the alarm acknowledged or driven through, and where you were looking when
you hit something. Both cases were already written down and unread:
`cab/sound.md` has the horn "joining the recording where the levers are", and
`cab/cockpit.md` has stepping out to chase as "a thing the rig can record".

**Two channels.** `commands` reached the machine; `attention` did not, and
`createPlayback` is handed `readonly Command[]` so a headless replay cannot read
the other side by accident. The line is `doc/MEMORY.md` § 11's — a maker's kit is
recorded, the rig's furniture is not — with the camera the stated exception,
because chase takes the levers away. `Act` widened so the cab has **one** queue
for a press; the E-stop records its latch *and* the fuses it pulls, because a
rack somebody emptied by hand is not a stopped machine.

The head is **sampled**, at `SNAPSHOT_HZ` and in **radians**: the neck spring is
wall-clock driven on purpose, so no gesture reproduces it, and `viewport.head()`
is pixels through a tangent that differ by a third between a phone and a desktop.
The camera moved onto `hands`, deleting `Run.setView`, the boot-time mode stash
and the `untrack` that existed because reading the camera in the run effect once
threw the world away.

**A shipped bug fell out of it:** `placed` was local `$state` in `Glass.svelte`,
which unmounts when the cabinet opens — so every instrument placement was
destroyed by looking down, while the field promised the opposite. Lifted, and
proved both ways in a browser. 355 tests; four faults planted and watched.

### [L-032] Record and playback, one engine — **closed**
The card read like a feature to build and was not. Twelve pieces of a replay
were already in the tree, **most carrying a comment saying they were put there
for the replay** — the seed and route on the snapshot, `AT_REST`,
`inertControls()`, `Clock.tick`, the event channel's `rewound` flag, impact
entropy drawn from `seq`. Nothing had ever replayed anything, because of three
places where one idea was spelled as several special cases.

The sim's input was **ambient**: `world.step()` takes nothing and the pilot
closes over a live `Hands`, so live and replay could only have differed by
swapping a module. `control/trace.ts` is the input twin of `core/events.ts` —
an `Operator` gives one tick its input, and the cab, a recording and a script
are three of them. Three `Hands` fields deleted themselves: a tick existing
already says `seated`, and `horn` and `alarm` were documented as off the
recording before there was one.

Rack edits crossed by **four routes and none carried a tick**, and the designed
one could express neither a reorder nor a verb — the two the ledger most needs.
One command value, one applier, queued with the tick that applies it. Rule 3 has
said "queued" since before there was production code; it is true now.

The frame was **written twice on purpose** and had already drifted (L-080).
`platform/frame.ts` is the frame; callers own what advances it and when it
stops. Two source-scanning regexes existed only to police the copy and are
deleted: `world.step(` appears in one file now.

The first version of the test **could not fail** — `record()` and `replay()`
both omitted the chassis, so the levers reached nothing and two parked machines
agreed perfectly. Half the suite is now the other direction: the levers, each of
the four commands, their *timing*, the seed and the rail's fitted order are each
removed and required to change the answer. 346 tests. The profile is unchanged
and this container cannot say so — two runs on the same tree move `cpu` more
than the extraction did, while every deterministic column is identical.

### [L-080] The graph gets tests, and the note gets its second oscillator — **closed**
Opened by a dropout report that did not survive a refresh, and the hunt for it
found the real gap: **`audio/engine.ts` had no tests at all.** Every assertion in
`tests/audio.test.ts` is about `voices.ts` arithmetic; nothing constructed
`createAudio`, so the half that owns node lifetimes, automation and every path to
silence had been checked by ear. Four defects came out of one sitting. The twin
oscillator **had never been written to** — `chase()` skips a write when the target
already equals the last value, and the twin was handed `held.hz` one line after
`held.hz` was set to that target — so the detuned pair `sound.md` calls *most of
what separates a machine from a synthesiser* was a fixed 56 Hz drone under a
moving note. Muting **destroyed the AudioContext**: `open()` read the mute knob
inside an `$effect`, which is L-072's own lesson in a file that never got its
test. Only `state === "suspended"` was ever resumed, missing every other way a
browser stops a context. And `dt` had no finiteness guard, so one NaN clock
silenced both chains permanently.

`tests/graph.test.ts` is the layer all four came through — a `BaseAudioContext`
that synthesises nothing and writes down what was asked of it. **Two of its
assertions proved nothing on their first draft and planting the fault caught
both.** A fifth suspect, a click storm from TILT-GUARD's hysteresis-free
condition, was *measured and rejected*: the condition rises once in thirty
seconds at full speed on a ramp at its own threshold, and that is a test now
rather than a fix. The bench also stopped disagreeing with the game about the
frame — `profile.ts` never called `audio.render()`, so its `cpu` was not the
frame's; `audio` reads 0.3 ms p50 and `nodes` 12 a frame, counted by
`src/probe/ear.ts`. 335 tests, worst case 0.922 against a 0.999 gate.

### [L-039] Breakables worth breaking — **closed**
Six kinds and a scooter became **fourteen kinds over nine materials**, and the
reason it had not happened before was structural rather than lazy: every fact
about a prop was a table keyed on its *kind* — mass and price, a collider box, a
voice in `audio/voices.ts`, and its art as a branch of an if/else chain **with a
boulder in its `else`**, so a kind that forgot the renderer drew a rock and said
nothing. A prop is a **part list over materials** now, and five consumers read
that one declaration. Toughness is derived (`tough × ½·m·v_max²`) so the
indestructible-cone scar is not expressible; the ring pitch is derived from mass,
so a new kind gets a voice with **no audio work at all**, which is what had been
stopping the inventory. Prices spread ¥300–14,000 so a careless run itemises.

Deriving the rating does not stop the *shape* being wrong, and only driving into
every kind found that: a concrete block absorbed **zero joules** from a full-speed
hit, because **the machine climbs anything shorter than its own tracks**.
Lightening it changed nothing; making it taller fixed it at once. The same sweep
is now a test, and it says ten of thirteen kinds are written off at full speed
while a 900 kg panel, a cable drum and the ballast only crack — the at-rest guard
working, not failing. Two shipped defects fell out of holding the declared box
against the pieces: a pipe stack drawn end-to-end inside a collider that said
side-by-side, and a cable drum boxed on the wrong axis.

### [L-057] The site stands up — **closed**
**46 of 102 breakables flat → 1 of 117**, and seventeen of eighteen marker poles
→ none. All three of the card's clauses: an untouched site stands, the first line
in the ledger comes from the machine, and `tests/events.test.ts` finally runs its
silence check on the **generated** site — the comment naming this card as the
reason it could not is deleted with it.

The fix was an **ordering** mistake, not a number. Terrain was generated from
noise and then `generateProps` invented six work-area centres of its own, so the
ground and the furniture disagreed about where the work was. The site plan comes
first now (`world/site.ts`), the ground is graded to each pad — the starting pad
generalised from the one hardcoded at the origin, with itself as the datum — and
a candidate is refused where its own tipping gradient says it cannot stand.

A/B'd, because the first census passed with the footing test **removed** and
proved nothing: pads alone leave 8 of 114 flat, the footing test alone leaves 13
and **drops twenty props** for want of anywhere to say yes to, and together it is
1 of 117 with everything placed. The assertion is pooled across all three
exercises for that reason — a per-exercise bound loose enough for E-01's 22 props
could not tell the two apart. Three stragglers were traced rather than tuned
away: each alone, each at the edge of its own limit, each having *slid* one to two
metres, because `sampleTerrain` is bilinear and the collider is triangulated.

### [L-072] The shell lets go of six concerns — **closed**
`App.svelte` went 991 → 732 lines, its script half 497 → 237, and the six clumps
of state the card named are modules: the annunciator's acknowledgement, the stop
and its restore, the maker's notices, the nag, the sound's lifetime. Three more
came out that the card had not found, and they are what moved the number — the
pilot module, the rig's *session* (which exercise, whether you have sat down,
whether the folder is open), and what a rung-one machine is fitted with, which is
the first file in the long-empty `src/build/` and in v0 *is* the build. The
purchase is `tests/cab.test.ts`: 27 assertions over machinery none of which had
ever been asserted, **with no component mounted**, each verified by planting the
fault. Writing them found the shape of two things twice — the wind-down is a fold
over *time*, not a `min` over the current pair, or an operator who silenced an
ALARM would never hear the next WARN; and the stop's latch is what stops a second
press overwriting the enable-state RESUME hands back. An `$effect` outside a
component is an orphan and throws, so every fold is a method the shell drives
with a one-line effect — a module that kept its own effect would have been as
unreachable as the code it replaced. The card's "~200" was not reached and 237 is
the honest number: 27 of them imports, the rest prose that is duplicated nowhere.

### [L-034] Measure the mobile frame — **closed**
`profile.html` and `src/probe/`: six passes over the same six seconds of the
same run, one button, on the device itself. **The frame fits** — a Pixel 9 holds
its panel's refresh through every pass on two browsers — so the answer is not a
rendering crisis
but the first price list: **a prop is 0.75 draw calls**, the site can triple
before the furniture matters, and **the machine already costs more draw calls
than the entire site does** (chase adds 170 over the cab's 224), which makes
rung 2's arm the thing to watch rather than L-039's inventory. The ceiling is
CPU, not GPU: 3–3.4 ms of a frame that may be 8.34 ms is already sim, snapshot
and render submit, at ~7 µs per draw call. Bytes: 1.32 MB over the wire, 95 % of it Rapier's base64 wasm, and
everything built since the empty scaffold adds 0.05 MB.
Three runs, and each found a defect in the bench. (1) Every pass returned the
refresh period, so every delta read 0 % and the fill verdict inverted — deltas
now fall back to GPU-owed time when the frame is pinned. (2) On a 1 ms clock one
tick *is* a 5 % delta, and two such ticks had been written down as prices. (3) A
finer clock removed that excuse and the table still said parking the machine and
removing 108 props each made it slower — so the floor is now the larger of the
clock's step and the **drift measured by the control pass**, which was in the
report all along. `tests/probe.test.ts` holds every branch, each verified by
mutation. Budget, method, the device table and what two browsers disagree about:
`doc/design/code/mobile-budget.md`.

### [L-074] `doc/`, and closed cards join the pipeline — **closed**
Two changes with one shape. Closed cards were the archive pathology one level
down: `doc/LOG.md` held 56 lines of six cards, every one describing something
`doc/HISTORY.md` already said — a third copy after the session and the arc. They
fold into HISTORY now, exactly as a log session does, since a closed card *is* a
condensed session. Only TILT-GUARD's `AMP`-not-`CAP` reasoning was missing from
the arc, and it went in with the ordering lesson beside it. And the tree moved to
match `yggi/robby`: the root holds `CLAUDE.md`, `README.md` and configuration —
the two entrypoints for a reader who has not been told where to look — and every
other document is in `doc/`. `CLAUDE.md` gained the **Gates** section robby has
and we lacked: green suites *you ran*, surfaces moved, nothing new unverifiable,
and a measured claim re-measured.

### [L-073] `doc/HISTORY.md` — the log's downstream side condenses — **closed**
`doc/log/` was a dump with a label: 1,577 lines holding 32 entry blocks of which
**28 were distinct** — four were stored twice between two archives, three of them
byte-identical — condensing 2% of what it held, gated by nothing, read by nothing,
and duplicating what git already stores twice over. Replaced by `doc/HISTORY.md` at
the root: one condensed arc, oldest first, **rewritten rather than appended to**,
with a target below `doc/MEMORY.md`'s because current truth outranks how it was
arrived at. A LOG overflow now folds its oldest sessions into the narrative and
deletes them. `tests/docs.test.ts` checks its links, which the archives were
exempt from.

### [L-070] The loop leaves the component — **closed**
`App.svelte` was 1082 lines with the sim lifecycle in the middle of it. It is
`platform/run.ts` now: the world, the fitted kit, the viewport, the input and the
frame loop, behind an object the shell holds. The escape hatch went with it —
`let setViewMode = () => {}`, reassigned from inside a `.then()`, so a camera
press before the wasm landed reached a function that did nothing and said
nothing. `createRun` returns synchronously and *remembers* a view given during
the boot. The run does not know what kit is fitted: NAV-1 and TILT-GUARD need a
world to read a pose off, so the caller passes `fit(world)` and keeps the
opinion. Verified by driving it — the rack reads `PILOT [SET] +2.20/-2.20` down
the chain exactly as before, and CHASE pressed on the same tick as BEGIN now
lands. `tests/architecture.test.ts` fails if a `requestAnimationFrame` reappears
in the component or a rune reaches the run.

