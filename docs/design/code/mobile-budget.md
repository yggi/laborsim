# The mobile budget — bytes, frames, and what each one buys

Mobile-first is a pillar and it is a *mechanical* one: viewport budgeting is a
core game mechanism and it is coupled to touch, so the phone is not the small
screen the game also runs on, it is the machine the game is for (`MEMORY.md`
§ 9). This page is where that stops being an assertion.

It exists because L-034 found the pillar had never been measured — not once, not
roughly. The numbers below are the ones that have been taken; a heading with no
numbers under it is a measurement not yet made, and says so.

## How it is measured

`profile.html` (`src/probe/`), which ships with the site for the same reason the
other two benches do and a stronger one: a frame time from a laptop is not a
worse version of a frame time from a phone, it is a fact about a different
machine. It is one button, it takes about ninety seconds, and it hands you a
block of text to paste. `npm run profile` drives the same page headlessly —
that is a **smoke check** on the bench, not a device row; add `--build` and it
also reports the payload, which a dev server cannot.

Six passes, each over the same six seconds of the same run, each changing one
thing. The pass count is not the point; the *differences* are, because a single
frame time tells you whether to worry and nothing about what to cut:

| pass | changes | answers |
|---|---|---|
| `FULL SITE` | nothing — E-03 as shipped, driven flat out, from the cab | the number |
| `HALF RES` | a quarter of the pixels | fill-bound, or bound by something else |
| `PARKED` | the levers at rest, the site asleep | what the site's motion costs |
| `CHASE` | outside the machine | what the second view costs |
| `GRADED PAD` | E-01's 22 props instead of E-03's 130 | what the furniture costs |
| `FULL SITE 2` | nothing, a minute later | thermal drift |

A pass ends on a **tick count, not a frame count**, and every pass gets a fresh
world. That is what makes two devices comparable: both profile the identical
stretch of the identical run, and the fact that one fits fewer frames into those
seconds *is* the measurement.

Two details that would otherwise quietly lie:

- **Draw calls are counted at the driver**, by shadowing the draw entry points
  on the canvas's own context rather than by reading `renderer.info`. It counts
  the shadow pass, which three.js's own figure does not present as part of a
  frame, and it needs no handle on the renderer — a bench reads the machine, it
  does not get to widen an interface (`src/probe/gl.ts`).
- **The GPU column is measured in a separate second.** `render()` returns when
  the commands are queued, so seeing what the GPU still owes takes a fence, and
  a fence stops the CPU running ahead into the next frame — exactly the overlap
  the real loop lives on. Timing the frame with one in it would report a game
  slower than the one that ships. It is a *size*, not a term to add.

### What is not measured

**The cab.** The cage, the dash, the pods and the levers are DOM over the glass
and none of it is on the bench page. By design its per-frame cost is one custom
property written on `:root` and nothing else, with the reactive half held to
10 Hz (architecture rule 3) — but that is a claim, and this page is about not
making those. It is an open thread in `NOTES.md`, not a settled exemption.

## Bytes — the first load

Measured 2026-08-26 against a production build, served compressed:

| | over the wire | parsed |
|---|---|---|
| **total, 10 files** | **1.30 MB** | **3.65 MB** |
| `world-*.js` | 1.24 MB | 3.47 MB |
| `substrate-*.js` | 30 kB | 84 kB |
| `main-*.js` | 11 kB | 28 kB |
| everything else (5 files) | 17 kB | 62 kB |

**The finding is that it is all Rapier, and none of it is the game.** `NOTES.md`
carried one prior figure — 3.44 MB raw / 1.25 MB gzipped, for an *empty
scaffold*, before there was a scene, a cockpit, an audio graph or an exercise.
Everything built since has added 0.05 MB over the wire. The chunk named `world`
is the sim's entry point and it is 95% of the payload because
`@dimforge/rapier3d-deterministic-compat` inlines its wasm as base64 — a third
larger than the binary, and unable to stream or compile in parallel with the
download the way a real `.wasm` response can.

So the levers, cheapest first, and none of them is "write less game":

1. **`vite-plugin-wasm`** — drop `-compat` for the plain deterministic build and
   let the wasm be a wasm. Removes the base64 inflation and lets the browser
   compile it while it downloads. This is the whole budget in one dependency.
2. **Code-split the sim from the shell** so the schedule screen is reachable
   before Rapier has arrived. The schedule is already the first screen and it
   needs no physics; today it waits for all of it anyway.
3. **Lazily load instruments** — worth little until (1) and (2) are done, and
   worth naming so nobody starts here.

Compression is the host's: GitHub Pages gzips, and these figures came from a
local preview that does the same. Brotli would read lower and neither is under
our control, so the wire figure is a floor to compare against itself, not a
promise.

## Frames — the device table

One row per device. The bench prints exactly these fields; the JSON block it
also prints is what a row is transcribed from.

| device | glass · buffer | Hz | `FULL SITE` fps | frame p50/p95 | sim p50 | render p50 | gpu p50 | calls |
|---|---|---|---|---|---|---|---|---|
| *awaiting first device* | | | | | | | | |

The headless runner's numbers are deliberately **not** in this table. It renders
through SwiftShader on a CPU, which is a rasteriser and not a phone; its only
job is to fail when the bench stops working.

## The budget

**Unset.** A budget written before a device has been measured is a guess with a
table around it, and the one thing this page exists to stop.

What it will have to say, once there is a row: a frame-time ceiling for `FULL
SITE` on the slowest device the game claims to support, a first-load ceiling in
wire bytes, and — the number the rest of the board actually needs — **what a
prop costs**, so that L-039's "more to break" and L-023's designed site features
can be priced before they are built rather than after.

## What would change this page

- A device row that lands badly. Then rendering budget moves from *defensive* to
  the top of the board, which `code/roadmap.md` already commits to.
- The `HALF RES` pass coming back near parity. Then the phone is not fill-bound,
  the buffer is not the lever, and the levers are draw calls and the ink shells
  that double them — a different piece of work entirely.
- Rapier stopping being the payload, by lever (1) above. Then the byte budget is
  about the game for the first time, and the table above needs re-taking.
