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

The foundation pass is done — [L-068] through [L-072] closed the seams that three
feature branches in one week had each bent, and the shell is wiring again rather
than a sixth home for cab state. What is left here is features, and `L-032` is
the one everything downstream of *attribution* waits on.

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

### [L-015] The rail — drag to reorder
- **what:** the pipeline model, verbs, settings and reordering all work, and the
  plates now look like equipment. What is missing is **drag**: reordering is
  still arrows. Also ~8 slots, and whether it is editable during sim (which is
  L-026, not a UX choice).
- **done-when:** you can drag a slot with a thumb and the machine changes.

---

## backlog

### [L-049] Themes, authored independently — the agentic round
- **what:** one author per manufacturer, each given only its own `doc/LORE.md`
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

### [L-075] Nothing drives the app
- **what:** four benches read the game and none of them *plays* it. `shots` and
  `listen` drive hand-built snapshots, `cab` poses the renderer, `profile` times
  it — all downstream of a recording, by design. So a defect in the shell's own
  wiring is invisible to every one of them, and both of this session's bugs were:
  the chase camera rebuilding the world, and a mirrored instrument that no test
  could reach. A scripted pass over BEGIN, the levers, both cameras, the cabinet,
  the stop and RESET found the first in one run and would have found it the day
  it landed. Wants deciding: whether it asserts (a fifth suite) or reports (a
  fifth bench), and what it does about the fact that it needs a real browser.
- **done-when:** one command drives the shipped app through its verbs and fails
  when one of them stops working.

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
- **needs:** L-032 (a second-order line has to be arguable from a replay)

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

### [L-069] `hands` — one channel across the reactive boundary — **closed**
Five values crossed into the loop by three mechanisms: two mirrored through
effects (one of whose comments said it was "the same shape, and the same reason"
as the other), the horn read raw inside `rAF`, the rack posture read raw inside a
pointer handler, and — the one the card had not found — **both levers read raw by
the pilot module's `intent`, which `runRack` calls inside `world.step()`, sixty
times a second**. That instance had gone unnoticed for as long as it did because
it crossed inside a module callback rather than in the loop body. `control/hands.ts`
is the one channel now, written by one effect; the five turn out to be one kind of
thing, *something the operator is doing or has not yet done*. Scanned rather than
trusted: `tests/architecture.test.ts` reads the pilot module, the loop's `tick`
and the drag handler and fails on a rune read that is not an assignment — each of
the three verified by putting the old code back.

### [L-071] Four clusters instead of a twenty-row index — **closed**
`doc/MEMORY.md` indexed all twenty spill files, which made `doc/design/` a star: a
long list at the centre, everything one hop from it, nothing near anything else,
and every addition making the list worse to read. Now four clusters of five —
machine, cab, rig, code — each with an entrypoint page that indexes its own five,
says what the cluster is *about*, and cross-links the siblings with *go there
instead* rather than a bare pointer. `doc/MEMORY.md` names the four. 145 references
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
