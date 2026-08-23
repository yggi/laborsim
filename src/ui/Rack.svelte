<script lang="ts">
/**
 * The rail, minimal version. Signal flows **down** to the actuator terminal
 * at the bottom, so further down is closer to the machine.
 *
 * Deliberately not the full DIN-rail treatment yet (BOARD L-015): reordering
 * is up/down arrows rather than drag, because arrows are honest and reliable
 * on touch, and dragging is worth designing once there is more than one thing
 * to drag. What *is* here is the whole semantic model — order, verb, enable.
 *
 * Architecture rule 3: this edits a plain list and reads a snapshot. It never
 * touches the sim.
 */
import type { Module, Stage, Verb } from "../control/bus.ts";
import { VERBS } from "../control/bus.ts";

const {
  modules,
  stages,
  onchange,
}: {
  modules: Module[];
  stages: readonly Stage[];
  onchange: () => void;
} = $props();

const num = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

function move(index: number, by: number) {
  const to = index + by;
  if (to < 0 || to >= modules.length) return;
  const [held] = modules.splice(index, 1);
  if (held) modules.splice(to, 0, held);
  onchange();
}

function cycleVerb(module: Module) {
  const next = (VERBS.indexOf(module.verb) + 1) % VERBS.length;
  module.verb = VERBS[next] as Verb;
  onchange();
}

/** The one hot-patchable control every module has. */
function toggle(module: Module) {
  module.enabled = !module.enabled;
  onchange();
}

const stageOf = (id: string) => stages.find((s) => s.id === id);
</script>

<div class="rail">
  <div class="head">RACK — SIGNAL FLOWS DOWN</div>

  {#each modules as module, i (module.id)}
    {@const stage = stageOf(module.id)}
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

      <div class="out">
        {#if stage && module.enabled && !stage.idle}
          {num(stage.output.left)}<br />{num(stage.output.right)}
        {:else}
          &mdash;<br />&mdash;
        {/if}
      </div>
    </div>
  {/each}

  <div class="terminal">
    <span>L TRACK</span><span>R TRACK</span>
  </div>
</div>

<style>
  .rail {
    position: fixed;
    left: 10px;
    top: calc(env(safe-area-inset-top) + 128px);
    width: 246px;
    background: rgba(16, 19, 21, 0.94);
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
    font: 9px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #c6d0cb;
  }
  .head {
    padding: 4px 7px;
    font-size: 8px;
    letter-spacing: 0.14em;
    color: #6d7a76;
    background: #23282a;
  }
  .slot {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 5px;
    border-top: 1px solid #0d1012;
    border-left: 3px solid #6fe3c4;
  }
  .slot.idle {
    border-left-color: #f0a830;
  }
  .slot.off {
    border-left-color: #3a4240;
    opacity: 0.55;
  }
  .order {
    display: flex;
    flex-direction: column;
  }
  .order button {
    font: inherit;
    font-size: 7px;
    line-height: 1;
    padding: 1px 3px;
    color: #c6d0cb;
    background: #23282a;
    border: 1px solid #0d1012;
  }
  .order button:disabled {
    opacity: 0.25;
  }
  .led {
    width: 12px;
    height: 12px;
    flex: none;
    padding: 0;
    border: 1px solid #0d1012;
    background: #6fe3c4;
    box-shadow: 0 0 5px #6fe3c4;
  }
  .idle .led {
    background: #f0a830;
    box-shadow: 0 0 5px #f0a830;
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
    letter-spacing: 0.06em;
  }
  .considers {
    font-size: 7.5px;
    color: #6d7a76;
  }
  .verb {
    font: inherit;
    letter-spacing: 0.1em;
    color: #14171a;
    background: #e8b53a;
    border: 1px solid #0d1012;
    padding: 3px 4px;
    flex: none;
  }
  .verb:disabled {
    color: #6d7a76;
    background: #23282a;
  }
  .out {
    width: 38px;
    flex: none;
    text-align: right;
    color: #6fe3c4;
  }
  .terminal {
    display: flex;
    justify-content: space-between;
    padding: 4px 7px;
    font-size: 7.5px;
    letter-spacing: 0.1em;
    color: #6d7a76;
    background: #23282a;
    border-top: 2px solid #6fe3c4;
  }
</style>
