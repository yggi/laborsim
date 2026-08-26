# The code — the rules, the conventions, the stack, and the order of the work

Start here before writing anything. Three of these pages are constraints you do
not get to relax on a tired afternoon; the others are why the tools are what they
are, why the board is ordered the way it is, and what the target platform costs.

## Pages

| | |
|---|---|
| [`code/architecture-rules.md`](code/architecture-rules.md) | the three non-negotiable constraints, what each is load-bearing for, and how each is checked |
| [`code/conventions.md`](code/conventions.md) | the narrower rules, each carrying the bug that earned it — do not invent one here in advance |
| [`code/stack.md`](code/stack.md) | the settled stack, and the rejected options with their reasons |
| [`code/prototype-findings.md`](code/prototype-findings.md) | what `prototype/concept-3/` proved, what it faked, and what it cost |
| [`code/roadmap.md`](code/roadmap.md) | forward-looking: the critical-path review and the argument behind the board's order |
| [`code/mobile-budget.md`](code/mobile-budget.md) | what the phone actually costs — how it is measured, the payload, and the device table |

## Where to go instead

- Lessons about **how the work goes** rather than how the code is written are in
  `doc/META.md` — an entry there carries the incident that earned it.
- What is being built next, as cards, is `doc/BOARD.md`. `code/roadmap.md` is the
  argument; the board is the decision.
- Why an instrument is DOM rather than a mesh is a *cab* question, not a stack
  one: [`cab/instrument-rendering.md`](cab/instrument-rendering.md).

## The shape of it

Everything here is **a constraint with a receipt**. The three rules name the
pillar each protects and the test that enforces it; every convention names the
bug that bought it; the stack names what was rejected and why; the prototype
names what it faked. A page in this cluster that asserts a rule without saying
what it cost is the shape of a rule about to be broken.
