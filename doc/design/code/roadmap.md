# Critical path — a review, and the ordering that follows

Written 2026-08-23, after rung 1, the rack pipeline, NAV-1 and the look-down
cockpit were all playable. Forward-looking: this is an argument about order, not
crystallized truth. Re-read it when the `doc/BOARD.md` ordering is challenged, and
rewrite it when it stops matching what the board is doing.

**Reviewed 2026-08-26.** The "Now" list below is mostly closed, and the largest
gap it named — a loop with no third beat — is not the largest gap any more. The
argument is left standing where it still holds and marked where it does not; the
board's `ready` order is the live plan.

---

## Where the project actually is

Built and playable from a public URL: a tracked machine with a friction model
you can open, a rack that folds module intents into one signal by verb, an
autopilot that is honestly stupid, an instrument that refuses to show more than
its module knows, and a look-down posture that charges you the view for
reconfiguring on the move.

Since then, and all downstream of the reading below: a damage ledger with a
debrief that prices what you broke, an industrial panel that names every control
on its own engraved plate, components as a triptych with three currencies, a
cab that sweeps 1:1 with your head, a synthesised voice for the machine and the
site, running gear sprung at every contact point, and the first exercises — so
the third beat can now say *yes* as well as *no*.

Against the five-beat core loop (`doc/MEMORY.md` § 4):

| Beat | State (2026-08-23) | State (2026-08-26) |
|---|---|---|
| **Build** — spec the machine | absent | absent — still the rack, not parts |
| **Wire** — order the rack | **built** | **built** |
| **Site** — drive it | **built** | **built**, and now *asked for something* |
| **Diagnose** — attribute to one decision, from a replay | absent | **built** (2026-08-27) — a run is a trace, and it replays |
| **Back to build** — with a reason | absent | absent |

Two of five became two and a half, and the half is the important one: the loop
can now say both *no* (a citizen, a bill) and *yes* (an exercise completed).
What it still cannot do is let you **watch the moment back**, which is the
difference between being told and being shown.

*(2026-08-27: the engine half of that landed with `L-032`, and it was three
seams rather than a feature — the sim's input was ambient, rack edits crossed by
four untimestamped routes, and the frame was written twice. A run is a `Setup`
plus a trace now, and it replays exactly, asserted. Nothing yet **shows** you
one: that is `L-083`, and it is the smaller half.)*

## The critical reading

**1. The mechanics exist; the thing that makes them matter does not.**
~~You can drive into a stack of pipes at full speed and the world does not care.
`doc/MEMORY.md` § 3.1 calls the damage ledger *the game's core feedback mechanism* —
and it does not exist, in any form, not even a console line.~~

**Closed.** The ledger, the toasts, the debrief and the machine's voice all
landed, and the exercises gave the same beat a way to say *yes*. The largest gap
is now the one *behind* it: everything the loop says, it says **after the fact
and in words**. `L-032` (record and playback) is what turns "you cost ¥55,690
and NAV-1 was driving" into something you can watch, and every attribution card
below still waits on it.

**`L-032` closed 2026-08-27**, and the shape of it was wrong here too: it was
not a feature to build but three seams to close, and most of a replay was
already in the tree carrying comments saying so. The recording exists and the
attribution is on it, so `L-018` and `L-079` are unblocked. What is left of
*watch* is `L-083`, and it is the smaller half.

**2. The acceptance scenario is already half-built, and nobody noticed.**
`L-018` asks for *two components fighting over one actuator*. Levers and NAV-1
already do exactly that, today, on rung 1 — `CAP` makes the levers govern the
autopilot and the autopilot cannot exceed them. The machinery is done.

What is missing is everything that makes the conflict *land*: nothing records
it, nothing prices it, and nothing walks a first-time player into it. So the
card is not "build the scenario". It is **"make the scenario legible"**, and
that is a different, smaller, better-defined job.

**3. The ten-minute clause is an onboarding requirement in disguise.**
"reachable within ten minutes of a first session" is the hardest sentence in
`doc/MEMORY.md` § 3 and no card owns it. A first session currently opens onto two
unlabelled levers and a rack. There is no reason a new player would find the
conflict at all, let alone in ten minutes. Onboarding is not polish here; it is
half of the acceptance criterion.

**4. Replay is on the critical path, but only half of it is.**
`L-019` bundles two different things: *record an input trace and play it back
identically in one engine* (cheap, needed now, unblocks attribution and makes
the ledger reproducible) and *bit-identical snapshot hashes across browsers*
(expensive, unverifiable in the current sandbox — Chromium only, and Node is
also V8 — and not needed until solutions are shared or verified across sites,
which is missions, which is not v0).

Splitting them takes the risky, unmeasurable half off the critical path without
giving up the guarantee. The architecture that makes cross-engine determinism
possible is already enforced by test; the *verification* can wait for a machine
that can perform it.

**5. v0's build surface should be the rack, not part assembly.** *(Confirmed,
2026-08-23, along with the shape of edit mode: inline, in the cab, while it
runs — instruments moved around the glass, modules swapped and reconfigured in
the rack. No separate build screen in v0. Now in `doc/MEMORY.md` § 3.)*
This is the scope call that decides whether v0 finishes. Build mode as KSP-style
assembly drags in the part/module model (`L-006`), the load chart (`L-021`), the
cockpit editor (`L-008`) and persistence (`L-012`) — four cards, none small, all
before the loop closes once.

But the loop does not need them. The rack **is** a build surface: order, verb,
enable and a module's settings are four real design decisions that change how
the machine behaves, and a run through a site already tests them. "Back to build with a specific
reason" can mean *move NAV-1 below the levers and try again*, and that is a
complete turn of the loop.

So: v0 closes the loop over the rack, on rung 1, with a fixed machine. Part
assembly is rung-2 entry cost, not v0. This forecloses nothing — the parts model
is additive, and `L-006`'s test ("a track drive and an autonav both expressible")
gets *easier* once both exist as running code rather than as a design.

**6. Two pillars are unmeasured.**
Mobile-first is a hard pillar (`doc/MEMORY.md` § 9) and no frame has ever been timed
on a phone — with ~130 props, ink shells doubling every mesh, greebles and
per-grouser track geometry. Cross-browser determinism is likewise structural
only. Neither is a crisis; both are claims we are currently *asserting*.

## The ordering

### Now — close the loop once, on rung 1

Consequence, then attribution, then the path a new player takes to both.

*(1) and (2) are closed, `L-039` included as of 2026-08-26 — the inventory worth
breaking is built. (3) and (4) are still the top of the board, and are still in
this order and for these reasons.*

1. **Damage model** (`L-031` — closed), and **enough to break** (`L-039`). World
   objects gain mass, a price and a destruction threshold; contact energy above it
   destroys them and emits a priced event. It is what makes the site an
   antagonist rather than scenery, and it gives `L-023`'s designed features
   something to do. The scope is deliberately *deep*, not a toast notification:
   impact, then deformation, then sound, then the written verdict — see
   `doc/design/rig/damage.md`.
2. **The ledger** (`L-029` — closed). Itemised, named, priced, condescending. Its
   attribution half — *what was driving when this happened* — is what makes it
   teach instead of score, and that is why it comes after (3) in dependency even
   though its first lines can be written before.
3. **Record and playback, one engine** (`L-032` — closed). An input trace plus
   the seed reproduces a run exactly. First user is the ledger: every line needs
   the rack state at the moment of impact — and it has it, because rack state is
   on the trace and `DamageEvent.driving` survives the round trip. Second user is
   the player, and that user is still waiting (`L-083`).
4. **The acceptance scenario, made legible** (`L-018`), and with it the
   **first-run path** (`L-033`) that gets someone to it unaided.

When those four land, the loop turns: you drive, you break something expensive,
you are told what it cost and which module was holding the wheel, you change the
rack, you drive again. That is the whole game at one rung, and nothing after it
is a leap of faith.

Alongside, cheap and defensive: **measure the mobile frame** (`L-034`). A
number, on a real phone, before the scene grows again.

### Next — make the rung deep enough to be worth replaying

- **The rail proper** (`L-015`): drag, and the hot-patch question that `L-026`
  really owns. *(Slot styling and module settings landed early, with
  TILT-GUARD — the third module the rack needed to become an ordering problem.
  Throttle-and-steer, `L-035`, is now a curriculum item rather than a
  structural one.)*
- **The panel budget with teeth** (`L-025`): a fixed glass area, and a component
  refusable for want of it. NAV-1's scope already costs view; nothing yet counts.
- **Designed site features** (`L-023`): benches, the haul road, the trench.
  The things a careless driver loses to, now that losing has a price.
- **Persistence** (`L-012`), narrowed to rack order and settings.

### Later — the second rung, and the first real curriculum

Rung 2 (excavator) is where the load chart (`L-021`) stops being an analogy and
starts being the Δv. Its old blocker is gone: normal load used to be shared
equally across contacts and could not express load transfer, and the sprung
running gear measures it off each bogie's own spring instead. It is also the
first machine that needs the part model, which is the honest place for `L-006`.

`L-008` (cockpit editor), `L-026` (LOTO hot-patching) and `L-027` (job site
generator) all belong to this stretch — each one wants two rungs of evidence
behind it, not zero.

### Horizon — deliberately abstract

Missions and Zachtronics-style budgeting (`doc/design/rig/missions.md`) are the
strongest known candidate for what v1 *is*, and the thing that would make
cross-browser determinism worth paying for: a solution verified across several
sites. The Phantom Labor (`L-009`) is what keeps the ladder non-monotonic and
the two-lever cage honest. Rungs 3–6 climb toward the biped that the probe
started from, which is exactly the order the probe proved was wrong.

None of these gets designed further until the loop has turned at two rungs.

## What would change this document

- The loop turns at rung 1 and is **not fun**. Then the missing beat was never
  the ledger and this whole ordering is wrong.
- A phone measurement comes back badly. Then rendering budget moves from
  "defensive" to "Now", ahead of everything.
- Part assembly turns out to be load-bearing for the ledger — e.g. damage needs
  to price *your* machine's parts, not just the world's. Then `L-006` climbs.
