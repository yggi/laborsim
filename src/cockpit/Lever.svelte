<script lang="ts">
/**
 * One track lever. Two of these, one per thumb, is the whole of rung 1's
 * control surface — tank steering, and you fight it to drive straight.
 *
 * Behaviour, decided deliberately and not a default:
 *   - grab on touch, move on drag, **stay where dropped**. Nothing
 *     self-centres. Leaving the throttle open and switching to chase view is
 *     a real thing you can do, and the ledger will explain it afterwards.
 *   - a dead zone around neutral snaps to a clear HALT, so "stopped" is a
 *     state you can reach with a thumb rather than a state you aim at.
 *
 * Architecture rule 3: this reports a value upward. It never touches the sim.
 */

const {
  label,
  value,
  onchange,
}: { label: string; value: number; onchange: (v: number) => void } = $props();

/** Below this, the lever reads as a deliberate halt rather than a slow creep. */
const DEAD_ZONE = 0.09;

let track: HTMLDivElement;
let dragging = $state(false);

function valueFrom(clientY: number): number {
  const box = track.getBoundingClientRect();
  const margin = box.height * 0.12;
  const span = box.height - margin * 2;
  const t = (clientY - box.top - margin) / span;
  const raw = 1 - t * 2;
  const clamped = raw < -1 ? -1 : raw > 1 ? 1 : raw;
  return Math.abs(clamped) < DEAD_ZONE ? 0 : clamped;
}

function grab(event: PointerEvent) {
  dragging = true;
  track.setPointerCapture(event.pointerId);
  onchange(valueFrom(event.clientY));
}

function move(event: PointerEvent) {
  if (!dragging) return;
  onchange(valueFrom(event.clientY));
}

function release() {
  // Deliberately does not reset `value`. The lever stays where you left it.
  dragging = false;
}
</script>

<div class="lever" class:dragging>
  <div
    class="track"
    role="slider"
    aria-label={label}
    aria-valuemin={-1}
    aria-valuemax={1}
    aria-valuenow={value}
    aria-valuetext={value === 0 ? "halt" : value.toFixed(2)}
    tabindex="0"
    bind:this={track}
    onpointerdown={grab}
    onpointermove={move}
    onpointerup={release}
    onpointercancel={release}
  >
    <div class="slot"></div>
    <div class="detent"></div>
    <div class="knob" style="top: {(1 - (value + 1) / 2) * 76 + 12}%"></div>
  </div>
  <div class="label">{label}</div>
  <div class="value" class:halt={value === 0}>
    {value === 0 ? "HALT" : (value > 0 ? "+" : "") + value.toFixed(2)}
  </div>
</div>

<style>
  .lever {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    touch-action: none;
  }
  .track {
    position: relative;
    width: 58px;
    height: 168px;
    background: #1a1e20;
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
    touch-action: none;
  }
  .dragging .track {
    border-color: #6fe3c4;
  }
  .slot {
    position: absolute;
    left: 50%;
    top: 12%;
    bottom: 12%;
    width: 3px;
    transform: translateX(-50%);
    background: #0d1012;
  }
  /* The neutral detent is drawn, so HALT is a place on the track you can see. */
  .detent {
    position: absolute;
    left: 6px;
    right: 6px;
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
    background: #6d7a76;
    opacity: 0.55;
  }
  .knob {
    position: absolute;
    left: 6px;
    right: 6px;
    height: 34px;
    margin-top: -17px;
    background: linear-gradient(#4a5350, #262c2b);
    border: 1px solid #0d1012;
    border-radius: 3px;
  }
  .knob::after {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    top: 15px;
    height: 2px;
    background: #0d1012;
  }
  .label,
  .value {
    font: 9px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.12em;
    color: #6d7a76;
  }
  .value {
    color: #c6d0cb;
  }
  .value.halt {
    color: #6d7a76;
  }
</style>
