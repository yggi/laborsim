# META.md — how the work goes

Durable lessons about **method**, not about the game: `doc/MEMORY.md` is what the
project *is*, and this is what building it has taught us about building it. Every
entry names the incident that earned it — an abstract rule nobody paid for is
advice, and an entry that has lost its incident has probably stopped being true.

**Target: 150 lines, act at 180** (`CLAUDE.md`). At 180, merge or cut.

---

## Diagnosis

**Ask when it appeared, and build the experiment that halves it.**
A dark slab across the site got four diagnoses; three were wrong. It had appeared
*exactly* when `terrainMaterial` landed and survived every lighting change — the
cheapest signal available, ignored for three rounds — and `receiveShadow = false`
settled in one build whether it was a shadow at all, run third. With two
plausible causes the move is the test that eliminates half, never a third
hypothesis.

**Reading is a hypothesis; measuring is an answer.**
Rapier's docs say `createSnapshot()`; the JS method is `takeSnapshot()`, and its
heightfield index order is the opposite of what the generator assumed — both
settled in one small script. A faceplate collapsed to 7 px with tests, types and
lint green, and two rounds went into re-reading the stylesheet before one
`getComputedStyle` dump named it: a house-style `bar` class colliding with the
meter's. Anything load-bearing gets asked, not read.

**Derive signs; never flip them to see.**
Mirrored steering was fixed by deriving `forward = up × right` against a known
frame, not by trying both — the same method caught NAV-1's sign before it ran.

## Verification

**A test that passes either way is worthless.**
Steering tests asserted that yaw *changed*, never which way, so a mirrored
control shipped. The fix is not a better assertion — it is *reintroducing the bug
to watch the test fail*. The other half is asserting the thing you mean: an
autonav test asserted raw displacement and broke when the route changed, because
the first pin can be *behind* the machine. Assert that the range to it closes.

**A test can pass by measuring the bug.**
The first "machine drives into a cone" test passed, and *failed* when the damage
code was disabled — both green. It had never hit anything: `step()` overwrote the
test's `drive` with HALT, and what it detected was furniture destroying itself on
spawn. A bite check proves the path ran, not that the scenario happened.

**Doubt the instrument before the system. It fails in four ways.**
*It is not looking where you think.* A grade probe reported zero climb at every
angle: its ramp was 30 m away and the machine covers 11 m in five seconds. Another
read the site "after one step" and found a pole flipped and moved 40 cm in 1/60 s
— impossible, and `createWorld` settles 120 steps before handing anything back.
**Ask what ran before your first observation.**

*It cannot fail.* Two `str.replace` edits matched nothing because the formatter
had reflowed the file — one blanked the dash and everything stayed green. A
deploy failed on formatting because the local check grepped for `lint/`, which a
formatter diagnostic does not match. Assert the edit matched; verify by exit code.

*It cannot see the claim.* A bench measured brightness as zero-crossing rate,
blind to the filter it existed to watch; another called rough ground identical to
smooth until its fixture was fitted to a real measurement rather than to an idea
of one; the bogie knock's null test measured one channel when the claim was about
**sides**. So **prove a new thing by taking it away** — a panel of switches
measured the same with its gain zeroed — but only once it could have been seen.

*It is reading something saturated, and that looks like a result.* The frame
profiler compared six passes on frame time; the first phone held its panel's
120 Hz in all six, so every delta read 0 % and the verdict said *pixels are not
what is costing you* about a scene where halving the buffer removed 43 % of the
GPU's work. No null test catches that — so **ask what clamps a quantity before
comparing on it**, and compare downstream of the clamp. Two more corrections
followed, both about the size of *nothing*: one tick of a 1 ms clock against a
21 ms basis is a 5 % delta and two of those reached a design document as prices,
and a finer clock still left the table claiming that removing 108 props made the
frame slower. **Put the control inside the instrument.** The profiler already
had a pass that changed nothing, and what it measures is what "no difference"
looks like on that device that day. An instrument that cannot say "I cannot tell"
will say something else, and be believed.

**Breaking a thing on purpose needs an undo that is not `git checkout`.**
A planted fault was undone with `git checkout MEMORY.md` on a tree whose rewrite
was not committed. That is a discard, not an undo, and it took the session's work
with it — while the same command on an *untracked* page failed silently and left
its fault in place. Copy the file, or commit, before you break it.

**Rules enforced by a test — and scoped to where they can break.**
Rule 2 was written down, read and violated twice anyway; a scanner found both
`Math.sin` uses in seconds. *Scope* is the next trap: the `:global` ban scanned
`src/cockpit/`, whose author already thinks about it, and the first violation
landed in unwatched `src/ui/`. Widening it to a hand-listed pair was the same
mistake with a longer list.

**Tests can encode accidents.**
An autonav test asserted raw displacement over a short window and broke when the
route changed, because the first pin can be *behind* the machine — an accident of
layout. Assert the thing you mean: the range to the pin closes.

**Perception catches what CI cannot — so make it cheap first.**
Build green, tests green, and the cab view was a solid black wall: an ink shell
seen from inside. Then a cyan wall — a windscreen 0.47 m from the eye. Re-earned
on the dash, written blind, 104 tests green, cluster off-screen at 390 px. None
of it is expressible as an assertion, and perception is only reliable when it
costs nothing — so when the work is visual or audible, build the bench *first*.
The audio bench paid for itself three times in its first run, and the readout a
developer needs is the readout the player needs. **But a bench has no assertion
to fail, so it fails silently, and a merge is where that lands.** Suspension and
exercises merged clean at 231 tests while the worst-case scene had gained a rut
*and* the rig's cues, a sum nothing had rendered. Green plus green is a third
state nobody measured: run the benches on the merge.

## Design

**A reframing that dissolves several open questions at once is probably right.**
The rack-as-pipeline killed three separate forks — arbitration granularity,
suppress-versus-inhibit, and what to do about `SET` — without new machinery.
That pattern is a stronger signal than any argument for the reframing itself.

**Add by need. A container before its contents is furniture.**
The rack's blocker was never the rail, it was the *second module*: building NAV-1
first made the rail's requirements obvious instead of speculative.

**The consequences of a decision are often better than its motivation.**
`CAP` was defined to let levers govern an autopilot and produced a dead-man's
throttle for free; the chase camera was priced as a cost and inverts into a
reward under autopilot scoring. Follow decisions downstream before defending
them.

**A naming constraint can be a complexity budget.**
Verbs are three letters, always, which makes a fifth one typographically awkward
on purpose. A rule that makes the wrong thing *harder to write* beats one that
asks you to remember not to.

**Record rejected options with their reasons.**
Godot, Babylon and Jolt each have a written reason for rejection. Without one, a
settled question comes back every few months wearing a new hat.

## Bookkeeping

**A gate you do not check is not a gate.**
`doc/MEMORY.md` was reported as within its 300-line limit at 307. Print the
number, do not estimate it — and print it *before* the commit: a later round ran
`wc` in the same command that committed the trim and shipped `doc/NOTES.md` at
104 claiming it was done. A merge re-earned it at 105, both branches having
landed on exactly 100. Spill on purpose rather than under that pressure.

**Write the log entry as if the next session has no context.**
Because it does not. The entries that proved useful later recorded *why a thing
was rejected*, not what was built — the build is in the diff.
