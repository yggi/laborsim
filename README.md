# laborsim

A Patlabor-themed mecha and vehicle simulator sandbox for the browser, built on
a multi-layer educational physics and kinematics engine.

Spec a Labor in the workshop, wire its control software, take it to a site, and
find out which of your assumptions was wrong.

What is being simulated is not combat and not locomotion. It is **the gap
between what a machine is rated to do and what it does on the day.**

**Status: v0, pre-code.** Feasibility is proven — see `prototype/concept-3/`,
which runs in a browser with no build step. Production code has not started.

**Stack:** Vite · Svelte 5 · Vitest · Three.js · Rapier (wasm). Mobile-first.

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
