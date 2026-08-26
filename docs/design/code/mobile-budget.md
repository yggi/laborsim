# The mobile budget — bytes, frames, and what each one buys

Mobile-first is a pillar and it is a *mechanical* one: viewport budgeting is a
core game mechanism and it is coupled to touch, so the phone is not the small
screen the game also runs on, it is the machine the game is for (`MEMORY.md`
§ 9). This page is where that stops being an assertion.

**The headline, 2026-08-26: the frame fits, with room.** A Pixel 9 renders the
full site at its panel's 120 Hz, in every pass, spending a little over a third
of each frame on the CPU to do it. The pillar is in no trouble. What the
measurement bought is not reassurance, though — it is the first honest price
list for the things the board is about to add, and it took two runs to get one
that does not include prices for things that are free.

## How it is measured

`profile.html` (`src/probe/`), which ships with the site for the same reason the
other two benches do and a stronger one: a frame time from a laptop is not a
worse version of a frame time from a phone, it is a fact about a different
machine. One button, ninety seconds, and a block of text to paste. `npm run
profile` drives the same page headlessly — that is a **smoke check** on the
bench, not a device row; add `--build` and it also reports the payload, which a
dev server cannot.

Six passes, each over the same six seconds of the same run, each changing one
thing. The pass count is not the point; the *differences* are, because a single
frame time tells you whether to worry and nothing about what to cut:

| pass | changes | answers |
|---|---|---|
| `FULL SITE` | nothing — E-03 as shipped, driven flat out, from the cab | the number |
| `HALF RES` | a quarter of the pixels | how much of the work is fill |
| `PARKED` | the levers at rest, the site asleep | what the site's motion costs |
| `CHASE` | outside the machine | what the second view costs |
| `GRADED PAD` | E-01's 22 props instead of E-03's 130 | what the furniture costs |
| `FULL SITE 2` | nothing, a minute later | thermal drift |

A pass ends on a **tick count, not a frame count**, and every pass gets a fresh
world. That is what makes two devices comparable: both profile the identical
stretch of the identical run, and the fact that one fits fewer frames into those
seconds *is* the measurement.

Four details that would otherwise quietly lie:

- **Draw calls are counted at the driver**, by shadowing the draw entry points
  on the canvas's own context rather than by reading `renderer.info`. It counts
  the shadow pass, which three.js's own figure does not present as part of a
  frame, and it needs no handle on the renderer — a bench reads the machine, it
  does not get to widen an interface (`src/probe/gl.ts`).
- **The GPU column is measured in a separate second.** `render()` returns when
  the commands are queued, so seeing what the GPU still owes takes a fence, and
  a fence stops the CPU running ahead into the next frame — exactly the overlap
  the real loop lives on. It is also not a per-frame cost: forcing the pipeline
  to drain measures *latency to a sync*, which is why the Pixel 9 shows 21 ms of
  GPU-owed time inside an 8.34 ms frame. **Compare it across passes; never add
  it to anything.**
- **Deltas are not taken on frame time when the frame fits.** A device that
  renders every pass inside its refresh period reports the refresh period back
  six times, so every delta is 0 % — which reads as *nothing here costs
  anything*. That is exactly what the first run of this bench said, about a
  scene where halving the buffer removes 43 % of the GPU's work. The report
  switches to GPU-owed time when the frame is pinned, and says which basis it
  used (`tests/probe.test.ts` holds both branches).
- **The clock's own resolution is reported, and it sets a floor under the
  deltas.** Firefox quantizes `performance.now()` to 1 ms, which against a 21 ms
  basis makes one tick a 5 % delta — so the report withholds any difference
  under two ticks rather than printing a number it cannot stand behind. It had
  printed two of them as findings before a repeat run caught them.

### What is not measured

**The cab.** The cage, the dash, the pods and the levers are DOM over the glass
and none of it is on the bench page. By design its per-frame cost is one custom
property written on `:root` and nothing else, with the reactive half held to
10 Hz (architecture rule 3) — but that is a claim, and this page is about not
making those. It is an open thread in `NOTES.md`, not a settled exemption.

**Time to first byte.** The payload is measured in bytes, not in seconds: how
long 1.3 MB takes is the network's answer, not the code's.

## Bytes — the first load

Measured 2026-08-26, served compressed by GitHub Pages:

| | over the wire | parsed |
|---|---|---|
| **total, 10 files** | **1.32 MB** | **3.65 MB** |
| `world-*.js` | 1.26 MB | 3.47 MB |
| `substrate-*.js` | 30 kB | 84 kB |
| `main-*.js` | 11 kB | 28 kB |
| everything else (6 files) | 18 kB | 64 kB |

**The finding is that it is all Rapier, and none of it is the game.** `NOTES.md`
carried one prior figure — 3.44 MB raw / 1.25 MB gzipped, for an *empty
scaffold*, before there was a scene, a cockpit, an audio graph or an exercise.
Everything built since has added about 0.05 MB over the wire. The chunk named
`world` is the sim's entry point and it is 95 % of the payload because
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

Compression is the host's and neither Pages' gzip nor a CDN's brotli is under
our control, so the wire figure is a floor to compare against itself rather than
a promise.

## Frames — the device table

One row per device. The bench prints exactly these fields; the JSON block it
also prints is what a row is transcribed from.

| device | browser | glass · buffer | Hz | `FULL SITE` fps | frame p50/p95 | cpu p50 | gpu-owed | calls |
|---|---|---|---|---|---|---|---|---|
| Pixel 9 | Firefox 153 / Android 17 | 486 × 933 · 972 × 1866 | 120 | 110 | 8.34 / 16.7 | 4 ms † | 21 ms | 225 |
| Pixel 9 (repeat) | Firefox 153 / Android 17 | 486 × 933 · 972 × 1866 | 120 | 115 | 8.34 / 8.36 | 3 ms | 22 ms | 225 |

† derived as `sim` + `render` p50; that run predates the `cpu` column. Summing
two medians taken over different frame sets overstates it, and the measured span
in the repeat is 3 ms — which is the figure the budget below uses.

**Two rows of the same phone is not redundancy, it is the error bar**, and it is
why the second one exists. See *the floor*, below.

Wanted next, in order of what each would settle: **the same phone on Chrome**
(a finer clock, an honest GPU string, and the browser most players are on), then
**the oldest Android in the drawer**, which is the row that actually decides the
budget below. The headless runner's numbers are deliberately not in this table —
it renders through SwiftShader on a CPU, and its only job is to fail when the
bench stops working.

### The floor

Firefox quantizes `performance.now()` to **1 ms**. Against a 21 ms GPU-owed
basis, one tick of quantization *is* a 5 % delta — so on this device the bench
cannot resolve anything under about ±9 %, and the first run printed two rows
that were exactly that:

| moved | run 1 | run 2 | ticks apart |
|---|---|---|---|
| half the pixels | −43 % | −45 % | 10 |
| 130 props → 22 | −14 % | −23 % | 5 |
| nothing moving | −5 % | **+0 %** | 1 |
| cab → chase | +5 % | **+0 %** | 1 |
| a minute later | ±0 % | **−9 %** | 2 |

The bottom three changed sign or magnitude between two runs of the same device
on the same build, which means they were never measurements. The first two did
not. **The bench now withholds any delta smaller than two clock ticks** and
prints `· · ·` instead, with the floor stated in the header — because the two
noise rows had already been written into this page as prices before the repeat
run caught them.

### What the Pixel 9 rows say

**The frame is pinned to the panel in all six passes**, so nothing in the scene
as it stands is the limiting factor. Read on GPU-owed time, which is not clamped,
and taking only what survives the floor:

1. **Fill is the largest single share of the GPU's work** — **44 %** of it
   (−43 %, −45 %), at a buffer that is already below native: dpr 2.22 clamped to
   2, so 972 × 1866 against a 1080 × 2424 panel. Headroom rather than a problem,
   and the first place to look if a row ever comes back badly.
2. **A prop costs about 0.75 draw calls.** The 108 between E-01 and E-03 are 81
   calls, about 1 ms of CPU and a fifth of the GPU-owed time. That is the number
   L-039 ("more to break") and L-023 (designed site features) were waiting on.
3. **The machine is ~170 draw calls, and the cab gets them free only because
   the camera is inside it.** Chase costs +170 over the cab's 225 — and that is
   almost exactly the machine's own mesh count doubled by its ink shells: hull,
   cab, frames, four wheels, two belts, 44 grousers and some 27 greebles, at two
   draws each. In the cab those are behind the eye and frustum-culled. **Rung 2's
   arm will not be** — an excavator's boom is in front of you — so it arrives at
   full price on the object that already dominates the count.
4. **170 draw calls cost about 1 ms of CPU and no measurable GPU time at all.**
   That is the sharpest thing in the table: the chase view's GPU-owed figure is
   inside the floor, and the only column that moves is `cpu`, 3 ms → 4 ms. Draw
   calls are a CPU price here, at *single-digit microseconds each* — bounded
   rather than measured, since 1 ms is one tick.
5. **Motion is free**, and the sim has never been close to a problem: one step
   plus a snapshot is ~1 ms of an 8.34 ms frame, and waking 130 dynamic bodies
   moves nothing above the floor.
6. **No thermal drift over ninety seconds.** Both repeat passes came back
   marginally *faster* than their own baseline. A longer soak is a different
   measurement nobody has asked for yet.

## The budget

Set against the only device measured, and to be re-set the moment a slower one
is. Every figure is a ceiling for `FULL SITE`:

- **Frame: 8.3 ms at 120 Hz, and the real ceiling is CPU.** 3 ms of an 8.34 ms
  frame is already spent on the CPU — sim, snapshot and render submit — so
  **a little over a third of the frame is gone before anything is added**. A
  device at 60 Hz has twice the room; a device slower per-core has less. The
  number to defend is the CPU span, not the GPU's, and `cpu` p95 is 5 ms, which
  is where a 120 Hz frame starts getting tight.
- **Draw calls: 225 in the cab, 395 in chase. Hold the cab under 500.** Not
  because 500 is a hardware limit — it is well inside one here — but because
  draw calls are the CPU price, the machine is already ~170 of them, and rungs
  2–6 each bolt an articulated assembly onto exactly that object. Chase shows
  what 170 more costs: about 1 ms, or a third of the CPU budget already spent.
  If a rung needs more, **the ink shells are the first thing to price** — they
  double every mesh, and their entire cost is draw calls.
- **Tripling the site is affordable; doubling the machine is not.** 130 props
  are ~97 draw calls, so 390 would be ~290 more — landing the cab view around
  420 calls, which is what chase costs today, for about +2 ms of CPU. That is
  the L-039 answer. The same 2 ms buys far less on the machine, because its
  meshes are in frame rather than behind the eye.
- **First load: 1.3 MB over the wire, and it must not grow with the game.** It
  is Rapier, so it will not — until somebody adds a dependency, at which point
  this figure is how it gets noticed.
- **Build to first frame: 0.7–1.1 s on the Pixel 9**, the range being a first
  visit against a repeat one — roughly 0.24–0.39 s of world, 0.29–0.48 s of
  shader compile on the first render, 0.09–0.11 s of wasm init. A re-rack or a
  second exercise is 0.4 s. Nothing here is a problem; it is written down so
  that a change which triples it is visible as one.

**A prop is 0.75 draw calls; a site's worth of furniture is 81.** That is the
one number the rest of the board was waiting on, and it says: build the
inventory L-039 wants, and measure again when the *machine* grows, not when the
site does.

## What would change this page

- A slower device row. That is what the budget is really for, and the Pixel 9 is
  the wrong end of the range to set it from.
- A device with a finer clock — Chrome resolves ~5 µs where Firefox resolves
  1 ms. Half the rows on this page are bounded rather than measured, and that is
  the reason.
- A rung-2 machine. The arm is the first thing since the greebles to add draw
  calls to the object that already owns most of them.
- The `HALF RES` pass coming back near parity on some device. Then that device
  is not fill-costly, the buffer is not its lever, and its levers are draw calls
  and the ink shells that double them — a different piece of work entirely.
- Rapier stopping being the payload, by lever (1) above. Then the byte budget is
  about the game for the first time, and the table needs re-taking.
