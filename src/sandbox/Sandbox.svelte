<script lang="ts">
/**
 * The cockpit sandbox — every component, in every state, at phone width, with
 * no physics behind it.
 *
 * This exists because of a `META.md` lesson that predicts exactly how the
 * theming work fails without it: *screenshots catch what CI cannot; look at the
 * thing.* A manufacturer's house style is graphic design, and design authored
 * without ever seeing the result is guessing. Types, lint and 85 tests were all
 * green the day the cab rendered as a solid black wall.
 *
 * So: a fixed grid of specimens, driven by hand-built snapshots
 * (`fixtures.ts`), rendered at 390×844 by default, and screenshot by
 * `scripts/shots.mjs`. It boots in milliseconds because there is no Rapier and
 * no renderer in it.
 *
 * It is also the surface a blind subagent authoring a maker's theme works
 * against — which is why it shows *states*, not a pretty gallery.
 */
import { styleOf } from "../cockpit/makers.ts";
import { cellFor } from "../cockpit/parts.ts";
import DashPanel from "../ui/DashPanel.svelte";
import Rack from "../ui/Rack.svelte";
import { SPECIMENS } from "./fixtures.ts";

/** Which specimen the rack and the loose cells are showing. */
let picked = $state(0);
const current = $derived(SPECIMENS[picked] ?? SPECIMENS[0]);

/**
 * The rack edits a live module list, not a snapshot, so the sandbox needs
 * stand-in modules. They do nothing — the sandbox is about how a plate *looks*,
 * and behaviour is what `tests/` is for.
 */
const modules = $derived(
  (current?.snapshot.stages ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    maker: s.maker,
    considers: "a fixture. Nothing at all.",
    verb: s.verb,
    enabled: s.enabled,
    safety: s.safety,
    intent: () => null,
  })),
);

const cells = $derived(
  (current?.snapshot.stages ?? [])
    .map((stage) => ({ stage, cell: cellFor(stage.id) }))
    .filter((e) => e.cell !== null),
);

const noop = () => {};
</script>

<div class="sandbox">
  <header>
    <h1>COCKPIT SANDBOX</h1>
    <p>
      Every component in every state, at phone width, with no physics behind it.
      Fixtures only — nothing here is simulated and nothing here is a test.
    </p>
  </header>

  <!-- 1. The dash, in each state it can reach. This is the row that has to
          survive a real phone, so each specimen is clipped to 390px. -->
  <section>
    <h2>DASH · the seam, in every state</h2>
    <div class="grid">
      {#each SPECIMENS as specimen, i (specimen.name)}
        <figure>
          <figcaption>
            <b>{specimen.name}</b>
            <span>{specimen.note}</span>
          </figcaption>
          <div class="phone" data-specimen={specimen.name}>
            <div class="pin">
              <DashPanel
                snapshot={specimen.snapshot}
                rackOpen={false}
                estopped={specimen.estopped ?? false}
                onOpenRack={noop}
                onEstop={noop}
                onReport={noop}
                onToggleModule={noop}
              />
            </div>
          </div>
          <button class="pick" class:on={picked === i} onclick={() => (picked = i)}>
            show in rack ▾
          </button>
        </figure>
      {/each}
    </div>
  </section>

  <!-- 2. Cells on their own, big, so the bolted-on detail is visible. -->
  <section>
    <h2>CELLS · {current?.name} · bolted onto somebody else's panel</h2>
    <div class="bench">
      {#each cells as entry (entry.stage.id)}
        {@const Cell = entry.cell}
        {#if Cell}
          <div class="specimen">
            <Cell
              stage={entry.stage}
              style={styleOf(entry.stage.maker)}
              onToggle={noop}
            />
            <span class="tag">{entry.stage.maker}</span>
          </div>
        {/if}
      {/each}
      {#if cells.length === 0}
        <p class="none">No cells. The chassis brings the dashboard and needs none.</p>
      {/if}
    </div>
  </section>

  <!-- 3. The rack: three makers' plates, stacked, as mismatched kit. -->
  <section>
    <h2>RACK · {current?.name} · plates from three suppliers</h2>
    <div class="phone tall">
      <Rack
        {modules}
        snapshot={current?.snapshot}
        onchange={noop}
        onclose={noop}
        debug={false}
      />
    </div>
  </section>
</div>

<style>
  .sandbox {
    min-height: 100%;
    padding: 16px 16px 64px;
    background: #101314;
    color: #c6d0cb;
    font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    overflow-y: auto;
  }
  header {
    max-width: 620px;
    margin-bottom: 22px;
  }
  h1 {
    font-size: 13px;
    letter-spacing: 0.3em;
    margin: 0 0 6px;
    color: #e8b53a;
  }
  header p {
    margin: 0;
    font-size: 11px;
    color: #78827f;
  }
  h2 {
    font-size: 10px;
    letter-spacing: 0.24em;
    color: #6d7a76;
    border-bottom: 1px solid #23282a;
    padding-bottom: 5px;
    margin: 26px 0 12px;
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
  }
  figure {
    margin: 0;
    width: 390px;
  }
  figcaption {
    display: block;
    margin-bottom: 5px;
    font-size: 10px;
    color: #78827f;
  }
  figcaption b {
    display: block;
    color: #c6d0cb;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  /* A phone-shaped window. The dash is `position: fixed` in the app because it
     rides the travelling deck, so here it is pinned inside a contained box
     instead — `contain: paint` makes this element the containing block. */
  /* A phone-width window, tall enough to hold the whole panel including the
     indicator row. Too short and the shot silently crops the thing you are
     trying to look at, which is its own way of not looking. */
  .phone {
    position: relative;
    width: 390px;
    min-height: 250px;
    background: #1a1d1f;
    border: 1px solid #2b3133;
    contain: paint;
  }
  .phone.tall {
    height: 620px;
    display: flex;
    flex-direction: column;
  }
  .pin {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .pick {
    display: block;
    margin-top: 5px;
    font: inherit;
    font-size: 9px;
    letter-spacing: 0.16em;
    color: #6d7a76;
    background: #191d1f;
    border: 1px solid #2b3133;
    padding: 4px 8px;
    cursor: pointer;
  }
  .pick.on {
    color: #14171a;
    background: #6fe3c4;
    border-color: #6fe3c4;
  }
  .bench {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 20px;
    padding: 16px;
    /* The chassis maker's yellow, because that is what a cell is bolted to. */
    background: linear-gradient(180deg, #d8a521, #b9871a);
    border: 1px solid #7c5a10;
  }
  .specimen {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  .tag {
    font-size: 8px;
    letter-spacing: 0.16em;
    color: #4a4230;
  }
  .none {
    margin: 0;
    font-size: 10px;
    color: #4a4230;
  }
</style>
