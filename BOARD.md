# BOARD.md — task board

One task per card. Cards carry *what* and *done-when*, never rationale — that
belongs in `MEMORY.md` or `NOTES.md`.

**Targets:** `doing` 3 · `ready` 10 · `backlog` 40 · `history` 10.
**Act at** 4 · 12 · 48 · 12 (`CLAUDE.md`). History past its target moves to
`LOG.md`; ready past its target means a card goes back to backlog, not that
ready is bigger now.

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

Order and reasoning: `docs/design/code/roadmap.md`. These close the core loop at rung
1 over the rack as the build surface. The verdict, its voice, the dash and the
exercises are built; what remains is more to break, replay, and the path to the
conflict.

The two foundation cards come first and are not features. Three feature branches
in one week bent the same seams, and both were *found* rather than planned —
which is the argument for spending a session on them before the next feature
bends them again.

### [L-069] One loop-input seam in `App.svelte`
- **what:** the render loop runs outside any reactive scope, so three of its
  inputs are handled three ways: `held` is mirrored from `briefing` in an
  effect, `hornLevel` is mirrored from `master` in another (whose comment says
  "same shape, and the same reason, as `held`"), and `honking` is read raw —
  an untracked rune read from inside `requestAnimationFrame`, which is exactly
  the shape the other two comments call a bug. One typed object the loop reads,
  fed by one effect.
- **done-when:** the loop reads one value, no `$state` is read from inside
  `requestAnimationFrame`, and adding a fourth input is one field.

### [L-070] `App.svelte` is ten concerns in one file
- **what:** 1080 lines holding the sim lifecycle, the render loop, the rack
  build, audio wiring, the annunciator, the E-stop, the horn, the notices, the
  exercise/briefing state, the camera and the nag. The seams are already
  visible as comment blocks; they want to be modules. `setViewMode` is the
  tell — a `let` assigned from inside an async callback, so calling it before
  the world exists does nothing, silently.
- **done-when:** the sim lifecycle leaves the component, and nothing crosses
  the boundary as a reassigned `let`.
- **needs:** L-069 (the loop's inputs have to be one thing first)

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
- **needs:** L-018 (this is the same conflict, met earlier)

### [L-067] The exercise is over and the rig has nothing to say next
- **what:** the debrief offers NEXT · E-02 after a success and that is the whole
  of the progression. Nothing remembers what you finished, nothing carries a run
  forward, and re-opening the schedule shows every exercise identically whether
  you have driven it or not. It wants the smallest honest thing — a record of
  *completed*, on the schedule, per exercise — and explicitly **not** a gate:
  every exercise stays available from the first session.
- **done-when:** the schedule shows what has been completed and in what time, and
  it survives a reload.
- **needs:** L-012 (persistence is where a record of a run belongs)

### [L-039] Breakables worth breaking
- **what:** the site as an inventory of expensive things. More props, more
  kinds, materials and prices — five kinds and one scooter is not an inventory.
  Quarry tier first: plenty to wreck, nobody to hurt. Also: work areas want to
  be somewhere a driver actually goes, not scattered where nothing leads.
- **done-when:** a careless run through a work area produces a list, not a line.

### [L-032] Record and playback — one engine
- **what:** an input trace plus the seed reproduces a run exactly in this
  browser. Rack state (order, verbs, enables) is part of the trace, because the
  ledger has to say what was driving. Splits off the cross-browser half (L-019).
- **done-when:** replaying a recorded run yields the same damage events in the
  same order, asserted in a test.

### [L-018] The acceptance scenario, made legible
- **what:** levers and NAV-1 under `CAP` already are two components fighting
  over one actuator. The machinery exists; nothing records the conflict, prices
  it, or names it. Make it land.
- **done-when:** a player can say what each module did to the signal, from a
  replay, after breaking something because of it.
- **needs:** L-029, L-032

### [L-033] First run — the ten-minute path
- **what:** the other half of the acceptance criterion, which no card owned. A
  first session opens on two unlabelled levers; nothing walks anyone to the
  conflict. Diegetic register: induction briefing, not a tutorial overlay.
- **done-when:** someone who has never seen the game reaches the conflict in
  under ten minutes without being told how.
- **needs:** L-018

### [L-034] Measure the mobile frame
- **what:** frame time and draw-call count on a real mid-range phone, with the
  current scene (~130 props, ink shells doubling meshes, greebles, grousers).
  Mobile-first is a pillar we have never measured.
- **done-when:** a number exists, and a written first-load and frame budget with
  it.

### [L-015] The rail — drag to reorder
- **what:** the pipeline model, verbs, settings and reordering all work, and the
  plates now look like equipment. What is missing is **drag**: reordering is
  still arrows. Also ~8 slots, and whether it is editable during sim (which is
  L-026, not a UX choice).
- **done-when:** you can drag a slot with a thumb and the machine changes.

---

## backlog

### [L-049] Themes, authored independently — the agentic round
- **what:** one author per manufacturer, each given only its own `LORE.md`
  entry, `cab/components.md`, `cab/theming.md` and the KIBA reference — blind to the
  other makers' work. Each produces that maker's plate, cell and pod. Then a
  **non-blind** adversarial comparison pass over all three side by side.
- **done-when:** three racks read as kit from three suppliers *and* as one game,
  and the pre-registered failure conditions in `cab/theming.md` are answered either
  way — including the one where a person cannot pick the maker of an unlabelled
  plate.
- **needs:** L-048 (built)

### [L-051] The cage and the levers are KIBA's too
- **what:** the chassis component brings the cab furniture. It has the geometry
  now — a roof, door posts, side glass, and levers that are sticks in a gate —
  but it is all generic steel. It belongs in the chassis maker's packet like the
  dashboard does.
- **done-when:** the cage frame and the levers are recognisably the same
  manufacturer's as the panel they sit behind.

### [L-057] The site stands up
- **what:** most of the furniture falls over on its own. Measured on the default
  seed, inside `createWorld`'s 120 settle steps where nothing can see it:
  everything is upright for ten steps, and by step 120 seventeen of eighteen
  marker poles, sixteen of twenty-two barriers and ten of forty-five cones are
  flat. Nothing is wrong with the physics — a 3 m pole with a 0.16 m base cannot
  stand on 20° noise. The fix is **footing**: grade the ground under a work area,
  or place kit only where it can stand, or give the tall things a base. Rejected
  already: placing a box on the highest point of its own footprint, which drops
  it onto one corner and toppled 13 more cones.
  Now audible as well as measurable: the event channel reports one impact at
  tick 109 on the default seed, which is a pole hitting the ground. It is 1.6 J
  and comes out as a tick rather than a bang, so nothing needs muting — but the
  site making a noise before the operator has touched anything is the clearest
  possible statement of the problem.
- **done-when:** an untouched site is still standing when the exercise begins,
  and the first line in the ledger came from the machine, and an untouched site
  is silent.
- **needs:** NOTES thread "the site is hard to crash into on purpose"

### [L-060] Impacts you can hear the side of
- **what:** an impact's voice is centred. It knows where it happened — the event
  carries a world position — and hearing that you clipped something on your left
  is a real cue on a machine you steer with two independent tracks. Wants the
  hull pose, a body-frame transform, and a decision about what "left" means when
  the camera is behind the machine rather than in it.
- **done-when:** clipping a cone on one side is audibly on that side, in the cab,
  and the chase camera does not lie about which side it was.

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
- **needs:** L-006 (the part/module model is where a declared input lives)

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
  version and explicitly not v0. See docs/design/rig/damage.md.
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
  different browsers, and the cost of that guarantee is in `MEMORY.md`.
- **needs:** L-032

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
- **needs:** NOTES thread "What does the procedural generator generate?"

### [L-012] Persistence
- **what:** save and load a machine — geometry, rack order, cockpit layout
  (instrument placements are already tracked; this makes them survive a reload).
- **done-when:** a built machine survives a page reload intact.
- **needs:** L-006

### [L-028] Footstep policy port
- **what:** the probe's most valuable mechanism — world-planted stance feet,
  swing feet retargeting against predicted body position. For rung 5–6, far out.
- **done-when:** deferred; do not start before rung 4 ships.

---

## history

### [L-071] Four clusters instead of a twenty-row index — **closed**
`MEMORY.md` indexed all twenty spill files, which made `docs/design/` a star: a
long list at the centre, everything one hop from it, nothing near anything else,
and every addition making the list worse to read. Now four clusters of five —
machine, cab, rig, code — each with an entrypoint page that indexes its own five,
says what the cluster is *about*, and cross-links the siblings with *go there
instead* rather than a bare pointer. `MEMORY.md` names the four. 145 references
across docs, source comments and tests were rewritten to the new paths.
`tests/docs.test.ts` checks the three things that rot silently: a path that no
longer resolves, a page in no cluster, and a content page creeping back into the
index. Closed [L-064] on the way — it wanted MEMORY spilled for room, and the
band plus the shorter index gave it five lines back instead.

### [L-068] One kit for a hand-built snapshot — **closed**
Three places built `Snapshot` values by hand and each grew its own kit; adding
`suspension` and then `goal` cost three separate lessons, and the one invariant
that had been fixed ("no contact, no traction reading") had been fixed in one of
them. `core/fixture.ts` is the one way now, the two invariants live in it, and
the listening bench stopped running a track through the air at the parked 45%
spring compression. All twenty audio scenes measure identically to before, which
is the claim a refactor has to make. Found on the way: the kits disagreed about a
parked track's traction, and taking the loose answer made `idle` louder — a
duplicate is two answers to a question nobody noticed was asked twice.
`tests/architecture.test.ts` fails on a fourth copy.

### [L-062] The running gear is sprung, and you can hear the side — **closed**
Refused as a voice, built as a machine: **one spring and damper per contact
point**, twelve of them, and the belts no longer touch the ground at all. The
rate is not a number anybody picked — it is the weight divided by the sag the
machine is specified to sit at, which puts the parked ride height exactly where
it already was, so nothing in `render/` moved. Two consequences bigger than the
card: normal load is now **measured off each spring** rather than shared out
equally, which was the load chart's blocker (L-021); and the friction model's
long-standing over-correction surfaced the moment the machine could roll —
impulses at ground level were sized against an equal mass share, ignoring that
the centre of mass is 1.3 m up, and the fix is the textbook **effective mass**.
The voice is the watts the dampers dissipate, per side, floor and ceiling
measured off 80 m of the default site. The bench learned to hear sides to prove
it: silenced it reads 0.008, playing 0.048, at the seconds the scene puts the
ruts.

### [L-065] Exercises — one marker, then all of them — **closed**
A site plus an objective, on one verb: `Exercise` is world data, `Goal` is on
the snapshot, and the ladder is the *ground* rather than the task — E-01 is the
same generator at `relief: 0.3` with its one pin in a forward cone, E-03 is the
full site. The loop's third beat can say **yes** for the first time: a schedule
before you sit down, an objective strip that is the rig's rather than fitted
kit, split times and an outcome band in the debrief, and the rig's first three
noises. `ObjectiveKind` was written and deleted. The open site is on the
schedule so v0's sandbox could not be repealed by adding exercises.

### [L-050] Pods on arms, and the view that recentres — **closed**
The whole cab sweeps, 1:1 with the look: pods, cage, levers and dash are one
rigid object and the head is the only hinge. Placement moved into cage space and
the bound became the arm — not through a pillar, not behind the beam or the
dash, not further out than 200 px of reach, which puts the middle of the
windscreen out of reach of a full-size instrument and leaves it reachable by a
small one. The arm is drawn, so a refusal is visible. One `--look-x`/`--look-y`
write per frame on `:root`, read as `translate` (never `transform`, which
carries transitions). `voice.tips` got its consumer. Found by looking: the
recentring ease was per *frame*, so the neck was twice as slow at 30 fps.

### [L-063] The horn, and the panel that clicks — **closed**
The old `horn` was the annunciator's **buzzer** — the machine talking to you —
and it had the name of the thing it was not. It is `alarm` now, and the horn is
a horn: a chord of two or three trumpets on one air line, never quite in tune
with each other, with the valve chuffing before the note and the tank sagging
after it. It is the loudest thing the machine can do on purpose and the only
voice that renders a **decision**, and it ducks everything else 7 dB while it is
down. On the panel it is a rubber dome, held rather than toggled, outside the
masters group. The panel became switchgear: a **click** for the button and a
**clunk** for the contactor, in the voice of whoever built the kit — and almost
all of it is heard off the *snapshot*, so a replay clicks too. Found by a new
`everything-at-once` scene: the mix clipped at 1.04 before the duck existed.

### [L-061] A machine is voiced by whoever built it — **closed**
Sound gets an owner. A manufacturer's house is colours, words **and sound**, in
one object at `src/makers/` above both renderers; the machine's voices are its
**chassis maker's**, read off the recording, and the site's belong to materials.
A house sets timbre and rate, never level. Depth on the drone (a detuned twin
and a firing pulse, both measured into place against the headroom an impact
needs), and three voices that were not there: the **chain**, one knock per track
plate at the rate the renderer turns the belt; the **squeak**, which belongs to
a heavy crawl and is gone by working speed; and the **rattle**, keyed to the
hull's jerk, which is the only voice that renders the ground. `MachineState`
gained an accelerometer. Rejected: a suspension voice (L-062), because nothing
simulates suspension travel.

### [L-055] GRIP and SLIP become one head — **closed**
TRACTION: the plan view, nose up, a channel per track. Channel colour is the
fraction of the friction cone in use, channel length is the contact patch, the
centre-zero bar is slip. `TrackState.traction` is `null` rather than 0 for a
track with no ground. Needle damped at 0.6 s. The GND and SLIP tells both point
at it, and the odometer got its right-alignment, its own colour for the metres
and a full column for the point.

### [L-052] The dash becomes a panel — **closed**
No inline labelling: every control is named by a separate engraved plate, a
plate never changes, and the lens carries the state. One wrapping flow, no
horizontal split and no scrolling. The rack toggle became the latch it always
was — full width on the bottom seam, and the rack's duplicate close went. The
masters are push-to-acknowledge and the E-STOP latches beside them. Dropped the
SLIP/GND/¥ legend row, which was the panel explaining itself in words. Found,
not built: ordering a guard above what it guards makes it advisory.

### [L-048] The triptych — plate, cell, pod — **closed**
A component is one thing seen from three postures, and only the plate is
mandatory; its maker decides the rest. Three currencies: a chassis component
costs nothing and brings the cockpit, a capability component costs glass, a
safety component costs capability. Severity crosses the boundary as a number so
MASTER WARNING and MASTER ALARM derive themselves and the dash stopped knowing
what a TILT-GUARD is. `src/cockpit/` filled in as the registry. The dash became
the seam and now travels between postures; ATT-0 moved onto it, leaving the bare
cage with clear glass. A sandbox at `sandbox.html` plus `npm run shots` closes
the look-at-it loop. Rejected: a budget for the indicator row — three fronts
competing for space is one too many, so cells just work.

### [L-043] The dash — status panel and closed face of the rack — **closed**
A live industrial control panel: yellow sheet steel, white-bezel needle gauges
(speed, grip), incline bubble, annunciator lamps, a master alarm that opens the
debrief, an ignition key for identity, a red E-STOP that kills the drive by
disabling every module. Critical controls pinned right so they never scroll off
a phone; the instrument strip scrolls. Every gauge reads a real quantity.
