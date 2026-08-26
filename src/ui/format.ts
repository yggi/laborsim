/**
 * The few bits of formatting more than one of the rig's surfaces needs.
 *
 * It exists because the elapsed clock is now read in three places — the
 * overlay, the debrief, and whatever scores a run later — and a run that
 * reported `2:07` on the glass and `127 s` in the folder would be two clocks.
 * One fact, one place, including the way it is written down.
 */

/**
 * Seconds as `M:SS`, or `H:MM:SS` once anyone has been out there that long.
 *
 * Floors rather than rounds: a clock that reads 1:00 with a second still to go
 * is a clock that lies about the moment you finished.
 */
export function clockOf(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
