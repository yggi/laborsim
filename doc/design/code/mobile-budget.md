# The mobile budget — bytes, frames, and what each one buys

Mobile-first is a pillar and it is a *mechanical* one: viewport budgeting is a
core game mechanism and it is coupled to touch, so the phone is not the small
screen the game also runs on, it is the machine the game is for (`MEMORY.md`
§ 9). This page is where that stops being an assertion.

**The headline, 2026-08-26: the frame fits, with room.** A Pixel 9 renders the
full site at its panel's refresh in every pass, on two browsers, spending
3–3.4 ms of CPU to do it. The pillar is in no trouble. What the measurement
bought is not reassurance, though — it is the first honest price list for the
things the board is about to add, and it took **three runs** to get one that
does not include prices for things that are free.

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
  GPU-owed time inside an 8.34 ms frame — and why the same phone reads 4.7 ms on
  Chrome, whose readback path is cheaper. **Compare it across passes within one
  run; never add it to anything, and never compare it across browsers.**
- **Deltas are not taken on frame time when the frame fits.** A device that
  renders every pass inside its refresh period reports the refresh period back
  six times, so every delta is 0 % — which reads as *nothing here costs
  anything*. That is exactly what the first run of this bench said, about a
  scene where halving the buffer removes 43 % of the GPU's work. The report
  switches to GPU-owed time when the frame is pinned, and says which basis it
  used (`tests/probe.test.ts` holds both branches).
- **Deltas carry a floor, and the report names what set it.** Two things put
  one there: the clock's own step (Firefox quantizes `performance.now()` to
  1 ms, which against a 21 ms basis makes one tick a 5 % delta) and the device's
  drift between passes, which is usually larger and is measured by the control
  pass. Anything under twice the larger reads `· · ·`. See *the floor*, below —
  every one of those causes was found by a device printing something impossible.

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

| device | browser | glass · buffer | Hz | `FULL SITE` fps | frame p50/p95 | cpu p50 | render p50 | gpu-owed | calls |
|---|---|---|---|---|---|---|---|---|---|
| Pixel 9 | Firefox 153 / Android 17 | 486 × 933 · 972 × 1866 | 120 | 110 | 8.34 / 16.7 | 4 ms † | 3 ms | 21 ms | 225 |
| Pixel 9 (repeat) | Firefox 153 / Android 17 | 486 × 933 · 972 × 1866 | 120 | 115 | 8.34 / 8.36 | 3 ms | 3 ms | 22 ms | 225 |
| **Pixel 9** | **Chrome 151 / Android** | 485 × 955 · 970 × 1910 | **60** | 60 | 16.7 / 16.8 | **3.4 ms** | **2.4 ms** | **4.7 ms** | 224 |

† derived as `sim` + `render` p50; that run predates the `cpu` column. Summing
two medians taken over different frame sets overstates it.

**Three rows of the same phone is not redundancy, it is the error bar.** Two of
them exist because the first table printed noise as findings, and the third
because the same hardware answers differently depending on which browser is
asking. Read the Chrome row first: it has a **0.1 ms clock against Firefox's
1 ms**, and it is the browser most players are on.

Wanted next: **the oldest Android in the drawer.** That is the row that decides
the budget, and a Pixel 9 is the wrong end of the range to set one from. The
headless runner's numbers are deliberately not in this table — it renders
through SwiftShader on a CPU, and its only job is to fail when the bench stops
working.

### The same phone, two browsers, three disagreements

Worth knowing before reading any row, because each is a property of the
*measurement* rather than of the game:

- **Firefox ran at 120 Hz; Chrome at 60.** Same panel. So the frame budget is
  the browser's choice, and **8.3 ms is the pessimistic case** — the one the
  budget below is written against.
- **GPU-owed came back 21 ms on Firefox and 4.7 ms on Chrome.** Same chip, same
  scene, and they cannot both be the GPU. The column is timed behind a fence, so
  it includes *the browser's readback path*, and Firefox's is several times
  dearer. **The GPU column compares passes within one run and nothing else** —
  never two browsers, never two devices.
- **Firefox reports a spoofed renderer** ("Mali-T760, or similar") against
  Chrome's honest `ANGLE (ARM, Mali-G715, OpenGL ES 3.2)`. Anti-fingerprinting,
  not a driver.

What agrees across both, and is therefore the real reading: **`cpu` — 3 ms on
Firefox, 3.4 ms on Chrome.** The budget stands on that column.

### The floor

Two things put a floor under what a delta can mean, and the bench now withholds
anything under twice the larger of them, printing `· · ·` and naming which one
is binding. Both were found by a device, one run at a time:

**Quantization.** Firefox quantizes `performance.now()` to 1 ms, which against a
21 ms basis makes one tick a 5 % delta. The first table printed two of those as
findings and they had already been written onto this page as prices when the
repeat run returned +0 % for both.

**Drift, which is usually larger.** A phone is not the same machine from one pass
to the next — clocks boost, cores park, heat builds. On Chrome's 0.1 ms clock
quantization explains almost nothing, and the table still claimed that parking
the machine (+9 %) and *removing* 108 props (+4 %) each made the frame slower.
Neither is a thing that can happen. `FULL SITE 2` is the answer: identical work,
run a minute later, and it came back **+6 %**. That is the size of "nothing" on
this device today, so it is the floor, and it is the one row exempt from its own
rule — suppressing the control would hide the number that licenses the others.

| moved | Firefox run 1 | Firefox run 2 | Chrome |
|---|---|---|---|
| half the pixels | −43 % | −45 % | **−28 %** |
| 130 props → 22 | −14 % | −23 % | `· · ·` |
| nothing moving | `· · ·` | `· · ·` | `· · ·` |
| cab → chase | `· · ·` | `· · ·` | **+15 %** |
| a minute later (control) | ±0 % | −9 % | +6 % |

### What the Pixel 9 rows say

**The frame is pinned to the panel in every pass on both browsers**, so nothing
in the scene as it stands is the limiting factor. Taking only what survives the
floor, and preferring the columns that agree across browsers:

1. **A draw call costs ~7 µs of CPU.** Chrome's clock resolves it directly and
   twice over: chase is +170 calls for +1.10 ms of `render` (6.5 µs each) and
   E-01 is −80 calls for −0.60 ms (7.5 µs each). Two independent estimates, one
   scene apart, agreeing. **This is the number the budget is built on.**
2. **A prop costs ~0.75 draw calls and ~3.7 µs of sim per step.** The 108
   between E-01 and E-03 are 81 calls — about 0.55 ms of render — and 0.40 ms of
   `sim`. That is what L-039 ("more to break") and L-023 (designed site
   features) were waiting on.
3. **The machine is ~170 draw calls, and the cab gets them free only because
   the camera is inside it.** Chase costs +170 over the cab's 224, which is
   almost exactly the machine's own mesh count doubled by its ink shells: hull,
   cab, frames, four wheels, two belts, 44 grousers and some 27 greebles, at two
   draws each. In the cab those are behind the eye and frustum-culled. **Rung 2's
   arm will not be** — an excavator's boom is in front of you — so it arrives at
   full price on the object that already dominates the count.
4. **Fill is real but small.** Chrome's honest reading is −28 % of a 4.7 ms
   GPU-owed figure, so roughly **1.3 ms of rasterisation** at 970 × 1910 — a
   buffer already below native, since dpr 2.23 is clamped to 2 against a
   1080 × 2424 panel. Firefox's −44 % is a share of its own readback path and is
   not the hardware. Fill is the lever if a slow device ever needs one; it is not
   what is being spent here.
5. **Motion is free**, and the sim has never been close to a problem: one step
   plus a snapshot is ~1 ms, and waking 130 dynamic bodies moves nothing above
   the floor on either browser.
6. **No thermal drift worth the name over ninety seconds** — ±6 % either way,
   which is exactly why it is being used as the noise floor rather than reported
   as a finding. A longer soak is a different measurement nobody has asked for.

## The budget

Set against the only device measured, and to be re-set the moment a slower one
is. Every figure is a ceiling for `FULL SITE`:

- **Frame: 8.3 ms, because the browser may choose 120 Hz.** The same phone ran
  at 120 Hz on Firefox and 60 on Chrome, so the pessimistic budget is the short
  one. **3–3.4 ms of it is already CPU** — sim, snapshot and render submit —
  which is 40 % of a 120 Hz frame and 20 % of a 60 Hz one. The number to defend
  is the CPU span, not the GPU's; `cpu` p95 is 4.5–5 ms, which is where a 120 Hz
  frame starts getting tight and a 60 Hz one still is not.
- **Draw calls: 224 in the cab, 394 in chase, at ~7 µs of CPU each. Hold the
  cab under 500.** Not because 500 is a hardware limit — it is well inside one
  here — but because 500 calls is ~3.5 ms of CPU on its own, which is the whole
  120 Hz budget once the sim is paid for. The machine is already ~170 of them
  and rungs 2–6 each bolt an articulated assembly onto exactly that object. If a
  rung needs more, **the ink shells are the first thing to price**: they double
  every mesh and their entire cost is draw calls.
- **Tripling the site is affordable; doubling the machine is not.** 130 props
  are ~97 draw calls, so 390 would be ~290 more — landing the cab around 420
  calls for about +2 ms of CPU, which fits at 60 Hz and is tight at 120. That is
  the L-039 answer, and it is a real ceiling rather than a shrug. The same 2 ms
  buys far less on the machine, whose meshes are in frame rather than behind the
  eye.
- **First load: 1.3 MB over the wire, and it must not grow with the game.** It
  is Rapier, so it will not — until somebody adds a dependency, at which point
  this figure is how it gets noticed.
- **Build to first frame: 0.34 s on Chrome, 0.7–1.1 s on Firefox.** Chrome
  spends 0.13 s on the world, 0.10 s compiling shaders on the first render and
  0.04 s on wasm init; Firefox is two to four times each. A re-rack or a second
  exercise is 0.17–0.4 s. Nothing here is a problem; it is written down so that
  a change which triples it is visible as one.

**A prop is 0.75 draw calls; a site's worth of furniture is 81.** That is the
one number the rest of the board was waiting on, and it says: build the
inventory L-039 wants, and measure again when the *machine* grows, not when the
site does.

### Re-measured after L-039 (2026-08-26)

The inventory was built on that answer, so the number was taken again. Same
counter, same passes; draw calls are counted at the driver and are a property of
the scene rather than of the device, so this is comparable even though the frame
times beside it were taken on software rendering and are not.

| | before | after |
|---|---|---|
| cab, 130 props | 224 | **289** |
| chase | 394 | **529** |
| E-01, 22 props | ~150 | **150** |
| triangles | — | 39k |
| `sim` p50 / p95 | 3–3.4 ms cpu | 1.1 / 2.2 ms |

**A prop is now ~1.3 draw calls rather than 0.75**, because a prop is a part
list: the mean kind went from about three meshes to about four, and the ink
shells double every one. The cab is 289 against a ceiling of 500, so the site can
still grow by about half again — but the *headroom* claim above is the one that
moved. "390 props lands the cab around 420" was true of the old furniture and is
not true of this; at 1.3 calls each, 390 props is ~500 calls on its own.

The chase view is the one to watch. It was 170 calls above the cab and is now
240, because the extra props in frame each cost more. The budget is stated on the
cab and the chase camera is "hands off the wheel" rather than the played view, so
this is recorded rather than acted on — but a rung-2 arm arriving in the same
view is the thing that would make it matter.

Debris is not in these numbers, and by construction cannot be: coming apart
**re-parents the prop's own meshes** rather than making any, so a written-off
pipe stack is the same four pipes it always was. Dust is one instanced mesh per
material, hidden while empty — at most nine calls, and only after something has
broken.

## The voice has a number now (2026-08-26)

`cpu` was documented as "the whole frame's CPU span" and was not: the bench's
copy of the loop **did not call `audio.render()` at all**, so the one half of a
frame that can make the machine go silent was the one half with no number. It
does now, and the architecture test that pins the loops together pins the voice
with them.

Measured on this box, `FULL SITE`:

| | p50 |
|---|---|
| `audio` — `audio.render()`, CPU side | **0.3 ms** |
| `nodes` — audio nodes built in a frame | **12** |

Twelve a frame is the chain: one plate per side per few frames, six nodes each.
The number matters because it is unbounded by construction — **one prop written
off builds up to 264 nodes synchronously inside one frame**, which is the audio
equivalent of the draw-call ceiling and, until this column existed, was not a
thing anyone could have known.

Two caveats, both structural:

- **It measures scheduling, not the audio thread.** The bench drives an
  `OfflineAudioContext`, which does the same main-thread work — building nodes,
  writing automation — without needing an audio device or the gesture a live
  context waits for. Whether the browser's audio thread keeps up with the graph
  it has been handed is a different question, and it is not observable from
  here.
- **Drift is not the instrument for that.** It was tried: driving the real app
  in a headless browser, the audio clock fell 0.27 s behind wall time in 30 s,
  which looks exactly like starvation — and a bare oscillator with no app at all
  drifts 0.272 s over the same 30 s. The number was the container's.

## What would change this page

- A slower device row. That is what the budget is really for, and the Pixel 9 is
  the wrong end of the range to set it from.
- A third browser disagreeing about GPU-owed time the way these two do. Two
  points is a difference; three would be a pattern, and might say the column
  needs a different fence.
- A rung-2 machine. The arm is the first thing since the greebles to add draw
  calls to the object that already owns most of them.
- The `HALF RES` pass coming back near parity on some device. Then that device
  is not fill-costly, the buffer is not its lever, and its levers are draw calls
  and the ink shells that double them — a different piece of work entirely.
- Rapier stopping being the payload, by lever (1) above. Then the byte budget is
  about the game for the first time, and the table needs re-taking.
