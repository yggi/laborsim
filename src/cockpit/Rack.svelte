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
 * Architecture rule 3: reads a snapshot, writes through `Controls`. Never the
 * sim, and — since L-032 — never a live module either. It used to `splice` the
 * rail and assign `module.verb` in place, which made the one part of the cockpit
 * that could reach a fitted component the same part that owns the two commands
 * the ledger most needs to know about. Both now leave as values, like every
 * other command in the cab, and arrive at a tick that can be written down.
 *
 * `modules` is still read — a param's bounds, label and unit are declared on the
 * module and are on no snapshot (L-054 is where that changes). Read to ask;
 * write through the channel.
 */

import type { Module, Param, Stage, Verb } from "../control/bus.ts";
import { VERBS } from "../control/bus.ts";
import type { Controls } from "../control/controls.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { MAX_TRACK_SPEED } from "../core/spec.ts";
import { styleOf } from "../makers/houses.ts";
import Decal from "./Decal.svelte";
import { ampsFor, faceFor, fuseColour, unitsFor } from "./parts.ts";

const {
  modules,
  snapshot,
  controls,
  debug = false,
}: {
  modules: readonly Module[];
  snapshot: Snapshot | undefined;
  controls: (id: string) => Controls;
  debug?: boolean;
} = $props();

const stages = $derived(snapshot?.stages ?? []);
const num = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

/** Signal strength as a fraction of what the drivetrain can take. */
const strength = (v: number) => Math.min(1, Math.abs(v) / MAX_TRACK_SPEED);

function move(index: number, by: number) {
  const to = index + by;
  const module = modules[index];
  if (!module || to < 0 || to >= modules.length) return;
  controls(module.id).reorder(to);
}

function cycleVerb(module: Module) {
  controls(module.id).setVerb(
    VERBS[(VERBS.indexOf(module.verb) + 1) % VERBS.length] as Verb,
  );
}

/** The one hot-patchable control every module has. */
function toggle(module: Module) {
  controls(module.id).toggle();
}

/**
 * Live mirror of every setting, so turning a knob does not rebuild the rack.
 * Order, verb and enable each change what the rail *is* and remount it; a
 * setting does not, and remounting mid-drag would drop the thumb that is
 * dragging it.
 *
 * It echoes what was **asked for** rather than what the module accepted, which
 * is the one thing the deferred channel changed here: the command lands a frame
 * later, so reading `param.get()` back in the same turn would show the previous
 * value and the thumb would snap backwards under your finger. The range input's
 * own `min`/`max`/`step` already bound what can be asked, and the module's `set`
 * is still what enforces it on the machine.
 */
const shown = $state<Record<string, number>>({});
const keyOf = (module: Module, param: Param) => `${module.id}:${param.id}`;
const settingOf = (module: Module, param: Param) =>
  shown[keyOf(module, param)] ?? param.get();

/**
 * A degree sign is set closed up against the number; a word is not. That is
 * typography and it belongs to the plate — the module owns the unit, the plate
 * owns how it is set, and a module writing `" PIN"` to buy itself a space would
 * be a module doing layout.
 */
const withUnit = (value: number, unit: string) =>
  `${value}${/^[a-z]/i.test(unit) ? " " : ""}${unit}`;

function setParam(module: Module, param: Param, value: number) {
  controls(module.id).setParam(param.id, value);
  shown[keyOf(module, param)] = value;
}

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
      {@const amps = ampsFor(module.id)}
      <div
        class="slot {style.layout} mfg-proud mfg-grain"
        class:off={!module.enabled}
        class:idle={stage?.idle}
        data-u={units}
        style="--mfg-plate: {style.plate}; --mfg-bezel: {style.bezel}; --mfg-face: {style.face}; --mfg-accent: {style.accent}; --mfg-active: {style.accent}"
      >
        <!-- POWER. The slot's, not the module's: nobody ships the fuse you
             power them through. Pulling it is how a component goes off, and the
             colour is the standard blade-fuse code, so the rating reads across
             the cabinet without anybody printing a number anywhere. -->
        <div class="rail power mfg-rail">
          <button
            class="fuse"
            class:pulled={!module.enabled}
            style="--cab-fuse: {fuseColour(amps)}"
            onclick={() => toggle(module)}
            aria-label="enable {module.label}"
            aria-pressed={module.enabled}
          >
            <span class="blade"></span>
            <span class="body">{amps}</span>
            <span class="blade"></span>
          </button>

          <!-- The circuit lamp, beside its fuse the way a fused distribution
               block has one per way. -->
          <span
            class="circuit mfg-lamp"
            data-lit={module.enabled ? Math.max(1, stage?.condition ?? 1) : 0}
          ></span>

          <!-- The terminal, and the wire going off into the cabinet. -->
          <span class="terminal-screw"></span>
        </div>

        <div class="plate" class:tight={module.params?.length}>
          <div class="ident">
            <!-- The maker's mark. Graphic design belongs in SVG, not in more
                 CSS — see doc/design/cab/instrument-rendering.md. -->
            <svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
              <path d={style.mark} />
            </svg>
            <span class="wordmark">{style.wordmark}</span>
            <span class="name">{module.label}</span>
          </div>
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
                  <span class="pval">{withUnit(settingOf(module, param), param.unit)}</span>
                </label>
              {/each}
            </div>
          {/if}
        </div>

        <!-- What the plate carries instead of a sentence: the marks a real part
             accumulates. HANSA has been to a test house and will not let you
             forget it; TOWA came out of a parts bin with a barcode on it; KIBA
             stamped it as passed and moved on. -->
        <div class="marks">
          {#if module.maker === "HANSA REGELTECHNIK"}
            <Decal kind="pruef" seed={module.id} tint={style.accent} width={24} />
          {:else if module.maker === "TOWA DENKI"}
            <Decal kind="bar" seed={module.id} width={30} />
          {:else}
            <Decal kind="qc" seed={module.id} tint={style.accent} width={28} />
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

          <div class="order">
            <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="move up">▲</button>
            <button
              onclick={() => move(i, 1)}
              disabled={i === modules.length - 1}
              aria-label="move down">▼</button
            >
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
    --cab-u: 46px;
    display: flex;
    align-items: stretch;
    gap: 0;
    margin: 4px 5px;
    background: var(--mfg-plate);
    border-radius: 3px;
    overflow: hidden;
  }
  .slot[data-u="1"] {
    height: var(--cab-u);
  }
  .slot[data-u="2"] {
    height: calc(var(--cab-u) * 2);
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
  /* Pull the fuse and the slot is dead — not dimmed, dead. Colour drains out of
     it, the plate goes grey, and the only thing still lit anywhere on it is
     nothing at all. A component running and a component switched off should not
     be a difference in *opacity*; that is a form disabling a field. */
  .off {
    filter: grayscale(0.85) brightness(0.52);
  }
  .off .plate {
    background-image: none;
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

  /* House styles. Same parts, arranged the way each maker arranges them. */
  /* TOWA: centred, glassy, consumer-electronics. */
  .stack .ident {
    flex-direction: column;
    align-items: center;
    gap: 0;
  }
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
  /* Sized for a degree reading, but it is a *minimum*: a unit that is a word
     ("1 PIN") must not wrap onto a second line inside a plate whose height is
     fixed by its rack units. It takes the width from the slider, which has it
     to give. */
  .pval {
    min-width: 22px;
    flex: none;
    white-space: nowrap;
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
     and its own face and nothing else (docs: src/cockpit/contract.ts). */
  .rail {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 3px;
  }
  /* A fuseway: one blade fuse, one circuit lamp, one terminal with the wire
     running off into the dark. The same object as the distribution block it
     would actually be wired through. */
  .rail.power {
    width: 30px;
    gap: 3px;
    /* The wire, leaving the terminal and disappearing into the cabinet. */
    background-image:
      radial-gradient(circle at 50% 100%, rgba(0, 0, 0, 0.55), transparent 62%),
      linear-gradient(
        180deg,
        transparent 62%,
        rgba(20, 14, 10, 0.9) 66% 70%,
        transparent 74%
      );
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

  /* A blade fuse. Translucent coloured plastic, the rating moulded into the
     top, two tinned blades going down into the holder. */
  .fuse {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .fuse .body {
    order: 1;
    width: 18px;
    padding: 3px 0 4px;
    border-radius: 2px 2px 1px 1px;
    /* Moulded plastic: bright where the light catches the shoulder, darker
       through the body, and translucent enough to see it is plastic. */
    background:
      linear-gradient(100deg, rgba(255, 255, 255, 0.5), transparent 42%),
      linear-gradient(180deg, var(--cab-fuse), color-mix(in srgb, var(--cab-fuse) 62%, #101314));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.45),
      inset 0 -2px 3px rgba(0, 0, 0, 0.3);
    font-size: 7px;
    line-height: 1;
    letter-spacing: 0;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
  }
  /* The blades. One shows above the body as the grip tab, one below in the
     holder — which is what makes it read as a thing you pull. */
  .fuse .blade {
    width: 12px;
    height: 4px;
    background: linear-gradient(90deg, #b9c0c2, #7f8789 55%, #5c6466);
  }
  .fuse .blade:first-child {
    order: 0;
    border-radius: 1px 1px 0 0;
  }
  .fuse .blade:last-child {
    order: 2;
    height: 5px;
    background: linear-gradient(90deg, #6f7679, #4a5254);
  }
  /* Pulled: lifted out of the holder, blades clear, and no longer conducting. */
  .fuse.pulled {
    transform: translateY(-4px);
    filter: saturate(0.35) brightness(0.72);
  }
  .fuse.pulled .blade:last-child {
    opacity: 0.35;
  }

  /* One lamp per way, beside its fuse. */
  .circuit {
    width: 7px;
    height: 7px;
    flex: none;
    border-width: 1px;
    border-radius: 50%;
  }
  /* A brass screw terminal. The wire leaves from here (see `.rail.power`). */
  .terminal-screw {
    width: 11px;
    height: 7px;
    flex: none;
    border-radius: 1px;
    background:
      radial-gradient(circle at 50% 40%, #2a2622 0 1.3px, transparent 1.6px),
      linear-gradient(180deg, #b9a15e, #7d6a34);
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.6);
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
  /* Stickers and stamps, bottom-right of the plate, applied by somebody in a
     hurry and never quite square to anything. */
  .marks {
    flex: none;
    display: flex;
    align-items: flex-end;
    padding: 0 5px 5px 0;
    opacity: 0.85;
    transform: rotate(-2.5deg);
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
