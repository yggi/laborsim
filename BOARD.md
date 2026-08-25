# BOARD.md — task board

One task per card. Cards carry *what* and *done-when*, never rationale — that
belongs in `MEMORY.md` or `NOTES.md`.

**Gates:** `doing` ≤ 3 · `ready` ≤ 10 · `backlog` ≤ 40 · `history` ≤ 10.
History past 10 cards moves to `LOG.md`.

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

Order and reasoning: `docs/design/roadmap.md`. These close the core loop at rung
1 over the rack as the build surface. The verdict, its voice and the dash are
built; what remains is more to break, replay, and the path to the conflict.

### [L-049] Themes, authored independently — the agentic round
- **what:** one author per manufacturer, each given only its own `LORE.md`
  entry, `components.md`, `theming.md` and the KIBA reference — blind to the
  other makers' work. Each produces that maker's plate, cell and pod. Then a
  **non-blind** adversarial comparison pass over all three side by side.
- **done-when:** three racks read as kit from three suppliers *and* as one game,
  and the pre-registered failure conditions in `theming.md` are answered either
  way — including the one where a person cannot pick the maker of an unlabelled
  plate.
- **needs:** L-048 (built)

### [L-050] Pods on arms, and the view that recentres
- **what:** instruments clamp to the cage and translate with the look instead of
  being viewport-fixed; placement moves from screen space into cage space, where
  the bound is the reach of the arm; the view eases back to forward on its own,
  with a house-voice nag. `voice.tips` already exists and nothing consumes it.
- **done-when:** looking around moves the pods, a drop is refused by arm reach
  rather than by the screen edge, and the look recentres without a per-instrument
  rune firing at 60 Hz.
- **needs:** NOTES thread "Pods on arms"

### [L-051] The cage and the levers are KIBA's too
- **what:** the chassis component brings the cab furniture, and it is currently
  a plain inset shadow and two generic sliders. They belong in the chassis
  maker's packet like the dashboard does.
- **done-when:** the cage frame and the levers are recognisably the same
  manufacturer's as the panel they sit behind.

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
  portrait number — turned sideways the glass is a letterbox, the rack overshoots
  and the pods sit where a portrait layout left them. Camera FOV, cage geometry
  and the deck's travel want deciding together rather than patching one at a
  time. Do not start it as a CSS pass.
- **done-when:** a phone turned sideways gives a cab worth driving from, with the
  same instruments, no clipped cage and no geometry that only works at one
  aspect ratio.
- **needs:** L-050 (pods move into cage space, which is half this problem)

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
  version and explicitly not v0. See docs/design/damage.md.
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

### [L-040] The machine symphony — synthesised sound — **closed**
Five voices, none sampled: the drive note carrying load (filter, droop and
loudness off `traction`), the grind carrying slip and only where there is
ground, impacts whose amplitude is the square root of the joules, the hull on
its own scale, and the horn as the audible half of the master lamp. `voices.ts`
is arithmetic with no WebAudio in it and `engine.ts` is the only file that knows
an oscillator exists, so the graph builds on an `OfflineAudioContext` exactly as
on a live one — which is `npm run listen`. It earned the event channel on the
way in (`core/events.ts`), and the master condition moved out of `DashPanel`
into the shell so the lamp and the horn are one fact. Rejected: a mute on the
dash — a Labor's horn has no cut-out, so volume is the rig's control and sits
with the camera.

### [L-059] The pod joins the registry, and the seam moves — **closed**
The triptych's third part was hand-wired into the shell: a branch and a position
variable per component, and a live `Autonav` held so the scope could call
`setTarget`. Now one `Packet` per component (cell, face, pod, units, amps) and
one contract for all three postures — a part is handed the slot it is drawn from
and the style it is drawn in, and commands cross back through `Controls`
(`toggle`, `setParam`, inert for a component nothing is driving). NAV-1's target
became a declared param, so the plate grew a TARGET slider and the scope stopped
being a second wire. The route rides the snapshot. `cockpit/` is now what the
manufacturers made and `ui/` what the rig made; both style bans scan all of
`src/`, and custom properties carry `--mfg-` or `--cab-`. Rejected: `controls`
on a face, which has nothing to command.

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

### [L-044] The live voice — stacking notifications — **closed**
Damage lines arrive as toasts that slide in and fade; a citizen latches until
acknowledged. Same register as the debrief, faster tempo. Survives a reset by
noticing the damage list shrank. Replaced the always-on ledger list.

### [L-029] The end-of-run report + RESET — **closed**
Itemised, scrollable debrief in the condescending register with a closing
verdict, RESUME and RESET SIMULATOR; auto-opens on a citizen. RESET rebuilds the
world by re-keying the sim effect, resetting the rack in place so modules do not
duplicate — the canvas is reused for the new renderer.

### [L-008] Inline edit — draggable instruments — **closed**
Instruments move by a titlebar, free to place but refused if they leave the
glass or overlap another; they snap back to the last legal spot. All three rules
(free move, no-overlap, in-bounds) verified in the browser. The scope for L-025
(a real glass budget) is now visible.

### [L-031] Damage model — the world can be broken — **closed**
Breakable furniture is dynamic and scatters; damage is **joules absorbed**, not
hit points, so it is a quantity the player can be shown. Lines carry what was
driving and what was bypassed. Two bugs paid for: props spawned overlapping and
destroyed each other (¥55,690 before the machine moved), and energy fed to
anything already sliding got integrated until it wrote itself off. Rejected:
Rapier's contact-force events — a solver force magnitude is not inspectable and
energy is. Learned: toughness must be a fraction of ½·m·v², or a cone rated at
22 J is indestructible by a 6.2 t machine.
