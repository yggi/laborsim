import { existsSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/** The pinned Chromium, or Playwright's own resolution where there is none. */
const PINNED = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const executablePath = existsSync(PINNED) ? PINNED : undefined;

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
      // Four entries. `sandbox.html` is the cockpit bench (src/sandbox/): every
      // component in every state, driven by hand-built snapshots, with no
      // Rapier and no renderer behind it. It ships with the site on purpose —
      // it is the surface a theme is authored and reviewed against, and one
      // that only exists on somebody's laptop is one nobody uses. `listen.html`
      // is the same argument for the machine's voice, which is harder to check
      // than a panel and therefore needs the bench more.
      //
      // `profile.html` (src/probe/) is the strongest version of that argument:
      // it times the real world through the real renderer, and a frame time
      // from a laptop is not merely less useful than one from a phone, it is
      // about a different machine. It has to ship, or the pillar it measures
      // stays unmeasured.
      input: {
        main: "index.html",
        sandbox: "sandbox.html",
        listen: "listen.html",
        profile: "profile.html",
      },
    },
  },
  test: {
    // Two suites, one stack. They are siblings in one file rather than two
    // configs because that is what makes the line between them readable: the
    // question a new check has to answer is *which of these two*, and a second
    // config file would let it be answered by not noticing.
    //
    //   npm test    -> node   ~11s, run constantly
    //   npm run drive -> drive  a browser, run before pushing
    //
    // The dividing rule, borrowed from `yggi/robby`, which paid for it: **if it
    // needs a browser to be true, it belongs in `drive`.** A two-minute check is
    // one nobody runs, and the whole value of the fast one is that it is cheap
    // enough to run on a thought.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          // Rule 1 — the sim runs headless. This environment is plain Node with
          // no DOM: a sim test that needs a browser is a rule violation, not a
          // configuration problem. See doc/design/code/architecture-rules.md.
          //
          // `drive` below is not a way around that rule, and
          // `tests/architecture.test.ts` is what keeps it from becoming one: a
          // browser test has to drive the shell, which is the one thing rule 1
          // was never about.
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/browser/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "drive",
          include: ["tests/browser/**/*.test.ts"],
          // One GL context and one physics world per file is enough to be going
          // on with; two in parallel is a thing to choose, not to discover.
          fileParallelism: false,
          browser: {
            enabled: true,
            headless: true,
            // A phone, because that is the only viewport this game is designed
            // for (`doc/MEMORY.md` § 9). The same 390x844 the benches use.
            instances: [{ browser: "chromium", viewport: { width: 390, height: 844 } }],
            provider: playwright({
              // Playwright resolves a browser by *its own* build number, so an
              // environment with Chromium preinstalled under a different build
              // demands a download of something already on disk. The same pin
              // the five benches carry (`scripts/shots.mjs` says why).
              launchOptions: executablePath ? { executablePath } : {},
            }),
          },
        },
      },
    ],
  },
});
