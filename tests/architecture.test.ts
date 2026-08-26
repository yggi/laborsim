/**
 * The architecture rules are only real if they are checked. This suite reads
 * the source tree and fails the build when a rule is broken, so that violating
 * one has to be a deliberate act — editing doc/design/code/architecture-rules.md
 * first — rather than an import added on a tired afternoon.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = new URL("../src", import.meta.url).pathname;

function filesUnder(dir: string): string[] {
  let found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found = found.concat(filesUnder(path));
    else if (/\.(ts|svelte)$/.test(entry)) found.push(path);
  }
  return found;
}

/**
 * Comments discuss the rules — `rng.ts` has to name `Math.random` in order to
 * forbid it. Scan code, not prose.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Blank out comments while preserving line numbers and columns, so a per-line
 * scan can still report where it found something. `stripComments` collapses
 * newlines, which is fine for whole-file scans and wrong for this.
 */
function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:])\/\/[^\n]*/gm,
      (m, lead: string) => lead + " ".repeat(m.length - lead.length),
    );
}

/** Import specifiers, ignoring the `import type` form, which erases at build. */
function valueImports(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /import\s+(?!type\b)([^;]*?)\s*from\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    specifiers.push(match[2] as string);
  }
  return specifiers;
}

const SIM_TREES = ["sim", "control", "modules", "core"];

describe("rule 1 — the sim runs headless", () => {
  it.each(SIM_TREES)("src/%s imports no renderer", (tree) => {
    let dir: string;
    try {
      dir = join(SRC, tree);
      statSync(dir);
    } catch {
      return; // tree not created yet
    }
    for (const file of filesUnder(dir)) {
      const imports = valueImports(stripComments(readFileSync(file, "utf8")));
      expect(imports, `${file} must not import a renderer`).not.toContain("three");
      expect(
        imports.filter((s) => s.startsWith("three/")),
        `${file} must not import a renderer`,
      ).toHaveLength(0);
      expect(imports, `${file} must not import Svelte`).not.toContain("svelte");
      // Audio is a renderer like the scene is, and the sim knows about neither.
      // A module that reached for a voice to announce itself would be a module
      // that cannot run in a worker, in a test, or in a replay.
      expect(
        imports.filter((s) => s.includes("/audio/")),
        `${file} must not import a renderer`,
      ).toHaveLength(0);
    }
  });

  it("sim code touches no browser globals", () => {
    for (const file of filesUnder(join(SRC, "sim"))) {
      const source = stripComments(readFileSync(file, "utf8"));
      expect(source, `${file} must not touch the DOM`).not.toMatch(
        /\b(document|window)\s*\./,
      );
    }
  });
});

describe("rule 2 — randomness is seeded", () => {
  it("no Math.random anywhere in src", () => {
    for (const file of filesUnder(SRC)) {
      expect(
        stripComments(readFileSync(file, "utf8")),
        `${file} must draw from src/core/rng.ts instead`,
      ).not.toMatch(/Math\.random/);
    }
  });
});

describe("rule 2 — no transcendental reaches sim state", () => {
  /**
   * `Math.sin`, `cos`, `tan`, `atan2`, `exp`, `pow` and friends are not
   * required to be bit-identical across JS engines, so one in sim-visible code
   * silently breaks cross-browser replay. `sqrt` and `round` are exempt —
   * IEEE-754 requires both to be correctly rounded.
   *
   * This caught two live violations the day it was written: site furniture
   * placed with sin/cos was writing non-portable values into collider
   * transforms, and NAV-1's route was generated the same way. Reading the rule
   * had not caught either.
   *
   * A line may opt out with a `deterministic-exempt:` comment naming why —
   * display-only derivations, or values quantized far below any engine
   * disagreement.
   */
  const BANNED = /Math\.(sin|cos|tan|asin|acos|atan2?|exp|log2?|pow|cbrt|hypot)\b/;

  it.each(["sim", "control", "modules", "world", "core"])(
    "src/%s uses no non-portable maths",
    (tree) => {
      let dir: string;
      try {
        dir = join(SRC, tree);
        statSync(dir);
      } catch {
        return;
      }
      for (const file of filesUnder(dir)) {
        const raw = readFileSync(file, "utf8");
        const lines = raw.split("\n");
        const code = blankComments(raw).split("\n");
        lines.forEach((_line, i) => {
          if (!BANNED.test(code[i] ?? "")) return;
          // Look back over a whole comment block, not just a line or two.
          const context = lines.slice(Math.max(0, i - 5), i + 1).join("\n");
          expect(
            context.includes("deterministic-exempt:"),
            `${file}:${i + 1} uses non-portable maths in sim-visible code. ` +
              "Rewrite it in arithmetic and sqrt, or justify it with a " +
              "deterministic-exempt: comment.",
          ).toBe(true);
        });
      }
    },
  );
});

describe("rule 3 — the snapshot boundary is one-directional", () => {
  // `cockpit` and `sandbox` joined `ui` when the cockpit became a registry of
  // components rather than a set of panels. `audio` joined them because a voice
  // is a view of a recording exactly as an instrument is — which is what makes
  // a replay sound like the run it recorded. All of them are further from the
  // sim than `ui` is, not closer, so the same rule applies to all four.
  it.each(["ui", "cockpit", "sandbox", "audio"])(
    "src/%s imports no renderer and no physics",
    (tree) => {
      let dir: string;
      try {
        dir = join(SRC, tree);
        statSync(dir);
      } catch {
        return; // tree not created yet
      }
      for (const file of filesUnder(dir)) {
        const imports = valueImports(stripComments(readFileSync(file, "utf8")));
        expect(imports, `${file} reads snapshots, not the scene`).not.toContain(
          "three",
        );
        expect(
          imports.filter((s) => s.includes("rapier") || s.includes("/sim/")),
          `${file} reads snapshots, not the sim`,
        ).toHaveLength(0);
      }
    },
  );

  it("no reactive scene-graph wrapper is installed", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const names = Object.keys(manifest.dependencies ?? {});
    expect(names.filter((n) => /threlte|svelte-cubed|svelthree/.test(n))).toEqual([]);
  });
});

/**
 * Not one of the three rules — a convention (`doc/design/code/conventions.md`, *one
 * fact, one place*) that earned a scanner the hard way.
 *
 * Three places built snapshots by hand, each with its own idea of what a track
 * at rest looks like, and only one of them refused to build the machine that
 * does not exist. Adding `suspension` and then `goal` meant teaching all three
 * separately. The kit fixes that; this stops a fourth appearing, because the
 * fourth will not arrive as a decision — it will arrive as somebody needing a
 * snapshot in a hurry and writing out the fields.
 *
 * Scoped to `src` **and** `tests`, because the last time a scanner was written
 * to watch only the directory whose author already thinks about the rule, the
 * first violation landed in the one it did not watch (`doc/META.md`).
 */
describe("one fact, one place — a hand-built snapshot comes from the kit", () => {
  /**
   * `src/sim/world.ts` builds the real one from the real world, which is the
   * thing the kit exists to imitate; `src/core/fixture.ts` is the kit.
   */
  const AUTHORS = ["src/sim/world.ts", "src/core/fixture.ts"];

  it("nothing else writes out a MachineState by hand", () => {
    const roots = [SRC, new URL("../tests", import.meta.url).pathname];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of filesUnder(root)) {
        const rel = file.slice(file.indexOf("/laborsim/") + "/laborsim/".length);
        if (AUTHORS.some((a) => rel.endsWith(a))) continue;
        // `machine:` with a brace is the shape of a snapshot literal and of
        // nothing else in this codebase — every other mention passes one along
        // by reference or reads a field off it.
        if (/\bmachine:\s*\{/.test(stripComments(readFileSync(file, "utf8")))) {
          offenders.push(rel);
        }
      }
    }
    expect(offenders, "build it with `snapshot()` from src/core/fixture.ts").toEqual(
      [],
    );
  });
});

/**
 * Rule 3's other edge: **what runs outside the reactive graph reads `hands`.**
 *
 * The render loop, the rack it steps and the canvas pointer handlers all run
 * where a rune must not be read. Reading one from there is an untracked read: it
 * returns the right value today and nothing anywhere guarantees it. All three
 * did it, by three different mechanisms, and the worst — the two levers, read
 * sixty times a second through a module callback — went unnoticed for as long as
 * it did precisely because it was not in the loop body where somebody would
 * think to look. `control/hands.ts` is the one channel now.
 *
 * The loop and the pointer handlers have since moved to `platform/run.ts`, where
 * the question cannot arise: a plain `.ts` module has no runes to read. So what
 * is left to check is the boundary itself — that the loop really is *out* of the
 * component, and that the one callback still declared in there stays clean.
 *
 * A write is fine and is how the UI gets its value at all. It is *reads* that
 * have to go through the seam, so an assignment target is allowed.
 */
describe("rule 3 — nothing outside the reactive graph reads a rune", () => {
  const CODE = stripComments(readFileSync(join(SRC, "App.svelte"), "utf8"));

  /** Every name this component declares with a rune. */
  const runes = [
    ...CODE.matchAll(
      /(?:let|const)\s+([A-Za-z_$][\w$]*)[^=\n]*=\s*\$(?:state|derived)\b/g,
    ),
  ].map((m) => m[1] as string);

  /** The balanced block introduced by `opener`, opener included. */
  function bodyAfter(source: string, opener: string): string {
    const start = source.indexOf(opener);
    if (start < 0) throw new Error(`no such block: ${opener}`);
    let depth = 0;
    for (let i = source.indexOf("{", start); i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
    }
    throw new Error(`unbalanced: ${opener}`);
  }

  it("the pilot module reads no rune", () => {
    // `runRack` calls its `intent` and `condition` from inside `world.step()`,
    // inside the frame loop. It is declared in the component, so unlike the loop
    // it *could* reach a rune, and it did — both levers, on the hottest path.
    const body = bodyAfter(CODE, "const pilot: Module = {");
    const read = runes.filter((name) => {
      // The lookbehind is load-bearing: `hands.leverL` contains `leverL`, and
      // reading it off the seam is the whole point. A property access is not a
      // rune read, and without this the check fails on its own fix.
      const anywhere = new RegExp(`(?<![.\\w$])${name}\\b`, "g");
      const written = new RegExp(`(?<![.\\w$])${name}\\b\\s*=(?!=)`, "g");
      return (body.match(anywhere)?.length ?? 0) > (body.match(written)?.length ?? 0);
    });
    expect(read, "read it off `hands` instead (src/control/hands.ts)").toEqual([]);
  });

  it("the component owns no frame loop", () => {
    // The shell's own header has claimed from the start that "a plain module
    // owns the renderer and the loop". It was aspirational for a long time; this
    // is what keeps it true, and what stops the loop drifting back in one
    // `requestAnimationFrame` at a time.
    expect(CODE, "the loop belongs to platform/run.ts").not.toContain(
      "requestAnimationFrame",
    );
  });

  it("the run is a plain module, so runes cannot get into it", () => {
    const run = stripComments(readFileSync(join(SRC, "platform/run.ts"), "utf8"));
    expect(run).not.toMatch(/\$(?:state|derived|effect)\b/);
    expect(valueImports(run).filter((s) => s.startsWith("svelte"))).toEqual([]);
  });
});
