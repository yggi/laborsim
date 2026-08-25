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
 * **Whose noise is it?** The machine's voices are the *chassis manufacturer's*,
 * read off the recording exactly as the dash reads its panel colours — the
 * chassis slot carries its maker, so a replay sounds like the machine it
 * recorded and not like whatever is bolted in today. Nothing here names a
 * manufacturer; it asks the snapshot and looks the house up
 * (`makers/sound.ts`).
 *
 * Architecture rule 3: snapshot in, nothing out. Nothing here can reach the sim.
 */

import { type Condition, chassisOf } from "../control/bus.ts";
import { createEventReader } from "../core/events.ts";
import { makeRng } from "../core/rng.ts";
import type { Snapshot, TrackState } from "../core/snapshot.ts";
import { styleOf } from "../makers/houses.ts";
import type { SoundHouse } from "../makers/sound.ts";
import {
  chainLink,
  chainVoice,
  driveVoice,
  grindVoice,
  hornVoice,
  hullVoice,
  impactVoice,
  isSilent,
  type Knock,
  rattleVoice,
  squeakVoice,
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

/**
 * How the note is split across its two oscillators.
 *
 * The twin sits **half** the main's level rather than beside it, and the pair is
 * then scaled so their combined power matches one oscillator at the level the
 * voice asked for. Both halves of that are measured rather than chosen.
 *
 * Adding the twin at full level doubled the peak of every driving scene on the
 * bench (`labouring` went 0.354 → 0.662) at unchanged RMS: the pair sums in
 * phase every beat, and what that eats is exactly the headroom an impact needs.
 * Halving both was wrong in the other direction — peaks matched the old note and
 * every RMS *halved*, because two detuned oscillators are only briefly in phase
 * and spend the rest of the beat cancelling.
 *
 * So: power, not amplitude. Two mostly-incoherent sources add in power, which is
 * what `hypot` is doing here, and it is the loudness that is preserved rather
 * than the oscilloscope trace. The unequal split is the other half — a quieter
 * twin still beats audibly against the main and costs far less peak than an
 * equal pair, which is how anyone mixes a unison.
 */
const TWIN = 0.5;
const UNISON = 1 / Math.hypot(1, TWIN);

/** How fast the cab's rattle rises to a knock, and how long it rings after. */
const RATTLE_ATTACK = 0.008;
const RATTLE_RELEASE = 0.06;

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

/**
 * The seed the chain's unevenness is drawn from, one side apart from the other.
 *
 * Two tracks on one machine are two chains with two histories, and drawing both
 * from one generator would make them clank in lockstep — which is worse than no
 * variation at all, because it reads as one belt heard twice.
 */
const CHAIN_SEED = 0x9e37;

/**
 * How many plates may be scheduled in a single frame.
 *
 * The belt is advanced by **sim time**, so a long frame owes several clanks and
 * they are all played rather than dropped — that is what keeps the rate honest
 * on a phone dropping frames. The cap is a backstop against a pathological
 * `simSeconds` jump (a scrubbed replay, a tab restored after an hour) turning
 * into ten thousand oscillators in one tick.
 */
const MAX_LINKS_PER_FRAME = 8;

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
  /** `dt` is **sim** seconds since the last frame, which is what the belt runs on. */
  update(
    track: TrackState | undefined,
    house: SoundHouse,
    at: number,
    dt: number,
  ): void;
  stop(): void;
}

function createSide(
  context: BaseAudioContext,
  master: AudioNode,
  noiseBuffer: AudioBuffer,
  pan: number,
  seed: number,
  knock: (voice: Knock, at: number, pan: number) => void,
): Side {
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(master);

  const driveGain = context.createGain();
  driveGain.gain.value = 0;
  driveGain.connect(panner);

  /**
   * The firing pulse: a square LFO into the drive gain, so the note is *cut*
   * rather than played. Its rate rides on the note's own frequency, which is
   * what keeps the lump slowing down with the engine instead of drifting free
   * of it — a drone whose beat does not track its pitch is a tremolo pedal.
   */
  const pulseDepth = context.createGain();
  pulseDepth.gain.value = 0;
  pulseDepth.connect(driveGain.gain);

  const pulse = context.createOscillator();
  pulse.type = "square";
  pulse.frequency.value = 28;
  pulse.connect(pulseDepth);
  pulse.start();

  const driveFilter = context.createBiquadFilter();
  driveFilter.type = "lowpass";
  driveFilter.frequency.value = 340;
  // Just enough resonance at the cutoff to give the note an edge as it opens.
  driveFilter.Q.value = 3;
  driveFilter.connect(driveGain);

  /**
   * **Two oscillators, a few cents apart.** One is a synthesiser playing a note;
   * two beating against each other is a machine. The detune is the maker's, and
   * it is the cheapest audible statement of how well built the thing is.
   */
  const drive = context.createOscillator();
  drive.type = "sawtooth";
  drive.frequency.value = 56;
  drive.connect(driveFilter);
  drive.start();

  const twinGain = context.createGain();
  twinGain.gain.value = TWIN;
  twinGain.connect(driveFilter);

  const twin = context.createOscillator();
  twin.type = "sawtooth";
  twin.frequency.value = 56;
  twin.detune.value = 0;
  twin.connect(twinGain);
  twin.start();

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

  /* -- the squeak ------------------------------------------------------- */
  /**
   * A dry bearing: narrow-band noise, wandering. The sweep is an LFO on the
   * filter's own frequency rather than on a gain, because what makes a squeak a
   * squeak is that the *pitch* moves — a fixed narrow band is a whistle, and a
   * whistle on a tracked machine is a kettle.
   */
  const squeakGain = context.createGain();
  squeakGain.gain.value = 0;
  squeakGain.connect(panner);

  const squeakFilter = context.createBiquadFilter();
  squeakFilter.type = "bandpass";
  squeakFilter.frequency.value = 2400;
  squeakFilter.Q.value = 14;
  squeakFilter.connect(squeakGain);

  const sweepDepth = context.createGain();
  sweepDepth.gain.value = 0;
  sweepDepth.connect(squeakFilter.frequency);

  const sweep = context.createOscillator();
  sweep.type = "sine";
  // Slow enough to be a wander rather than a warble. Not a house decision: a
  // bearing does not squeak at a rate its manufacturer chose.
  sweep.frequency.value = 0.37;
  sweep.connect(sweepDepth);
  sweep.start();

  const squeakSource = context.createBufferSource();
  squeakSource.buffer = noiseBuffer;
  squeakSource.loop = true;
  squeakSource.connect(squeakFilter);
  squeakSource.start();

  /** Fraction of a plate travelled but not yet clanked. See `MAX_LINKS`. */
  let linkPhase = 0;
  const rng = makeRng(seed);

  const held = {
    hz: 56,
    gain: 0,
    cutoff: 340,
    grind: 0,
    grindCut: 600,
    squeak: 0,
    squeakHz: 2400,
    squeakQ: 14,
    sweep: 0,
    pulse: 0,
    pulseHz: 28,
    detune: 0,
    q: 3,
    wave: "sawtooth" as OscillatorType,
  };

  const chase = (param: AudioParam, target: number, at: number, last: number) => {
    if (Math.abs(target - last) < 1e-4) return last;
    param.setTargetAtTime(target, at, GLIDE);
    return target;
  };

  return {
    update(track, house, at, dt) {
      // No run, no machine: everything falls to silence rather than freezing on
      // its last value. A cockpit between exercises is a quiet one.
      if (!track) {
        held.gain = chase(driveGain.gain, 0, at, held.gain);
        held.pulse = chase(pulseDepth.gain, 0, at, held.pulse);
        held.grind = chase(grindGain.gain, 0, at, held.grind);
        held.squeak = chase(squeakGain.gain, 0, at, held.squeak);
        linkPhase = 0;
        return;
      }
      const voice = driveVoice(track, house);
      const grind = grindVoice(track);
      // The waveform is the one thing a house changes that is not a number, so
      // it is set rather than chased. Swapping a chassis mid-run is not a thing
      // the game does yet; when it is, this is already the right behaviour.
      if (voice.wave !== held.wave) {
        drive.type = voice.wave;
        twin.type = voice.wave;
        held.wave = voice.wave;
      }
      held.hz = chase(drive.frequency, voice.hz, at, held.hz);
      chase(twin.frequency, voice.hz, at, held.hz);
      held.detune = chase(twin.detune, voice.detune, at, held.detune);
      held.gain = chase(driveGain.gain, voice.gain * UNISON, at, held.gain);
      held.pulse = chase(pulseDepth.gain, voice.pulse * UNISON, at, held.pulse);
      held.pulseHz = chase(pulse.frequency, voice.pulseHz, at, held.pulseHz);
      held.cutoff = chase(driveFilter.frequency, voice.cutoff, at, held.cutoff);
      held.q = chase(driveFilter.Q, voice.resonance, at, held.q);
      held.grind = chase(grindGain.gain, grind.gain, at, held.grind);
      held.grindCut = chase(grindFilter.frequency, grind.cutoff, at, held.grindCut);

      const squeal = squeakVoice(track, house);
      held.squeak = chase(squeakGain.gain, squeal.gain, at, held.squeak);
      held.squeakHz = chase(squeakFilter.frequency, squeal.hz, at, held.squeakHz);
      held.squeakQ = chase(squeakFilter.Q, squeal.q, at, held.squeakQ);
      held.sweep = chase(sweepDepth.gain, squeal.hz * squeal.sweep, at, held.sweep);

      /**
       * The chain, one plate at a time.
       *
       * The phase is advanced by **sim** seconds rather than by wall time, so
       * the belt clanks the same number of times per metre travelled however
       * the frames fell — a dropped frame owes two clanks and pays them, and a
       * replay of the same run clanks identically. Each one is spread across
       * the frame it belongs to rather than fired at its start, because eight
       * plates landing on one instant is a crunch, not a chain.
       */
      const chain = chainVoice(track, house);
      linkPhase += chain.rate * dt;
      let links = 0;
      while (linkPhase >= 1 && links < MAX_LINKS_PER_FRAME) {
        linkPhase -= 1;
        const spread = house.gear.clankSpread;
        knock(
          chainLink(chain.link, spread, rng.range(-1, 1)),
          at + (links * dt) / MAX_LINKS_PER_FRAME,
          pan,
        );
        links++;
      }
      // A jump nobody can play through is a jump nobody should hear the tail of.
      if (linkPhase > MAX_LINKS_PER_FRAME) linkPhase = 0;
    },
    stop() {
      drive.stop();
      twin.stop();
      pulse.stop();
      noise.stop();
      sweep.stop();
      squeakSource.stop();
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

  const left = createSide(context, master, noiseBuffer, LEFT_PAN, CHAIN_SEED, knock);
  const right = createSide(
    context,
    master,
    noiseBuffer,
    RIGHT_PAN,
    // Two chains with two histories. One seed for both would make the sides
    // clank in lockstep, which reads as one belt heard twice.
    CHAIN_SEED ^ 0x5bf0,
    knock,
  );

  /* -- the cab ------------------------------------------------------------ */
  /**
   * Everything not bolted down tightly enough, answering to the accelerometer.
   *
   * Centred and not per track, because it is the *cab* — you are sitting in it,
   * and a rattle that came from one side would be a rattle in somebody else's
   * machine. It is also the only voice on the machine that renders the ground
   * rather than the drivetrain: a graded pad is silent at any speed and a
   * rutted haul road is not.
   */
  const rattleGain = context.createGain();
  rattleGain.gain.value = 0;
  rattleGain.connect(master);

  const rattleFilter = context.createBiquadFilter();
  rattleFilter.type = "bandpass";
  rattleFilter.frequency.value = 900;
  rattleFilter.Q.value = 1.2;
  rattleFilter.connect(rattleGain);

  const rattleSource = context.createBufferSource();
  rattleSource.buffer = noiseBuffer;
  rattleSource.loop = true;
  rattleSource.connect(rattleFilter);
  rattleSource.start();

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
  /**
   * Sim seconds at the last frame, so the belt can be advanced by the clock the
   * machine actually runs on rather than by the one the browser paints on.
   * `undefined` before the first frame and after a rewind: a run that has just
   * started owes no clanks.
   */
  let lastSeconds: number | undefined;
  let rattle = 0;
  let rattleHz = 900;
  let rattleQ = 1.2;
  let hornBase = 0;
  let hornHz = 990;
  let hornRate = 1;
  let hornWave: OscillatorType = "square";
  let disposed = false;

  return {
    render(snapshot, unacknowledged, at) {
      if (disposed) return;
      const now = at ?? context.currentTime;

      // Whose machine is this? The chassis slot on the recording says, and an
      // empty rack falls back to the OEM — the same fallback the cab uses for
      // an unmarked plate (`makers/houses.ts`).
      const house = styleOf(chassisOf(snapshot?.stages ?? [])?.maker ?? "").sound;

      // How much *sim* time this frame covers. Clamped, because a tab that was
      // in the background for a minute must not owe a minute of chain.
      const seconds = snapshot?.simSeconds;
      const dt =
        seconds === undefined || lastSeconds === undefined || seconds < lastSeconds
          ? 0
          : Math.min(seconds - lastSeconds, 0.25);
      lastSeconds = seconds;

      left.update(snapshot?.machine.left, house, now, dt);
      right.update(snapshot?.machine.right, house, now, dt);

      /**
       * The rattle is the one voice that must **not** glide.
       *
       * Everything else here is a state being interpolated, and 50 ms of glide
       * is what keeps it honest across a dropped frame. A rattle is not a state:
       * the hull's ride is mostly nothing punctuated by single-step spikes
       * (measured: median 0.13 m/s², ninetieth percentile 8.6), and smoothing
       * that turns a series of knocks into a steady hiss — which is exactly what
       * the first version did, and it measured *identically* over smooth ground
       * and rutted. So: fast up, slower down, which is a thing being struck and
       * then ringing rather than a level being chased.
       */
      const shake = snapshot?.machine.shake;
      const shaking = shake
        ? rattleVoice(shake, house)
        : { gain: 0, hz: rattleHz, q: rattleQ };
      if (Math.abs(shaking.gain - rattle) > 1e-4) {
        const glide = shaking.gain > rattle ? RATTLE_ATTACK : RATTLE_RELEASE;
        rattleGain.gain.setTargetAtTime(shaking.gain, now, glide);
        rattle = shaking.gain;
      }
      if (shaking.hz !== rattleHz) {
        rattleFilter.frequency.setTargetAtTime(shaking.hz, now, GLIDE);
        rattleHz = shaking.hz;
      }
      if (shaking.q !== rattleQ) {
        rattleFilter.Q.setTargetAtTime(shaking.q, now, GLIDE);
        rattleQ = shaking.q;
      }

      const alarm = hornVoice(unacknowledged, house);
      const depth = isSilent(alarm) ? 0 : alarm.gain / 2;
      if (Math.abs(depth - hornBase) > 1e-4) {
        hornDepth.gain.setTargetAtTime(depth, now, GLIDE);
        hornGain.gain.setTargetAtTime(depth, now, GLIDE);
        hornBase = depth;
      }
      if (!isSilent(alarm)) {
        if (alarm.wave !== hornWave) {
          horn.type = alarm.wave;
          hornWave = alarm.wave;
        }
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
      if (rewound) {
        lastSeconds = seconds;
        return;
      }
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
      rattleSource.stop();
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
