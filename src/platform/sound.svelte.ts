/**
 * The machine's voice, and the room's volume knob.
 *
 * It is `platform/` for the same reason the loop is: almost everything here is
 * where the application meets the browser. An `AudioContext` is an expensive,
 * limited resource with a lifetime of its own, and a browser will not let a page
 * make noise before the player has touched it — so the context starts suspended
 * and the first gesture anywhere wakes it. That is not a workaround to be
 * embarrassed about: a rig that started talking before you had touched anything
 * would be the rig being rude.
 *
 * It deliberately **outlives a run**. Re-racking the exercise is no reason to
 * throw a context away, and it costs nothing to keep because the engine reads
 * the event channel like everything else — a rewind is a new run to it, and
 * nothing from the old one is played.
 *
 * The volume is **the rig's, not the machine's**. A Labor's horn has no cut-out
 * — that is what a horn is for — so this is not a dash control and does not live
 * on the panel; it is the training system's own knob, and it sits with the
 * camera, which is the other control that belongs to the room rather than to the
 * machine (`doc/design/rig/training-frame.md`).
 */

import { type Audio, createLiveAudio } from "../audio/engine.ts";
import type { PanelEvent } from "../audio/voices.ts";

/** What `createLiveAudio` hands back — named so a test can hand back a fake. */
export interface LiveAudio {
  readonly audio: Audio;
  resume(): void;
  dispose(): void;
}

export interface Sound {
  /** Whether the room is unmuted. Bound to the rig's own control. */
  readonly on: boolean;
  toggle(): void;
  /**
   * The machine's voice, asked for once a frame by the loop.
   *
   * A getter rather than a value: for the first moments of a session there is
   * honestly nothing here, and a run must be able to start anyway.
   */
  voice(): Audio | undefined;
  /**
   * Put the knob's position on the machine.
   *
   * Separate from `open()` on purpose, and it is the whole of a defect that had
   * been sitting behind the mute button. `open()` used to apply the volume
   * itself — reasonably: a player who muted before the context existed must not
   * be shouted at when it arrives (L-072). But `open()` is called from an
   * `$effect`, and **a read is a subscription**: reading `on` in there made the
   * mute knob a dependency of the thing that owns the `AudioContext`, so every
   * press of SND tore the context down, closed it, rebuilt the whole graph and
   * re-rendered the noise buffer — and attached the gesture listeners that wake
   * a suspended context *after* the gesture that caused all of it.
   *
   * That is the same lesson the run effect has a test for, one file over
   * (`tests/architecture.test.ts`, "a run is made of the exercise and the reset").
   * The fix is not `untrack`: it is that applying the volume is a different job
   * from owning a context, and it wants its own one-line effect.
   */
  level(): void;
  /**
   * The cab's own switchgear, for the few controls the machine does not record.
   *
   * Almost every switch is already audible without anyone asking: flipping a
   * component off changes its slot on the snapshot and the engine hears that by
   * itself, which is why a replay clicks in all the right places. What is left
   * is furniture — the cabinet latch, the acknowledgement, an instrument
   * clamping home — and it is voiced by the maker whose furniture it is.
   *
   * The camera and the volume are deliberately **silent**: they belong to the
   * training rig, and the rig does not reach into the cab and make noises.
   */
  panel(event: PanelEvent, maker: string): void;
  /**
   * Open the context and listen for the gesture that wakes it. Returns teardown.
   *
   * `gestures` is where that first touch arrives — the window, in a cab. It is a
   * parameter so this file can be driven from a test in plain Node, which is the
   * environment the suite runs in on purpose (`vite.config.ts`).
   */
  open(gestures?: EventTarget): () => void;
}

export function createSound(make: () => LiveAudio = createLiveAudio): Sound {
  let on = $state(true);
  let live: LiveAudio | undefined;

  return {
    get on() {
      return on;
    },
    toggle() {
      on = !on;
    },
    level() {
      live?.audio.setVolume(on ? 1 : 0);
    },
    voice: () => live?.audio,
    panel(event, maker) {
      live?.audio.panel(event, maker);
    },
    open(gestures: EventTarget = window) {
      const opened = make();
      live = opened;
      const wake = () => opened.resume();
      gestures.addEventListener("pointerdown", wake);
      gestures.addEventListener("keydown", wake);
      // Coming back to the tab is not a gesture and used to wake nothing. It is
      // the most ordinary way on a phone for a context to have been stopped
      // while you were not looking.
      gestures.addEventListener("visibilitychange", wake);
      return () => {
        gestures.removeEventListener("pointerdown", wake);
        gestures.removeEventListener("keydown", wake);
        gestures.removeEventListener("visibilitychange", wake);
        live = undefined;
        opened.dispose();
      };
    },
  };
}
