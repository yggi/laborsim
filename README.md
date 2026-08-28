# laborsim

A Patlabor-themed mecha and vehicle simulator sandbox for the browser, built on
a multi-layer educational physics and kinematics engine.

Spec a Labor in the workshop, wire its control software, take it to a site, and
find out which of your assumptions was wrong.

What is being simulated is not combat and not locomotion. It is **the gap
between what a machine is rated to do and what it does on the day.**

### ▶ [Drive it](https://yggi.github.io/laborsim/)

Best on a phone. Pick an exercise, then two levers, one per thumb — tank
steering, and you fight it to go straight. They do not self-centre, so what you
leave them at is what the machine keeps doing. Watch **TRACTION**: how much of
the grip you have is already spent is the whole of rung 1.

Deployed from `main` on every green push. Every other branch is published
beside it — **[branch builds](https://yggi.github.io/laborsim/b/)** — so a piece
of work in progress is one tap away too, and a branch's build goes when the
branch does.

**Status: v0.** Rung 1 of the machinery ladder drives — a tracked platform on
procedural terrain, sprung at every contact point, with an industrial panel, a
pipeline rack you reorder in the cab, a damage ledger, a synthesised voice, and
three graded exercises alongside the open site. The site is fourteen kinds of
expensive thing over nine materials, standing on ground graded to hold them, and
each one comes apart into what it is made of — with a noise to match. What is not built is the rest of
the ladder, part assembly, persistence, replay, and the mission verbs past
*reach the markers*. Feasibility was proven separately in `prototype/concept-3/`,
which needs no build step.

**Stack:** TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js · Rapier
(deterministic wasm). **Mobile-first** — touch is the primary input, because
viewport budgeting is a core mechanic rather than a UI style.

## Running it

```sh
npm install
npm run dev        # dev server, exposed on the LAN so you can open it on a phone
npm test           # headless sim + architecture-rule enforcement
npm run drive      # plays the app in a real browser — the only thing that does
npm run typecheck  # svelte-check
npm run lint       # biome
npm run format     # biome, writing fixes
npm run build      # typecheck, then production bundle
npm run shots      # screenshot every cockpit specimen  → shots/
npm run cab        # screenshot the cab at poses you cannot drive to → shots/cab/
npm run yard       # photograph the site, and something coming apart → shots/yard/
npm run listen     # render every voice to WAV, measured → renders/
npm run profile    # drive the profiling bench headlessly and print the report
```

`npm run dev` binds to `0.0.0.0` on purpose: the cockpit has to be tested on a
real phone from day one, because desktop-only iteration hides touch problems
that are mechanics here, not polish.

The last five are benches, and they exist because the things they check are not
expressible as assertions. `/sandbox.html` is every component in every state and
`/listen.html` is every voice the machine has — both ship with the site, because
a bench that only exists on somebody's laptop is one nobody uses. `npm run cab`
has no page of its own: it drives the real app, and poses the hull at attitudes
you cannot hold still long enough to look at. `npm run yard` is the same argument
pointed outward — it stands over each graded work area, then drives into a pipe
stack and photographs it coming apart, asking the sim *when* that happened rather
than counting steps.

`/profile.html` is the third page and the strongest version of that argument:
mobile-first is a pillar, so it times the real world through the real renderer
**on the phone in your hand** and hands you a block of text to paste. One button,
ninety seconds. `npm run profile` drives the same page headlessly, which is a
check that the bench still works rather than a reading — a laptop's frame time is
a fact about a different machine. What it has found so far:
`doc/design/code/mobile-budget.md`.

### The three architecture rules

Non-negotiable, and `npm test` fails if you break them. Full rationale in
`doc/design/code/architecture-rules.md`.

1. **The sim runs headless** — no `three`, no DOM, no canvas under `src/sim/`,
   `src/control/` or `src/modules/`.
2. **Fixed timestep, seeded PRNG** — no `Math.random()` anywhere sim-visible.
3. **One-directional snapshot boundary** — instruments read snapshots, never
   live sim state. Svelte never owns the canvas. No Threlte.

## Where things are

| | |
|---|---|
| `CLAUDE.md` | agent entrypoint; how to work here, and the size gates |
| `doc/MEMORY.md` | what the project is — durable decisions and structure |
| `doc/META.md` | what building it has taught us about building it |
| `doc/NOTES.md` | open, unresolved threads |
| `doc/BOARD.md` | task board |
| `doc/LOG.md` | worklog and closed tasks, this session first |
| `doc/HISTORY.md` | the arc — decisions, reversals, and what each cost |
| `doc/LORE.md` | the world — manufacturers, the L.A.B.O.R. institution, how kit fails |
| `doc/design/` | four clusters — [machine](doc/design/machine.md), [cab](doc/design/cab.md), [rig](doc/design/rig.md), [code](doc/design/code.md) — each indexing its own pages |
| `prototype/` | frozen feasibility probes — evidence, not a starting point |

Start with `doc/MEMORY.md` for the design, `doc/BOARD.md` for what's next.
