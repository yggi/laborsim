# META.md — how the work goes

Durable lessons about **method**, not about the game. `MEMORY.md` is what the
project *is*; this is what building it has taught us about building it.

Every entry names the incident that earned it. An abstract rule nobody paid for
is advice; a rule with a scar is a lesson. If an entry loses its incident, it
has probably stopped being true.

**Target: 150 lines, act at 180** (`CLAUDE.md`). At 180 the entries have gone
abstract — merge or cut, back to 150 or below in one pass.

---

## Diagnosis

**Ask when it appeared, and build the experiment that halves it.**
A dark slab across the site got four diagnoses; three were wrong. It had
appeared *exactly* when `terrainMaterial` landed and survived every lighting
change — the cheapest possible signal, ignored for three rounds. In that same
hunt, `receiveShadow = false` took one build and settled whether it was a
shadow at all; it was run third. With two plausible causes the move is the test
that eliminates half, never a third hypothesis. (The cause was the contour
shader: on flat ground both the distance to a contour and its derivative vanish,
and the graded pad sits at exactly 0 m.)

**Probe the API; do not trust the prose.**
Rapier's docs say `createSnapshot()`; the JS method is `takeSnapshot()`. Its
heightfield index order is the opposite of what the generator assumed. Both were
settled in one small script. Anything load-bearing gets probed.

**Derive signs; never flip them to see.**
Mirrored steering was fixed by deriving `forward = up × right` and checking it
against a known frame (three.js camera), not by trying both. The same method
caught NAV-1's steering sign *before* it ever ran.

**Ask the browser what it computed; do not re-read the CSS.**
A faceplate collapsed to 7 px with tests, types and lint all green. Two rounds
went into re-reading the stylesheet. One `getComputedStyle` dump answered it:
`display: block; height: 7px` — a house-style class named `bar` colliding with
the meter's `.bar` in the same scoped stylesheet. Reading is a hypothesis;
measuring is an answer.

**Suspect the probe before the system.**
A grade probe reported zero climb at every angle, with ten tests passing and the
machine fine: its ramp was 30 m away and the machine covers 11 m in five
seconds. Re-earned harder — a probe read the site "after one step" and found a
pole flipped over and moved 40 cm in 1/60 s. Impossible, and it was:
`createWorld` settles for 120 steps before it hands anything back, so two
hypotheses and a measured-worse fix went into a launch that never happened.
**Ask what ran before your first observation.**

## Verification

**A test that passes either way is worthless.**
Steering tests asserted that yaw *changed*, never which way, so a mirrored
control shipped. The fix is not just a better assertion — it is *reintroducing
the bug to watch the test fail*. Three failed; that is what made them real.

**A test can pass by measuring the bug.**
The first "machine drives into a cone" test passed, and *failed* when the damage
code was disabled — both signals green. It had never hit anything: the world's
own `step()` re-ran the rack and overwrote the test's `drive` with an empty
rack's HALT, and what it was actually detecting was furniture destroying itself
on spawn. A bite check proves the code path ran, not that the scenario happened.
Assert the scenario too — here, that the impact speed was non-zero.

**A check that cannot fail is not a check.**
Scars enough, one shape: the thing you judge by is the broken thing. Two
`str.replace` edits matched nothing because the formatter had reflowed the file —
one blanked the dash and everything stayed green. A deploy failed on formatting
because the local check grepped output for `lint/`, which a formatter diagnostic
does not match. A bench measured brightness as zero-crossing rate, blind to the
filter opening it existed to see. A bench *scene* built from sines, then from
spikes too sharp for its own 60 Hz sampling, called rough ground identical to
smooth both times, until the machine was probed and the fixture fitted to what it
measured. Assert the edit matched; verify by exit code; move the instrument
before you trust it; **fit a fixture to a measurement, not to your idea of one.**
And **prove a new thing by taking it away**: a finished panel of switches, firing
at the right instants, measured the same with its gain zeroed. If silencing what
you added changes nothing you did not add it — *unless the instrument cannot see
the claim*, as the bogie knock's null test proved by measuring one channel when
the claim was about **sides**.

**A quantity with a ceiling reports the ceiling, and it looks like a result.**
The frame profiler compared six passes on frame time. The first phone it ran on
held its panel's 120 Hz in all six, so every pass reported 8.34 ms, every delta
read 0 %, and the printed verdict was *pixels are not what is costing you* about
a scene where halving the buffer removed 43 % of the GPU's work. Nothing was
broken and no null test would have caught it: the instrument could see, it was
just reading something saturated. **Before comparing on a quantity, ask what
clamps it** — vsync, a cap, a timeout, a rate limit — and compare on something
downstream of the clamp instead. The same reflex catches the *sibling* trap it
was found next to, and which cost a second correction: a duration measured on a
clock quantized to 1 ms is an integer, one tick of it against a 21 ms basis *is*
a 5 % delta, and two such ticks had already been written into a design document
as prices before the same phone was run twice and returned zero for both.
**Run it twice before you write the number down** — the second run is the error
bar, and an instrument that cannot say "I cannot tell" will say something else.

**Breaking a thing on purpose needs an undo that is not `git checkout`.**
Three probes planted a fault each to prove a new checker could see it — and the
third was undone with `git checkout MEMORY.md`, on a tree whose index rewrite was
not committed. That is not an undo, it is a discard, and it took the session's
work with it. The same command on the *untracked* page failed silently and left
its planted fault in place, so the two files ended up wrong in opposite
directions. Copy the file, or commit first, before you break it.

**Rules enforced by a test — and scoped to where they can break.**
Rule 2 was written down, read and violated twice anyway; a scanner found both
`Math.sin` uses in seconds. The scanner's *scope* is the next trap: the
`:global` ban scanned `src/cockpit/`, whose author already thinks about it, and
the first violation landed in `src/ui/`, unwatched — and widening it to a
hand-listed pair of directories was the same mistake with a longer list.

**Tests can encode accidents.**
An autonav test asserted raw displacement over a short window and broke when the
route changed, because the first pin can be *behind* the machine — an accident of
layout. Assert the thing you mean: the range to the pin closes.

**Perception catches what CI cannot — so make it cheap first.**
Build green, tests green, and the cab view was a solid black wall: an ink shell
seen from inside. Then a cyan wall — a windscreen 0.47 m from the eye. Re-earned
on the dash, written blind for an hour, typechecked, 104 tests green, and the
cluster off-screen at 390 px. None of it is expressible as an assertion, and
perception is only reliable when it costs nothing — so when the work is visual or
audible, build the bench *first*: the audio bench paid for itself three times in
its first run (a limiter crushing every impact, a strike filter tied backwards to
the ring, a cue that measured beautifully and could not be heard), and the
readout a developer needs is the readout the player needs. **But a bench has no
assertion to fail, so it fails silently, and a merge is where that lands.**
Suspension and exercises merged clean, 231 tests green, while the worst-case
scene had gained a rut *and* the rig's cues — a sum nothing had rendered — and
`npm run cab` had not reached the cab since a schedule became the first screen.
Green plus green is a third state nobody measured: run the benches on the merge.

## Design

**A reframing that dissolves several open questions at once is probably right.**
The rack-as-pipeline killed three separate forks — arbitration granularity,
suppress-versus-inhibit, and what to do about `SET` — without new machinery.
That pattern is a stronger signal than any argument for the reframing itself.

**Add by need. A container before its contents is furniture.**
The rack's blocker was never the rail; it was the *second module*. Building
NAV-1 first made the rail's requirements obvious instead of speculative.

**The consequences of a decision are often better than its motivation.**
`CAP` was defined to let levers govern an autopilot; it produced a dead-man's
throttle for free. The chase camera was priced as a cost; under autopilot
scoring it inverts into a reward. Follow decisions downstream before defending
them.

**A naming constraint can be a complexity budget.**
Verbs are three letters, always — which makes a fifth verb typographically
awkward on purpose. A rule that makes the wrong thing *harder to write* beats a
rule that asks you to remember not to.

**Record rejected options with their reasons.**
Godot, Babylon and Jolt each have a written reason for rejection. Without one, a
settled question comes back every few months wearing a new hat.

## Bookkeeping

**A gate you do not check is not a gate.**
`MEMORY.md` was reported as within its 300-line limit at 307. Print the number;
do not estimate it — and print it *before* the commit, not after: a later round
ran `wc` in the same command that committed the trim and shipped `NOTES.md` at
104 claiming it was done. A merge re-earned it at 105: both branches had landed
on exactly 100, and their union is nobody's 100. Spill on purpose rather than
under that pressure — the sections that spilled well were spilled early.

**Write the log entry as if the next session has no context.**
Because it does not. The entries that proved useful later recorded *why a thing
was rejected*, not what was built — the build is in the diff.
