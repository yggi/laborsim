<script lang="ts">
/**
 * One track lever. Two of these, one per thumb, is the whole of rung 1's
 * control surface — tank steering, and you fight it to drive straight.
 *
 * It is a **stick**, not a slider: a shaft coming up out of the dashboard
 * through a rubber boot, with a grip on the end. That is not decoration.
 * Principle 7 says the world may look like a simulation because it *is* one, and
 * the cab may not — the cab is the real thing you are sitting in, and a slider is
 * a thing on a screen. Nothing about how it is operated changed: same place,
 * same throw, same dead zone.
 *
 * **No housing.** It had a bezel — a box with a border and a background — and a
 * box is the last thing left of a widget. A real travel lever stands in the
 * open, in front of the glass, bolted to the console it comes out of, and that
 * is the whole difference between an overlay and a cockpit. What is left is a
 * shaft, a grip, a boot, and the detent mark that makes HALT a place.
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
    <!-- The notch that makes HALT a place on the throw you can see rather than a
         number you aim at. All that is left of the gate: without a housing there
         is nothing for a slot to be cut into. -->
    <div class="detent"></div>

    <!-- The stick: this box spans from the grip down to where the shaft enters
         the boot, so the shaft is however long the throw leaves it. -->
    <div class="stick" style="top: {gripTop}%">
      <div class="shaft"></div>
      <div class="grip" style="scale: {gripScale}">
        <div class="knurl"></div>
      </div>
    </div>

    <!-- Where it goes through the deck. Its lower half is behind the dash, which
         is what makes the lever come *out of* the panel rather than sit on it. -->
    <div class="boot"></div>
  </div>
</div>

<style>
  .lever {
    touch-action: none;
  }
  /* The reach, not a housing: a box the size of a thumb's travel with nothing
     drawn in it. Same footprint as the bezel it replaces, so the hands do not
     move because the furniture became real. */
  .console {
    position: relative;
    width: 58px;
    /* Taller than the bezel was. A housing wanted to be compact; a lever wants
       to be long, because the throw is the control and a short one is fiddly.
       The pointer maths reads this box, so the travel grew with it. */
    height: 196px;
    touch-action: none;
  }
  /* The notch at neutral, cut into nothing — a machined mark beside the shaft.
     Short, because it is a mark on a console and not a line across a widget. */
  .detent {
    position: absolute;
    left: 10px;
    width: 10px;
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
    background: linear-gradient(90deg, rgba(190, 205, 200, 0.55), transparent);
  }
  .dragging .detent {
    background: linear-gradient(90deg, #6fe3c4, transparent);
  }
  .stick {
    position: absolute;
    left: 50%;
    /* Ends inside the boot rather than at its mouth: a shaft that stopped where
       the rubber starts would look like it was resting on it. */
    bottom: 16px;
    width: 10px;
    transform: translateX(-50%);
    /* Standing in the open, against sky or against ground — so it carries its
       own shadow, the way a real object in a cab does. */
    filter: drop-shadow(2px 3px 4px rgba(0, 0, 0, 0.55));
  }
  /* Turned steel, lit from the left like everything else in the cab. */
  .shaft {
    position: absolute;
    inset: 0 2px;
    background: linear-gradient(
      90deg,
      #10141600 0%,
      #191e21 6%,
      #59636a 34%,
      #8b979b 46%,
      #3f484c 66%,
      #12171a 96%
    );
    border-radius: 1px;
  }
  .grip {
    position: absolute;
    top: 0;
    left: 50%;
    width: 26px;
    height: 34px;
    transform: translate(-50%, -62%);
    /* A moulded handgrip: round over the top, squarer where the hand sits. */
    border-radius: 13px 13px 8px 8px;
    background:
      radial-gradient(ellipse at 32% 20%, rgba(255, 255, 255, 0.24), transparent 55%),
      linear-gradient(90deg, #12171a 0%, #3d4548 32%, #282f31 64%, #0d1113 100%);
    box-shadow: inset 0 -7px 9px rgba(0, 0, 0, 0.5);
  }
  /* The moulded ribs a thumb sits between. Worn shinier than the rest. */
  .knurl {
    position: absolute;
    left: 5px;
    right: 5px;
    top: 14px;
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
    /* Standing proud of the panel, not flush with it: a couple of centimetres
       of rubber above the deck is what says the shaft goes *through* it. The
       rest is behind the dash, where it belongs. */
    bottom: 12px;
    width: 28px;
    height: 28px;
    transform: translateX(-50%);
    clip-path: polygon(30% 0, 70% 0, 100% 100%, 0 100%);
    background:
      repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0 2px, transparent 2px 5px),
      linear-gradient(90deg, #0b0e0f 0%, #262c2e 42%, #14181a 100%);
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
  }
</style>
