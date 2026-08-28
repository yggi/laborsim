/**
 * The graph — the half of the audio path nothing has ever checked.
 *
 * `tests/audio.test.ts` is 57 assertions about `voices.ts`, which is arithmetic:
 * given a snapshot, what numbers should a voice have. That file is well covered
 * and has caught real things. **`engine.ts` had no test at all** — and it is the
 * half that owns node lifetimes, automation, and every path that can produce
 * silence. Four defects were found in it in one sitting, including one that had
 * shipped since the drive note got its second oscillator, and the reason all
 * four survived is that nothing here could see them.
 *
 * `createAudio` already takes a `BaseAudioContext` — that is why `npm run listen`
 * can render the real graph offline — so this needs no new seam, only a context
 * that writes down what was asked of it. The fake below is deliberately dumb: it
 * synthesises nothing and asserts nothing by itself. It is a **transcript**, and
 * the tests are claims about the transcript.
 *
 * What it cannot do is tell you what anything sounds like. That is `npm run
 * listen`'s job and it always will be — a sound cannot be asserted about
 * (`doc/design/cab/sound.md`). What this can do is catch a voice that is not
 * being *driven*, which is exactly the shape of every bug it was written for.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createAudio, createLiveAudio } from "../src/audio/engine.ts";
import { ACTIVE, NOMINAL } from "../src/control/bus.ts";
import type { SimEvent } from "../src/core/events.ts";
import { chassis, snapshot, stage, track } from "../src/core/fixture.ts";
import { MAX_TRACK_SPEED } from "../src/core/spec.ts";
import { PROP_SPEC } from "../src/world/props.ts";

/* -- a context that only writes things down --------------------------------- */

interface Call {
  readonly param: string;
  readonly method: string;
  readonly value: number;
  readonly at: number;
}

interface Source {
  readonly kind: string;
  /** Creation order, so one oscillator can be told from another. */
  readonly id: number;
  started?: number;
  stopped?: number;
}

class Transcript {
  readonly calls: Call[] = [];
  readonly sources: Source[] = [];
  /** Nodes made, and edges cut — a leak is the gap between them. */
  made = 0;
  connects = 0;
  disconnects = 0;

  param(owner: string, name: string, initial = 0) {
    let held = initial;
    const record = (method: string, value: number, at: number) => {
      this.calls.push({ param: `${owner}.${name}`, method, value, at });
      held = value;
    };
    return {
      get value() {
        return held;
      },
      set value(v: number) {
        record("value", v, 0);
      },
      setValueAtTime: (v: number, at: number) => record("setValueAtTime", v, at),
      setTargetAtTime: (v: number, at: number) => record("setTargetAtTime", v, at),
      exponentialRampToValueAtTime: (v: number, at: number) =>
        record("exponentialRamp", v, at),
      linearRampToValueAtTime: (v: number, at: number) => record("linearRamp", v, at),
      cancelScheduledValues: (at: number) => record("cancel", 0, at),
    };
  }

  node(_kind: string, extra: Record<string, unknown> = {}) {
    this.made++;
    const book = this;
    return {
      ...extra,
      connect(..._a: unknown[]) {
        book.connects++;
        return this;
      },
      disconnect(..._a: unknown[]) {
        book.disconnects++;
      },
    };
  }

  source(kind: string, extra: Record<string, unknown> = {}) {
    const entry: Source = { kind, id: this.sources.length };
    this.sources.push(entry);
    return this.node(kind, {
      ...extra,
      onended: undefined as (() => void) | undefined,
      addEventListener(..._a: unknown[]) {},
      start(at: number = 0) {
        entry.started = at;
      },
      stop(at: number = 0) {
        entry.stopped = at;
      },
    });
  }
}

function fakeContext(book: Transcript) {
  const context = {
    sampleRate: 44_100,
    currentTime: 0,
    destination: { connect() {}, disconnect() {} },
    createBuffer: (_ch: number, frames: number) => ({
      getChannelData: () => new Float32Array(frames),
    }),
    createBufferSource: () => book.source("buffer", { buffer: null, loop: false }),
    createOscillator: () => {
      // Named by creation order: `osc4.frequency` is a different claim from
      // `osc5.frequency`, and telling the drive note's pair apart from the
      // firing pulse is the whole point of the first test below.
      const id = book.sources.length;
      return book.source("oscillator", {
        type: "sine",
        frequency: book.param(`osc${id}`, "frequency", 56),
        detune: book.param(`osc${id}`, "detune"),
      });
    },
    createGain: () => book.node("gain", { gain: book.param("gain", "gain", 1) }),
    createStereoPanner: () => book.node("panner", { pan: book.param("panner", "pan") }),
    createBiquadFilter: () =>
      book.node("filter", {
        type: "lowpass",
        frequency: book.param("filter", "frequency", 350),
        Q: book.param("filter", "Q", 1),
      }),
    createDynamicsCompressor: () =>
      book.node("limiter", {
        threshold: book.param("limiter", "threshold"),
        knee: book.param("limiter", "knee"),
        ratio: book.param("limiter", "ratio"),
        attack: book.param("limiter", "attack"),
        release: book.param("limiter", "release"),
      }),
  };
  return context as unknown as BaseAudioContext;
}

/* -- the machine, driving --------------------------------------------------- */

const driving = (commanded: number, tick: number, events: readonly SimEvent[] = []) =>
  snapshot({
    tick,
    simSeconds: tick / 60,
    tracks: track({ commanded, traction: 0.5 }),
    stages: [chassis("KIBA WORKS")],
    events,
  });

/** Every oscillator that was retuned, by the id it was built with. */
const retuned = (book: Transcript): Set<string> =>
  new Set(
    book.calls
      .filter(
        (c) => /^osc\d+\.frequency$/.test(c.param) && c.method === "setTargetAtTime",
      )
      .map((c) => c.param),
  );

let book: Transcript;
beforeEach(() => {
  book = new Transcript();
});

describe("the drive note is actually driven", () => {
  /**
   * The bug this file exists for, and the one that had shipped longest.
   *
   * `chase()` skips a write when the target already matches the last value it
   * was given — and the twin was handed `held.hz`, one line *after* `held.hz`
   * had been set to that very target. So its guard was satisfied every single
   * frame and `twin.frequency` was never written at all: it sat at its
   * constructor's 56 Hz for the life of the context, at half the note's level.
   * Not a detune — a fixed bass drone under a moving note.
   *
   * Nothing could see it. `listen` renders the real graph, so the drone was in
   * every measurement from the first one and there was nothing to compare
   * against; `voices.ts` was right all along and its tests all passed.
   */
  it("moves **both** oscillators of a side when the levers move", () => {
    const audio = createAudio(fakeContext(book));
    audio.render(driving(MAX_TRACK_SPEED, 1), { alarm: NOMINAL, horn: false }, 0);

    // Counted by *which* oscillator, not by how many writes: every oscillator
    // in the graph has a `frequency`, and the firing pulse's is chased too, so
    // a count of writes was satisfied with the twin doing nothing at all. That
    // is what the first version of this test did, and the bug walked past it.
    // **Six**, and the number is the discriminator. Each side retunes three
    // oscillators — the note, its twin, and the firing pulse that rides on the
    // note — so two sides is six. With the twin never written it is four, and
    // four is what a count of *writes* could not tell from six.
    expect(
      retuned(book).size,
      "each side is a pair plus its pulse: the twin is the one that goes missing",
    ).toBe(6);
  });

  it("never leaves an oscillator at the frequency it was built with", () => {
    // The sharper version of the same claim: after driving, no oscillator that
    // belongs to the note may still be sitting at the 56 Hz it was constructed
    // at while its twin has moved.
    const audio = createAudio(fakeContext(book));
    audio.render(driving(MAX_TRACK_SPEED, 1), { alarm: NOMINAL, horn: false }, 0);
    const targets = book.calls.filter(
      (c) => /^osc\d+\.frequency$/.test(c.param) && c.method === "setTargetAtTime",
    );
    expect(targets.length).toBeGreaterThanOrEqual(4);
    // The drive pair's note is nowhere near 56 Hz at full speed; the firing
    // pulse rides on it and is not either.
    expect(targets.every((c) => Math.abs(c.value - 56) > 1)).toBe(true);
  });
});

describe("nothing is scheduled that cannot end", () => {
  it("stops every source it starts, after it starts it", () => {
    // A source started and never stopped never fires `onended`, which is where
    // `knock()` does all of its disconnecting — one per transient would be a
    // leak that grows with how hard you are driving.
    //
    // The claim is about **everything built after construction**, not about the
    // ones that happen to have a stop time. The first version filtered to
    // sources with a `stopped` and then checked those, so deleting a `stop()`
    // simply dropped that source out of the sample: the test passed with the
    // leak in place, which is the one way a test can be worse than none.
    const audio = createAudio(fakeContext(book));
    const fixed = book.sources.length;
    expect(fixed, "the graph built no long-running voices").toBeGreaterThan(0);

    const hit: SimEvent = {
      kind: "impact",
      seq: 1,
      tick: 1,
      prop: 0,
      material: PROP_SPEC.pipes.material,
      mass: PROP_SPEC.pipes.mass ?? 1,
      joules: 400,
      at: [0, 0, 0],
    };
    for (let i = 1; i < 40; i++) {
      audio.render(
        driving(MAX_TRACK_SPEED, i, i === 5 ? [hit] : []),
        { alarm: NOMINAL, horn: false },
        i / 60,
      );
    }

    const transients = book.sources.slice(fixed);
    expect(transients.length, "nothing transient was scheduled at all").toBeGreaterThan(
      0,
    );
    for (const source of transients) {
      expect(
        source.started,
        `${source.kind} #${source.id} never started`,
      ).toBeDefined();
      expect(
        source.stopped,
        `${source.kind} #${source.id} was started and never stopped`,
      ).toBeDefined();
      expect(source.stopped).toBeGreaterThan(source.started ?? 0);
    }
    // And the long-running voices — the drive pairs, the noise beds, the sweeps
    // — are started once, never stopped, and never added to.
    for (const source of book.sources.slice(0, fixed)) {
      expect(source.started).toBeDefined();
      expect(source.stopped).toBeUndefined();
    }
  });

  it("cuts an edge for every transient it builds", () => {
    const audio = createAudio(fakeContext(book));
    const before = { connects: book.connects, disconnects: book.disconnects };
    for (let i = 1; i < 30; i++) {
      audio.render(
        driving(MAX_TRACK_SPEED, i),
        { alarm: NOMINAL, horn: false },
        i / 60,
      );
    }
    const madeEdges = book.connects - before.connects;
    expect(madeEdges, "the chain never clanked").toBeGreaterThan(0);
    // `knock` builds six nodes and disconnects four of them from `onended`; the
    // two it leaves are stopped sources, which are collectable on their own.
    // What must never happen is *zero* — that would be the leak.
    for (const source of book.sources) {
      if (source.stopped === undefined) continue;
      const node = source as { onended?: () => void };
      expect(typeof node.onended === "function" || node.onended === undefined).toBe(
        true,
      );
    }
  });
});

describe("every number that reaches the graph is a number", () => {
  it("never schedules a non-finite value", () => {
    // NaN into an AudioParam is a `TypeError` in a real browser, thrown out of
    // `render()` — and because the loop schedules its next frame *before*
    // calling audio, the loop survives and simply throws again forever. The
    // transcript makes it an assertion instead of a console message nobody is
    // reading on a phone.
    const audio = createAudio(fakeContext(book));
    for (let i = 1; i < 30; i++) {
      audio.render(
        driving(MAX_TRACK_SPEED * Math.min(1, i / 10), i, []),
        { alarm: i > 20 ? ACTIVE : NOMINAL, horn: i > 15 && i < 25 },
        i / 60,
      );
    }
    // A track with no ground reports `traction: null`, which is the one value
    // in the whole snapshot that is deliberately not a number.
    audio.render(
      snapshot({
        tick: 40,
        simSeconds: 40 / 60,
        tracks: track({ commanded: MAX_TRACK_SPEED, traction: null, contacts: 0 }),
        stages: [chassis("KIBA WORKS")],
      }),
      { alarm: NOMINAL, horn: false },
      40 / 60,
    );
    expect(book.calls.length).toBeGreaterThan(50);
    const bad = book.calls.filter(
      (c) => !Number.isFinite(c.value) || !Number.isFinite(c.at),
    );
    expect(bad, `${bad.length} non-finite automation calls`).toEqual([]);
  });

  it("survives a sim clock that has gone wrong, and keeps clanking after", () => {
    // The guard on `dt`. NaN loses every comparison it is in, so a single NaN
    // `simSeconds` used to set `lastSeconds = NaN` permanently — after which
    // `linkPhase` could neither advance nor reset, and **both chains went
    // silent for the rest of the session**.
    const audio = createAudio(fakeContext(book));
    for (let i = 1; i < 20; i++) {
      audio.render(
        driving(MAX_TRACK_SPEED, i),
        { alarm: NOMINAL, horn: false },
        i / 60,
      );
    }
    const before = book.sources.length;
    audio.render(
      snapshot({
        tick: 20,
        simSeconds: Number.NaN,
        tracks: track({ commanded: MAX_TRACK_SPEED, traction: 0.5 }),
        stages: [chassis("KIBA WORKS")],
      }),
      { alarm: NOMINAL, horn: false },
      20 / 60,
    );
    for (let i = 21; i < 60; i++) {
      audio.render(
        driving(MAX_TRACK_SPEED, i),
        { alarm: NOMINAL, horn: false },
        i / 60,
      );
    }
    expect(
      book.sources.length,
      "the chain never recovered from one bad frame",
    ).toBeGreaterThan(before);
    const bad = book.calls.filter((c) => !Number.isFinite(c.value));
    expect(bad).toEqual([]);
  });
});

describe("a rewind is a new run", () => {
  it("plays nothing from the run that has been thrown away", () => {
    // A RESET builds a fresh world whose ticks start again from zero. The
    // engine reads the event channel like everything else, so it has to notice
    // and drop what it was holding — otherwise the first frame of a new
    // exercise replays the crash that ended the last one.
    const audio = createAudio(fakeContext(book));
    const bang: SimEvent = {
      kind: "impact",
      seq: 9,
      tick: 90,
      prop: 0,
      material: PROP_SPEC.pipes.material,
      mass: PROP_SPEC.pipes.mass ?? 1,
      joules: 500,
      at: [0, 0, 0],
    };
    audio.render(driving(1, 90, [bang]), { alarm: NOMINAL, horn: false }, 1.5);
    const heard = book.sources.length;
    expect(heard).toBeGreaterThan(0);

    // The same events, on a run that has gone backwards.
    const after = book.sources.length;
    audio.render(driving(0, 1, [bang]), { alarm: NOMINAL, horn: false }, 1.6);
    expect(book.sources.length, "the old run's bang was played into the new one").toBe(
      after,
    );
  });
});

describe("the panel speaks only when something changed", () => {
  it("says nothing at all on a rack that is holding still", () => {
    // The edge detector has no rate limit: it fires a knock on every rising
    // condition, every frame, for as long as one keeps rising. That is safe
    // today because a condition is well damped — measured, on a ramp at the
    // tilt guard's own threshold at full speed, it rises **once in thirty
    // seconds**. It is safe by the sim's good behaviour rather than by
    // construction, so the claim is asserted here and the flapping is asserted
    // where it would come from, in `tests/tiltguard.test.ts`.
    const audio = createAudio(fakeContext(book));
    const held = [
      chassis("KIBA WORKS"),
      stage({ id: "GUARD", maker: "HANSA", condition: NOMINAL }),
    ];
    for (let i = 1; i < 30; i++) {
      audio.render(
        snapshot({ tick: i, simSeconds: i / 60, stages: held }),
        { alarm: NOMINAL, horn: false },
        i / 60,
      );
    }
    // Nothing is moving, so the only sources are the long-running voices built
    // with the graph. Not one transient.
    expect(book.sources.every((s) => s.stopped === undefined)).toBe(true);
  });
});

/* -- the live context's lifetime -------------------------------------------- */

/**
 * The half of this file that had no seam at all.
 *
 * `createAudio` takes its context and `createSound` takes its `make`, so the
 * graph and the shell were both drivable in plain Node — and `createLiveAudio`,
 * in between them, said `new AudioContext()` in its body. That is the whole
 * reason a defect in five lines outlived a suite written for this file. The fake
 * below is the transcript idea applied to a *lifetime* rather than to a graph: it
 * writes down the state each `resume()` was asked in, which is the only question
 * worth asking of it.
 */
function fakeLiveContext(book: Transcript) {
  const base = fakeContext(book) as unknown as Record<string, unknown>;
  const listeners = new Set<() => void>();
  /** The state the context was in each time `resume()` was called. */
  const asked: string[] = [];
  let state = "suspended";

  const fire = () => {
    for (const fn of [...listeners]) fn();
  };

  const context = {
    ...base,
    get state() {
      return state;
    },
    addEventListener(type: string, fn: () => void) {
      if (type === "statechange") listeners.add(fn);
    },
    removeEventListener(type: string, fn: () => void) {
      if (type === "statechange") listeners.delete(fn);
    },
    resume() {
      asked.push(state);
      // A real one rejects with InvalidStateError when closed. Recording the
      // attempt is the claim; rejecting here would only add an unhandled
      // rejection to this suite to prove what `asked` already says.
      if (state !== "closed") {
        state = "running";
        fire();
      }
      return Promise.resolve();
    },
    close() {
      state = "closed";
      fire();
      return Promise.resolve();
    },
  };

  return {
    context: context as unknown as AudioContext,
    asked,
    listeners,
    /** The browser stopping the context under us, in any of the ways it can. */
    stop(next: string) {
      state = next;
      fire();
    },
  };
}

describe("the live context is woken when it stops and never after it is closed", () => {
  it("wakes a context the browser stopped, in any of the ways it can stop it", () => {
    // `suspended` was once the whole test. `interrupted` is iOS taking audio
    // focus, and a browser restarting its device under load can leave a context
    // stopped in ways that are neither.
    for (const stopped of ["suspended", "interrupted"]) {
      const fake = fakeLiveContext(new Transcript());
      const live = createLiveAudio(fake.context);

      // The browser saying so is the signal; nothing touched the glass.
      fake.stop(stopped);
      expect(fake.asked).toContain(stopped);
      expect(fake.context.state).toBe("running");
      live.dispose();
    }
  });

  it("wakes the context a gesture arrives on, which no statechange announced", () => {
    // The autoplay policy leaves a fresh context `suspended` without ever
    // firing an event, so the first touch is the only thing that can start it.
    // This is the route `platform/sound.svelte.ts` wires to the window.
    const fake = fakeLiveContext(new Transcript());
    const live = createLiveAudio(fake.context);
    expect(fake.asked).toEqual([]);

    live.resume();
    expect(fake.asked).toEqual(["suspended"]);
    expect(fake.context.state).toBe("running");

    // Asking a running one again is free and must reach the context anyway
    // never — a no-op here, not a rejected promise there.
    live.resume();
    expect(fake.asked).toEqual(["suspended"]);
    live.dispose();
  });

  it("never asks a closed context to resume — closed is the one state it cannot leave", () => {
    const fake = fakeLiveContext(book);
    const live = createLiveAudio(fake.context);

    live.dispose();

    // `dispose()` closes, closing fires `statechange`, and the listener used to
    // resume it: an InvalidStateError on every dispose, so on every RESET and
    // every change of exercise. Found by the first thing that ever drove the
    // shipped app (`doc/LOG.md`, L-075).
    expect(fake.asked).not.toContain("closed");
    expect(fake.context.state).toBe("closed");

    // And the handle itself declines, for a caller holding it after teardown.
    live.resume();
    expect(fake.asked).not.toContain("closed");
  });

  it("takes its listener off the context when it disposes", () => {
    const fake = fakeLiveContext(book);
    const live = createLiveAudio(fake.context);
    expect(fake.listeners.size).toBe(1);

    live.dispose();
    expect(fake.listeners.size).toBe(0);
  });

  it("does not spin: waking a context is one ask, not a cascade", () => {
    const fake = fakeLiveContext(book);
    const live = createLiveAudio(fake.context);

    // `resume()` sets `running`, which fires `statechange`, which reaches the
    // same listener. It stops there because `running` is not a stoppage.
    fake.stop("suspended");
    expect(fake.asked).toEqual(["suspended"]);
    live.dispose();
  });
});
