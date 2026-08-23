# laborsim

A Patlabor-themed mecha and vehicle simulator sandbox for the browser, built on
a multi-layer educational physics and kinematics engine.

Spec a Labor in the workshop, wire its control software, take it to a site, and
find out which of your assumptions was wrong.

What is being simulated is not combat and not locomotion. It is **the gap
between what a machine is rated to do and what it does on the day.**

**Status: v0.** The toolchain is up and the architecture rules are enforced by
tests. No game yet — the first machine is `BOARD.md` L-014. Feasibility was
proven separately in `prototype/concept-3/`, which needs no build step.

**Stack:** TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js · Rapier
(deterministic wasm). **Mobile-first** — touch is the primary input, because
viewport budgeting is a core mechanic rather than a UI style.

## Running it

```sh
npm install
npm run dev        # dev server, exposed on the LAN so you can open it on a phone
npm test           # headless sim + architecture-rule enforcement
npm run typecheck  # svelte-check
npm run lint       # biome
npm run format     # biome, writing fixes
npm run build      # typecheck, then production bundle
```

`npm run dev` binds to `0.0.0.0` on purpose: the cockpit has to be tested on a
real phone from day one, because desktop-only iteration hides touch problems
that are mechanics here, not polish.

### The three architecture rules

Non-negotiable, and `npm test` fails if you break them. Full rationale in
`docs/design/architecture-rules.md`.

1. **The sim runs headless** — no `three`, no DOM, no canvas under `src/sim/`,
   `src/control/` or `src/modules/`.
2. **Fixed timestep, seeded PRNG** — no `Math.random()` anywhere sim-visible.
3. **One-directional snapshot boundary** — instruments read snapshots, never
   live sim state. Svelte never owns the canvas. No Threlte.

## Where things are

| | |
|---|---|
| `CLAUDE.md` | agent entrypoint; how to work here, and the size gates |
| `MEMORY.md` | what the project is — durable decisions and structure |
| `NOTES.md` | open, unresolved threads |
| `BOARD.md` | task board |
| `LOG.md` | worklog and closed tasks |
| `docs/design/` | detail spilled out of `MEMORY.md` |
| `prototype/` | frozen feasibility probes — evidence, not a starting point |

Start with `MEMORY.md` for the design, `BOARD.md` for what's next.
