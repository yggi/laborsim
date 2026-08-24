# Theming — the substrate, the contract, and the brief

How a manufacturer's house style is expressed in code, what an author may and
may not touch, and what a subagent authoring one is handed.

Companion to `docs/design/components.md`, which says what the *parts* are. This
says how to *make* one. Rendering technology and why it is DOM at all:
`docs/design/instrument-rendering.md`.

---

## The three layers, cheapest first

Use the cheapest one that works. This is the rule that keeps a theming system
from becoming a combinatorial explosion of CSS.

1. **Tokens.** A maker's palette arrives as custom properties on the element
   that owns the part. A new manufacturer is *data* — a row in `makers.ts` — and
   costs no new rules at all.
2. **Substrate classes.** The physical primitives in `src/cockpit/substrate.css`:
   screws, grain, rails, lamps, meters, embossed label tape, the proud-plate
   lighting recipe. Use them; do not reimplement them.
3. **The maker's own component.** When a house style needs a genuinely different
   *arrangement*, it gets its own Svelte component and puts the graphic design in
   inline SVG. This is where character belongs and where it costs the most.

## The substrate is the physics of a panel

`substrate.css` is loaded once, globally, from `main.ts`, inside an
`@layer substrate`. Component styles are unlayered, so they always win without a
specificity fight — that is the whole reason for the layer.

What lives there is what is **not** a brand decision:

- **Light comes from above.** `.mfg-proud` — lit top edge, shadowed bottom, a
  real drop. One rule, and it is what makes a panel read as an object rather
  than as paint.
- **Wear.** `.mfg-grain`, a generated `feTurbulence` at soft-light. Texture,
  never dirt.
- **Fixings.** `.mfg-screw`, and `.mfg-screw-hex` for the machined kind.
- **Uprights.** `.mfg-rail`, brushed steel lit from the left.
- **Lamps.** `.mfg-lamp` with `data-lit="0..3"`. An unlit lamp is a dark lens
  with a highlight, not a grey box — a real lamp is visible when it is off,
  which is how you know it is there.
- **Meters.** `.mfg-meter` / `.mfg-meter-fill`, with `data-rev` for reversing.
- **Label tape.** `.mfg-emboss`, the raised-letter stuff from a hand-squeezed
  gun, pale where the plastic is stretched.
- **Hazard trim.** `.mfg-hazard`.

If three independently authored themes do not share this, they read as three
different games rather than three suppliers in one cab. That is the failure the
substrate exists to prevent.

### Which colours are shared and which are yours

Warning colours are **not** a brand decision. `--mfg-warn` and `--mfg-alarm` are
the same for everyone; what a maker may change is the *word* on the legend, not
the colour of the lamp.

The useful trick: a maker's accent **is** the active colour for its own kit —
set `--mfg-active: {style.accent}` on the part, and its power lamp stays in house
style right up until something is actually wrong, at which point everybody's
kit warns in the same language. That is how real equipment behaves, and it costs
one token.

## The token contract

Every custom property this system defines is prefixed `--mfg-`. Enforced by
`tests/cockpit.test.ts`, not by this paragraph.

| token | what it is |
|---|---|
| `--mfg-plate` | the faceplate itself |
| `--mfg-bezel` | the frame and the mounting around it |
| `--mfg-face` | label type |
| `--mfg-accent` | the maker's live colour: LEDs, meters, the live edge |
| `--mfg-active` | the "this is running" colour. Default cyan; set it to the accent for a maker's own kit |
| `--mfg-nominal` `--mfg-warn` `--mfg-alarm` `--mfg-dead` | **shared.** Do not redefine per maker |
| `--mfg-cabinet` `--mfg-ink` `--mfg-steel` | the cabinet, the outlines, the uprights |
| `--mfg-noise` | the grain image |

## A maker is more than a palette

`MakerStyle` in `src/cockpit/makers.ts` carries four things beyond colour, and
the last two are the ones that make a theme feel authored rather than tinted:

- **`mark`** — one SVG path on a 16×16 grid. One path, deliberately: a
  constraint that makes a fussy logo hard to write (`META.md`, on naming rules
  as complexity budgets).
- **`plateText`** — silkscreen. Model code, voltage, standard number.
- **`lexicon`** — how this maker words the states everything shares. `on`,
  `off`, `fault`, `bypassed`. HANSA says `ÜBERBRÜCKT` where KIBA says `OFF`, and
  the annunciator strip uses the *component's* maker's word, not the chassis's.
- **`voice`** — the maker's own strings: the warranty notice when its safety kit
  is bypassed, and its house safety tips. This is the first channel where a
  manufacturer speaks for itself, and it must never be confused with
  L.A.B.O.R.'s (`docs/design/training-frame.md`).

## The sandbox is how you look at it

`sandbox.html` → `src/sandbox/`. Every component in every state, at phone width,
driven by hand-built snapshots with **no Rapier and no renderer**. It boots in
milliseconds and it ships with the site, because a bench that only exists on
somebody's laptop is one nobody uses.

```
npm run dev            # then open /sandbox.html
npm run shots          # screenshot every specimen at 390x844 into shots/
npm run shots -- tilt  # just the specimens whose name matches
```

`npm run shots` **fails on a page error**, so a green run means the screenshots
are of something that at least works.

This is not optional infrastructure. `META.md` says it twice — *screenshots
catch what CI cannot*, and *ask the browser what it computed, do not re-read the
CSS* — and both were paid for: a faceplate collapsed to 7px with lint, types and
71 tests green, and a cab rendered as a solid black wall with a green build.
Neither is expressible as an assertion. The first pass of this very document's
dash was authored blind and looked fine in code; the first screenshot showed the
instrument cluster scrolled off at 390px, leaving nothing but a speedometer.

## The brief — what an author is handed

A new genre for this repo: not a `CLAUDE.md` (rules of engagement) and not a
design doc (what is true), but **the packet a single author works from**. One
manufacturer per author, deliberately blind to the other manufacturers' work.

The packet is:

1. **The maker's entry in `LORE.md`** — its temperament, its doctrine, and
   above all *how its kit fails*, because that is what the player learns.
2. **`docs/design/components.md`** — the invariants and the freedoms.
3. **This file** — the substrate, the tokens, the sandbox loop.
4. **The `UNMARKED`/KIBA reference implementation** — the worked example. Read
   it; do not read the other makers'.

Blind to *each other*, never blind to the substrate. Independence is what buys
distinctness; ignoring the shared floor is what buys incoherence.

And the last step is not blind: **an adversarial comparison pass** puts every
maker's rack, dash and cells side by side and asks one question — do these read
as *different suppliers* and as *one game*? That cannot be done by an author who
has seen only their own work.

## The experiment, pre-registered

This round is also a process experiment: **can independent, mutually-blind
authors produce a coherent visual system from a written contract?** `META.md`
takes entries that cost something to learn, so the failure conditions are
written down *before* the round rather than rationalised after it.

It has failed if:

- **more than one theme needs hand-fixing to not collide.** Then the contract was
  underspecified, and the lesson is about what a contract has to nail down, not
  about agents.
- **a person cannot identify the maker of an unlabelled plate.** Then blindness
  bought no distinction and the constraint was theatre.
- **any theme reimplements a substrate primitive** rather than using it. Then
  the substrate was not discoverable enough to be the path of least resistance.
- **a theme looks right in the sandbox and wrong in the cab.** Then the sandbox
  is lying and it is worse than not having one.

It has succeeded if three racks side by side read as kit from three suppliers,
bolted into one machine, by people who never met — which is, not coincidentally,
exactly what the fiction claims happened.
