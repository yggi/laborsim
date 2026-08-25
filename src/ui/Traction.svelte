<script lang="ts">
/**
 * TRACTION — the plan view, and the other half of ATT-0's question.
 *
 * ATT-0 is the horizon: *which way am I pointing, and how level am I?* This is
 * the machine seen from above: *what are my tracks doing to the ground, and it
 * to them?* Two heads, two viewpoints, one machine — and between them the pilot
 * has the attitude and the contact patch, which is the whole of rung 1.
 *
 * **It replaced two dials, GRIP and SLIP, that were measuring one thing badly
 * between them.** They are not the same quantity and the panel needed both:
 * measured over 7200 steps, the correlation between them is 0.267. Slip is a
 * velocity difference at the contact — what is happening. Traction is impulse
 * demanded over impulse the ground can hold — how much is left. On a 40° ramp
 * the machine climbs cleanly with slip under the lamp threshold 89% of the time
 * while traction sits at 0.93: at the edge of the friction cone and not yet
 * sliding. That is the panel's only reading that arrives *before* the failure,
 * and dropping it to keep SLIP alone would have left a dash that can only
 * report things that have already gone wrong.
 *
 * So both, on one head, in the two channels a person reads separately:
 *
 * - **The channel's colour is the margin.** A track using its friction cone
 *   heats up, because that is what friction does. Cold is reserve, amber is
 *   working. You take this peripherally and never read a number for it.
 * - **The channel's length is the contact patch**, closing from both ends as
 *   samples leave the ground and hatching out where they have. Contacts were
 *   previously only ever visible on the debug telemetry line, and they are the
 *   *why* behind a track going cold.
 * - **The bar is the slip**, centre-zero, growing the way the track is sliding:
 *   up when it outruns the ground (spinning), down when the ground outruns it
 *   (being pushed, or dragged by the other side). Vertical, because in a plan
 *   view the track runs fore-and-aft and the sign of slip is a direction on the
 *   ground rather than an abstraction.
 *
 * Colour, length and mark are separable at a glance, which is what lets one
 * head carry three quantities. A short bar in a hot channel and a long bar in a
 * cold one are different machines in different trouble, and they look it.
 *
 * **A track with no ground is not a track at 0%.** It hatches out and stops
 * reporting: no bar, no number, no needle at the bottom of the scale pretending
 * to be a low reading. The old GRIP dial showed 0% for it — the same reading as
 * parked — beside a lit NO CONTACT lamp. `TrackState.traction` is now `null`
 * there, so this cannot be got wrong by forgetting to check.
 *
 * The needle is damped (`damping.ts`) because the raw ratio is far too noisy to
 * read: undamped it sat above the danger band 21% of a flat-ground run.
 *
 * Architecture rule 3: reads a snapshot.
 */
import { SLIPPING } from "../cockpit/annunciator.ts";
import { damp } from "../cockpit/damping.ts";
import Seg from "../cockpit/Seg.svelte";
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot, size = 62 }: { snapshot: Snapshot | undefined; size?: number } =
  $props();

/** Full scale each way, m/s. Beyond this the machine is not driving, it is ice. */
const SPAN = 1.6;
/** Needle damping, seconds. See `damping.ts` for how this number was chosen. */
const TAU = 0.6;

/* -- geometry, in the 100x100 viewBox ------------------------------------- */

const TOP = 20;
const BOTTOM = 80;
const MID = (TOP + BOTTOM) / 2;
/** Half the bar's travel. Just inside the channel, so full scale still reads. */
const REACH = (BOTTOM - TOP) / 2 - 1;

/** Left channel, right channel, and where each one's slip bar sits inside it. */
const SIDES = [
  { id: "L", x: 15, bar: 18 },
  { id: "R", x: 69, bar: 72 },
] as const;
/** Channel width, and the bar's, in viewBox units. */
const CHANNEL = 16;
const BAR = 10;

/* -- the damped needles --------------------------------------------------- */

// Plain locals, deliberately not `$state`: the effect below writes `shown` and
// must not re-run because it read its own previous value.
let heldL: number | null = null;
let heldR: number | null = null;
let lastSeconds = Number.NaN;

let damped = $state<{ L: number | null; R: number | null }>({ L: null, R: null });

$effect(() => {
  const s = snapshot;
  if (!s) {
    heldL = heldR = null;
    lastSeconds = Number.NaN;
    damped = { L: null, R: null };
    return;
  }
  const dt = s.simSeconds - lastSeconds;
  lastSeconds = s.simSeconds;
  // A reset winds the clock back and a long stall jumps it forward. Neither is
  // an interval to damp across, so the needles start again instead.
  const step = dt > 0 && dt < 1 ? dt : 0;
  heldL = damp(heldL, s.machine.left.traction, step, TAU);
  heldR = damp(heldR, s.machine.right.traction, step, TAU);
  damped = { L: heldL, R: heldR };
});

/* -- what each side draws ------------------------------------------------- */

const tracks = $derived(
  SIDES.map((side) => {
    const state = side.id === "L" ? snapshot?.machine.left : snapshot?.machine.right;
    const slip = state?.slip ?? 0;
    const contacts = state?.contacts ?? 0;
    // Undamped on the very first paint, before the effect has run once. The
    // damper is a display filter, so the honest fallback is the raw reading.
    const use = (side.id === "L" ? damped.L : damped.R) ?? state?.traction ?? null;
    const reach = (Math.min(Math.abs(slip), SPAN) / SPAN) * REACH;
    return {
      ...side,
      grounded: contacts > 0,
      use,
      slip,
      contacts,
      hot: Math.abs(slip) > SLIPPING,
      /** At the limit: the cone is full and the next newton goes into sliding. */
      limit: use !== null && use > 0.97,
      // A hair of bar even at rest, so there is a needle sitting at zero rather
      // than a gap where the reading should be.
      barY: slip >= 0 ? MID - reach : MID,
      barH: Math.max(reach, 1.2),
      /** How much of the channel is touching ground, closing from both ends. */
      liveH: ((BOTTOM - TOP) * Math.min(contacts, 6)) / 6,
    };
  }),
);

/** The worst reading among the tracks that have ground to report about. */
const worstUse = $derived.by(() => {
  const measured = tracks.map((t) => t.use).filter((u): u is number => u !== null);
  return measured.length === 0 ? null : Math.max(...measured);
});

/**
 * Cold, working, hot. Interpolated in RGB across four stops, which is enough
 * for a field that is read as a temperature rather than a value.
 *
 * **It stops at amber and never reaches red.** Red on this panel means a thing
 * has happened, and the only things that have happened here are the slip bar
 * and the frame at the limit. A ramp that ran to red put a red bar on a red
 * channel, and the one mark that says *you are sliding right now* disappeared
 * into the one that says *you are nearly out of grip* — which is precisely the
 * distinction this head exists to draw.
 */
const HEAT: readonly [number, [number, number, number]][] = [
  [0, [24, 27, 29]],
  [0.55, [38, 58, 44]],
  [0.85, [96, 68, 20]],
  [1, [154, 108, 16]],
];

function heat(use: number | null): string {
  if (use === null) return "#131517";
  const u = Math.max(0, Math.min(1, use));
  let i = 1;
  while (i < HEAT.length - 1 && u > (HEAT[i]?.[0] ?? 1)) i++;
  const [x0, c0] = HEAT[i - 1] as [number, [number, number, number]];
  const [x1, c1] = HEAT[i] as [number, [number, number, number]];
  const t = x1 === x0 ? 0 : (u - x0) / (x1 - x0);
  const mix = c0.map((v, k) => Math.round(v + t * ((c1[k] as number) - v)));
  return `rgb(${mix[0]} ${mix[1]} ${mix[2]})`;
}

const say = (t: (typeof tracks)[number]): string =>
  t.grounded
    ? `${t.id} traction ${Math.round((t.use ?? 0) * 100)} percent, slip ${t.slip.toFixed(2)} metres per second`
    : `${t.id} no ground contact`;
</script>

<div class="traction" style="width: {size}px">
  <svg viewBox="0 0 100 100" role="img" aria-label="traction: {tracks.map(say).join('; ')}">
    <defs>
      <!-- The inside of a hole, lit from above. See `Gauge.svelte`. -->
      <linearGradient id="mfg-rim-traction" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0, 0, 0, 0.8)" />
        <stop offset="0.55" stop-color="rgba(0, 0, 0, 0.15)" />
        <stop offset="1" stop-color="rgba(255, 255, 255, 0.4)" />
      </linearGradient>
      <!-- Nothing is being measured here. Hatching is what a dead channel looks
           like on a real panel, and it is deliberately not a colour on the
           scale — an off-scale reading must not look like a low one. -->
      <pattern
        id="mfg-traction-void"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="6" height="6" fill="#141618" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#4a3a38" stroke-width="2" />
      </pattern>
    </defs>

    <!-- The face is square where ATT-0's is round, because what is on it is a
         diagram rather than a sweep. Same cutout, a different window in it. -->
    <rect class="face" x="10" y="10" width="80" height="80" rx="5" />

    <!-- The machine, from above, nose up. It does not move: the world moves
         around it, the same bargain ATT-0 makes with the horizon. -->
    <path class="hull" d="M41 26 L50 18 L59 26 V78 H41 Z" />

    {#each tracks as track (track.id)}
      <!-- The track, as a channel of six samples. What is *not* touching is
           hatched, so contact and traction are one mark rather than two: the
           live part is as long as the contact patch and as hot as the friction
           it is using, and a track that has left the ground is simply all
           hatch. It was a separate rail beside the channel first, 2.5 units
           wide, which is 1.3 px at the size this is actually bolted on at —
           a reading nobody would ever take. -->
      <rect
        class="channel"
        x={track.x}
        y={TOP}
        width={CHANNEL}
        height={BOTTOM - TOP}
        rx="2"
        fill="url(#mfg-traction-void)"
      />
      {#if track.contacts > 0}
        <rect
          class="live"
          x={track.x}
          y={MID - track.liveH / 2}
          width={CHANNEL}
          height={track.liveH}
          rx="2"
          fill={heat(track.use)}
        />
      {/if}
      <line class="zero" x1={track.x + 1} y1={MID} x2={track.x + CHANNEL - 1} y2={MID} />

      {#if track.grounded}
        <rect
          class="bar"
          class:hot={track.hot}
          x={track.bar}
          y={track.barY}
          width={BAR}
          height={track.barH}
          rx="1"
        />
      {/if}

      <!-- The frame goes on last so nothing paints over it. -->
      <rect
        class="frame"
        class:dead={!track.grounded}
        class:limit={track.limit}
        x={track.x}
        y={TOP}
        width={CHANNEL}
        height={BOTTOM - TOP}
        rx="2"
      />
    {/each}

    <rect class="rim" x="10" y="10" width="80" height="80" rx="5" />
  </svg>

  <!-- Per cent of the friction cone in use, worst track. Blank — not zero —
       when no track has ground under it, because then nothing is measuring. -->
  <Seg value={worstUse === null ? "---" : Math.round(worstUse * 100).toFixed(0)} />
</div>

<style>
  .traction {
    flex: none;
    text-align: center;
    font: 7px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    color: #2a2418;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .face {
    fill: #16181a;
  }
  /* The lip of the cutout it is set into. See `Gauge.svelte`. */
  .rim {
    fill: none;
    stroke: url(#mfg-rim-traction);
    stroke-width: 2.6;
  }
  /* The machine is drawn as plate, not as an outline: it is the one solid thing
     on this face, and everything else is what is happening to it. */
  .hull {
    fill: #2b3033;
    stroke: #545c60;
    stroke-width: 1;
    stroke-linejoin: round;
  }
  .channel {
    stroke: none;
  }
  .live {
    transition:
      fill 0.12s linear,
      height 0.12s linear,
      y 0.12s linear;
  }
  .frame {
    fill: none;
    stroke: #6a7175;
    stroke-width: 1;
  }
  /* At the limit the channel is outlined, not just coloured: the moment the
     cone fills is an event, and an event deserves an edge rather than one more
     step along a ramp. */
  .frame.limit {
    stroke: #e0503c;
    stroke-width: 1.6;
  }
  .frame.dead {
    stroke: #e0503c;
    stroke-width: 1.2;
    stroke-dasharray: 3 3;
  }
  .zero {
    stroke: #6a6252;
    stroke-width: 1;
  }
  .bar {
    fill: #6fe3c4;
    transition:
      height 0.12s linear,
      y 0.12s linear;
  }
  /* Past the point where the lamp calls it slipping it changes colour rather
     than only getting longer — that is the reading you take peripherally. */
  .bar.hot {
    fill: #e0503c;
  }
</style>
