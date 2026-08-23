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
 * Signal flows **down** the rail to an actuator terminal at the bottom.
 *
 * Not the full DIN-rail treatment yet (BOARD L-015): reordering is arrows
 * rather than drag. What is here is the whole semantic model — order, verb,
 * enable — plus immediate strength feedback, which is the part you read while
 * driving rather than while thinking.
 *
 * Architecture rule 3: edits a plain list, reads a snapshot. Never the sim.
 */
import type { Module, Stage, Verb } from "../control/bus.ts";
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
      {@const driving = module.enabled && stage && !stage.idle}
      <div class="slot" class:off={!module.enabled} class:idle={stage?.idle}>
        <div class="order">
          <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="move up">▲</button>
          <button
            onclick={() => move(i, 1)}
            disabled={i === modules.length - 1}
            aria-label="move down">▼</button
          >
        </div>

        <button class="led" onclick={() => toggle(module)} aria-label="enable {module.label}"
        ></button>

        <div class="body">
          <div class="name">{module.label}</div>
          <div class="considers">{module.considers}</div>
        </div>

        <button class="verb" onclick={() => cycleVerb(module)} disabled={!module.enabled}>
          {module.verb}
        </button>

        <!-- Output strength, as a pair of meters. This is the part you read
             at a glance; the numbers below are for diagnosing, not driving. -->
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
  .slots {
    flex: 1;
    overflow-y: auto;
  }
  .slot {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px;
    border-top: 1px solid #0d1012;
    border-left: 4px solid #6fe3c4;
  }
  .slot.idle {
    border-left-color: #f0a830;
  }
  .slot.off {
    border-left-color: #3a4240;
    opacity: 0.6;
  }
  .order {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .order button {
    font: inherit;
    font-size: 9px;
    line-height: 1;
    padding: 4px 6px;
    color: #c6d0cb;
    background: #23282a;
    border: 1px solid #0d1012;
  }
  .order button:disabled {
    opacity: 0.25;
  }
  .led {
    width: 20px;
    height: 20px;
    flex: none;
    padding: 0;
    border: 1px solid #0d1012;
    border-radius: 2px;
    background: #6fe3c4;
    box-shadow: 0 0 8px #6fe3c4;
  }
  .idle .led {
    background: #f0a830;
    box-shadow: 0 0 8px #f0a830;
  }
  .off .led {
    background: #0d1012;
    box-shadow: none;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  .name {
    letter-spacing: 0.08em;
  }
  .considers {
    font-size: 9px;
    color: #6d7a76;
  }
  .verb {
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: #14171a;
    background: #e8b53a;
    border: 1px solid #0d1012;
    padding: 6px 7px;
    flex: none;
  }
  .verb:disabled {
    color: #6d7a76;
    background: #23282a;
  }
  .meters {
    width: 86px;
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
    background: #6fe3c4;
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
