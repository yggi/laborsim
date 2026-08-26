# META.md — how the work goes

Durable lessons about **method**, not about the game: `doc/MEMORY.md` is what the
project *is*, and this is what building it has taught us about building it. Every
entry names the incident that earned it — an entry that has lost its incident has
probably stopped being true.

**Target: 150 lines, act at 180** (`CLAUDE.md`). At 180, merge or cut.

---

## Diagnosis

**Ask when it appeared, and build the experiment that halves it.**
A dark slab across the site got four diagnoses; three were wrong. It had appeared
*exactly* when `terrainMaterial` landed and survived every lighting change — the
cheapest signal available, ignored for three rounds — and `receiveShadow = false`
settled in one build whether it was a shadow at all. With two plausible causes,
run the test that eliminates half, never a third hypothesis.

**Reading is a hypothesis; measuring is an answer.**
Rapier's docs say `createSnapshot()`; the JS method is `takeSnapshot()`, and its
heightfield index order is the opposite of what the generator assumed — both
settled in one small script. A faceplate collapsed to 7 px with everything green,
and two rounds of re-reading the stylesheet lost to one `getComputedStyle` dump:
a house-style `bar` class colliding with the meter's. Ask; do not read.

**Derive signs; never flip them to see.**
Mirrored steering was fixed by deriving `forward = up × right` against a known
frame; the same method caught NAV-1's sign before it ran, and the scope's later.

**When a stated fact does not match what you see, widen the look — do not
reinterpret the statement.**
Told another repo kept its core files in `doc/`, I cloned it `--depth 1`, found
no `doc/`, and began reasoning about what the instruction "must" have meant —
guessing dressed as inference, and the structure was on a branch I had not
fetched. **Every branch, absolute paths, and the contradiction is the finding.**

## Verification

**A green test can prove nothing, in three ways.**
It *passes either way*: steering tests asserted that yaw changed, never which
way, so a mirrored control shipped — the fix is not a better assertion but
*reintroducing the bug to watch it fail*. It *measures the bug*: the first
"machine drives into a cone" test passed, and passed again with the damage code
disabled, because `step()` overwrote its `drive` with HALT and what it saw was
furniture destroying itself on spawn. And it *asserts an accident*: an autonav
test took raw displacement and broke when the route changed, because the first
pin can be behind the machine. Assert the thing you mean — the range closes — and
prove the scenario happened before trusting that it did.

**Doubt the instrument before the system. It fails in four ways.**
*It is not looking where you think.* A grade probe reported zero climb at every
angle: its ramp was 30 m away and the machine covers 11 m in five seconds. Another
read the site "after one step", where `createWorld` had already settled 120.
**Ask what ran before your first observation.**

*It cannot fail.* Two `str.replace` edits matched nothing because the formatter
had reflowed the file — one blanked the dash and everything stayed green, as did
a deploy check that grepped for `lint/` and never saw a formatter diagnostic.
Assert the edit matched; verify by exit code. A *test* fails the same way and it
is harder to see: **a filter that selects on the property being asserted** — the
leak check took the sources that *have* a stop time and checked those, so
deleting a `stop()` dropped the source out of the sample; **a count of a unit
every candidate produces** — counting frequency *writes* was satisfied at four
when the claim was that six oscillators retune; and a scan that matched
`audio.render(` inside the doc comment about `audio.render(`. Three assertions,
each written to catch a known bug, each passing with that bug planted.

*It cannot see the claim.* A bench measured brightness as zero-crossing rate,
blind to the filter it existed to watch; the bogie knock's null test measured one
channel when the claim was about **sides**. So **prove a new thing by taking it
away** — but only once it could have been seen.

*It is reading something saturated, and that looks like a result.* The frame
profiler compared six passes on frame time; the phone held its panel's 120 Hz in
all six, so every delta read 0 % and the verdict said *pixels are not what is
costing you* about a scene where halving the buffer removed 43 % of the GPU's
work. No null test catches that — **ask what clamps a quantity before comparing
on it**, then ask how big *nothing* is, because a 1 ms tick against a 21 ms basis
is a 5 % delta and two of those reached a design document as prices. **Put the
control inside the instrument**: an instrument that cannot say "I cannot tell"
will say something else, and be believed.

**A fix with two halves needs each half taken away separately.**
The site-standing assertion passed with the footing test *deleted* — the graded
pads alone were carrying it — so it was green for half a reason and would have
stayed green while half the work rotted. Removing each half alone is what said
what each buys: pads alone leave 8 of 114 props flat, footing alone leaves 13
**and drops twenty props** for want of anywhere to say yes to, together 1 of 117.
The bound then had to be pooled across three exercises, because a per-exercise
one loose enough for the smallest could not tell those two apart. **Plant the
absence of each part, not of the whole.**

**Where a thing lives decides whether it can be checked.**
Two defects stayed shipped because nothing could reach them, not because nobody
looked: NAV-1's route scope plotted every pin on the wrong side of the machine
for its whole life, its geometry inside a `.svelte` file no test mounts, and six
cab concerns sat in the shell where the E-stop's restore had never been asserted
at all. **Ask what a defect would have had to get past — if "nothing", that is
the finding.**

**A read is a subscription, and nothing in the syntax says so.**
`run.setView(mode)` inside the effect that builds a run made the camera a
dependency, so pressing CHASE threw the world away — and the same press had
already pointed the camera correctly on the way past, which is why it looked like
anything but a camera bug. An effect *is* a dependency list, written invisibly.

**Breaking a thing on purpose needs an undo that is not `git checkout`.**
A planted fault was undone with `git checkout MEMORY.md` on a tree whose rewrite
was not committed: a discard, not an undo, and it took the session's work with it
— while the same command on an *untracked* page failed silently and left the
fault in place. Copy the file, or commit, before you break it.

**Rules enforced by a test — and scoped to where they can break.**
Rule 2 was written down, read and violated twice anyway; a scanner found both
`Math.sin` uses in seconds. *Scope* is the next trap: the `:global` ban scanned
`src/cockpit/`, whose author already thinks about it, and the first violation
landed in unwatched `src/ui/`. A hand-listed pair was the same mistake, longer.

**Perception catches what CI cannot — so make it cheap first.**
Build green, tests green, and the cab view was a solid black wall: an ink shell
seen from inside. Then a cyan wall — a windscreen 0.47 m from the eye. Re-earned
on the dash, written blind, 104 tests green, cluster off-screen at 390 px. None
of it is an assertion, and perception is only reliable when it costs nothing — so
when the work is visual or audible, build the bench *first*.
**But a bench has no assertion to fail, so it fails silently, and a merge is
where that lands.** Suspension and exercises merged clean at 231 tests while the
worst-case scene had gained a rut *and* the rig's cues, a sum nothing had
rendered: run the benches on the merge.

## Design

**A reframing that dissolves several open questions at once is probably right.**
The rack-as-pipeline killed three separate forks — arbitration granularity,
suppress-versus-inhibit, and `SET` — with no new machinery. That pattern is a
stronger signal than any argument for the reframing itself.

**Add by need. A container before its contents is furniture.**
The rack's blocker was never the rail, it was the *second module*: NAV-1 made the
rail's requirements obvious instead of speculative.

**The consequences of a decision are often better than its motivation.**
`CAP` was defined to let levers govern an autopilot and produced a dead-man's
throttle for free; the chase camera was priced as a cost and inverts into a
reward under autopilot scoring. Follow a decision downstream before defending it.

**A naming constraint can be a complexity budget.**
Verbs are three letters, always, which makes a fifth one typographically awkward
on purpose. A rule that makes the wrong thing *harder to write* beats one that
asks you to remember not to.

**Record rejected options with their reasons.**
Godot, Babylon and Jolt each have a written reason. Without one, a settled
question comes back every few months wearing a new hat.

## Bookkeeping

**A gate you do not check is not a gate.**
`doc/MEMORY.md` was reported as within its 300-line limit at 307. Print the
number, do not estimate it — and print it *before* the commit: a later round ran
`wc` in the same command that committed the trim, and shipped a surface over its
target claiming it was done.

**Write the log entry as if the next session has no context.**
Because it does not. The entries that proved useful later recorded *why a thing
was rejected*, not what was built — the build is in the diff.
