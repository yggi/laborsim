<script lang="ts">
/**
 * One track lever. Two of these, one per thumb, is the whole of rung 1's
 * control surface — tank steering, and you fight it to drive straight.
 *
 * It is a **stick**, not a slider: a shaft coming up out of the dashboard
 * through a rubber gasket, with a grip on the end. That is not decoration.
 * Principle 7 says the world may look like a simulation because it *is* one, and
 * the cab may not — the cab is the real thing you are sitting in, and a slider is
 * a thing on a screen. Nothing about how it is operated changed: same place,
 * same throw, same dead zone.
 *
 * **No housing.** It had a bezel — a box with a border and a background — and a
 * box is the last thing left of a widget. A real travel lever stands in the
 * open, in front of the glass, bolted to the console it comes out of, and that
 * is the whole difference between an overlay and a cockpit. What is left is a
 * shaft, a grip, a gasket, and the detent mark that makes HALT a place.
 *
 * **It moves at the foot as well as at the grip.** A lever pivots somewhere
 * under the deck, so the point where the shaft crosses the floor travels too —
 * a little, in the same direction as the grip, which is the parallax that says
 * *pivot* rather than *piston*. With the foot pinned it was a rod going up and
 * down a hole. The gasket it moves in is elongated along the throw for the same
 * reason: a slot has a direction, and the direction is fore and aft.
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
  side,
  value,
  onchange,
}: {
  label: string;
  /** Which corner of the glass it stands in. The throw leans toward the middle
   *  of the view, and which way that is depends on where you are sitting. */
  side: "left" | "right";
  value: number;
  onchange: (v: number) => void;
} = $props();

/** Below this, the lever reads as a deliberate halt rather than a slow creep. */
const DEAD_ZONE = 0.09;

/**
 * The console, in pixels, and the geometry of the lever standing in it.
 *
 * `H` is the *thumb's* travel and it is the only one the pointer maths reads —
 * a control wants a comfortable drag. The lever's own swing is deliberately
 * **smaller**: a 30 cm throw seen from the seat is not half a screen, and
 * drawing it that way is what made the rod stretch like a telescope. At full
 * back the grip used to arrive at the deck with no shaft left under it.
 */
const H = 196;
/** Where the shaft crosses the deck, and where the grip sits, at neutral. */
const FOOT_Y = 178;
const GRIP_Y = 74;
/** How far the grip travels up the glass at full forward. */
const SWING = 44;
/** ...and how far it leans toward the middle of the view while it does. A lever
 *  at the edge of the glass moves toward the vanishing point as it goes away. */
const LEAN = 15;
/** The share of all that the **foot** does. Small: the near end of a lever
 *  swings through the same angle over a much shorter arm. It is the parallax
 *  between the two ends that says *pivot* rather than *piston*. */
const FOOT_SHARE = 0.22;

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

/** Toward the middle of the glass is `+x` for the left lever and `−x` for the
 *  right one. Same lever, mirrored, because the seat is between them. */
const inward = $derived(side === "left" ? 1 : -1);

/** The two ends of the rod, in console pixels from its top-left. */
const grip = $derived({ x: value * LEAN * inward, y: GRIP_Y - value * SWING });
const foot = $derived({
  x: grip.x * FOOT_SHARE,
  y: FOOT_Y - value * SWING * FOOT_SHARE,
});
/** ...and the rod between them: how long it looks, and how far it is leaning. */
const rod = $derived(Math.hypot(grip.x - foot.x, foot.y - grip.y));
const lean = $derived((Math.atan2(grip.x - foot.x, foot.y - grip.y) * 180) / Math.PI);

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
    style="height: {H}px"
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

    <!-- The gasket: the rubber slot cover the shaft comes through, elongated
         along the throw. Drawn *before* the stick, so the shaft's cut end shows
         against the dark of the slot and you can see how far in it has gone. -->
    <div class="gasket"></div>

    <!-- The rod, standing on its foot and leaning: the box is the shaft itself,
         so its length is what the geometry says and its rotation is the lean. -->
    <div
      class="stick"
      style="left: calc(50% + {foot.x}px); bottom: {H - foot.y}px; height: {rod}px;
             transform: translateX(-50%) rotate({lean}deg)"
    >
      <div class="shaft"></div>
      <div class="grip" style="scale: {gripScale}">
        <div class="knurl"></div>
      </div>
    </div>

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
  /* Position, length and lean are all inline: the rod is geometry, not style. */
  .stick {
    position: absolute;
    width: 10px;
    transform-origin: 50% 100%;
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
  /* The cut end, catching a little light. Without it the shaft dissolves into
     the dark of the slot and there is nothing to see moving. */
  .shaft::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 0 0 2px 2px;
    background: linear-gradient(90deg, #2b3336, #7d888c 45%, #333b3e);
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
  /* The gasket: a rubber slot cover on the deck, **elongated along the throw**,
     because that is the direction the foot travels. Seen from the seat a
     fore-and-aft slot is foreshortened into a tall oval, and the dark of it is
     the hole the shaft goes down. Its lower rim runs behind the dash. */
  .gasket {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 36px;
    height: 50px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: linear-gradient(180deg, #3a4245 0%, #1d2325 42%, #0c1011 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 3px 6px rgba(0, 0, 0, 0.65);
  }
  /* The hole itself, and the shadow the deck casts into it. */
  .gasket::after {
    content: "";
    position: absolute;
    inset: 8px 9px;
    border-radius: 50%;
    background: #05080a;
    box-shadow: inset 0 4px 7px rgba(0, 0, 0, 0.95);
  }
</style>
