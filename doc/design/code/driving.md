# Driving the app — the fifth thing, and the only one that plays

`npm run drive`. One Vitest project, one file, a real Chromium, the real shell.

Four benches read this game and none of them played it. `shots` poses DOM
specimens, `cab` poses the renderer, `yard` looks at the site, `listen` renders
the ear, `profile` times a frame — all **downstream of a recording**, by design
(architecture rule 3). So the shell's own wiring — BEGIN, the cameras, the
cabinet latch, the stop, RESET — was reachable by nothing, and that is where its
bugs were.

## Why a suite and not a sixth bench

Because the question has an answer, and a bench's does not. Whether a cab reads
right is a thing you look at; whether pressing CHASE still leaves your recording
intact is true or false. Vitest 4's browser mode makes that a **suite**:
`@vitest/browser-playwright` pins to the same Vitest and peer-depends on the
`playwright` the benches already use, so this is one dev dependency and no second
runner. The two projects live in one `vite.config.ts` on purpose — the line
between them should be readable, and a second config file would let a new check
land on the wrong side by not noticing.

The dividing rule is borrowed from `yggi/robby`, which paid for it: **if it needs
a browser to be true, it belongs in `drive`.** A two-minute check is one nobody
runs, and the whole value of the eleven-second one is that it is cheap enough to
run on a thought.

## The gate: the recording's own vocabulary

The trap in "drive it through its verbs" is *its verbs* — a hand-written list of
what to press goes stale the first time somebody adds a control, silently, in the
direction of less coverage.

So the list is not invented. `control/trace.ts` already enumerates it: a
`Command` is what reached the machine, an `Attention` is what the operator saw,
heard and did about it, and between them **they are the shell's verbs**. Nine of
them. `tests/browser/verbs.ts` names them once, and two checks share it:

- the driver presses each one and waits for it **by name**, so a control that
  stops being wired fails saying which;
- `tests/architecture.test.ts` holds that list against both unions, in the fast
  suite, in milliseconds.

Neither half can be satisfied by writing the list down twice. Add a `kind` and
the fast suite fails until it is listed; list it and the browser suite fails
until something presses it.

## What it asks, and what it cannot

**The recording**, for anything a press has to reach. A trace is public and
always on, so "did that button do anything" is a line on it rather than a pixel.

**The DOM**, for what a recording is blind to — geometry, and which surfaces are
mounted. Always by asking the browser what it computed, never by re-deriving the
CSS (`doc/META.md`). A route scope plotted every pin on the wrong side of the
machine for its whole life inside a `.svelte` file no test mounts.

**Neither**, for how anything looks or sounds. That is `shots`, `cab`, `yard` and
`listen`, and it always will be.

## Three things learnt the hard way

**Read the exit code, not the summary.** Uncaught errors, unhandled rejections
and throws from a rAF callback are all caught and all exit 1 — under a summary
line reading `Tests 1 passed`. A human scanning that sees green. Never wrap this
in anything that parses the summary.

**Nothing moves until you are seated.** `advance()` feeds the clock
`hands.seated ? elapsed : 0`, so an open schedule is a frame owing no steps. A
driver that skipped BEGIN would watch a parked machine agree with itself — which
is exactly how the first replay test managed to prove nothing.

**A refused drop tells nobody.** `Draggable` eases a pod back and records nothing
when a drop is outside the cage or overlapping another pod, which is
indistinguishable from a broken drag. The driver measures the glass and moves
along the axis with room in it rather than guessing.

## Reaching the run

The shell takes `makeRun`, defaulting to `createRun`, so a session can keep hold
of the `Run` and read its trace. A default parameter rather than a module,
because this call path already answers exactly this question twice — `createSound(make)`
and `createLiveAudio(context)` — and the second of those was added the same day,
because its absence had hidden a shipped defect for the whole life of the file.

It is **captured with `untrack`**, and that matters: a prop is a rune, and reading
one inside the run effect would make *how* a run is built a reason to throw the
world away. That is the bug the camera already cost once, and the guard against
it could not have seen this one — it matched `$state` and `$derived`, not
`$props`, until this landed.

## Where to go instead

- The rules the driver is checking the far side of:
  [`architecture-rules.md`](architecture-rules.md).
- What the recording is, and why it has two channels:
  [`../../MEMORY.md`](../../MEMORY.md) § 12.
- What the benches do instead: [`mobile-budget.md`](mobile-budget.md) for the
  clock, and [`../cab/sound.md`](../cab/sound.md) for the ear.
