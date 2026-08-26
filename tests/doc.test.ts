/**
 * The docs are a structure, so the structure is checked.
 *
 * `doc/design/` is four clusters of five pages, indexed by `doc/MEMORY.md` one
 * level up. That shape only helps while it is true: an index that has drifted
 * from the tree is worse than no index, because it is read as authoritative and
 * quietly sends you to a page that moved.
 *
 * Nothing here judges prose. It checks the three things that rot silently —
 * a link that no longer resolves, a page in no cluster, and a cluster the index
 * has forgotten — because all three are invisible to a reader who is *already*
 * lost and looking for the page they were promised.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const DESIGN = join(ROOT, "doc/design");

/** Every markdown file that is part of the contract, root surfaces included. */
function markdownUnder(dir: string): string[] {
  let found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found = found.concat(markdownUnder(path));
    else if (entry.endsWith(".md")) found.push(path);
  }
  return found;
}

const CLUSTERS = ["machine", "cab", "rig", "code"];

/**
 * A path-shaped mention, from a link or from backticked prose.
 *
 * Both forms are checked because both are used and both are followed. A reader
 * does not care whether the author reached for a link or for `code/stack.md`;
 * they care that the file is there.
 */
function mentionedPaths(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/\]\((\.{0,2}[\w./-]+\.md)(?:#[\w-]*)?\)/g)) {
    found.add(m[1] as string);
  }
  for (const m of source.matchAll(/`((?:doc\/|\.{1,2}\/)[\w./-]+\.md)`/g)) {
    found.add(m[1] as string);
  }
  return [...found];
}

describe("the design docs are four clusters, and the map matches the ground", () => {
  it("every page lives in exactly one cluster", () => {
    const stray = readdirSync(DESIGN).filter(
      (e) =>
        statSync(join(DESIGN, e)).isFile() &&
        e.endsWith(".md") &&
        !CLUSTERS.includes(e.replace(/\.md$/, "")),
    );
    expect(stray, "a content page belongs in a cluster directory").toEqual([]);
  });

  it.each(CLUSTERS)("the %s cluster page indexes every page in its tree", (cluster) => {
    const page = readFileSync(join(DESIGN, `${cluster}.md`), "utf8");
    for (const file of readdirSync(join(DESIGN, cluster))) {
      expect(page, `${cluster}.md does not mention ${file}`).toContain(
        `${cluster}/${file}`,
      );
    }
  });

  it("MEMORY.md indexes the clusters and nothing below them", () => {
    const memory = readFileSync(join(ROOT, "doc/MEMORY.md"), "utf8");
    const index = memory.slice(0, memory.indexOf("\n---\n"));
    for (const cluster of CLUSTERS) {
      expect(index, `the index has lost ${cluster}`).toContain(
        `doc/design/${cluster}.md`,
      );
    }
    // The point of the cluster layer: the index names four things, not twenty.
    // A content page creeping back in is the star topology growing again.
    const deep = [...index.matchAll(/doc\/design\/(\w+)\/([\w-]+\.md)/g)];
    expect(
      deep.map((m) => `${m[1]}/${m[2]}`),
      "index cluster pages, not content pages",
    ).toEqual([]);
  });
});

describe("every markdown path that is written down resolves", () => {
  it("no link or backticked path points at a file that is not there", () => {
    const broken: string[] = [];
    for (const file of markdownUnder(ROOT)) {
      const rel = relative(ROOT, file);
      // The log is append-only. It records paths that were correct when
      // written, and rewriting them to keep a checker happy would be editing
      // the record to match the present. `doc/HISTORY.md` is *not* exempt: it is
      // rewritten rather than appended to, so its links have to resolve.
      if (rel === "doc/LOG.md") continue;
      for (const path of mentionedPaths(readFileSync(file, "utf8"))) {
        const target = path.startsWith("doc/")
          ? join(ROOT, path)
          : resolve(dirname(file), path);
        try {
          statSync(normalize(target));
        } catch {
          broken.push(`${rel} → ${path}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });
});
