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
import {
  chassisConditions,
  conditionAt,
  masterLine,
  worst,
} from "../src/cockpit/annunciator.ts";
import { damp } from "../src/cockpit/damping.ts";
import { MAKER_NAMES, styleOf } from "../src/cockpit/makers.ts";
import { cellFor, podFor, REGISTERED } from "../src/cockpit/parts.ts";
import {
  ACTIVE,
  ALARM,
  type Module,
  NOMINAL,
  runRack,
  WARN,
} from "../src/control/bus.ts";
import { createControls, inertControls } from "../src/control/controls.ts";
import type { Snapshot, TrackState } from "../src/core/snapshot.ts";
import { createAutonav } from "../src/modules/autonav.ts";

const COCKPIT = new URL("../src/cockpit", import.meta.url).pathname;
/**
 * The style bans scan **everything that renders**, not the careful half.
 *
 * They used to scan `src/cockpit/` alone, which is exactly the directory whose
 * author is already thinking about the rule — and the first `:global` written
 * after the ban went in was written in the rack, to size a decal, where nothing
 * was watching. Widened once to `src/cockpit/` plus `src/ui/`, which was the
 * same mistake with a longer list: the two directories are a seam between the
 * *machine* and the *rig*, and a stylesheet does not care which side it is on.
 * A conformance test that checks a subset chosen by accident is a test that will
 * pass while the invariant dies. So: all of `src/`.
 */
const SRC = [new URL("../src", import.meta.url).pathname];

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

const podSources = () =>
  filesUnder(join(COCKPIT, "pods")).filter((f) => f.endsWith(".svelte"));

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
        route: [],
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
        events: [],
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

describe("the tells point at an instrument that can show the thing", () => {
  /** A snapshot with whatever the case under test needs, and nothing else. */
  const withTracks = (over: Partial<TrackState>): Snapshot => {
    const contacts = over.contacts ?? 6;
    const track: TrackState = {
      commanded: 0,
      surface: 0,
      slip: 0,
      traction: contacts === 0 ? null : 0.2,
      ...over,
      contacts,
      ...(contacts === 0 ? { traction: null } : {}),
    };
    return {
      tick: 0,
      simSeconds: 0,
      seed: 1,
      distance: 0,
      machine: {
        pose: { position: [0, 0, 0], rotation: [0, 0, 0, 1] },
        left: track,
        right: track,
        speed: 0,
        pitch: 0,
        roll: 0,
      },
      stages: [],
      props: [],
      route: [],
      damage: [],
      bill: 0,
      events: [],
    };
  };

  it("sends a track that has lost the ground to TRACTION, where it is visible", () => {
    // It used to point at a GRIP dial that read 0% for a track in the air —
    // the same reading as parked. The plan view hatches that track out.
    const lamps = chassisConditions(withTracks({ contacts: 0, commanded: 1.4 }), false);
    expect(conditionAt(lamps, "TRACTION")).toBe(ALARM);
  });

  it("sends slipping tracks to the same head, because it is one head now", () => {
    const lamps = chassisConditions(withTracks({ slip: 1.2 }), false);
    expect(conditionAt(lamps, "TRACTION")).toBe(WARN);
  });

  it("points nothing at the dials that no longer exist", () => {
    const lamps = chassisConditions(
      withTracks({ contacts: 0, slip: 1.2, commanded: 1.4 }),
      false,
    );
    expect(conditionAt(lamps, "GRIP")).toBe(NOMINAL);
    expect(conditionAt(lamps, "SLIP")).toBe(NOMINAL);
  });

  it("leaves a condition with no gauge lighting only the master", () => {
    // The stop is a control, not a measurement. Nothing on the cluster is
    // reading it, so nothing on the cluster claims to.
    const lamps = chassisConditions(withTracks({}), true);
    expect(worst(lamps.map((l) => l.condition))).toBe(ALARM);
    expect(conditionAt(lamps, "TRACTION")).toBe(NOMINAL);
  });
});

describe("the instrument damper", () => {
  it("snaps to the reading when the needle has nothing to damp from", () => {
    expect(damp(null, 0.8, 0.1, 0.6)).toBe(0.8);
  });

  it("drops the needle when the reading stops existing, never fading it out", () => {
    // A track that leaves the ground has no traction reading, and damping from
    // its last one would be the gauge inventing a number for a dead channel.
    expect(damp(0.9, null, 0.1, 0.6)).toBeNull();
  });

  it("takes one time constant to cover about 63% of the gap", () => {
    const after = damp(0, 1, 0.6, 0.6) ?? 0;
    expect(after).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it("damps by elapsed time, not by number of updates", () => {
    // The same second of sim, delivered as one slow frame or ten fast ones,
    // has to leave the needle in the same place — otherwise a phone dropping
    // frames reads a different machine.
    const once = damp(0, 1, 1, 0.6) ?? 0;
    let many: number | null = 0;
    for (let i = 0; i < 10; i++) many = damp(many, 1, 0.1, 0.6);
    expect(many ?? 0).toBeCloseTo(once, 10);
  });

  it("does not move on a zero or backwards step", () => {
    // A reset winds the clock back. Nothing sensible is damped across that.
    expect(damp(0.4, 0.9, 0, 0.6)).toBe(0.9);
    expect(damp(0.4, 0.9, -2, 0.6)).toBe(0.9);
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

  /**
   * The base case runs the other way for glass. An unknown component still gets
   * a cell, because a dash with a component missing from it is lying — but it
   * gets **no pod**, because a pod is view you paid for and the registry cannot
   * invent an instrument on a maker's behalf.
   */
  it("gives an unregistered component no instrument at all", () => {
    expect(podFor("SOMETHING-NEW")).toBeUndefined();
  });

  it("costs nothing in glass to fit the chassis", () => {
    expect(podFor("PILOT")).toBeUndefined();
  });

  it("ships the capability component's instrument with it", () => {
    // NAV-1 pays for itself in view: fitted means fitted, never toggled.
    expect(podFor("NAV")).toBeTruthy();
  });
});

/**
 * The parts contract. A component is one thing seen from three postures, and
 * every posture is handed **the slot it is drawn from and the style it is drawn
 * in** — nothing goes looking for either.
 *
 * These are greps for a reason. The pods were written first, before the contract
 * existed, and each one had quietly grown its own way of answering the same two
 * questions: `snapshot.stages.find(s => s.id === "NAV")` for the slot and
 * `styleOf("TOWA DENKI")` for the style, hardcoded, in the instrument. Both work
 * and both are wrong — a part that names itself cannot be shown for anything
 * else, and a part that names its maker cannot be re-skinned by the maker.
 */
describe("the parts contract — one shape for three postures", () => {
  it("keeps every instrument in the registry's reach", () => {
    // If a pod is not under `pods/`, it is not something the registry can hand
    // out — which is exactly how the last one ended up wired into the shell.
    expect(podSources().length).toBeGreaterThan(0);
  });

  it("hands a part its house style; a part never asks for one", () => {
    for (const file of [...podSources(), ...cellSources()]) {
      expect(
        readFileSync(file, "utf8"),
        `${file} resolves its own maker; style arrives in props`,
      ).not.toMatch(/styleOf\s*\(/);
    }
  });

  it("hands a part its slot; a part never goes looking for one", () => {
    for (const file of [...podSources(), ...cellSources()]) {
      expect(
        readFileSync(file, "utf8"),
        `${file} finds itself on the snapshot; the stage arrives in props`,
      ).not.toMatch(/stages\s*[.?]/);
    }
  });

  /**
   * A cell has no budget and nothing to configure — that is the deal that lets
   * the indicator row exist at all (`docs/design/components.md`). It gets the
   * same `Controls` as everything else, so the rule that it must not reach the
   * settings has to be a test rather than a type.
   */
  it("keeps settings off the cells, which have no room to fight for", () => {
    for (const file of cellSources()) {
      expect(
        readFileSync(file, "utf8"),
        `${file} configures its module from the dash; settings live on the plate`,
      ).not.toMatch(/setParam/);
    }
  });
});

/**
 * The other direction. State leaves the sim as a snapshot; commands come back
 * through here and nowhere else, which is what lets the same instrument code
 * drive a live cockpit and a replay (`src/control/controls.ts`).
 */
describe("commands cross back through one channel", () => {
  const rackOf = (...over: Partial<Module>[]) =>
    over.map((o, i) => module({ id: `M${i}`, ...o }));

  it("switches a component off, and says so", () => {
    const rack = rackOf({ enabled: true });
    let changed = 0;
    const controls = createControls(rack, { onChange: () => changed++ });
    controls("M0").toggle();
    expect(rack[0]?.enabled).toBe(false);
    expect(changed).toBe(1);
  });

  it("does nothing at all for a component that is not fitted", () => {
    // The replay case: the instrument is drawn from a recording of a machine
    // that is not in front of you. Its handles must be harmless, not absent.
    const rack = rackOf({ enabled: true });
    const controls = createControls(rack, {});
    expect(() => controls("GONE").toggle()).not.toThrow();
    expect(() => controls("GONE").setParam("anything", 3)).not.toThrow();
    expect(rack[0]?.enabled).toBe(true);
  });

  it("looks the slot up again on every call, because the rack is mutated", () => {
    const rack = rackOf({ enabled: true });
    const controls = createControls(rack, {});
    const handle = controls("LATER");
    rack.push(module({ id: "LATER", enabled: true }));
    handle.toggle();
    expect(rack[1]?.enabled).toBe(false);
  });

  it("fires the warranty hook on a deliberate bypass, and only then", () => {
    const rack = rackOf({ safety: true, enabled: true });
    const bypassed: string[] = [];
    const controls = createControls(rack, { onBypass: (m) => bypassed.push(m.id) });
    controls("M0").toggle();
    expect(bypassed).toEqual(["M0"]);
    // Putting the guard back is not a bypass, and neither is switching off
    // ordinary kit. Nobody's warranty is void for using the machine.
    controls("M0").toggle();
    expect(bypassed).toEqual(["M0"]);
  });

  it("leaves an E-stop nobody's fault, because it disables before it asks", () => {
    // An emergency stop disables every module in the rack, so by the time any
    // cell could call `toggle` there is nothing enabled to bypass.
    const rack = rackOf({ safety: true, enabled: true });
    const bypassed: string[] = [];
    const controls = createControls(rack, { onBypass: (m) => bypassed.push(m.id) });
    for (const m of rack) m.enabled = false;
    controls("M0").toggle();
    expect(bypassed).toEqual([]);
  });

  it("reaches a declared param and nothing else", () => {
    const nav = createAutonav(
      [
        { x: 0, z: 10 },
        { x: 10, z: 0 },
        { x: 0, z: -10 },
      ],
      () => ({ x: 0, z: 0, rotation: { x: 0, y: 0, z: 0, w: 1 } }),
    );
    const controls = createControls([nav], {});
    controls("NAV").setParam("target", 3);
    expect(nav.target).toBe(2);
    // The module's own `set` owns the bounds: a pin off the end of the route is
    // refused there, not clamped here.
    controls("NAV").setParam("target", 9);
    expect(nav.target).toBe(2);
    controls("NAV").setParam("gain", 0.5);
    expect(nav.target).toBe(2);
  });

  it("gives a bench and a replay handles that do nothing", () => {
    expect(() => inertControls().toggle()).not.toThrow();
    expect(() => inertControls().setParam("target", 1)).not.toThrow();
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
  it("uses no :global anywhere in the cab", () => {
    for (const dir of SRC) {
      for (const file of filesUnder(dir).filter((f) => f.endsWith(".svelte"))) {
        expect(readFileSync(file, "utf8"), `${file} must not use :global`).not.toMatch(
          /:global\s*\(/,
        );
      }
    }
  });

  /**
   * The line between a plate and an engraving, which is about *who made the
   * words*. A plate names a control: engraved by whoever fitted that control,
   * unscrewable, and capable of being wrong about what it sits next to. An
   * engraving names part of the instrument it is cut into — it arrived from
   * that instrument's supplier and it cannot be wrong, because it and the dial
   * are one object.
   *
   * A cell is a component's faceplate: everything on it is a control somebody
   * fitted. So engraving in a cell is always the wrong side of the line, and it
   * is exactly the shortcut an author reaches for to save a few pixels.
   */
  it("keeps engraving off the cells, where every word names a control", () => {
    for (const file of cellSources()) {
      expect(
        readFileSync(file, "utf8"),
        `${file} engraves a word into a faceplate; controls get plates`,
      ).not.toMatch(/mfg-engraved/);
    }
  });

  /**
   * Svelte scopes classes. It does **not** scope custom properties: one set on
   * a slot inherits straight down into whatever a manufacturer bolted into it,
   * so a bare `--u` on a rack slot and a bare `--u` in somebody's faceplate are
   * one variable with two owners. That is the `bar` collision again, one layer
   * down and harder to see, so every custom property carries a namespace:
   *
   *   `--mfg-` — a maker's token, inherited into its parts on purpose.
   *   `--cab-` — the machine's own structure, and never a maker's to set.
   *
   * Two prefixes, no more, for the same reason there are four verbs.
   */
  /**
   * The other half, and the half that bites. A `var()` with a fallback is a
   * property that *works* when nothing defines it — so renaming `--dash-h` to
   * `--cab-dash-h` left the toasts silently sitting 128px off the bottom, with
   * types, lint and every test green, exactly the way a scripted edit that
   * matched nothing once removed the dash's background (`META.md`).
   *
   * A `--mfg-` token is allowed to go undefined: a maker's component offers
   * them to whatever it is bolted into, and the fallback *is* the offer.
   * Everything else must be defined somewhere in `src/` by the time it is read.
   */
  it("defines every property something reads, unless it is a maker's offer", () => {
    const defined = new Set<string>();
    const used = new Map<string, string>();
    for (const dir of SRC) {
      for (const file of filesUnder(dir)) {
        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(/(--[a-z][\w-]*)\s*:/g)) {
          if (match[1]) defined.add(match[1]);
        }
        for (const match of source.matchAll(/var\(\s*(--[a-z][\w-]*)/g)) {
          // A maker's token may go undefined: the fallback is the offer.
          if (match[1] && !match[1].startsWith("--mfg-")) used.set(match[1], file);
        }
      }
    }
    for (const [name, file] of used) {
      expect(defined, `${file} reads ${name}, which nothing in src/ defines`).toContain(
        name,
      );
    }
  });

  it("namespaces every custom property it defines", () => {
    for (const dir of SRC) {
      for (const file of filesUnder(dir)) {
        const source = readFileSync(file, "utf8");
        // Definitions, not uses: `--x: value`, wherever it is written.
        for (const [, name] of source.matchAll(/(--[a-z][\w-]*)\s*:/g)) {
          expect(name, `${file} defines ${name}, which is not namespaced`).toMatch(
            /^--(mfg|cab)-/,
          );
        }
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
          /controls\.toggle/,
        );
      } else {
        expect(source, `${name} must expose an enable control by name`).toMatch(
          /aria-label="enable /,
        );
      }
    }
  });
});
