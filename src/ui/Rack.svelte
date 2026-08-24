<script lang="ts">
/**
 * The rail — seen by **looking down** at it, not by opening a panel.
 *
 * The viewport slides up so only a strip of windscreen shows at the top, and
 * the rack fills what is left. That is the posture it describes: you have
 * dropped your eyes from the glass to the cabinet between your knees, and
 * while you are reading it you are not watching where you are going. The
 * machine keeps running the whole time — the same bargain as the chase view.
 *
 * It is a **server rack, not a DIN rail**: modules are faceplates stacked
 * vertically between two uprights, each screwed in, each from whoever built
 * it. Signal flows **down** the stack to an actuator terminal at the bottom.
 *
 * Not the full treatment yet (BOARD L-015): reordering is arrows rather than
 * drag. What is here is the whole semantic model — order, verb, enable,
 * settings — plus immediate strength feedback, which is the part you read
 * while driving rather than while thinking.
 *
 * There is no close button here. The dash's latch is the only way in and out,
 * because it *is* the latch — one handle on the seam, the way a hood has one.
 *
 * Architecture rule 3: edits a plain list, reads a snapshot. Never the sim.
 */

import { styleOf } from "../cockpit/makers.ts";
import { faceFor, unitsFor } from "../cockpit/parts.ts";
import type { Module, Param, Stage, Verb } from "../control/bus.ts";
import { VERBS } from "../control/bus.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";

const {
  modules,
  snapshot,
  onchange,
  debug = false,
}: {
  modules: Module[];
  snapshot: Snapshot | undefined;
  onchange: () => void;
  debug?: boolean;
} = $props();

const stages = $derived(snapshot?.stages ?? []);
const num = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

/** Signal strength as a fraction of what the drivetrain can take. */
const strength = (v: number) => Math.min(1, Math.abs(v) / MAX_TRACK_SPEED);

function move(index: number, by: number) {
  const to = index + by;
  if (to < 0 || to >= modules.length) return;
  const [held] = modules.splice(index, 1);
  if (held) modules.splice(to, 0, held);
  onchange();
}

function cycleVerb(module: Module) {
  module.verb = VERBS[(VERBS.indexOf(module.verb) + 1) % VERBS.length] as Verb;
  onchange();
}

/** The one hot-patchable control every module has. */
function toggle(module: Module) {
  module.enabled = !module.enabled;
  onchange();
}

/**
 * Live mirror of every setting, so turning a knob does not rebuild the rack.
 * Order, verb and enable each change what the rail *is* and call `onchange`;
 * a setting does not, and remounting mid-drag would drop the thumb that is
 * dragging it. The module stays the owner — this only echoes what it accepted.
 */
const shown = $state<Record<string, number>>({});
const keyOf = (module: Module, param: Param) => `${module.id}:${param.id}`;
const settingOf = (module: Module, param: Param) =>
  shown[keyOf(module, param)] ?? param.get();

function setParam(module: Module, param: Param, value: number) {
  param.set(value);
  shown[keyOf(module, param)] = param.get();
}

/**
 * The fuse carrier at the bottom of the cabinet. Fixed, not random: rule 2 bans
 * `Math.random` anywhere sim-visible, and while a decorative fuse is not sim
 * state, a cockpit that reshuffles itself between replays of the same run is
 * exactly the kind of thing that makes a recording untrustworthy. One blown
 * fuse, always the same one, because a machine this old has one.
 */
const FUSES = [1, 1, 0, 1, 1, 1, 1, 1];

/** What a face is handed before the first snapshot arrives. */
const EMPTY_STAGE: Stage = {
  id: "",
  label: "",
  maker: "",
  verb: "SET",
  enabled: false,
  idle: true,
  output: { left: 0, right: 0 },
  condition: 0,
  safety: false,
};

const stageOf = (id: string): Stage | undefined => stages.find((s) => s.id === id);
const terminal = $derived(stages.at(-1)?.output ?? { left: 0, right: 0 });
</script>

<div class="rack">
  <div class="slots">
    {#each modules as module, i (module.id)}
      {@const stage = stageOf(module.id)}
      {@const style = styleOf(module.maker)}
      {@const driving = module.enabled && stage && !stage.idle}
      {@const units = unitsFor(module.id)}
      {@const Face = faceFor(module.id)}
      <div
        class="slot {style.layout} mfg-proud mfg-grain"
        class:off={!module.enabled}
        class:idle={stage?.idle}
        data-u={units}
        style="--mfg-plate: {style.plate}; --mfg-bezel: {style.bezel}; --mfg-face: {style.face}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
      >
        <!-- POWER. The slot's, not the module's: nobody ships the fuse you
             power them through. Pulling it is how a component goes off. -->
        <div class="rail power mfg-rail">
          <button
            class="fuse"
            class:pulled={!module.enabled}
            onclick={() => toggle(module)}
            aria-label="enable {module.label}"
            aria-pressed={module.enabled}
          >
            <span class="cap"></span>
            <span class="glass" data-lit={module.enabled ? Math.max(1, stage?.condition ?? 1) : 0}></span>
            <span class="cap"></span>
          </button>

          <!-- Where the plate is bolted, and therefore where you move it. -->
          <div class="order">
            <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="move up">▲</button>
            <button
              onclick={() => move(i, 1)}
              disabled={i === modules.length - 1}
              aria-label="move down">▼</button
            >
          </div>
        </div>

        <div class="plate" class:tight={module.params?.length}>
          <div class="ident">
            <!-- The maker's mark. Graphic design belongs in SVG, not in more
                 CSS — see docs/design/instrument-rendering.md. -->
            <svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
              <path d={style.mark} />
            </svg>
            <span class="wordmark">{style.wordmark}</span>
            <span class="name">{module.label}</span>
          </div>
          <div class="considers">{module.considers}</div>
          <div class="silkscreen">{style.plateText}</div>

          {#if module.params?.length}
            <!-- Settings, on the faceplate where you turn them. Not a tuning
                 panel: bounded numbers with units, and only what the module
                 actually offers. -->
            <div class="params">
              {#each module.params as param (param.id)}
                <label class="param">
                  <span class="plabel">{param.label}</span>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={settingOf(module, param)}
                    disabled={!module.enabled}
                    oninput={(e) => setParam(module, param, e.currentTarget.valueAsNumber)}
                  />
                  <span class="pval">{settingOf(module, param)}{param.unit}</span>
                </label>
              {/each}
            </div>
          {/if}
        </div>

        <!-- The module's own interface, if it has one. Everything else on
             this slot belongs to the rack. -->
        {#if Face}
          <div class="face">
            <Face stage={stage ?? EMPTY_STAGE} {style} />
          </div>
        {/if}

        <!-- BUS. The slot's too: how this component folds into the signal, and
             what comes out. The mode switch lives under a cover, because
             changing what a fitted component *does* to the drive is not
             something you should be able to do by brushing it with a thumb. -->
        <div class="rail bus">
          <div class="mode">
            <button
              class="modeswitch"
              onclick={() => cycleVerb(module)}
              disabled={!module.enabled}
              aria-label="mode for {module.label}"
            >
              {module.verb}
            </button>
            <span class="cover" class:open={module.enabled}></span>
          </div>

          <div class="meters">
            {#each [["L", stage?.output.left ?? 0], ["R", stage?.output.right ?? 0]] as const as [side, value] (side)}
              <span class="bar mfg-meter" title={debug ? `${side} ${num(value)}` : undefined}>
                <span
                  class="mfg-meter-fill"
                  data-rev={value < 0}
                  style="width: {driving ? strength(value) * 100 : 0}%"
                ></span>
              </span>
            {/each}
          </div>

        </div>
      </div>
    {/each}

    <!-- The bottom of the cabinet. Not decoration: it is the thing that says
         you have your head *under the hood* rather than in a menu. Everything
         above is kit somebody chose; this is what was already in there. -->
    <div class="furniture" aria-hidden="true">
      <svg class="loom" viewBox="0 0 300 120" preserveAspectRatio="none">
        <defs>
          <filter id="loom-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <!-- A loom dropping out of the plates above and disappearing behind
             the terminal. Out of focus, because your eyes are on the plates. -->
        <g filter="url(#loom-blur)">
          <path d="M42 -10 C46 30 22 52 30 92 C34 112 30 118 26 130" />
          <path class="brown" d="M58 -10 C62 26 38 56 48 96 C52 116 50 122 46 132" />
          <path class="blue" d="M74 -10 C80 34 58 60 70 100 C74 118 74 124 70 134" />
          <path d="M262 -10 C256 28 274 54 266 94 C262 114 266 120 270 130" />
          <path class="brown" d="M246 -10 C240 32 258 62 250 98 C246 118 248 124 252 132" />
        </g>
        <!-- The tie that holds it to the cabinet wall. -->
        <rect class="tie" x="24" y="62" width="56" height="5" rx="2" />
        <rect class="tie" x="238" y="66" width="40" height="5" rx="2" />
      </svg>

      <!-- A fuse carrier. The most boring object in any machine, and the one
           that most says a machine is what you are looking into. -->
      <div class="fusebox">
        <span class="fusebox-lip"></span>
        <div class="fuses">
          {#each FUSES as fuse, i (i)}
            <span class="fuse" class:blown={fuse === 0}></span>
          {/each}
        </div>
        <span class="mfg-legend fuse-plate">FUSES 15A</span>
      </div>
    </div>
  </div>

  <!-- The terminal. It is the bottom of the stack and it is wired to the
       tracks; nothing needs to say so. -->
  <div class="terminal">
    {#each [["L", terminal.left], ["R", terminal.right]] as const as [side, value] (side)}
      <div class="out">
        <span class="side">{side}</span>
        <span class="bar mfg-meter">
          <span
            class="mfg-meter-fill out-fill"
            data-rev={value < 0}
            style="width: {strength(value) * 100}%"
          ></span>
        </span>
        {#if debug}<span class="val">{num(value)}</span>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  /* In flow, below the dash, inside the travelling deck (App.svelte). The dash
     is the seam: it is overhead while you are reading this. */
  .rack {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #14171a;
    border-top: 3px solid #0d1012;
    box-shadow: 0 -14px 26px rgba(0, 0, 0, 0.6);
    font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #c6d0cb;
    padding-bottom: env(safe-area-inset-bottom);
  }
  /* The cabinet interior the faceplates are screwed into. */
  .slots {
    flex: 1;
    overflow-y: auto;
    background:
      linear-gradient(90deg, #0a0d0e 0 16px, transparent 16px),
      linear-gradient(270deg, #0a0d0e 0 16px, transparent 16px), #0f1214;
    padding: 4px 0;
  }

  /* -- one faceplate ----------------------------------------------------- */
  /* Proud, grained and railed by the substrate — those are the physics of a
     panel and they belong to every maker, not to this stylesheet.

     A rack has a pitch, so plates are whole units tall (docs: parts.ts). The
     height is fixed and the content is clipped: a faceplate that does not fit
     its unit has too much on it, which is the standard doing its job. */
  .slot {
    --u: 46px;
    display: flex;
    align-items: stretch;
    gap: 0;
    margin: 4px 5px;
    background: var(--mfg-plate);
    border-radius: 3px;
    overflow: hidden;
  }
  .slot[data-u="1"] {
    height: var(--u);
  }
  .slot[data-u="2"] {
    height: calc(var(--u) * 2);
  }
  /* At one unit there is no room for the rating line, and it is the least
     load-bearing thing on the plate. */
  .slot[data-u="1"] .silkscreen {
    display: none;
  }

  .plate {
    flex: 1;
    min-width: 0;
    padding: 5px 8px;
    border-left: 3px solid var(--mfg-accent);
    /* Stamped sheet: a faint top highlight and a wash of vent slots. */
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 22%),
      repeating-linear-gradient(
        90deg,
        transparent 0 6px,
        rgba(0, 0, 0, 0.14) 6px 7px
      );
    background-blend-mode: normal;
  }
  .idle .plate {
    border-left-color: #f0a830;
  }
  .off .plate {
    border-left-color: #3a4240;
  }
  .off {
    opacity: 0.62;
  }
  .ident {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mark {
    width: 13px;
    height: 13px;
    flex: none;
    fill: none;
    stroke: var(--mfg-accent);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .silkscreen {
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 7px;
    letter-spacing: 0.14em;
    color: color-mix(in srgb, var(--mfg-face) 34%, transparent);
  }
  .wordmark {
    font-size: 7px;
    letter-spacing: 0.2em;
    color: var(--mfg-accent);
    opacity: 0.85;
    white-space: nowrap;
  }
  .name {
    white-space: nowrap;
    font-size: 13px;
    letter-spacing: 0.1em;
    color: var(--mfg-face);
  }
  .considers {
    font-size: 9px;
    color: #78827f;
    margin-top: 0;
    /* Two lines at most. The sentence matters (it is the attribution rule on
       the faceplate), but not enough to push a plate past its unit. */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  /* House styles. Same parts, arranged the way each maker arranges them. */
  /* TOWA: centred, glassy, consumer-electronics. */
  .stack .ident {
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
  .stack .considers,
  .stack .silkscreen {
    text-align: center;
  }
  .stack .plate {
    border-left-width: 1px;
    border-radius: 0 4px 4px 0;
    background:
      radial-gradient(120% 90% at 50% 0%, rgba(111, 227, 196, 0.09), transparent 70%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 30%);
  }
  .stack .mark {
    width: 15px;
    height: 15px;
  }

  /* KIBA: stamped steel, the wordmark punched into the plate. */
  .strip .wordmark {
    padding: 1px 4px;
    background: color-mix(in srgb, var(--mfg-accent) 22%, transparent);
    border-left: 2px solid var(--mfg-accent);
  }
  /* HANSA: everything in a bordered field, because everything is a rating. */
  .boxed .ident {
    border: 1px solid var(--mfg-accent);
    padding: 2px 6px;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    background: rgba(0, 0, 0, 0.35);
  }
  .boxed .mark {
    position: absolute;
    right: 8px;
    width: 22px;
    height: 22px;
    opacity: 0.5;
  }
  .boxed .plate {
    position: relative;
  }
  .boxed .silkscreen {
    letter-spacing: 0.18em;
  }
  .boxed .plate {
    border-left-width: 6px;
    border-image: repeating-linear-gradient(
        45deg,
        var(--mfg-accent) 0 4px,
        #12100c 4px 8px
      )
      1;
  }

  /* -- settings ---------------------------------------------------------- */
  /**
   * A plate with settings loses its rating line.
   *
   * Two units is two units. Something has to give, and the silkscreen is the
   * least load-bearing thing on a faceplate — it is a part number, and HANSA's
   * standard is on its dashboard plate anyway. The settings are the reason the
   * component has a second unit in the first place.
   *
   * The first attempt split the plate into identity-left / settings-right, the
   * way a real faceplate with pots is arranged. It overlapped at 390px, because
   * a bordered identity block will not shrink below its own text. Worth knowing
   * before anyone tries it again on a wider chassis.
   */
  .plate.tight .silkscreen {
    display: none;
  }
  /* And one line of prose rather than two. The sentence still lands; a
     component with knobs has simply spent its second unit on the knobs. */
  .plate.tight .considers {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
  .params {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .param {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 8px;
    letter-spacing: 0.1em;
    color: #78827f;
  }
  .plabel {
    width: 32px;
    flex: none;
    font-size: 7px;
    white-space: nowrap;
  }
  .pval {
    width: 22px;
    text-align: right;
    color: var(--mfg-face);
    font-size: 7px;
  }
  .param input {
    flex: 1;
    min-width: 0;
    height: 14px;
    accent-color: var(--mfg-accent);
  }

  /* -- controls ---------------------------------------------------------- */
  /* -- the two rails ----------------------------------------------------- */
  /* Both belong to the *slot*, identically for every component, because that is
     what a rack is: a standard you plug things into. A module owns its style
     and its own face and nothing else (docs: src/cockpit/face.ts). */
  .rail {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 3px;
  }
  .rail.power {
    width: 22px;
    gap: 4px;
  }
  .rail.bus {
    width: 70px;
    gap: 4px;
    justify-content: space-between;
    background:
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.04) 0 1px,
        transparent 1px 3px
      ),
      linear-gradient(90deg, #0a0d0e, #1b2022 60%, #12171a);
    border-left: 1px solid #05080a;
  }

  /* POWER — a cartridge fuse in a holder. Pulling it is how a component goes
     off, which is the same gesture as the carrier at the bottom of the
     cabinet, because it is the same object. */
  .fuse {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 2px 1px;
    border: none;
    border-radius: 2px;
    background: linear-gradient(180deg, #23282a, #14181a);
    box-shadow: inset 0 0 0 1px #05080a;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .fuse .cap {
    width: 10px;
    height: 3px;
    border-radius: 1px;
    background: linear-gradient(180deg, #9aa3a5, #5c6466);
  }
  .fuse .glass {
    width: 10px;
    height: 15px;
    border-radius: 1px;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.3), transparent 55%),
      #16191b;
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.8);
  }
  .fuse .glass[data-lit="1"] {
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.4), transparent 55%),
      var(--mfg-active);
    box-shadow: 0 0 7px var(--mfg-active);
  }
  .fuse .glass[data-lit="2"] {
    background: var(--mfg-warn);
    box-shadow: 0 0 7px var(--mfg-warn);
  }
  .fuse .glass[data-lit="3"] {
    background: var(--mfg-alarm);
    box-shadow: 0 0 8px var(--mfg-alarm);
  }
  /* Pulled halfway out of the holder, the way you actually isolate something. */
  .fuse.pulled {
    transform: translateY(-3px);
    box-shadow:
      inset 0 0 0 1px #05080a,
      0 3px 4px rgba(0, 0, 0, 0.6);
  }

  /* BUS — mode, output, order. */
  .mode {
    position: relative;
    width: 100%;
  }
  .modeswitch {
    display: block;
    width: 100%;
    font: inherit;
    font-size: 10px;
    letter-spacing: 0.12em;
    color: #14171a;
    background: linear-gradient(180deg, #9aa3a5, #6d7678);
    border: 1px solid #05080a;
    border-radius: 1px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
    padding: 3px 0;
    cursor: pointer;
  }
  .modeswitch:disabled {
    color: #4a5254;
    background: #23282a;
    box-shadow: none;
  }
  /* A hinged cover over the mode switch. What a fitted component *does* to the
     drive is not something a thumb should change in passing, so it is behind a
     flap — and the flap is only up while the component is powered, because
     there is nothing to set on a slot with the fuse pulled. */
  .cover {
    position: absolute;
    inset: -1px;
    border-radius: 1px;
    background:
      repeating-linear-gradient(
        -45deg,
        rgba(232, 181, 58, 0.5) 0 4px,
        rgba(20, 23, 26, 0.55) 4px 8px
      );
    border: 1px solid #05080a;
    transform-origin: top center;
    transition: transform 0.18s ease;
    pointer-events: none;
  }
  /* Hinged up and out of the way. Still visible, so you can see it is a cover. */
  .cover.open {
    transform: perspective(60px) rotateX(-72deg);
  }

  .meters {
    width: 100%;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .bar {
    display: block;
    width: 100%;
  }
  .order {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .order button {
    font: inherit;
    font-size: 7px;
    line-height: 1;
    padding: 1px 0;
    width: 14px;
    color: #8b968f;
    background: #23282a;
    border: 1px solid #05080a;
  }
  .order button:disabled {
    opacity: 0.25;
  }
  /* The module's own interface, when it has one. It gets the room it needs and
     the identity plate gives way, because the face is the part the maker built
     and the plate is the part everybody has. */
  .face {
    flex: none;
    display: flex;
    align-items: center;
    padding: 0 6px 0 0;
  }
  .slot:has(.face) .plate {
    min-width: 0;
  }
  .slot:has(.face) .considers {
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }
  /* The terminal is the machine's, not any module's, so it wears machine
     yellow rather than whoever drove it last. */
  .out {
    background: #e8b53a;
  }
  /* -- cabinet furniture ------------------------------------------------- */
  .furniture {
    position: relative;
    height: 120px;
    margin: 10px 5px 0;
    pointer-events: none;
  }
  .loom {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .loom path {
    fill: none;
    stroke: #0a0c0d;
    stroke-width: 3.5;
    opacity: 0.85;
  }
  .loom .brown {
    stroke: #241a12;
    stroke-width: 2.8;
  }
  .loom .blue {
    stroke: #101d2a;
    stroke-width: 2.4;
  }
  .loom .tie {
    fill: #171b1d;
    stroke: #0a0c0d;
    stroke-width: 1;
  }
  .fusebox {
    position: absolute;
    left: 50%;
    top: 16px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 7px 9px 6px;
    border-radius: 2px;
    background: linear-gradient(180deg, #23282a, #14181a);
    border: 1px solid #0a0d0e;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 3px 6px rgba(0, 0, 0, 0.6);
  }
  .fusebox-lip {
    width: 30px;
    height: 3px;
    border-radius: 2px;
    background: repeating-linear-gradient(90deg, #4a5254 0 2px, #23282a 2px 4px);
  }
  .fuses {
    display: flex;
    gap: 3px;
  }
  /* A glass cartridge with a metal cap at each end. */
  .fuse {
    width: 6px;
    height: 17px;
    border-radius: 1px;
    background:
      linear-gradient(180deg, #8d9698 0 4px, transparent 4px calc(100% - 4px), #8d9698 0),
      linear-gradient(90deg, rgba(255, 255, 255, 0.28), transparent 55%),
      #b98a2a;
    box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.6);
  }
  /* The one that has gone. Every machine has one. */
  .fuse.blown {
    background:
      linear-gradient(180deg, #8d9698 0 4px, transparent 4px calc(100% - 4px), #8d9698 0),
      #33302a;
  }
  .fuse-plate {
    font-size: 5px;
    letter-spacing: 0.14em;
  }

  /* The actuator terminal: what actually reaches the tracks. Its own layout —
     it shares nothing with the per-slot meters, which are a column inside a
     74px rail and were making this three hundred pixels tall. */
  .terminal {
    flex: none;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 7px 12px;
    background: #23282a;
    border-top: 3px solid #6fe3c4;
  }
  .out {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .side {
    flex: none;
    font-size: 9px;
    letter-spacing: 0.14em;
    color: #6d7a76;
  }
  .terminal .bar {
    flex: 1;
    min-width: 0;
  }
  /* Machine yellow: the terminal is the machine's, not any module's. */
  .out-fill {
    background: #e8b53a;
  }
  .val {
    flex: none;
    width: 34px;
    text-align: right;
    font-size: 8px;
    color: #6d7a76;
  }
</style>
