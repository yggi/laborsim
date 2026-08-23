/**
 * The actuator bus.
 *
 * On rung 1 this is two numbers: commanded surface speed for each track, in
 * m/s, body frame. That is the whole contended resource, and it is the reason
 * this file exists now rather than later — the acceptance test (BOARD L-018)
 * needs two components fighting over one actuator *on rung 1*, so nothing may
 * reach the tracks except through here, even while the levers are the only
 * thing writing to it.
 *
 * Ordering is priority, exactly as on the rail: later entries suppress earlier
 * ones. See docs/design/arbitration.md.
 */

export interface TrackCommand {
  /** Commanded track surface speed, m/s. Positive drives forward. */
  readonly left: number;
  readonly right: number;
}

export interface CommandSource {
  readonly id: string;
  /** Shown to the pilot when this source owns the bus. Never a bare id. */
  readonly label: string;
  enabled: boolean;
  /** Null means "nothing to say this tick" — the layer below gets the bus. */
  command(): TrackCommand | null;
}

export interface BusResult {
  readonly command: TrackCommand;
  /** Who is driving. Null means nothing is, which is itself worth showing. */
  readonly owner: CommandSource | null;
  /** Enabled sources that wanted the bus and did not get it. */
  readonly suppressed: readonly CommandSource[];
}

const IDLE: TrackCommand = { left: 0, right: 0 };

/**
 * Highest enabled source with something to say wins the whole bus.
 *
 * The suppressed list is not diagnostics — the attribution rule requires that
 * whenever an input is ignored, the reason is on screen before the player asks.
 * A suppressed source that nothing reports is a dead control, which is a bug
 * report rather than a lesson.
 */
export function resolveBus(sources: readonly CommandSource[]): BusResult {
  const suppressed: CommandSource[] = [];
  let command: TrackCommand | null = null;
  let owner: CommandSource | null = null;

  for (let i = sources.length - 1; i >= 0; i--) {
    const source = sources[i];
    if (!source?.enabled) continue;
    const wanted = source.command();
    if (wanted === null) continue;
    if (command === null) {
      command = wanted;
      owner = source;
    } else {
      suppressed.push(source);
    }
  }

  return { command: command ?? IDLE, owner, suppressed };
}
