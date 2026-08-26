import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

/**
 * GitHub Pages serves a project site from /<repo>/, not from the root, so the
 * bundle has to know its own base or every asset 404s. CI passes it in from the
 * Pages config; locally it stays "/". Trailing slash is required.
 */
const base = process.env.BASE_PATH
  ? `${process.env.BASE_PATH.replace(/\/$/, "")}/`
  : "/";

export default defineConfig({
  base,
  plugins: [svelte()],
  server: {
    // Mobile-first: the cockpit has to be tested on a real phone, on the real
    // LAN, from the first day. Desktop-only iteration hides touch problems
    // that are core mechanics here, not polish. See MEMORY.md section 9.
    host: true,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      // Three entries. `sandbox.html` is the cockpit bench (src/sandbox/): every
      // component in every state, driven by hand-built snapshots, with no
      // Rapier and no renderer behind it. It ships with the site on purpose —
      // it is the surface a theme is authored and reviewed against, and one
      // that only exists on somebody's laptop is one nobody uses. `listen.html`
      // is the same argument for the machine's voice, which is harder to check
      // than a panel and therefore needs the bench more.
      input: {
        main: "index.html",
        sandbox: "sandbox.html",
        listen: "listen.html",
      },
    },
  },
  test: {
    // Rule 1 — the sim runs headless. The default test environment is plain
    // Node with no DOM: a sim test that needs a browser is a rule violation,
    // not a configuration problem. See doc/design/code/architecture-rules.md.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
