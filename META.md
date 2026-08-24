# META.md — how the work goes

Durable lessons about **method**, not about the game. `MEMORY.md` is what the
project *is*; this is what building it has taught us about building it.

Every entry names the incident that earned it. An abstract rule nobody paid for
is advice; a rule with a scar is a lesson. If an entry loses its incident, it
has probably stopped being true.

**Gate: 150 lines.** Overflow means entries have gone abstract — merge or cut.

---

## Diagnosis

**Ask when it appeared, before asking what it is.**
A dark slab across the site got four diagnoses; three were wrong. It had
appeared *exactly* when `terrainMaterial` landed and survived every lighting
change — the cheapest possible signal, and it was ignored for three rounds. The
cause was the contour shader: on perfectly flat ground both the distance to a
contour and its derivative vanish, and the graded pad sits at exactly 0 m, so
the whole pad rendered as one enormous contour line.

**Build the isolating experiment before proposing the next hypothesis.**
In that same hunt, `receiveShadow = false` took one build and permanently
settled whether it was a shadow. It was run third. With two plausible causes,
the move is the test that eliminates half — not a third hypothesis.

**Probe the API; do not trust the prose.**
Rapier's docs say `createSnapshot()`; the JS method is `takeSnapshot()`. Its
heightfield index order is the opposite of what the generator assumed. Both were
settled in one small script. Anything load-bearing gets probed.

**Derive signs; never flip them to see.**
Mirrored steering was fixed by deriving `forward = up × right` and checking it
against a known frame (three.js camera), not by trying both. The same method
caught NAV-1's steering sign *before* it ever ran.

**Look at the numbers, not only at the green ticks.**
A grade probe reported zero climb at every angle. Ten tests were passing and the
machine was fine — the *probe* was wrong: the ramp started 30 m away and the
machine covers 11 m in five seconds.

**Ask the browser what it computed; do not re-read the CSS.**
A faceplate collapsed to 7 px with tests, types and lint all green. Two rounds
went into re-reading the stylesheet. One `getComputedStyle` dump answered it:
`display: block; height: 7px` — a house-style class named `bar` colliding with
the meter's `.bar` in the same scoped stylesheet. Reading is a hypothesis;
measuring is an answer.

**Instrument early.**
Carried in from the concept-3 probe, which lost rounds diagnosing from
screenshots until a telemetry line settled it instantly. It pays twice here: the
readout a developer needs to diagnose a failure is the readout the player needs.

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

**Verify by exit code, not by grepping output.**
A deploy failed on formatting because the local check grepped for `lint/` rule
hits and a formatter diagnostic does not match that pattern.

**Rules enforced by a test, not by a document.**
Rule 2 was written down, read, and violated twice anyway — prop yaw and NAV-1's
route both used `Math.sin`/`cos`, writing non-portable values into sim state. A
scanner found both in seconds. Anything stated as "never" should have something
that checks it.

**Tests can encode accidents.**
An autonav test asserted raw displacement over a short window, and broke when
the route changed — because the first pin can be *behind* the machine. It was
testing an accident of layout. Assert the thing you mean: the range to the pin
closes.

**Screenshots catch what CI cannot.**
Build green, tests green, and the cab view was a solid black wall — an ink shell
seen from inside. Then a cyan wall: an opaque windscreen 0.47 m from the eye.
Neither is expressible as an assertion. Look at the thing.

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

**One fact, one place.**
Three of concept-3's four defects came from duplicating a fact. Re-earned here:
machine sides live once as `LEFT_X`/`RIGHT_X`, shared by sim and renderer,
because a mirrored control is invisible on a symmetric hull.

**Record rejected options with their reasons.**
Godot, Babylon and Jolt each have a written reason for rejection. Without one, a
settled question comes back every few months wearing a new hat.

## Bookkeeping

**A gate you do not check is not a gate.**
`MEMORY.md` was reported as within its 300-line limit at 307. Print the number;
do not estimate it.

**Spill before the gate forces you to.**
Trimming under pressure produces worse cuts than trimming on purpose. The
sections that spilled well were the ones spilled early.

**Write the log entry as if the next session has no context.**
Because it does not. The entries that proved useful later were the ones that
recorded *why a thing was rejected*, not what was built — the build is in the
diff.
