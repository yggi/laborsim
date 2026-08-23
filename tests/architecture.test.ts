/**
 * The architecture rules are only real if they are checked. This suite reads
 * the source tree and fails the build when a rule is broken, so that violating
 * one has to be a deliberate act — editing docs/design/architecture-rules.md
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

describe("rule 3 — the snapshot boundary is one-directional", () => {
  it("src/ui imports no renderer and no physics", () => {
    for (const file of filesUnder(join(SRC, "ui"))) {
      const imports = valueImports(stripComments(readFileSync(file, "utf8")));
      expect(imports, `${file} reads snapshots, not the scene`).not.toContain("three");
      expect(
        imports.filter((s) => s.includes("rapier") || s.includes("/sim/")),
        `${file} reads snapshots, not the sim`,
      ).toHaveLength(0);
    }
  });

  it("no reactive scene-graph wrapper is installed", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const names = Object.keys(manifest.dependencies ?? {});
    expect(names.filter((n) => /threlte|svelte-cubed|svelthree/.test(n))).toEqual([]);
  });
});
