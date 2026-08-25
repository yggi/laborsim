<script lang="ts">
/**
 * One track lever. Two of these, one per thumb, is the whole of rung 1's
 * control surface — tank steering, and you fight it to drive straight.
 *
 * It is a **stick**, not a slider: a shaft coming up out of the console through
 * a rubber boot, with a grip on the end and a gate it moves in. That is not
 * decoration. Principle 7 says the world may look like a simulation because it
 * *is* one, and the cab may not — the cab is the real thing you are sitting in,
 * and a slider is a thing on a screen. Nothing about how it is operated changed:
 * same place, same throw, same dead zone.
 *
 * Behaviour, decided deliberately and not a default:
 *   - grab on touch, move on drag, **stay where dropped**. Nothing
 *     self-centres. Leaving the throttle open and switching to chase view is
 *     a real thing you can do, and the ledger will explain it afterwards.
 *   - a dead zone around neutral snaps to a clear HALT, so "stopped" is a
 *     state you can reach with a thumb rather than a state you aim at.
 *
 * Still generic steel: whose lever this is, is L-051, along with the cage.
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

/** Where the grip sits, as a percentage of the console. The same 12%/76% the
 *  pointer maths uses, so the thing you see is the thing you are dragging. */
const gripTop = $derived((1 - (value + 1) / 2) * 76 + 12);
/**
 * Pulled back is nearer your chest, so it is drawn slightly larger.
 *
 * The seat looks *along* the machine, so a fore-and-aft lever mostly moves
 * toward you and away from you — with no perspective at all it would read as a
 * grip sliding up and down a groove, which is the slider this stopped being.
 * Eight percent is enough to say "this is coming at you" and not enough to look
 * like a zoom.
 */
const gripScale = $derived(1 - value * 0.08);
</script>

<div class="lever" class:dragging>
  <div
    class="console"
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
    <!-- The gate the shaft runs in, and the notch that makes HALT a place on it
         you can see rather than a number you aim at. -->
    <div class="gate"></div>
    <div class="detent"></div>

    <!-- The stick: this box spans from the grip down to where the shaft enters
         the boot, so the shaft is however long the throw leaves it. -->
    <div class="stick" style="top: {gripTop}%">
      <div class="shaft"></div>
      <div class="grip" style="scale: {gripScale}">
        <div class="knurl"></div>
      </div>
    </div>

    <!-- Where it comes through the deck: a rubber gaiter on a bolted plate. -->
    <div class="boot"></div>
    <div class="plate"></div>
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
  /* Same footprint as the slider it replaces: the hands do not move because the
     furniture got real. */
  .console {
    position: relative;
    width: 58px;
    height: 168px;
    background: linear-gradient(180deg, #1d2224 0%, #15191b 60%, #0f1315 100%);
    border: 1px solid #333a3b;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 0 0 3px #0d1012;
    touch-action: none;
    overflow: hidden;
  }
  .dragging .console {
    border-color: #6fe3c4;
  }
  /* A milled slot, dark because it is a hole. */
  .gate {
    position: absolute;
    left: 50%;
    top: 10%;
    bottom: 26px;
    width: 7px;
    transform: translateX(-50%);
    border-radius: 4px;
    background: #080b0c;
    box-shadow:
      inset 0 2px 3px rgba(0, 0, 0, 0.9),
      0 1px 0 rgba(255, 255, 255, 0.06);
  }
  .detent {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
    background: #6d7a76;
    opacity: 0.5;
  }
  .stick {
    position: absolute;
    left: 50%;
    /* Ends inside the boot rather than at the plate: a shaft that stopped where
       the rubber starts would look like it was resting on it. */
    bottom: 22px;
    width: 12px;
    transform: translateX(-50%);
  }
  /* Turned steel, lit from the left like everything else in the cab. */
  .shaft {
    position: absolute;
    inset: 0 3px;
    background: linear-gradient(
      90deg,
      #14181a 0%,
      #5c6669 30%,
      #8c9698 42%,
      #454e51 62%,
      #12171a 100%
    );
    border-radius: 1px;
  }
  .grip {
    position: absolute;
    top: 0;
    left: 50%;
    width: 28px;
    height: 32px;
    transform: translate(-50%, -60%);
    /* A moulded handgrip: round over the top, squarer where the hand sits. */
    border-radius: 14px 14px 9px 9px;
    background:
      radial-gradient(ellipse at 32% 22%, rgba(255, 255, 255, 0.22), transparent 55%),
      linear-gradient(90deg, #171c1e 0%, #3f4749 34%, #2b3234 66%, #101416 100%);
    border: 1px solid #0a0d0e;
    box-shadow:
      0 3px 6px rgba(0, 0, 0, 0.55),
      inset 0 -6px 8px rgba(0, 0, 0, 0.45);
  }
  /* The moulded ribs a thumb sits between. Worn shinier than the rest. */
  .knurl {
    position: absolute;
    left: 5px;
    right: 5px;
    top: 13px;
    height: 13px;
    background: repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.16) 0 1px,
      transparent 1px 4px
    );
    border-radius: 3px;
  }
  /* Ribbed rubber where the shaft goes through the deck. Wider at the bottom,
     because it is a cone that has been squashed by a thousand hours of this. */
  .boot {
    position: absolute;
    left: 50%;
    bottom: 9px;
    width: 30px;
    height: 20px;
    transform: translateX(-50%);
    clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%);
    background:
      repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0 2px, transparent 2px 5px),
      linear-gradient(90deg, #0e1112 0%, #2a3032 45%, #171b1d 100%);
  }
  /* The plate it is bolted to, proud of the console like every other plate. */
  .plate {
    position: absolute;
    left: 6px;
    right: 6px;
    bottom: 0;
    height: 11px;
    background: linear-gradient(180deg, #3a4245 0%, #232a2c 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.5);
  }
  .plate::after {
    content: "";
    position: absolute;
    inset: 0 5px;
    background:
      radial-gradient(circle at 0% 50%, #737d7f 0 1.4px, transparent 1.8px),
      radial-gradient(circle at 100% 50%, #737d7f 0 1.4px, transparent 1.8px);
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
