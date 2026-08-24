/**
 * The cockpit contract, enforced.
 *
 * Two halves, and the second is the interesting one.
 *
 * **Behaviour** — severity crosses the boundary as a number, and the masters are
 * derived from it. The case worth having a test for is the bypassed guard: a
 * safety module that has been switched off stands at WARN rather than going
 * quiet, which is the whole "pop the hood" bargain and is exactly the kind of
 * thing that would rot silently.
 *
 * **The theme contract** — `docs/design/components.md` lists invariants every
 * manufacturer must honour, and `META.md` says a rule enforced by a document is
 * a rule that gets violated anyway (rule 2 was written down, read, and broken
 * twice). These are about to be handed to authors working independently and
 * blind to each other, so every invariant that can be checked mechanically is
 * checked here rather than reviewed by eye.
 *
 * Conformance is by **accessible name**, not by CSS review: a plate or a cell
 * may be arranged however its maker likes, but the affordances have to be there
 * and have to be findable. That is a contract you can honour with any layout.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chassisConditions, masterLine, worst } from "../src/cockpit/annunciator.ts";
import { MAKER_NAMES, styleOf } from "../src/cockpit/makers.ts";
import { cellFor, REGISTERED } from "../src/cockpit/parts.ts";
import {
  ACTIVE,
  ALARM,
  type Module,
  NOMINAL,
  runRack,
  WARN,
} from "../src/control/bus.ts";

const COCKPIT = new URL("../src/cockpit", import.meta.url).pathname;

function filesUnder(dir: string): string[] {
  let found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found = found.concat(filesUnder(path));
    else found.push(path);
  }
  return found;
}

const cellSources = () =>
  filesUnder(join(COCKPIT, "cells")).filter((f) => f.endsWith(".svelte"));

const module = (over: Partial<Module> = {}): Module => ({
  id: "X",
  label: "X",
  maker: "KIBA WORKS",
  considers: "nothing",
  verb: "SET",
  enabled: true,
  intent: () => ({ left: 1, right: 1 }),
  ...over,
});

describe("severity crosses the boundary as a number", () => {
  it("reads a module's own condition when it publishes one", () => {
    const { stages } = runRack([module({ condition: () => ALARM })]);
    expect(stages[0]?.condition).toBe(ALARM);
  });

  it("falls back to idle-is-nominal, driving-is-active", () => {
    const driving = runRack([module()]).stages[0];
    const idle = runRack([module({ intent: () => null })]).stages[0];
    expect(driving?.condition).toBe(ACTIVE);
    expect(idle?.condition).toBe(NOMINAL);
  });

  it("leaves an ordinary disabled module nominal", () => {
    const { stages } = runRack([module({ enabled: false, condition: () => ALARM })]);
    expect(stages[0]?.condition).toBe(NOMINAL);
  });

  /**
   * The one that matters. Reintroducing the bug — dropping the `safety` branch
   * in `conditionOf` — makes exactly this fail, which is what makes it a real
   * test rather than one that passes either way (`META.md`).
   */
  it("stands a bypassed safety module at WARN, not nominal", () => {
    const { stages } = runRack([module({ safety: true, enabled: false })]);
    expect(stages[0]?.condition).toBe(WARN);
  });

  it("carries maker and safety onto the stage, so a replay can style it", () => {
    const { stages } = runRack([module({ maker: "HANSA REGELTECHNIK", safety: true })]);
    expect(stages[0]?.maker).toBe("HANSA REGELTECHNIK");
    expect(stages[0]?.safety).toBe(true);
  });
});

describe("the masters are derived, never hand-wired", () => {
  it("takes the worst of everything, and nothing over an empty rack", () => {
    expect(worst([])).toBe(NOMINAL);
    expect(worst([NOMINAL, WARN, ACTIVE])).toBe(WARN);
    expect(worst([WARN, ALARM, NOMINAL])).toBe(ALARM);
  });

  it("names a component the dash has never heard of", () => {
    const { stages } = runRack([
      module({ id: "MYSTERY", label: "MYSTERY-9", condition: () => ALARM }),
    ]);
    const line = masterLine([], stages, "NOMINAL");
    expect(line.condition).toBe(ALARM);
    expect(line.text).toContain("MYSTERY-9");
  });

  it("names a bypassed guard in its own maker's word, not the chassis's", () => {
    const { stages } = runRack([
      module({
        id: "TILT",
        label: "TILT-GUARD",
        maker: "HANSA REGELTECHNIK",
        safety: true,
        enabled: false,
      }),
    ]);
    const line = masterLine([], stages, "NOMINAL");
    expect(line.text).toContain("ÜBERBRÜCKT");
    expect(line.text).not.toContain("OFF");
  });

  it("lets severity beat order — a citizen outranks a module's opinion", () => {
    const { stages } = runRack([module({ label: "GUARD", condition: () => WARN })]);
    const citizen = chassisConditions(
      {
        tick: 0,
        simSeconds: 0,
        seed: 1,
        distance: 0,
        machine: {
          pose: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
          left: { commanded: 0, surface: 0, slip: 0, contacts: 6, traction: 0 },
          right: { commanded: 0, surface: 0, slip: 0, contacts: 6, traction: 0 },
          speed: 0,
          pitch: 0,
          roll: 0,
        },
        stages: [],
        props: [],
        damage: [
          {
            tick: 0,
            prop: 0,
            kind: "scooter",
            category: "citizen asset",
            label: "scooter",
            state: "destroyed",
            yen: 3000,
            energy: 1,
            toughness: 1,
            at: [0, 0, 0],
            speed: 1,
            driving: [],
            bypassed: [],
          },
        ],
        bill: 3000,
      },
      false,
    );
    expect(masterLine(citizen, stages, "NOMINAL").text).toBe("CITIZEN PROPERTY");
  });

  it("says nothing when there is nothing to say", () => {
    const { stages } = runRack([module()]);
    const line = masterLine([], stages, "SYSTEMS NOMINAL");
    expect(line.condition).toBe(NOMINAL);
    expect(line.text).toBe("SYSTEMS NOMINAL");
  });
});

describe("the registry", () => {
  it("gives an unregistered component the base case", () => {
    expect(cellFor("SOMETHING-NEW")).not.toBeNull();
  });

  it("lets a component deliberately have no cell", () => {
    // The chassis brings the whole dashboard; it needs no lamp to say so.
    expect(REGISTERED).toContain("PILOT");
    expect(cellFor("PILOT")).toBeNull();
  });
});

describe("the theme contract — invariants every maker must honour", () => {
  it("gives every maker a complete lexicon and voice", () => {
    for (const name of MAKER_NAMES) {
      const style = styleOf(name);
      for (const key of ["on", "off", "fault", "bypassed"] as const) {
        expect(style.lexicon[key], `${name} lexicon.${key}`).toBeTruthy();
      }
      expect(style.voice.warranty[1], `${name} warranty body`).toBeTruthy();
      expect(style.voice.tips.length, `${name} tips`).toBeGreaterThan(0);
    }
  });

  it("falls back to a real house style for an unknown maker", () => {
    // Not a blank plate: an unmarked part reads as OEM kit until the
    // grey-market maker exists to claim it. Hackjob is a style, not an absence.
    expect(styleOf("WHO?").wordmark).toBe(styleOf("KIBA WORKS").wordmark);
  });

  /**
   * Svelte scopes a component's styles, which removes most of the collision
   * risk from independently authored themes. `:global` is the escape hatch that
   * puts it all back — and a house-style class called `bar` once collided with
   * a meter's `.bar` and collapsed a faceplate to 7px with everything green.
   */
  it("uses no :global in any cockpit component", () => {
    for (const file of filesUnder(COCKPIT).filter((f) => f.endsWith(".svelte"))) {
      expect(readFileSync(file, "utf8"), `${file} must not use :global`).not.toMatch(
        /:global\s*\(/,
      );
    }
  });

  it("prefixes every custom property it defines with --mfg-", () => {
    for (const file of filesUnder(COCKPIT)) {
      const source = readFileSync(file, "utf8");
      // Definitions, not uses: `--x: value`, wherever it is written.
      for (const [, name] of source.matchAll(/(--[a-z][\w-]*)\s*:/g)) {
        expect(name, `${file} defines ${name}, which is not namespaced`).toMatch(
          /^--mfg-/,
        );
      }
    }
  });

  /**
   * Conformance by accessible name. A cell's *arrangement* is free — that is the
   * whole point of giving each maker its own component — but a component you
   * can switch off must expose a control that says so, and safety kit must not
   * expose one at all, because bypassing a guard costs you the glass.
   */
  it("gives every non-safety cell a findable enable control", () => {
    const safetyCells = new Set(["TiltCell.svelte"]);
    for (const file of cellSources()) {
      const source = readFileSync(file, "utf8");
      const name = file.split("/").pop() ?? file;
      if (safetyCells.has(name)) {
        expect(source, `${name} is safety kit and must carry no toggle`).not.toMatch(
          /onToggle\s*\}|onclick=\{onToggle\}/,
        );
      } else {
        expect(source, `${name} must expose an enable control by name`).toMatch(
          /aria-label="enable /,
        );
      }
    }
  });
});
