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
 * Architecture rule 3: edits a plain list, reads a snapshot. Never the sim.
 */
import type { Module, Param, Stage, Verb } from "../control/bus.ts";
import { VERBS } from "../control/bus.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import { styleOf } from "./makers.ts";

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

const stageOf = (id: string): Stage | undefined => stages.find((s) => s.id === id);
const terminal = $derived(stages.at(-1)?.output ?? { left: 0, right: 0 });
</script>

<div class="rack">
  <div class="head">
    <span>RACK &mdash; SIGNAL FLOWS DOWN</span>
    <span class="warn">EYES OFF THE GLASS</span>
  </div>

  <div class="slots">
    {#each modules as module, i (module.id)}
      {@const stage = stageOf(module.id)}
      {@const style = styleOf(module.maker)}
      {@const driving = module.enabled && stage && !stage.idle}
      <div
        class="slot {style.layout}"
        class:off={!module.enabled}
        class:idle={stage?.idle}
        style="--plate: {style.plate}; --bezel: {style.bezel}; --face: {style.face}; --accent: {style.accent}"
      >
        <!-- Rack ears. Screws, because a thing you can unbolt is a thing
             somebody bolted in. -->
        <div class="ear">
          <span class="screw"></span>
          <span class="screw"></span>
        </div>

        <div class="plate">
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

        <div class="controls">
          <button class="led" onclick={() => toggle(module)} aria-label="enable {module.label}"
          ></button>
          <button class="verb" onclick={() => cycleVerb(module)} disabled={!module.enabled}>
            {module.verb}
          </button>

          <!-- Output strength, as a pair of meters. This is the part you read
               at a glance; the numbers are for diagnosing, not driving. -->
          <div class="meters">
            {#each [["L", stage?.output.left ?? 0], ["R", stage?.output.right ?? 0]] as const as [side, value] (side)}
              <div class="meter">
                <span class="cap">{side}</span>
                <span class="bar">
                  <span
                    class="fill"
                    class:rev={value < 0}
                    style="width: {driving ? strength(value) * 100 : 0}%"
                  ></span>
                </span>
                {#if debug}<span class="val">{num(value)}</span>{/if}
              </div>
            {/each}
          </div>
        </div>

        <div class="ear order">
          <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="move up">▲</button>
          <button
            onclick={() => move(i, 1)}
            disabled={i === modules.length - 1}
            aria-label="move down">▼</button
          >
        </div>
      </div>
    {/each}
  </div>

  <div class="terminal">
    <span>ACTUATOR TERMINAL</span>
    <div class="meters wide">
      {#each [["L TRACK", terminal.left], ["R TRACK", terminal.right]] as const as [name, value] (name)}
        <div class="meter">
          <span class="cap">{name}</span>
          <span class="bar">
            <span class="fill out" class:rev={value < 0} style="width: {strength(value) * 100}%"
            ></span>
          </span>
          {#if debug}<span class="val">{num(value)}</span>{/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .rack {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: 26vh;
    display: flex;
    flex-direction: column;
    background: #14171a;
    border-top: 3px solid #0d1012;
    box-shadow: 0 -14px 26px rgba(0, 0, 0, 0.6);
    font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #c6d0cb;
    padding-bottom: env(safe-area-inset-bottom);
    /* A pinch of film grain, generated not sampled. The world is allowed to
       look like a simulation (contour lines); the cockpit is not, so the panels
       get the wear a real cabinet has. feTurbulence is the old 2D trick, laid
       over everything at soft-light so it reads as texture, never as dirt. */
    --noise: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .head {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    font-size: 9px;
    letter-spacing: 0.16em;
    color: #6d7a76;
    background: #23282a;
  }
  .head .warn {
    color: #f0a830;
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
  .slot {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 0;
    margin: 4px 5px;
    background: var(--plate);
    border-radius: 3px;
    /* Physical: a lit top edge, a shadowed bottom edge, and a real drop so the
       plate sits proud of the cabinet rather than being painted on it. */
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.55),
      0 2px 4px rgba(0, 0, 0, 0.55);
  }
  /* Grain, over the plate but under nothing you touch. */
  .slot::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 3px;
    background-image: var(--noise);
    background-size: 90px 90px;
    mix-blend-mode: soft-light;
    opacity: 0.5;
    pointer-events: none;
  }
  .ear {
    width: 16px;
    flex: none;
    /* Brushed steel upright, lit from the left the way a real one would be. */
    background:
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 0 1px,
        transparent 1px 3px
      ),
      linear-gradient(90deg, #2f3639 0%, var(--bezel) 55%, #0a0d0e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-evenly;
    padding: 5px 0;
  }
  .screw {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4a5254;
    box-shadow: inset 0 1px 0 #7d8a8c;
  }
  .order button {
    font: inherit;
    font-size: 8px;
    line-height: 1;
    padding: 3px 0;
    width: 14px;
    color: var(--face);
    background: #23282a;
    border: 1px solid #05080a;
  }
  .order button:disabled {
    opacity: 0.25;
  }

  .plate {
    flex: 1;
    min-width: 0;
    padding: 5px 8px;
    border-left: 3px solid var(--accent);
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
    stroke: var(--accent);
    stroke-width: 1.4;
    stroke-linejoin: round;
  }
  .silkscreen {
    margin-top: 2px;
    font-size: 7px;
    letter-spacing: 0.14em;
    color: color-mix(in srgb, var(--face) 34%, transparent);
  }
  .wordmark {
    font-size: 7px;
    letter-spacing: 0.2em;
    color: var(--accent);
    opacity: 0.85;
    white-space: nowrap;
  }
  .name {
    white-space: nowrap;
    font-size: 13px;
    letter-spacing: 0.1em;
    color: var(--face);
  }
  .considers {
    font-size: 9px;
    color: #78827f;
    margin-top: 0;
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
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    border-left: 2px solid var(--accent);
  }
  /* HANSA: everything in a bordered field, because everything is a rating. */
  .boxed .ident {
    border: 1px solid var(--accent);
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
  .boxed .verb {
    border-radius: 0;
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.4);
  }
  .boxed .led {
    border-radius: 0;
    border-width: 2px;
  }
  .stack .led {
    border-radius: 50%;
  }
  .stack .verb {
    border-radius: 9px;
  }
  .boxed .plate {
    border-left-width: 6px;
    border-image: repeating-linear-gradient(
        45deg,
        var(--accent) 0 4px,
        #12100c 4px 8px
      )
      1;
  }

  /* -- settings ---------------------------------------------------------- */
  .params {
    margin-top: 5px;
    display: flex;
    flex-direction: column;
    gap: 3px;
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
    width: 58px;
    flex: none;
  }
  .pval {
    width: 30px;
    text-align: right;
    color: var(--face);
  }
  .param input {
    flex: 1;
    min-width: 0;
    height: 18px;
    accent-color: var(--accent);
  }

  /* -- controls ---------------------------------------------------------- */
  .controls {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 7px 5px 0;
  }
  .led {
    width: 18px;
    height: 18px;
    flex: none;
    padding: 0;
    border: 1px solid #05080a;
    border-radius: 2px;
    background:
      radial-gradient(50% 42% at 38% 32%, rgba(255, 255, 255, 0.7), transparent 60%),
      var(--accent);
    box-shadow:
      0 0 8px var(--accent),
      inset 0 -1px 2px rgba(0, 0, 0, 0.45);
  }
  .idle .led {
    background: #f0a830;
    box-shadow: 0 0 8px #f0a830;
  }
  .off .led {
    background: #0d1012;
    box-shadow: none;
  }
  .verb {
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: #14171a;
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 82%, white), var(--accent));
    border: 1px solid #05080a;
    border-radius: 2px;
    /* A real key: lit top, a seat of shadow under it. */
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      0 1px 2px rgba(0, 0, 0, 0.5);
    padding: 6px 7px;
    flex: none;
  }
  .verb:active:not(:disabled) {
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  .verb:disabled {
    color: #6d7a76;
    background: #23282a;
  }
  .meters {
    width: 78px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .meters.wide {
    width: 190px;
  }
  .meter {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 8px;
    color: #6d7a76;
  }
  .cap {
    width: 10px;
  }
  .meters.wide .cap {
    width: 44px;
  }
  .bar {
    flex: 1;
    height: 7px;
    background: #0d1012;
    border: 1px solid #23282a;
    display: block;
    position: relative;
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--accent);
    transition: width 0.08s linear;
  }
  .fill.out {
    background: #e8b53a;
  }
  .fill.rev {
    background: #e0503c;
  }
  .val {
    width: 34px;
    text-align: right;
    color: #6d7a76;
  }
  .terminal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    font-size: 9px;
    letter-spacing: 0.14em;
    color: #6d7a76;
    background: #23282a;
    border-top: 3px solid #6fe3c4;
  }
</style>
