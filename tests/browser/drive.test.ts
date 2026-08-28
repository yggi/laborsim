/**
 * The thing that drives the app. `npm run drive`
 *
 * Four benches read this game and none of them plays it (`doc/BOARD.md` L-075).
 * `shots` poses DOM specimens, `cab` poses the renderer, `yard` looks at the
 * site, `listen` renders the ear and `profile` times a frame — all downstream of
 * a recording, by design. So a defect in the **shell's own wiring** is invisible
 * to every one of them, and to all 360 tests in the fast suite: the shell is
 * where BEGIN, the cameras, the cabinet latch, the stop and RESET live, and
 * nothing had ever pressed one.
 *
 * ## What it asserts, and why it is two different kinds of claim
 *
 * **The recording.** A run's trace is public and always on, so the honest
 * question to ask of a press is *did it reach the machine* — and the answer is a
 * line on the recording, not a pixel. Every verb below is driven and then waited
 * for by name, so a control that stops being wired fails saying which one. The
 * list is `verbs.ts`, held against `control/trace.ts` by the fast suite, which
 * is what stops it going stale in the direction of less coverage.
 *
 * **The DOM.** A recording cannot see geometry, and geometry is the other half
 * of the shell's bugs — a route scope that plotted every pin on the wrong side
 * lived its whole life inside a `.svelte` file no test mounts. So what a
 * recording is blind to is asked of the browser directly, and never re-derived
 * from the CSS (`doc/META.md`).
 *
 * ## And the third thing, which is free
 *
 * An uncaught error anywhere in the page fails this run. Note the shape of that
 * failure: Vitest reports the errors and still prints `Tests N passed`, and
 * exits **1**. The exit code is the gate. Never wrap this in anything that reads
 * the summary — that is how a suite comes to lie to you.
 */

import { mount, unmount } from "svelte";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import App from "../../src/App.svelte";
import "../../src/cockpit/substrate.css";
import "../../src/cockpit/cab.css";
import { createRun, type Run, type RunOptions } from "../../src/platform/run.ts";
import { ATTENTION_KINDS, COMMAND_KINDS } from "./verbs.ts";

/** How long any one verb gets to reach the recording. Generous: swiftshader. */
const PATIENCE = 20_000;

let teardown: (() => void) | undefined;
afterEach(() => {
  teardown?.();
  teardown = undefined;
});

/**
 * Boot the shell the way `main.ts` does, and keep hold of the run.
 *
 * The page frame — `height: 100%`, `overflow: hidden`, `touch-action: none` —
 * is **fetched from the real `index.html`** rather than copied here. The shell
 * is written against those rules and a copy of them in a test is a copy that
 * drifts, silently, in the direction of a layout nobody ships.
 */
async function cab() {
  const html = await fetch("/index.html").then((r) => r.text());
  const frame = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  if (!frame) throw new Error("index.html no longer carries the page frame");
  const style = document.createElement("style");
  style.textContent = frame;
  document.head.append(style);

  const target = document.createElement("div");
  target.id = "app";
  document.body.append(target);

  /** Every run this session built, newest last. RESET makes a new one. */
  const runs: Run[] = [];
  const app = mount(App, {
    target,
    props: {
      makeRun: (options: RunOptions) => {
        const run = createRun(options);
        runs.push(run);
        return run;
      },
    },
  });

  teardown = () => {
    unmount(app);
    target.remove();
    style.remove();
  };

  const live = () => {
    const run = runs[runs.length - 1];
    if (!run) throw new Error("the shell never built a run");
    return run;
  };
  return { runs, live };
}

async function until(what: string, done: () => boolean, ms = PATIENCE) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (done()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error(`timed out after ${ms}ms waiting for: ${what}`);
}

/**
 * A control, by the name a person would reach for it by.
 *
 * By **accessible name**, not by class or by shape: some of this cab is labelled
 * (`aria-label="emergency stop"`) and some of it is named by the legend written
 * on it (CAB, CHASE), and a driver has no business knowing which is which. It
 * also means a control that loses its name fails here — which is a real bug on
 * a machine whose whole panel is switchgear.
 */
const control = (name: string | RegExp) => page.getByRole("button", { name });

/** The same, when the box matters and not just the press. */
function boxOf(locator: ReturnType<typeof control>): DOMRect {
  const el = locator.query();
  if (!el) throw new Error("that control is not on the glass");
  return el.getBoundingClientRect();
}

const kinds = (entries: readonly { kind: string }[] = []) =>
  new Set(entries.map((e) => e.kind));

/** Every verb this run has recorded, both channels in one set. */
function recorded(run: Run): Set<string> {
  const trace = run.trace();
  return new Set([...kinds(trace?.commands), ...kinds(trace?.attention)]);
}

it("drives the shell through every verb the recording has a name for", async () => {
  const { runs, live } = await cab();

  // Each verb is pressed and then waited for **by name**, so the failure says
  // which control stopped being wired rather than which assertion was last.
  const lands = (verb: string) =>
    until(`the ${verb} to reach the recording`, () => recorded(live()).has(verb));

  /* -- BEGIN, which is what makes the machine able to move at all ----------- */

  // `advance()` feeds the clock `hands.seated ? elapsed : 0`, so an open
  // schedule is a frame that owes no steps. Nothing below this line moves
  // without it, which is the reason a driver has to go through the shell.
  await until("the briefing", () => !!document.querySelector("button.begin"));
  await userEvent.click(control("BEGIN EXERCISE"));
  // BEGIN *is* a new run: choosing an exercise bumps `session.runId`, which the
  // run effect depends on, which builds the world you are about to drive. That
  // is one of exactly two presses in this cab allowed to do that.
  await until("the exercise's own run", () => runs.length === 2);
  await until("the machine to start stepping", () => (live().world()?.tick ?? 0) > 30);

  /* -- the levers ---------------------------------------------------------- */

  const levers = [...document.querySelectorAll<HTMLElement>('[role="slider"]')];
  expect(levers, "two levers, one per track").toHaveLength(2);
  for (const lever of levers) {
    const box = lever.getBoundingClientRect();
    expect(
      box.height,
      "a lever with no height is one nothing can be dragged on",
    ).toBeGreaterThan(50);
    // `valueFrom` reads this box with a 12% margin at each end, so full ahead is
    // the top of the travel. Ask the browser for the box; never assume it. And
    // `grab()` sets the value on pointerdown while `release()` deliberately does
    // not reset it, so a click at a position *is* a lever command.
    await userEvent.click(lever, {
      position: { x: box.width / 2, y: box.height * 0.12 },
    });
  }
  await lands("levers");
  for (const lever of levers) {
    expect(
      Number(lever.getAttribute("aria-valuenow")),
      "the lever reports what the thumb did to it",
    ).toBeGreaterThan(0.9);
  }

  /* -- the cameras, and the thing this card was written about --------------- */

  // The chase camera is "hands off the wheel", not RESET (`doc/MEMORY.md` § 6).
  // Reading a rune in the run effect once threw the world away on every CHASE
  // press, and the giveaway was not a broken camera — it was the site you were
  // driving being replaced by an identical untouched copy. A recording is what
  // makes that visible: the levers you just pulled are either still on it or
  // they are not.
  const before = live().trace()?.commands.length ?? 0;
  const running = live();
  const built = runs.length;
  await userEvent.click(control("CHASE"));
  await lands("view");
  await userEvent.click(control("CAB"));

  expect(live(), "a camera press handed back a different run").toBe(running);
  expect(runs.length, "a camera press built another run").toBe(built);
  expect(
    live().trace()?.commands.length ?? 0,
    "the levers you pulled are gone: the camera threw the world away",
  ).toBeGreaterThanOrEqual(before);

  /* -- the head, the horn, an instrument, the acknowledgement ---------------- */

  const canvas = document.querySelector<HTMLCanvasElement>("canvas");
  if (!canvas) throw new Error("no glass");
  await userEvent.dragAndDrop(canvas, canvas, {
    sourcePosition: { x: 195, y: 300 },
    targetPosition: { x: 300, y: 320 },
  });
  await lands("look");

  // Held, not tapped: `hands.horn` is sampled at the tick boundary, so a press
  // that goes down and up inside one frame is a press nothing saw.
  await userEvent.click(control("horn"), { delay: 400 });
  await lands("horn");

  await userEvent.click(control("alarm, acknowledge"));
  await lands("ack");

  // Whichever instrument is first on the glass. Rung one fits two, and which
  // one moves is not the claim — that a placement is recorded at all is.
  const pod = control(/^move /).first();
  const seat = boxOf(pod);
  // Leftward, and only a little. A drop is **refused** unless it is inside the
  // cage and clear of every other pod, and a refusal tells nobody — it eases
  // back and records nothing, which is indistinguishable from a broken drag.
  // Measured rather than guessed: rung one hangs two pods in the same column,
  // so the axis with room in it is x (`doc/META.md` — ask, do not assume).
  await userEvent.dragAndDrop(pod, canvas, {
    sourcePosition: { x: seat.width / 2, y: seat.height / 2 },
    targetPosition: { x: seat.x + seat.width / 2 - 60, y: seat.y + seat.height / 2 },
  });
  await lands("pod");

  /* -- the cabinet, and the rail inside it ---------------------------------- */

  await userEvent.click(control("open the rack"));
  await lands("posture");

  await userEvent.click(control(/^enable /).first());
  await lands("rack");

  await userEvent.click(control("open the rack"));

  /* -- the stop, which is also the way out ---------------------------------- */

  await userEvent.click(control("emergency stop"));
  await lands("estop");

  /* -- and the gate: every verb, or the name of the one that is missing ------ */

  const seen = recorded(live());
  const missing = [...COMMAND_KINDS, ...ATTENTION_KINDS].filter((k) => !seen.has(k));
  expect(missing, "verbs the driver never got onto the recording").toEqual([]);

  /* -- RESET, which is the one press that *should* build a new run ---------- */

  await until("the debrief", () => !!document.querySelector("button.reset"));
  await userEvent.click(control("RESET SIMULATOR"));
  await until("the re-racked run", () => runs.length > built);
  expect(live(), "RESET handed back the same run").not.toBe(running);
  // A re-racked exercise is a fresh recording. Nothing you did to the last one
  // is on it, which is the other half of what "a run is a recording" means.
  expect(
    recorded(live()).size,
    "RESET carried the last run's recording into the new one",
  ).toBeLessThan(seen.size);
}, 180_000);
