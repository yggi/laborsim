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
 * *is* suppression. See docs/design/arbitration.md.
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

export interface Module {
  readonly id: string;
  /** Shown to the pilot. Never a bare id. */
  readonly label: string;
  /** One honest sentence about what this module considers. */
  readonly considers: string;
  verb: Verb;
  /**
   * Disabling is the default hot-patchable control: a disabled module becomes
   * a pass-through, not a hole. The signal still reaches the terminal.
   */
  enabled: boolean;
  /** What this module wants, on its own terms. Null means nothing to say. */
  intent(): TrackCommand | null;
  /**
   * Numbers this module publishes for its own instrument.
   *
   * Components ship mandatory instruments (docs/design/cockpit.md), and an
   * instrument reads a snapshot rather than the live module — so whatever it
   * needs has to travel through here. Plain numbers only: this crosses the
   * one-directional boundary and has to stay a value.
   */
  readout?(): Readonly<Record<string, number>> | undefined;
}

/** One module's contribution, kept so the chain can be read stage by stage. */
export interface Stage {
  readonly id: string;
  readonly label: string;
  readonly verb: Verb;
  readonly enabled: boolean;
  /** True when the module had nothing to say and simply passed the signal on. */
  readonly idle: boolean;
  readonly output: TrackCommand;
  /** Whatever the module publishes for its instrument. */
  readonly readout?: Readonly<Record<string, number>>;
}

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
      verb: module.verb,
      enabled: module.enabled,
      idle: intent === null,
      output: signal,
      readout: module.readout?.(),
    });
  }

  return { command: signal, stages };
}
