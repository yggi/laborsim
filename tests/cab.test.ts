/**
 * The cab's six concerns, driven without a cab.
 *
 * `App.svelte` was 991 lines because each of these was a clump of state plus the
 * two or three functions that owned it, fenced off by a comment block and
 * reachable only by mounting the component (BOARD L-072). Nothing in here was
 * ever asserted — the annunciator's wind-down, the E-stop's restore, a notice's
 * expiry, the nag's cooldown — because the only way in was through the shell.
 *
 * They are modules now, and the price of that is this file: each one built by
 * hand, stepped by hand, and checked. **No component is mounted anywhere below**,
 * which is the property that was bought.
 *
 * The runes are real — these are `.svelte.ts` modules and the plugin compiles
 * them — but nothing here opens an `$effect`, because an `$effect` outside a
 * component is an orphan and throws. Every fold that used to be one is a method
 * the shell drives with a one-line effect and a test drives by calling it.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAlarm, stillAcked } from "../src/cockpit/alarm.svelte.ts";
import { createEstop } from "../src/cockpit/estop.svelte.ts";
import { createNag, NAG_AFTER, NAG_COOLDOWN_MS } from "../src/cockpit/nag.ts";
import { createNotices } from "../src/cockpit/notices.svelte.ts";
import { ACTIVE, ALARM, type Module, NOMINAL, WARN } from "../src/control/bus.ts";
import { restingHands } from "../src/control/hands.ts";
import { snapshot, stage } from "../src/core/fixture.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { createPilot } from "../src/modules/pilot.ts";
import { createSound, type LiveAudio } from "../src/platform/sound.svelte.ts";
import { createSession } from "../src/ui/session.svelte.ts";
import { FIRST_EXERCISE } from "../src/world/exercises.ts";

const mod = (over: Partial<Module> = {}): Module => ({
  id: "X",
  label: "X",
  maker: "KIBA WORKS",
  considers: "nothing",
  verb: "SET",
  enabled: true,
  intent: () => null,
  ...over,
});

describe("the annunciator's acknowledgement", () => {
  /**
   * The rule on its own, as a table. It is the part with a memory — `min` over
   * *time* rather than over the current pair — so it is worth stating flat.
   */
  it("keeps an acknowledgement until the condition it covered clears", () => {
    expect(stillAcked(ALARM, ALARM)).toBe(ALARM);
    expect(stillAcked(ALARM, WARN)).toBe(WARN);
    expect(stillAcked(ALARM, NOMINAL)).toBe(NOMINAL);
    // It never *grants* one: a condition getting worse is not acknowledged.
    expect(stillAcked(NOMINAL, ALARM)).toBe(NOMINAL);
  });

  const withStop = (estopped: boolean) =>
    createAlarm(
      () => snapshot({ seed: 1 }),
      () => estopped,
    );

  it("takes the worst of the chassis and every fitted module", () => {
    const alarm = createAlarm(
      () =>
        snapshot({
          seed: 1,
          stages: [stage({ id: "M", maker: "KIBA WORKS", condition: WARN })],
        }),
      () => false,
    );
    expect(alarm.master).toBe(WARN);
  });

  it("is quiet on a healthy machine and loud on a stopped one", () => {
    expect(withStop(false).master).toBe(NOMINAL);
    expect(withStop(true).master).toBe(ALARM);
  });

  it("stops shouting once it is pressed, and only then", () => {
    const alarm = withStop(true);
    expect(alarm.unacked).toBe(ALARM);
    alarm.ack();
    expect(alarm.acked).toBe(ALARM);
    expect(alarm.unacked).toBe(NOMINAL);
  });

  /**
   * The one that would rot silently. An operator who silenced an ALARM must
   * still hear the next WARN — it is *lower*, so without the wind-down it would
   * arrive already acknowledged and the panel would be deaf to everything short
   * of the thing it had already told you about.
   */
  it("re-arms for a lesser condition once the machine has recovered", () => {
    let stopped = true;
    const alarm = createAlarm(
      () => snapshot({ seed: 1 }),
      () => stopped,
    );
    alarm.ack();
    expect(alarm.unacked).toBe(NOMINAL);

    stopped = false;
    alarm.settle();
    expect(alarm.acked).toBe(NOMINAL);

    // Something lesser now happens. Without `settle` above, `acked` would still
    // be ALARM and this would read NOMINAL — silence, for a live warning.
    const lesser = createAlarm(
      () =>
        snapshot({
          seed: 1,
          stages: [stage({ id: "M", maker: "KIBA WORKS", condition: WARN })],
        }),
      () => false,
    );
    expect(lesser.unacked).toBe(WARN);
  });
});

describe("the E-stop", () => {
  it("disables every module in the rack and remembers what it found", () => {
    const rack = [mod({ id: "A", enabled: true }), mod({ id: "B", enabled: false })];
    const estop = createEstop(rack, () => {});
    estop.hit();
    expect(estop.engaged).toBe(true);
    expect(rack.map((m) => m.enabled)).toEqual([false, false]);
    estop.release();
    // Exactly what you had, not everything on: a safety control that quietly
    // rewired your rack would be its own hazard.
    expect(rack.map((m) => m.enabled)).toEqual([true, false]);
  });

  it("is latched, not toggled — hitting it twice is hitting it once", () => {
    const rack = [mod({ id: "A", enabled: true })];
    const estop = createEstop(rack, () => {});
    estop.hit();
    // The second press must not overwrite the memory with the disabled state it
    // has already imposed, or RESUME hands back a dead rack.
    estop.hit();
    estop.release();
    expect(rack[0]?.enabled).toBe(true);
  });

  it("tells the cockpit both times, because the rack moved under it", () => {
    let changed = 0;
    const estop = createEstop([mod()], () => changed++);
    estop.hit();
    estop.release();
    expect(changed).toBe(2);
    // And not for a press that changed nothing.
    estop.release();
    expect(changed).toBe(2);
  });

  it("forgets on a re-rack, because that rack is gone", () => {
    const rack = [mod({ id: "A", enabled: true })];
    const estop = createEstop(rack, () => {});
    estop.hit();
    estop.clear();
    expect(estop.engaged).toBe(false);
    // `clear` does not restore: the world is about to be rebuilt and the fresh
    // rack brings its own enable-states.
    expect(rack[0]?.enabled).toBe(false);
  });
});

describe("a manufacturer's notice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    return () => vi.useRealTimers();
  });

  it("goes up, and takes itself down again", () => {
    const board = createNotices(1000);
    board.notify("KIBA WORKS", "HEAD", "body");
    expect(board.list).toHaveLength(1);
    expect(board.list[0]?.maker).toBe("KIBA WORKS");
    vi.advanceTimersByTime(999);
    expect(board.list).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(board.list).toHaveLength(0);
  });

  it("expires each one on its own clock, oldest first", () => {
    const board = createNotices(1000);
    board.notify("A", "1", "one");
    vi.advanceTimersByTime(600);
    board.notify("B", "2", "two");
    vi.advanceTimersByTime(400);
    expect(board.list.map((n) => n.maker)).toEqual(["B"]);
  });
});

describe("the chassis maker's nag", () => {
  const GLASS = 1000;
  /** Far enough out to count as a look away. */
  const AWAY = GLASS * NAG_AFTER + 1;

  const spy = () => {
    const said: string[] = [];
    let clock = 0;
    const nag = createNag(
      "KIBA WORKS",
      (_m, _h, body) => said.push(body),
      () => clock,
    );
    return { said, nag, tick: (ms: number) => (clock += ms) };
  };

  it("says nothing while you are looking away — only when you come back", () => {
    const { said, nag } = spy();
    nag.look(AWAY, GLASS);
    expect(said).toHaveLength(0);
    nag.look(0, GLASS);
    expect(said).toHaveLength(1);
  });

  it("waits for the view to actually come back, not just to start coming back", () => {
    // The cab recentres itself, so the moment worth speaking into is the one
    // where the operator has just been shown that — not halfway through it.
    const { said, nag } = spy();
    nag.look(AWAY, GLASS);
    nag.look(GLASS * 0.1, GLASS);
    expect(said).toHaveLength(0);
    nag.look(0, GLASS);
    expect(said).toHaveLength(1);
  });

  it("ignores a glance that never went far", () => {
    const { said, nag } = spy();
    nag.look(GLASS * 0.2, GLASS);
    nag.look(0, GLASS);
    expect(said).toHaveLength(0);
  });

  it("then keeps quiet for a while — a reminder you always get is one you learn to ignore", () => {
    const { said, nag, tick } = spy();
    nag.look(AWAY, GLASS);
    nag.look(0, GLASS);
    nag.look(AWAY, GLASS);
    nag.look(0, GLASS);
    expect(said).toHaveLength(1);
    tick(NAG_COOLDOWN_MS);
    nag.look(AWAY, GLASS);
    nag.look(0, GLASS);
    expect(said).toHaveLength(2);
  });

  it("speaks the first time, whatever the wall clock says", () => {
    // `lastNag` starts at −∞ rather than 0: a session a minute old is already
    // past any cooldown measured from zero, and the *first* nag is the one that
    // teaches you the view comes back on its own. It was silent for 45 s once.
    const said: string[] = [];
    const nag = createNag(
      "KIBA WORKS",
      (_m, _h, b) => said.push(b),
      () => 120_000,
    );
    nag.look(AWAY, GLASS);
    nag.look(0, GLASS);
    expect(said).toHaveLength(1);
  });

  it("works through the maker's tips rather than repeating one", () => {
    const { said, nag, tick } = spy();
    for (let i = 0; i < 2; i++) {
      nag.look(AWAY, GLASS);
      nag.look(0, GLASS);
      tick(NAG_COOLDOWN_MS);
    }
    expect(said).toHaveLength(2);
    expect(said[0]).not.toBe(said[1]);
  });
});

describe("the rig's session", () => {
  it("opens on the schedule, with nothing driven", () => {
    const session = createSession();
    expect(session.briefing).toBe(true);
    expect(session.runId).toBe(0);
  });

  it("means begin when it says BEGIN, even for the exercise already loaded", () => {
    const session = createSession();
    session.begin();
    expect(session.briefing).toBe(false);
    expect(session.exercise.id).toBe(FIRST_EXERCISE.id);
    const first = session.runId;
    session.begin(FIRST_EXERCISE);
    expect(session.runId).toBe(first + 1);
  });

  it("opens the folder once when the exercise settles, not every frame", () => {
    const session = createSession();
    session.begin();
    session.settle("running");
    expect(session.report).toBe(false);
    session.settle("success");
    expect(session.report).toBe(true);
    // Closing it must not let the same outcome open it again on the next frame.
    session.closeReport();
    session.settle("success");
    expect(session.report).toBe(false);
  });

  it("re-arms the folder for the next run", () => {
    const session = createSession();
    session.begin();
    session.settle("failed");
    session.reRack();
    expect(session.report).toBe(false);
    session.settle("failed");
    expect(session.report).toBe(true);
  });

  it("goes back to the schedule with what is on the rig selected", () => {
    const session = createSession();
    session.pick("E-03");
    session.begin();
    session.pick("E-01");
    session.schedule();
    expect(session.briefing).toBe(true);
    expect(session.picked).toBe(session.exercise.id);
  });
});

describe("the room's volume", () => {
  const fake = () => {
    const volumes: number[] = [];
    const panels: string[] = [];
    let resumed = 0;
    let disposed = 0;
    const live = {
      audio: {
        setVolume: (v: number) => volumes.push(v),
        panel: (event: string, maker: string) => panels.push(`${event}/${maker}`),
      },
      resume: () => resumed++,
      dispose: () => disposed++,
    } as unknown as LiveAudio;
    return { live, volumes, panels, seen: () => ({ resumed, disposed }) };
  };

  it("says nothing before the context exists, rather than throwing", () => {
    const sound = createSound(() => fake().live);
    expect(sound.voice()).toBeUndefined();
    expect(() => sound.panel("click", "KIBA WORKS")).not.toThrow();
  });

  it("carries a knob turned before the context arrived", () => {
    // Muting during the boot used to be lost: `toggle` reached an `audio` that
    // did not exist yet, and the context opened at full volume regardless.
    const rig = fake();
    const sound = createSound(() => rig.live);
    sound.toggle();
    expect(sound.on).toBe(false);
    sound.open(new EventTarget());
    expect(rig.volumes).toEqual([0]);
  });

  it("passes a panel knock on to the maker whose furniture it is", () => {
    const rig = fake();
    const sound = createSound(() => rig.live);
    const gestures = new EventTarget();
    const close = sound.open(gestures);
    sound.panel("clunk", "TOWA DENKI");
    expect(rig.panels).toContain("clunk/TOWA DENKI");
    // The gesture that a browser makes a page wait for.
    gestures.dispatchEvent(new Event("pointerdown"));
    expect(rig.seen().resumed).toBe(1);
    close();
    gestures.dispatchEvent(new Event("pointerdown"));
    expect(rig.seen().resumed).toBe(1);
    // Closed means silent, not stale: the handle is dropped with the context.
    expect(sound.voice()).toBeUndefined();
    expect(rig.seen().disposed).toBe(1);
  });
});

describe("the pilot", () => {
  it("scales two thumbs to track speed, off the seam and not off a rune", () => {
    const hands = restingHands();
    const pilot = createPilot(hands);
    hands.leverL = 1;
    hands.leverR = -0.5;
    expect(pilot.intent()).toEqual({
      left: MAX_TRACK_SPEED,
      right: -0.5 * MAX_TRACK_SPEED,
    });
  });

  it("is active with a hand on a lever and nominal without, and never warns", () => {
    const hands = restingHands();
    const pilot = createPilot(hands);
    expect(pilot.condition?.()).toBe(NOMINAL);
    hands.leverR = 0.1;
    expect(pilot.condition?.()).toBe(ACTIVE);
  });
});
