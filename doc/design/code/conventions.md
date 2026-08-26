# Coding conventions — each with the bug that earned it

Spilled from `doc/MEMORY.md` § 12, which keeps the three architecture rules and
points here. These are narrower than those rules: none of them is load-bearing
for a pillar, and every one of them cost a debugging round to learn. The three
rules are enforced by `tests/architecture.test.ts`; these are not enforced by
anything, which is exactly why they are written down with their scars attached.

Do not invent conventions here in advance. An entry arrives when something
breaks.

---

## One fact, one place

Three of the four `concept-3` probe defects came from keeping one fact in two
places — heading in `body.yaw` *and* in `root.rotation.y`; hull height derived
from the soles *and* from the ground. Delete the duplicate rather than syncing
it; a sync is a bug with a schedule.

Re-earned three times since:

- Machine sides live once as `LEFT_X`/`RIGHT_X`, shared by sim and renderer.
- NAV-1's target had two setters — a `setTarget` method and a declared param —
  until the method went. A second entry point to one number is the same defect
  wearing a different hat.
- **A hand-built `Snapshot` comes from `core/fixture.ts`.** Three places built
  them by hand — the cockpit bench, the listening bench, the tests — and each
  grew its own `track()`, its own stage builder, its own literal for *standing
  on the ground*. Adding `suspension` and then `goal` meant teaching all three,
  separately, in commits that did not know about each other. Then they drifted:
  one refused to build `contacts: 0` with a traction reading, and the other two
  did not, so the listening bench ran a track through the air at the parked
  45% spring compression. The two invariants now live in the kit, where a
  caller cannot forget them, and `tests/architecture.test.ts` fails if a fourth
  copy appears — because the fourth will not arrive as a decision, it will
  arrive as somebody needing a snapshot in a hurry.

  Unifying them found a second thing: the two kits disagreed about what a
  parked track's `traction` is. One said 0.2, which is a dial reading somebody
  wanted to see rather than a state a stationary machine is in. Taking the
  loose one made `idle` measurably louder on the listening bench — so a
  duplicate is not only a sync you have to remember, it is two answers to a
  question nobody noticed was being asked twice.

## Body axes: forward is +Z, up is +Y, so right is −X and left is +X

Named as `LEFT_X`/`RIGHT_X` in `core/spec.ts` rather than written inline. Getting
them the wrong way round silently mirrors the steering, which is invisible on a
symmetric hull — it shipped that way once, and the tests passed, because they
asserted that yaw *changed* rather than which way (`doc/META.md`).

Derive signs; never flip them to see which works.

## Write the full rotation triple

`rotation.set(k, 0, 0)`, never `rotation.x = k`, so a hinge's one-axis
constraint is explicit in the code rather than assumed by whoever reads it next.

And: `Object3D.add()` returns the **parent**, not the child. Chaining off it
silently builds the wrong tree.

## Custom properties carry a namespace

Svelte scopes classes; it does **not** scope custom properties. One set on a
rack slot inherits straight down into whatever a manufacturer bolted into it, so
a bare `--u` on the slot and a bare `--u` in somebody's faceplate are one
variable with two owners — the `bar` collision that collapsed a faceplate to
7 px, one layer down and harder to see.

Two prefixes, and no more, for the same reason there are four verbs:

- `--mfg-` — a maker's token, inherited into its parts on purpose. It may go
  undefined: a component offers them to whatever it is bolted into, and the
  `var()` fallback *is* the offer.
- `--cab-` — the machine's own structure, and never a maker's to set. If it is
  read, it is defined.

Both halves are checked in `tests/cockpit.test.ts`, over all of `src/`. The
second half exists because renaming `--dash-h` to `--cab-dash-h` left one stale
`var(--dash-h, 128px)` behind, and a fallback means that reads as *working*:
types, lint and every test stayed green with the toasts sitting 128 px off the
bottom of a panel that is 229 px tall.

## A type-only import survives the file it imports from

`import type { X } from "./gone.ts"` is erased before anything resolves it, so
deleting `gone.ts` leaves tests, lint and the dev server green. Only
`svelte-check` says a word. Run the typecheck after a move, not just the tests.
