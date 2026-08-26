# How instruments and faceplates get drawn

The question, asked once the maker identities turned out to be a mechanic
rather than decoration: *everything else is 3D — should the panels be? Can DOM
content be anchored to a three.js surface? Is a library the answer?*

This is the answer and its reasons, so it does not get reopened by accident.

---

## The decision

**Stay in the DOM. Put the structure in CSS custom properties and the character
in inline SVG.** No UI library. No canvas textures. No second renderer.

Revisit exactly once: when the panel budget (L-025) becomes a *physical* thing
in the cab rather than an area budget on an overlay.

## What was considered, and why it lost

### A UI or component library

Rejected outright. Tailwind buys nothing — the styling problem here is
per-manufacturer character, not utility classes, and it adds build weight
against an unmeasured mobile budget (L-034). A component library (Melt, Bits,
Skeleton) is worse than nothing: those exist to make things look like
well-behaved web apps, and the entire point of the rack is that it should look
like industrial equipment from three different suppliers. `doc/MEMORY.md` § 9 says
no further dependencies without a reason; there is no reason here.

### Canvas 2D per instrument

Genuinely viable, and the right tool the day an instrument needs something
dense and procedural — a waveform, a radar sweep with persistence, CRT grain.
Costs: hit-testing becomes ours to write, text needs care to stay crisp, and
each instrument becomes an opaque bitmap rather than inspectable DOM.

Not now. Nothing on the machine yet needs a pixel that CSS and SVG cannot draw.

### Instruments as real 3D geometry in the cab

The most attractive version, and the most expensive. Needles, bezels and glass
as meshes: correctly occluded, lit by the same key light, ink-outlined by the
same pipeline, fogged, and physically *in the place* the panel budget is about.
It would make "this instrument is in the way" literal rather than notional.

Costs, all real: every control needs raycast hit-testing written from scratch;
text needs `troika-three-text` or geometry; touch precision — which is the
mechanic (`doc/MEMORY.md` § 9) — gets worse before it gets better; and the draw-call
budget grows on a platform whose frame time has never been measured.

Deferred, not rejected. It is what L-025 should be *measured against*.

### Canvas texture mapped onto a 3D panel

The middle path: draw the instrument in Canvas 2D, upload it as a texture, map
it onto a quad in the cab. Real 3D placement with a 2D authoring surface. Same
hit-testing problem, plus a texture upload per instrument per update — cheap at
10 Hz, not free. Keep in reserve for the 3D cockpit; it is how that should be
prototyped before anyone models a needle.

### CSS3DRenderer — "anchor DOM on a three.js surface"

Worth answering precisely, because the answer is *yes, but*.

three.js ships `CSS3DRenderer`, which positions real DOM elements with CSS 3D
transforms so they line up with a three.js camera. The DOM stays DOM: crisp
text, working inputs, real touch handling, no hit-testing to write. It is a
**second renderer** layered over the WebGL canvas.

The limitation that decides it: **there is no shared depth buffer.** DOM
elements cannot be occluded by WebGL geometry. The usual workaround — punching
holes in the WebGL render with blended occluder boxes — fights the ink shells
and the toon materials directly, and it forfeits fog and shadow on the panel.
For a cockpit whose whole subject is *occlusion*, a layer that cannot be
occluded is the wrong tool.

The related question — **rendering DOM into a WebGL texture** — has a flat
answer: you cannot. `foreignObject` → canvas → texture is blocked by
tainted-canvas rules across browsers, and reimplementations like html2canvas
are a separate rendering engine with separate bugs. Do not go down this road.

## Why the DOM keeps winning, for now

1. **Touch is the mechanic.** Direct manipulation, thumb reach, no hover, no
   pixel precision (`doc/MEMORY.md` § 9). The DOM gives correct touch targets,
   pointer capture and accessibility for free. Everything else means writing
   them.
2. **The panel budget is about area, not perspective.** L-025 — fixed glass,
   instruments declaring their size, a component refusable for want of it —
   works in an overlay. Perspective would make it prettier and more literal; it
   is not what makes it a mechanic.
3. **Nothing is measured yet.** Adding a second renderer or per-frame texture
   uploads before L-034 has produced a frame time on a real phone is exactly
   the wrong order.
4. **An instrument is a view of a recording** (rule 3). That holds in any of
   these technologies, so it does not choose between them — but the DOM version
   is the one that is already written and already replay-safe.

## So where does the character come from?

Three layers, in increasing cost, and the rule is to use the cheapest that
works:

- **Tokens** — each maker's palette arrives as CSS custom properties on the
  slot (`--plate`, `--bezel`, `--face`, `--accent`). Structure stays one
  stylesheet; a new manufacturer is data.
- **Layout** — a small closed set of house layouts (`strip`, `stack`, `boxed`),
  each a handful of rules. Deliberately few: this is a house style per maker,
  not a theming system, and a fourth needs an argument.
- **Inline SVG** — the actual *graphic design*: the maker's mark, silkscreen,
  vents, wear. SVG is where character goes without a combinatorial explosion of
  CSS, it is the same technology the instruments already use, it scales to any
  DPI, and it costs nothing at runtime.

One caution learned the expensive way: **the layout class shares a namespace
with every other class in that scoped stylesheet.** A house layout called `bar`
collided with the meter's `.bar` and collapsed a whole faceplate to 7 px, with
lint, types and 71 tests green. House-style class names get a prefix or a
distinct word, always.
