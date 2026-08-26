# The mobile budget — bytes, frames, and what each one buys

Mobile-first is a pillar and it is a *mechanical* one: viewport budgeting is a
core game mechanism and it is coupled to touch, so the phone is not the small
screen the game also runs on, it is the machine the game is for (`MEMORY.md`
§ 9). This page is where that stops being an assertion.

**The headline, 2026-08-26: the frame fits, with room.** A Pixel 9 renders the
full site at its panel's 120 Hz, in every pass, and spends about half of each
frame's CPU budget doing it. The pillar is in no trouble. What the measurement
bought is not reassurance, though — it is the first honest price list for the
things the board is about to add.

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
- **The clock's own resolution is reported**, because Firefox quantizes
  `performance.now()` to 1 ms and a column of integers nobody explained is read
  as precision it does not have. Every sub-10 ms figure in the row below is that
  coarse.

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

| device | browser | glass · buffer | Hz | `FULL SITE` fps | frame p50/p95 | cpu | gpu-owed | calls |
|---|---|---|---|---|---|---|---|---|
| Pixel 9 | Firefox 153 / Android 17 | 486 × 933 · 972 × 1866 | 120 | 110 | 8.34 / 16.7 | ~4 ms † | 21 ms | 225 |

† derived as `sim` + `render` p50: this row predates the `cpu` column, and the
device's 1 ms clock resolution puts it at 4 ± 1 either way.

Wanted next, in order of what each would settle: **the same phone on Chrome**
(a finer clock, an honest GPU string, and the browser most players are on), then
**the oldest Android in the drawer**, which is the row that actually decides the
budget below. The headless runner's numbers are deliberately not in this table —
it renders through SwiftShader on a CPU, and its only job is to fail when the
bench stops working.

### What the Pixel 9 row says

**The frame is pinned to the panel in all six passes**, so nothing in the scene
as it stands is the limiting factor. Read on GPU-owed time, which is not
clamped:

| moved | gpu-owed | draw calls | render CPU |
|---|---|---|---|
| half the pixels | **−43 %** | ±0 | ±0 |
| 130 props → 22 | −14 % | −81 | −33 % |
| cab → chase | +5 % | **+170** | +33 % |
| nothing moving | −5 % | −4 | ±0 |
| a minute later | ±0 % | ±0 | ±0 |

1. **Fill is the largest single share of the GPU's work** — 43 % of it, at a
   buffer that is already below native (dpr 2.22 clamped to 2, so 972 × 1866
   against a 1080 × 2424 panel). It is headroom rather than a problem, and it is
   the first place to look if a row ever comes back badly.
2. **A prop costs about 0.75 draw calls and 0.01 ms of render CPU.** 108 of them
   are 81 calls, 1 ms of CPU and 3 ms of GPU-owed time. That is the number
   L-039 ("more to break") and L-023 (designed site features) needed, and it
   says the site can roughly **triple** before the furniture is worth a thought.
3. **The machine costs more draw calls than the entire site does.** Chase adds
   170 calls over cab — greebles, grousers, bogies and the ink shell doubling
   every one of them — against 225 for the whole cab view including the shadow
   pass. Rung 2's excavator arrives with an arm, and *that* is the number to
   watch, not the prop count.
4. **Motion is free.** Waking 130 dynamic bodies, pricing their impacts and
   rebuilding the moved-prop list costs 5 % of GPU-owed and nothing measurable
   on the CPU. The sim is not the problem and has never been close to it: one
   step plus a snapshot is ~1 ms of an 8.34 ms frame.
5. **No thermal drift over the run.** The repeat pass came back marginally
   *faster* than the first. Ninety seconds is not an hour, and a longer soak is
   a different measurement nobody has asked for yet.

## The budget

Set against the only device measured, and to be re-set the moment a slower one
is. Every figure is a ceiling for `FULL SITE`:

- **Frame: 8.3 ms at 120 Hz, and the real ceiling is CPU.** ~4 ms of an 8.34 ms
  frame is already spent on the CPU — sim, snapshot and render submit — so the
  budget is **half a frame, and half of that is gone**. A device at 60 Hz has
  four times the room; a device slower per-core has less. The number to defend
  is the CPU span, not the GPU's.
- **Draw calls: 225 today, 400 in chase. Hold the cab under 500.** Not because
  500 is a hardware limit, but because the machine already accounts for two
  thirds of the count and rungs 2–6 each bolt an articulated assembly onto it.
  If a rung needs more, the ink shells are the first thing to price — they
  double every mesh and their cost is entirely draw calls.
- **First load: 1.3 MB over the wire, and it must not grow with the game.** It
  is Rapier, so it will not — until somebody adds a dependency, at which point
  this figure is how it gets noticed.
- **Build to first frame: 1.1 s cold on the Pixel 9** — 0.4 s of world, 0.5 s of
  shader compile on the first render, 0.1 s of wasm init. Warm (a re-rack, or a
  second exercise) it is 0.4 s. Nothing here is a problem; it is written down so
  that a change which triples it is visible as one.

**A prop is 0.75 draw calls; a site's worth of furniture is 81.** That is the
one number the rest of the board was waiting on, and it says: build the
inventory L-039 wants, and measure again when the *machine* grows, not when the
site does.

## What would change this page

- A slower device row. That is what the budget is really for, and the Pixel 9 is
  the wrong end of the range to set it from.
- A rung-2 machine. The arm is the first thing since the greebles to add draw
  calls to the object that already owns most of them.
- The `HALF RES` pass coming back near parity on some device. Then that device
  is not fill-costly, the buffer is not its lever, and its levers are draw calls
  and the ink shells that double them — a different piece of work entirely.
- Rapier stopping being the payload, by lever (1) above. Then the byte budget is
  about the game for the first time, and the table needs re-taking.
