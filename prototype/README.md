# prototype/

**Frozen evidence. Not a starting point.**

Each subdirectory is a self-contained feasibility probe plus the handover brief
that interprets it. They are kept because they answered a question, and because
the reasoning that produced them is worth more than the code.

Rules:

- **Do not port their structure.** They are single-file, no-build artifacts that
  bought an answer cheaply. Copying their layout into `src/` would be importing
  a shape that was chosen to avoid a bundler.
- **Do port named mechanisms**, and only the ones the handover marks as worth
  carrying. Those are listed in `docs/design/code/prototype-findings.md`.
- **Do not edit them.** They are a record of what was true on a date. A probe
  that gets patched stops being evidence. Write a new one instead.

| Probe | Date | Question it answered |
|---|---|---|
| `concept-3/` | 2026-08 | Can this look and feel right in a browser, on a phone? Yes. |

Open `concept-3/index.html` directly in a browser — it pulls three.js r128 from a
CDN and needs no build step and no server.
