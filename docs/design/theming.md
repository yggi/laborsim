# Theming — the substrate, the contract, and the brief

How a manufacturer's house style is expressed in code, what an author may and
may not touch, and what a subagent authoring one is handed.

Companion to `docs/design/components.md`, which says what the *parts* are. This
says how to *make* one. Rendering technology and why it is DOM at all:
`docs/design/instrument-rendering.md`.

---

## The register: an industrial machine, not a website

Settled 2026-08-24, and it decides more visual arguments than anything else
here. Three rules, in order of how often they are broken:

1. **The label is a separate object.** Every control is named by an engraved
   plate bolted near it (`.mfg-legend`), never by text set inside it or beside
   it. Text in a control is a website; a plate is a machine — made by a
   different process, at a different time, by whoever fitted the thing, and
   capable of being wrong about what it is bolted next to.
2. **A plate never changes.** It is engraved metal. A label that rewrites itself
   to report state is a screen pretending to be a panel. TILT-GUARD's plate says
   `TILT-GUARD` whether the guard is working, limiting or bypassed.
3. **The lens is the state.** Colour and position, not words. Dark is not
   running, lit is running, amber and red mean what they always mean. You read a
   panel the way you read a room, not the way you read a page.
4. **A number reads out in segments or in drums.** Those are the two ways a
   panel shows a number. Set text on a coloured rectangle is a third way and it
   belongs to websites. `Seg` draws real seven-segment digits — unlit bars and
   all, because the ghost is what the eye reads as an LED — and the hour meter
   turns mechanical wheels, which is what an hour meter does.
5. **Every indicator carries its component's name.** No exceptions: a lens
   without a name is a light you have to learn. A manufacturer may style the
   plate however it likes — HANSA's is heavy-bordered with a warning mark cut
   into it — but it may not omit it, and it may not make it say something else.

Three registers, each doing exactly one job: **the plate names**, **the lens
reports**, and **the strip** — the single line of words on the panel — says the
one sentence, when there is one. Nothing else on the dash is allowed to talk.

Corollaries that fall out and are worth stating because they get re-litigated:
no scrolling (a panel that has run out of room grows another row); no horizontal
splits (things are bolted where they fit and the panel wraps); and a digital
readout is a *character choice for one manufacturer*, not a default.

## The slot owns power and mode; the module owns its face

**Reversed 2026-08-24.** Every plate used to carry its own enable lamp and its
own verb button, drawn by the rack but sitting inside the plate as if the maker
had chosen them. That reads as a form, not as equipment: *no manufacturer ships
the fuse you power it through.*

Now the slot supplies both rails, identically for everyone:

- **Left — power.** A cartridge fuse in a holder, the same object as the carrier
  at the bottom of the cabinet. Pulling it is how a component goes off, and it
  sits proud of its holder when pulled. The ears are here too, because unbolting
  them is how you move a plate up or down the rack.
- **Right — the bus.** How this component folds into the signal, and what comes
  out of it. The mode switch is **under a hinged cover**: what a fitted component
  does to the drive is not something a thumb should change in passing. The cover
  is only up while the slot is powered, since there is nothing to set on a slot
  with the fuse pulled.

A module owns its **style** and its **face** — an optional interface that is
genuinely its own (`src/cockpit/face.ts`). Most have none; a plate with an
identity and two limit sliders is a complete plate. NAV-1 has one, because TOWA
cannot help itself.

## Display primitives

Two, and they are different *technologies* rather than different colours,
because that distinction is real on a real panel and it dates the equipment:

| | what | who |
|---|---|---|
| `Seg` | seven-segment LED, red. Shows a number and nothing else. | the machine |
| `Matrix` | 5×7 dot-matrix LCD, blue backlight, white characters. Shows *words*. | TOWA |

Both are **drawn, not typeset**: the unlit segments and the unlit dot grid stay
visible, and that ghost is what the eye reads as a display. Text on a coloured
rectangle is neither, and it is what a website does. Neither costs a font file.

## Cell formats

A small closed set, so a component of a kind you have never seen still reads.
Each is roughly the footprint of a small instrument or less.

| format | what it is | who |
|---|---|---|
| **1-lamp** | one illuminated pushbutton, one plate. The base case. | anyone |
| **lamp + counter** | the same, plus a tiny numeric window | TOWA |
| **lamp, no toggle** | safety kit: the lens reports, and there is no way to switch it off from here | HANSA |
| **two-button** | a raise/lower pair with one plate between them — the commonest thing on a KIBA machine after a lamp, for a tool extension | *not built; add by need* |
| **selector** | a multi-position pointer knob with an arc of positions | *not built* |

A cell is roughly a small instrument's footprint, and it sits in the **same row
and on the same baseline** as the chassis maker's own controls: plates aligned
along one line, the controls ragged above it, because the labels were fitted in
a row and the hardware was not. An indicator is a control like any other and has
no strip of its own. `ALARM` and the stop sit at the head of that row, which is
where the chassis stops speaking and the components start.

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
