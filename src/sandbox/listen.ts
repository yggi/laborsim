/**
 * The listening bench — `npm run listen`, and a page you can click.
 *
 * `META.md`: *screenshots catch what CI cannot — so make looking cheap first.*
 * Sound is the same lesson with the volume turned up, because a sound is not
 * merely hard to assert about, it is **impossible**: no test can tell you a
 * machine sounds like a machine. What a test *can* do is measure, and what a
 * person can do is press play. This page is both.
 *
 * It renders each scene through the **real graph** — `createAudio` on an
 * `OfflineAudioContext` instead of a live one — so what you hear here is what
 * the cab plays, not a simplified copy that drifts from it. That is the whole
 * reason `engine.ts` takes a context rather than making one.
 *
 * Deliberately plain DOM. It is a bench with buttons on it, not a cockpit, and
 * a Svelte component here would be a third entry point's worth of machinery for
 * ten `<button>`s.
 */

import { createAudio } from "../audio/engine.ts";
import { SCENES, type Scene } from "./scenes.ts";

/** CD rate. High enough that the grind's top end is not an artefact of it. */
const SAMPLE_RATE = 44_100;
/** The bench drives the graph at the rate the cab does. */
const FRAME_SECONDS = 1 / 60;
/** Rendered past the scene's end, so the last transient rings out. */
const TAIL_SECONDS = 1.2;

export interface Rendered {
  readonly name: string;
  readonly note: string;
  /** 16-bit stereo PCM in a WAV container, base64 — the shape a script wants. */
  readonly wav: string;
  /** What the render measured, so a claim about it can be checked. */
  readonly peak: number;
  readonly rms: number;
  /**
   * Loudness and brightness at the **start** and at the **end** of the scene.
   *
   * A single number over a whole scene answers almost nothing, because what a
   * voice does is mostly what it does *while something changes*. These two
   * pairs are what make a scene falsifiable: `labouring` has to get brighter
   * between them at constant track speed, and `alarm-then-acknowledged` has to
   * get quieter.
   */
  readonly opens: Segment;
  readonly closes: Segment;
  /**
   * When the two channels differ most, and by how much — **the sides**.
   *
   * The bench measured channel 0 and nothing else for its whole life, which
   * made it blind to the thing half these voices exist for: the tracks are
   * panned to the sides they are on, and *which side* is a real cue on a
   * machine you steer with two independent levers. A mono measurement cannot
   * fail the claim "the knock is on the side that took the rut", and a check
   * that cannot fail is not a check (`META.md`).
   *
   * It is a **difference** and not each channel's own peak, which was the
   * first attempt and was useless: the loudest instant in a mix is loud on
   * both channels, so both peaked at the same moment and the answer was always
   * "yes, and also yes". What says a knock was on the left is that the left
   * channel was *louder than the right* at that instant, so this reports the
   * widest gap each way, over 12 ms windows so a waveform's own zero crossings
   * do not decide it.
   */
  readonly sides: { readonly left: Moment; readonly right: Moment };
}

/** How far one channel led the other, and the second it happened in. */
export interface Moment {
  /** Difference in short-window RMS. Zero means the mix was centred. */
  readonly by: number;
  readonly at: number;
}

export interface Segment {
  readonly rms: number;
  /**
   * Fraction of the energy above 800 Hz, 0–1 — the stand-in for "brighter".
   *
   * Not a spectral centroid, and not for want of trying: a centroid wants a
   * transform, and the cheap proxy for one (zero-crossing rate) is *blind to
   * the thing being measured here*. A lowpassed sawtooth crosses zero twice a
   * cycle whether the filter is at 340 Hz or 2600 Hz, so the first version of
   * this bench reported a labouring machine as 6 Hz brighter than a coasting
   * one and would have signed off on a voice that did nothing at all.
   *
   * What the claim actually is — "the load opens the filter" — is a question
   * about how much energy sits above the fundamental, and that is what this
   * measures, with a one-pole highpass and no transform anywhere.
   */
  readonly bright: number;
}

/**
 * Play one scene into an offline context and hand back the samples.
 *
 * The frame loop is the cab's, stepped by hand: `render(snapshot, alarm, at)`
 * with an explicit time, because an offline context's clock does not move until
 * `startRendering` and every automation event has to be scheduled in advance.
 */
export async function renderScene(scene: Scene): Promise<AudioBuffer> {
  const seconds = scene.seconds + TAIL_SECONDS;
  const context = new OfflineAudioContext(
    2,
    Math.ceil(seconds * SAMPLE_RATE),
    SAMPLE_RATE,
  );
  const audio = createAudio(context);

  for (let t = 0; t < scene.seconds; t += FRAME_SECONDS) {
    const { snapshot, alarm, horn } = scene.frame(t);
    audio.render(snapshot, { alarm, horn: horn === true }, t);
  }
  return context.startRendering();
}

/* -- measuring -------------------------------------------------------------- */

/**
 * Above this is "the top end", Hz.
 *
 * 1500 rather than something nearer the fundamental, and the reason is the
 * shape of the thing being measured. A sawtooth's power falls as 1/n², so even
 * with the filter wide open only about a quarter of the drive note's energy is
 * above 800 Hz — which put both ends of the `labouring` sweep on the same side
 * of the line and reported a dramatic filter sweep as five percentage points.
 * The crossover has to sit *above* where the filter sweeps to be a measure of
 * whether it swept.
 */
const BRIGHT_HZ = 1500;

const rmsOf = (samples: Float32Array, from: number, to: number): number => {
  let sum = 0;
  for (let i = from; i < to; i++) {
    const v = samples[i] ?? 0;
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, to - from));
};

/**
 * A one-pole highpass, run over the samples by hand.
 *
 * `y[n] = a·(y[n-1] + x[n] − x[n-1])`, the textbook single-pole form. 6 dB per
 * octave is a gentle slope and that is fine: this is a comparison between two
 * renders of the same voice, not a measurement anyone quotes.
 */
function highpass(
  samples: Float32Array,
  from: number,
  to: number,
  hz: number,
  rate: number,
) {
  const rc = 1 / (2 * Math.PI * hz);
  const dt = 1 / rate;
  const a = rc / (rc + dt);
  const out = new Float32Array(Math.max(0, to - from));
  let previousIn = samples[from] ?? 0;
  let previousOut = 0;
  for (let i = from; i < to; i++) {
    const value = samples[i] ?? 0;
    previousOut = a * (previousOut + value - previousIn);
    previousIn = value;
    out[i - from] = previousOut;
  }
  return out;
}

function segment(
  samples: Float32Array,
  from: number,
  to: number,
  rate: number,
): Segment {
  const rms = rmsOf(samples, from, to);
  const top = highpass(samples, from, to, BRIGHT_HZ, rate);
  const topRms = rmsOf(top, 0, top.length);
  return { rms, bright: rms > 1e-6 ? topRms / rms : 0 };
}

/**
 * The widest gap each way between the two channels, in short-window RMS.
 *
 * 12 ms of window: long enough that the measurement is a loudness rather than
 * a sample, short enough to sit inside a knock — the bogies rise in 8 ms and
 * ring out in 60.
 */
const SIDES_WINDOW = 0.012;

function sidesOf(buffer: AudioBuffer): { left: Moment; right: Moment } {
  const rate = buffer.sampleRate;
  const l = buffer.getChannelData(0);
  const r = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : l;
  const hop = Math.max(1, Math.round(rate * SIDES_WINDOW));
  let left: Moment = { by: 0, at: 0 };
  let right: Moment = { by: 0, at: 0 };
  for (let from = 0; from + hop <= l.length; from += hop) {
    const gap = rmsOf(l, from, from + hop) - rmsOf(r, from, from + hop);
    const at = from / rate;
    if (gap > left.by) left = { by: gap, at };
    if (-gap > right.by) right = { by: -gap, at };
  }
  return { left, right };
}

function measure(buffer: AudioBuffer) {
  const channel = buffer.getChannelData(0);
  const rate = buffer.sampleRate;
  const sides = sidesOf(buffer);
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i] ?? 0);
      if (a > peak) peak = a;
    }
  }
  // A fifth at each end, and never the very first frames — the voices glide in
  // from silence and a scene's opening 50 ms is the glide, not the state.
  const fifth = Math.floor(channel.length / 5);
  const settle = Math.floor(rate * 0.4);
  return {
    peak,
    rms: rmsOf(channel, 0, channel.length),
    opens: segment(channel, settle, settle + fifth, rate),
    closes: segment(channel, channel.length - 2 * fifth, channel.length - fifth, rate),
    sides,
  };
}

/* -- a WAV, because a file is a thing a person can play ---------------------- */

function encodeWav(buffer: AudioBuffer): Uint8Array {
  const channels = Math.min(2, buffer.numberOfChannels);
  const frames = buffer.length;
  const bytes = new Uint8Array(44 + frames * channels * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + frames * channels * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, frames * channels * 2, true);

  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = data[c]?.[i] ?? 0;
      const clamped = sample < -1 ? -1 : sample > 1 ? 1 : sample;
      view.setInt16(offset, Math.round(clamped * 32767), true);
      offset += 2;
    }
  }
  return bytes;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** What `scripts/listen.mjs` calls. One scene, rendered and measured. */
async function renderNamed(name: string): Promise<Rendered | null> {
  const scene = SCENES.find((s) => s.name === name);
  if (!scene) return null;
  const buffer = await renderScene(scene);
  return {
    name: scene.name,
    note: scene.note,
    wav: toBase64(encodeWav(buffer)),
    ...measure(buffer),
  };
}

declare global {
  interface Window {
    renderNamed(name: string): Promise<Rendered | null>;
    sceneNames(): string[];
  }
}

window.renderNamed = renderNamed;
window.sceneNames = () => SCENES.map((s) => s.name);

/* -- the page --------------------------------------------------------------- */

const root = document.querySelector("#listen");
if (root) {
  const list = document.createElement("div");
  list.className = "scenes";
  for (const scene of SCENES) {
    const row = document.createElement("div");
    row.className = "scene";

    const play = document.createElement("button");
    play.textContent = "▶";
    play.setAttribute("aria-label", `play ${scene.name}`);

    const label = document.createElement("div");
    label.className = "label";
    label.innerHTML = `<b>${scene.name}</b><span>${scene.note}</span>`;

    const audioEl = document.createElement("audio");
    audioEl.controls = true;
    audioEl.preload = "none";

    play.onclick = async () => {
      play.disabled = true;
      play.textContent = "…";
      const buffer = await renderScene(scene);
      const blob = new Blob([encodeWav(buffer) as BlobPart], { type: "audio/wav" });
      audioEl.src = URL.createObjectURL(blob);
      void audioEl.play();
      play.textContent = "▶";
      play.disabled = false;
    };

    row.append(play, label, audioEl);
    list.append(row);
  }
  root.append(list);
}
