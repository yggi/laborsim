import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  server: {
    // Mobile-first: the cockpit has to be tested on a real phone, on the real
    // LAN, from the first day. Desktop-only iteration hides touch problems
    // that are core mechanics here, not polish. See MEMORY.md section 9.
    host: true,
  },
  build: {
    target: "es2022",
  },
  test: {
    // Rule 1 — the sim runs headless. The default test environment is plain
    // Node with no DOM: a sim test that needs a browser is a rule violation,
    // not a configuration problem. See docs/design/architecture-rules.md.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
