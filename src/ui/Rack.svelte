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
            <span class="wordmark">{style.wordmark}</span>
            <span class="name">{module.label}</span>
          </div>
          <div class="considers">{module.considers}</div>

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
    display: flex;
    align-items: stretch;
    gap: 0;
    margin: 3px 0;
    background: var(--plate);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    border-bottom: 1px solid #05080a;
  }
  .ear {
    width: 16px;
    flex: none;
    background: var(--bezel);
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
    padding: 7px 9px;
    border-left: 3px solid var(--accent);
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
    align-items: baseline;
    gap: 7px;
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
    margin-top: 1px;
  }

  /* House styles. Same parts, arranged the way each maker arranges them. */
  .stack .ident {
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
  .stack .considers {
    text-align: center;
  }
  .boxed .ident {
    border: 1px solid var(--accent);
    padding: 2px 6px;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    background: rgba(0, 0, 0, 0.35);
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
    gap: 7px;
    padding: 7px 8px 7px 0;
  }
  .led {
    width: 18px;
    height: 18px;
    flex: none;
    padding: 0;
    border: 1px solid #05080a;
    border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
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
    background: var(--accent);
    border: 1px solid #05080a;
    padding: 6px 7px;
    flex: none;
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
