/**
 * The graph — the only file that knows an oscillator exists.
 *
 * Everything it plays comes from `voices.ts`, which is arithmetic over a
 * snapshot and nothing else. The split is load-bearing twice over: the mapping
 * is testable in plain Node, and this file can be driven by an
 * `OfflineAudioContext` exactly as it is driven by a live one — which is what
 * makes `npm run listen` a rendering of the real graph rather than of a
 * simplified copy of it.
 *
 * **Audio is a renderer, not a reader.** It sits with `src/render/` on the far
 * side of the snapshot boundary and takes the same 60 Hz value the scene does,
 * rather than the 10 Hz one the instruments read. Two reasons: an impact heard
 * up to 100 ms after it landed is heard as a *separate event* from the one you
 * watched, and a voice is an interpolation of a state, which is exactly what
 * rule 3 says a renderer is for. It follows that **a replay sounds identical to
 * the run it recorded**, down to the grit — the noise is drawn from the seeded
 * generator in `core/rng.ts`, never from `Math.random`.
 *
 * Architecture rule 3: snapshot in, nothing out. Nothing here can reach the sim.
 */

import type { Condition } from "../control/bus.ts";
import { createEventReader } from "../core/events.ts";
import { makeRng } from "../core/rng.ts";
import type { Snapshot, TrackState } from "../core/snapshot.ts";
import {
  driveVoice,
  grindVoice,
  hornVoice,
  hullVoice,
  impactVoice,
  isSilent,
  type Knock,
} from "./voices.ts";

/**
 * How quickly a continuous voice chases its target, seconds.
 *
 * Short enough that the note follows the levers, long enough that a value
 * arriving every 16 ms does not turn each one into a step. It is also what
 * keeps the sound honest across a dropped frame: the voice glides through the
 * gap instead of jumping when the next value lands.
 */
const GLIDE = 0.05;

/** Seconds of noise in the shared buffer, looped. Long enough not to buzz. */
const NOISE_SECONDS = 2;

/**
 * The seed the grit is drawn from.
 *
 * Fixed rather than the world's, deliberately: the noise is the *machine's*
 * texture, not the site's, and every exercise should sound like the same
 * machine. What matters for replay is only that it is drawn from `core/rng.ts`
 * at all — `Math.random` here would make two playbacks of one recording into
 * two different recordings, which is the thing rule 2 exists to prevent.
 */
const GRIT_SEED = 0x1ab04;

/** Where a voice sits in the field. The tracks are on the sides they are on. */
const LEFT_PAN = -0.55;
const RIGHT_PAN = 0.55;

export interface Audio {
  /**
   * Play one frame.
   *
   * `unacknowledged` is the master condition the pilot has *not* pressed. The
   * horn is the audible half of that lamp, so acknowledging silences the noise
   * and leaves the light on, exactly as an annunciator panel does.
   *
   * `at` is the context time to schedule against. It defaults to now, which is
   * right for a live context and wrong for an offline one, where nothing has
   * happened yet and the whole timeline is laid out in advance.
   */
  render(snapshot: Snapshot | undefined, unacknowledged: Condition, at?: number): void;
  /** 0–1, straight onto the master. */
  setVolume(volume: number): void;
  readonly volume: number;
  dispose(): void;
}

function whiteNoise(context: BaseAudioContext): AudioBuffer {
  const frames = Math.floor(context.sampleRate * NOISE_SECONDS);
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = makeRng(GRIT_SEED);
  for (let i = 0; i < frames; i++) data[i] = rng.range(-1, 1);
  return buffer;
}

/**
 * One track's pair of voices — the drivetrain, and what it is sliding on — with
 * the last value written to each parameter.
 *
 * The held values are not a cache for speed. `render` runs 60 times a second
 * against five parameters a side, and an automation event written on every one
 * of them is 600 events a second that mostly say the same thing as the last.
 */
interface Side {
  update(track: TrackState | undefined, at: number): void;
  stop(): void;
}

function createSide(
  context: BaseAudioContext,
  master: AudioNode,
  noiseBuffer: AudioBuffer,
  pan: number,
): Side {
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(master);

  const driveGain = context.createGain();
  driveGain.gain.value = 0;
  driveGain.connect(panner);

  const driveFilter = context.createBiquadFilter();
  driveFilter.type = "lowpass";
  driveFilter.frequency.value = 340;
  // Just enough resonance at the cutoff to give the note an edge as it opens.
  driveFilter.Q.value = 3;
  driveFilter.connect(driveGain);

  const drive = context.createOscillator();
  drive.type = "sawtooth";
  drive.frequency.value = 56;
  drive.connect(driveFilter);
  drive.start();

  const grindGain = context.createGain();
  grindGain.gain.value = 0;
  grindGain.connect(panner);

  const grindFilter = context.createBiquadFilter();
  grindFilter.type = "bandpass";
  grindFilter.frequency.value = 600;
  grindFilter.Q.value = 0.7;
  grindFilter.connect(grindGain);

  const noise = context.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  noise.connect(grindFilter);
  noise.start();

  const held = { hz: 56, gain: 0, cutoff: 340, grind: 0, grindCut: 600 };

  const chase = (param: AudioParam, target: number, at: number, last: number) => {
    if (Math.abs(target - last) < 1e-4) return last;
    param.setTargetAtTime(target, at, GLIDE);
    return target;
  };

  return {
    update(track, at) {
      // No run, no machine: everything falls to silence rather than freezing on
      // its last value. A cockpit between exercises is a quiet one.
      if (!track) {
        held.gain = chase(driveGain.gain, 0, at, held.gain);
        held.grind = chase(grindGain.gain, 0, at, held.grind);
        return;
      }
      const voice = driveVoice(track);
      const grind = grindVoice(track);
      held.hz = chase(drive.frequency, voice.hz, at, held.hz);
      held.gain = chase(driveGain.gain, voice.gain, at, held.gain);
      held.cutoff = chase(driveFilter.frequency, voice.cutoff, at, held.cutoff);
      held.grind = chase(grindGain.gain, grind.gain, at, held.grind);
      held.grindCut = chase(grindFilter.frequency, grind.cutoff, at, held.grindCut);
    },
    stop() {
      drive.stop();
      noise.stop();
    },
  };
}

/**
 * Build the machine's voice on a context.
 *
 * Takes the context rather than making one, so the same graph can be rendered
 * offline. `createLiveAudio` is the browser's convenience over it, and the only
 * thing in the audio path that knows a `window` exists.
 */
export function createAudio(context: BaseAudioContext, output?: AudioNode): Audio {
  const destination = output ?? context.destination;
  const noiseBuffer = whiteNoise(context);

  /**
   * A limiter on the master, not for loudness but for arithmetic: several
   * transients can land on one frame — driving through a line of cones does
   * exactly that — and summed peaks clip. Every voice below is written as
   * though it were the only one playing, which is only safe with this here.
   */
  const limiter = context.createDynamicsCompressor();
  // Set to catch genuine peaks and nothing else. At -10 dB it was catching the
  // *drive note*, which meant the machine's own idle was using up the headroom
  // an impact needed and every bang came out the same size as every other bang.
  limiter.threshold.value = -4;
  limiter.knee.value = 6;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  limiter.connect(destination);

  const master = context.createGain();
  master.gain.value = 1;
  master.connect(limiter);

  const left = createSide(context, master, noiseBuffer, LEFT_PAN);
  const right = createSide(context, master, noiseBuffer, RIGHT_PAN);

  /* -- the horn ----------------------------------------------------------- */
  /**
   * Pulsed by a square LFO into the gain rather than by scheduling each beep:
   * the rate is then a continuous parameter like any other, and changing it
   * mid-condition cannot leave half a pulse behind.
   *
   * The LFO swings ±1, so the depth is half the peak gain and the base sits at
   * the same value — the sum then travels between silence and full rather than
   * between a negative gain and a positive one.
   *
   * The phase is not locked to the lamp's CSS blink. Same rate, whatever phase
   * each of them started at, which is what a horn and a lamp on one relay
   * actually do once you have watched the panel for a few seconds.
   */
  const hornGain = context.createGain();
  hornGain.gain.value = 0;
  hornGain.connect(master);

  const horn = context.createOscillator();
  horn.type = "square";
  horn.frequency.value = 990;
  horn.connect(hornGain);
  horn.start();

  const hornPulse = context.createOscillator();
  hornPulse.type = "square";
  hornPulse.frequency.value = 1;
  const hornDepth = context.createGain();
  hornDepth.gain.value = 0;
  hornPulse.connect(hornDepth);
  hornDepth.connect(hornGain.gain);
  hornPulse.start();

  /* -- transients --------------------------------------------------------- */

  /**
   * One thing being struck: a body ringing, and the noise of the strike itself.
   *
   * Both halves decay from the same instant and the mix between them is the
   * material's `grit` — a cone is nearly all strike, a pipe stack nearly all
   * ring. The pitch falls through the decay, because a struck body's does.
   */
  function knock(voice: Knock, at: number, pan: number) {
    if (voice.gain <= 0.001) return;
    const start = Math.max(at, context.currentTime);
    const end = start + voice.decay;

    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(master);

    const body = context.createGain();
    body.gain.setValueAtTime(Math.max(0.0002, voice.gain * (1 - voice.grit)), start);
    body.gain.exponentialRampToValueAtTime(0.0001, end);
    body.connect(panner);

    const tone = context.createOscillator();
    tone.type = "triangle";
    tone.frequency.setValueAtTime(voice.hz, start);
    tone.frequency.exponentialRampToValueAtTime(voice.hz * 0.6, end);
    tone.connect(body);
    tone.start(start);
    tone.stop(end);

    const strike = context.createGain();
    strike.gain.setValueAtTime(Math.max(0.0002, voice.gain * voice.grit), start);
    // The strike is always shorter than the ring: it is the moment of contact,
    // not the body's response to it.
    strike.gain.exponentialRampToValueAtTime(0.0001, start + voice.decay * 0.35);
    strike.connect(panner);

    // Lowpass rather than bandpass. A bandpass throws away almost all of white
    // noise's energy, so the strike arrived at a fraction of the level it was
    // set to and a 140 kJ landing measured quieter than driving into a cone. A
    // strike is broadband anyway — everything up to a ceiling, not a band.
    const band = context.createBiquadFilter();
    band.type = "lowpass";
    band.frequency.value = voice.strikeHz;
    band.Q.value = 0.7;
    band.connect(strike);

    const grit = context.createBufferSource();
    grit.buffer = noiseBuffer;
    grit.loop = true;
    grit.connect(band);
    grit.start(start);
    grit.stop(end);

    // Nothing holds a reference once it has rung, so the nodes are collectable
    // as soon as they stop. A leak here would be one node per cone on the site.
    grit.onended = () => {
      panner.disconnect();
      band.disconnect();
      strike.disconnect();
      body.disconnect();
    };
  }

  /* -- the frame ---------------------------------------------------------- */

  const reader = createEventReader();
  let volume = 1;
  let hornBase = 0;
  let hornHz = 990;
  let hornRate = 1;
  let disposed = false;

  return {
    render(snapshot, unacknowledged, at) {
      if (disposed) return;
      const now = at ?? context.currentTime;

      left.update(snapshot?.machine.left, now);
      right.update(snapshot?.machine.right, now);

      const alarm = hornVoice(unacknowledged);
      const depth = isSilent(alarm) ? 0 : alarm.gain / 2;
      if (Math.abs(depth - hornBase) > 1e-4) {
        hornDepth.gain.setTargetAtTime(depth, now, GLIDE);
        hornGain.gain.setTargetAtTime(depth, now, GLIDE);
        hornBase = depth;
      }
      if (!isSilent(alarm)) {
        if (alarm.hz !== hornHz) {
          horn.frequency.setValueAtTime(alarm.hz, now);
          hornHz = alarm.hz;
        }
        if (alarm.rate !== hornRate) {
          hornPulse.frequency.setValueAtTime(alarm.rate, now);
          hornRate = alarm.rate;
        }
      }

      // A rewind is a new run: nothing that happened in the old one is played.
      const { events, rewound } = reader.take(snapshot);
      if (rewound) return;
      for (const event of events) {
        // Impacts are centred for now. Panning them by where they happened
        // relative to the hull is a real cue and a separate decision — it wants
        // the pose, a body-frame transform, and a view on what "left" means in
        // the chase camera.
        if (event.kind === "impact") knock(impactVoice(event), now, 0);
        // The hull is you, so it is never off to one side.
        else if (event.kind === "hull") knock(hullVoice(event), now, 0);
      }
    },
    setVolume(next) {
      volume = next < 0 ? 0 : next > 1 ? 1 : next;
      master.gain.setTargetAtTime(volume, context.currentTime, 0.02);
    },
    get volume() {
      return volume;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      left.stop();
      right.stop();
      horn.stop();
      hornPulse.stop();
      master.disconnect();
      limiter.disconnect();
    },
  };
}

/**
 * The live context, made on demand.
 *
 * A browser will not let a page make noise before the player has touched it, so
 * the context starts suspended and `resume()` has to be called from inside a
 * gesture handler. That is not a workaround to hide: an exercise that began
 * talking before you had touched anything would be the rig being rude.
 */
export function createLiveAudio(): { audio: Audio; resume(): void; dispose(): void } {
  const context = new AudioContext();
  const audio = createAudio(context);
  return {
    audio,
    resume() {
      if (context.state === "suspended") void context.resume();
    },
    dispose() {
      audio.dispose();
      void context.close();
    },
  };
}
