/**
 * The rack — a pipeline of modules, not a priority stack.
 *
 * Each module takes the signal from the module above it, combines it with its
 * own intent according to its **verb**, and passes the result down. The bottom
 * of the rail is the actuator terminal. Signal flows down; further down is
 * closer to the machine.
 *
 * This supersedes the earlier "highest active layer wins the bus" model, and it
 * is strictly more expressive: a module with verb SET ignores its input, which
 * *is* suppression. See doc/design/machine/arbitration.md.
 *
 * Ordering is the game. The same two modules in two orders are two different
 * machines — put the pilot above autonav and your levers become a governor on
 * it; put the pilot below and they become a trim on top of it.
 */

/** Commanded track surface speed, m/s, body frame. The signal on the bus. */
export interface TrackCommand {
  readonly left: number;
  readonly right: number;
}

/**
 * How a module folds its own intent into what reached it from above.
 *
 * **Three letters, always.** That is a deliberate cost on extension: the
 * vocabulary must stay small enough that a player can hold the whole chain in
 * their head, and a naming rule that makes a fifth verb awkward is a complexity
 * budget that enforces itself. Adding one should feel expensive.
 *
 *   SET — ignore the input, emit intent. (This is plain suppression.)
 *   CAP — emit intent, but never exceeding the magnitude that arrived.
 *   ADD — add intent to the input.
 *   AMP — multiply the input by intent, which is read as a gain.
 */
export type Verb = "SET" | "CAP" | "ADD" | "AMP";

export const VERBS: readonly Verb[] = ["SET", "CAP", "ADD", "AMP"];

/**
 * How worried the pilot should be about this module, right now.
 *
 * A **number**, not a word, because it crosses the one-directional snapshot
 * boundary and everything that crosses stays a plain value (rule 3). The word on
 * the annunciator is a *theme* decision — HANSA says `STÖRUNG` where KIBA says
 * `STOP` — and a theme decision has no business in sim state.
 *
 * MASTER WARNING is derived from `>= WARN` and MASTER ALARM from `>= ALARM`,
 * over every fitted component at once. Nothing is hand-wired to a named module,
 * which is what lets a new component light the dash without editing the dash.
 */
export const NOMINAL = 0;
export const ACTIVE = 1;
export const WARN = 2;
export const ALARM = 3;
export type Condition = typeof NOMINAL | typeof ACTIVE | typeof WARN | typeof ALARM;

/**
 * A number the pilot can turn on a fitted module.
 *
 * Deliberately thin: a bounded number with a name and a unit, nothing else. A
 * parameter is a setting on a component you bought, not a tuning knob on the
 * simulation — the gain-tuning trap (NOTES) is exactly what this must not
 * become, so there is no way to express a gain here and no plan to add one.
 */
export interface Param {
  readonly id: string;
  readonly label: string;
  /** Shown after the value. Display only; the module owns the real units. */
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  get(): number;
  set(value: number): void;
}

export interface Module {
  readonly id: string;
  /** Shown to the pilot. Never a bare id. */
  readonly label: string;
  /**
   * Who built it. Components come from different manufacturers, and the rail
   * shows that — different plates, different colours, different layouts. It is
   * cosmetic on purpose: a rack of mixed kit reads as equipment someone
   * assembled rather than as a menu the game drew.
   */
  readonly maker: string;
  /**
   * One honest sentence about what this module considers — and, by omission,
   * what it is blind to. Every automation module gets one, because a player
   * should be able to learn a component's envelope by watching rather than by
   * reading a tooltip.
   *
   * **It is not on the faceplate.** A module carries a manufacturer's label, not
   * a slogan, and a rack of plates each explaining itself in prose reads as a
   * form rather than as equipment. This belongs in the debrief, which is the one
   * place the machine is allowed to use words.
   */
  readonly considers: string;
  verb: Verb;
  /**
   * Disabling is the default hot-patchable control: a disabled module becomes
   * a pass-through, not a hole. The signal still reaches the terminal.
   */
  enabled: boolean;
  /**
   * Safety kit: something whose whole job is to stop you doing what you were
   * about to do. Bypassing one is a deliberate act with consequences, so its
   * cell carries no toggle — you have to open the rack and pop the hood.
   *
   * It also means a *disabled* slot is not a quiet one: a bypassed guard stands
   * at WARN until it is put back, which is HANSA behaving exactly as designed.
   */
  readonly safety?: boolean;
  /** What this module wants, on its own terms. Null means nothing to say. */
  intent(): TrackCommand | null;
  /**
   * How worried to be about this module right now. Optional: a module that does
   * not answer is read from its own signal — idle is nominal, driving is active,
   * which is right for anything without an opinion about its own health.
   */
  condition?(): Condition;
  /**
   * Numbers this module publishes for its own instrument.
   *
   * Components ship mandatory instruments (doc/design/cab/cockpit.md), and an
   * instrument reads a snapshot rather than the live module — so whatever it
   * needs has to travel through here. Plain numbers only: this crosses the
   * one-directional boundary and has to stay a value.
   */
  readout?(): Readonly<Record<string, number>> | undefined;
  /** Settings on the faceplate. Omitted by modules that have none. */
  readonly params?: readonly Param[];
}

/** One module's contribution, kept so the chain can be read stage by stage. */
export interface Stage {
  readonly id: string;
  readonly label: string;
  /**
   * Carried through so the cockpit can style a slot off a *recording* rather
   * than off the live rack. It is what lets a replay render in the right house
   * style, and it is why the dash knows a KIBA machine has a KIBA dashboard
   * without anything hardcoding that.
   */
  readonly maker: string;
  readonly verb: Verb;
  readonly enabled: boolean;
  /** True when the module had nothing to say and simply passed the signal on. */
  readonly idle: boolean;
  readonly output: TrackCommand;
  /** Whatever the module publishes for its instrument. */
  readonly readout?: Readonly<Record<string, number>>;
  /** What the dash should make of this slot. See `Condition`. */
  readonly condition: Condition;
  /** Carried from the module so the cockpit can read it off a recording. */
  readonly safety: boolean;
}

/**
 * The id the **chassis component** takes: the machine itself, in the rack.
 *
 * The chassis is a slot like any other and it is also the one that brings the
 * cab, the glass, the dashboard and the noise — so two renderers need to find
 * it on a recording and ask *who built this machine*. The dash did it by
 * hand-written id to pick the panel's colours; the audio engine needs the same
 * answer to pick the machine's voice. Written twice, it is a fact with two
 * owners and one typo away from a cab styled by one maker and voiced by another.
 */
export const CHASSIS = "PILOT";

/** The chassis slot on a recording, if the machine had one fitted. */
export const chassisOf = (stages: readonly Stage[]): Stage | undefined =>
  stages.find((stage) => stage.id === CHASSIS);

export interface BusResult {
  readonly command: TrackCommand;
  readonly stages: readonly Stage[];
}

const HALT: TrackCommand = { left: 0, right: 0 };

const capTo = (value: number, limit: number): number => {
  const bound = Math.abs(limit);
  return value < -bound ? -bound : value > bound ? bound : value;
};

function combine(verb: Verb, input: TrackCommand, intent: TrackCommand): TrackCommand {
  switch (verb) {
    case "SET":
      return intent;
    case "CAP":
      // A lever at rest caps to zero, so parking the levers parks the machine
      // no matter what is driving it. That is a dead-man's throttle, and it
      // falls out of the verb rather than being a special case.
      return {
        left: capTo(intent.left, input.left),
        right: capTo(intent.right, input.right),
      };
    case "ADD":
      return { left: input.left + intent.left, right: input.right + intent.right };
    case "AMP":
      return { left: input.left * intent.left, right: input.right * intent.right };
  }
}

/**
 * Run the chain from the top of the rail to the actuator terminal.
 *
 * The signal starts at halt: an empty rack, or a rack of disabled modules,
 * leaves the machine stopped rather than in an undefined state.
 *
 * Every module produces a stage even when it does nothing, because the
 * attribution rule needs the whole chain visible — a module that silently
 * dropped out is exactly the dead control the rule exists to prevent.
 */
export function runRack(modules: readonly Module[]): BusResult {
  const stages: Stage[] = [];
  let signal: TrackCommand = HALT;

  for (const module of modules) {
    const intent = module.enabled ? module.intent() : null;
    if (intent !== null) signal = combine(module.verb, signal, intent);
    stages.push({
      id: module.id,
      label: module.label,
      maker: module.maker,
      verb: module.verb,
      enabled: module.enabled,
      idle: intent === null,
      output: signal,
      readout: module.readout?.(),
      condition: conditionOf(module, intent),
      safety: module.safety === true,
    });
  }

  return { command: signal, stages };
}

/**
 * What the dash makes of one slot.
 *
 * The one case worth reading twice: a **disabled safety module is not nominal**.
 * Switching a guard off does not make the machine quiet, it makes it a machine
 * with a guard switched off — so the slot stands at WARN until you put it back,
 * and the master warning stays lit while it does. That is the whole "pop the
 * hood" bargain enforced in four lines, rather than as a rule someone remembers.
 */
function conditionOf(module: Module, intent: TrackCommand | null): Condition {
  if (!module.enabled) return module.safety === true ? WARN : NOMINAL;
  return module.condition?.() ?? (intent === null ? NOMINAL : ACTIVE);
}
