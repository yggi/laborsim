/**
 * A notice in a **manufacturer's** voice.
 *
 * Two institutions speak in this cockpit and they must not blur: L.A.B.O.R.
 * certifies and bills, and the damage ledger speaks in its register; a
 * manufacturer sells and warns, and this is the channel where one speaks for
 * itself. Keeping them visually distinct matters — a warranty notice is not a
 * verdict, and the player has to be able to tell whose opinion they are reading
 * (`doc/design/rig/training-frame.md`).
 *
 * `Notice` was declared twice, once in the shell and once in `ui/Toasts.svelte`,
 * with the same four fields and two different comments explaining it. One fact,
 * one place (`doc/design/code/conventions.md`) — this is the place, because the
 * maker is the one who wrote the words and the rig only carries them.
 */

export interface Notice {
  readonly id: number;
  readonly maker: string;
  readonly head: string;
  readonly body: string;
}

/** How long a manufacturer gets to lecture you before it fades, ms. */
export const NOTICE_LINGER = 8000;

export interface NoticeBoard {
  readonly list: readonly Notice[];
  /** Put one up. It takes itself down again after `NOTICE_LINGER`. */
  notify(maker: string, head: string, body: string): void;
}

export function createNotices(linger = NOTICE_LINGER): NoticeBoard {
  let list = $state<Notice[]>([]);
  let nextId = 0;

  return {
    get list() {
      return list;
    },
    notify(maker, head, body) {
      const id = nextId++;
      list = [...list, { id, maker, head, body }];
      setTimeout(() => {
        list = list.filter((n) => n.id !== id);
      }, linger);
    },
  };
}
