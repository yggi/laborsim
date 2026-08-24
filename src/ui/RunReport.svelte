<script lang="ts">
/**
 * The end-of-run report (L-029) — the *final* face of the ledger, and the
 * natural first screen of the game: you arrive at the rig and read the last
 * trainee's account before you reset it.
 *
 * Itemised, scrollable, never aggregated. The total is shown but it is never
 * the only thing shown, because a total teaches nothing (docs/design/tone.md).
 * The voice is condescending institutional politeness: the rig is not angry, it
 * is disappointed, patiently, and it has written everything down.
 *
 * Two ways out: RESET SIMULATOR re-racks the exercise; RESUME closes the folder
 * and lets you keep driving — the rig never yanks control (L-038).
 *
 * Architecture rule 3: reads a snapshot, reports two intents up.
 */
import type { Snapshot } from "../core/snapshot.ts";

const {
  snapshot,
  onReset,
  onResume,
}: {
  snapshot: Snapshot | undefined;
  onReset: () => void;
  onResume: () => void;
} = $props();

const lines = $derived(snapshot?.damage ?? []);
const bill = $derived(snapshot?.bill ?? 0);
const citizen = $derived(lines.some((d) => d.category === "citizen asset"));

const yen = (n: number) => `−¥${n.toLocaleString("en-US")}`;

/** The rig's closing remark. Register: unimpressed, never cruel, never a quip. */
const verdict = $derived.by(() => {
  if (citizen)
    return "A person was involved. This session is recorded as a failure. Please reflect.";
  if (bill === 0)
    return "No chargeable damage. The exercise notes that you also accomplished nothing.";
  if (bill < 3000)
    return "Within tolerances a supervisor might overlook. They will not.";
  if (bill < 12000)
    return "A costly session. The equipment is, at least, insured. The confidence is not.";
  return "Extensive. The instructor has been notified. Consider a lighter machine.";
});

function why(line: (typeof lines)[number]): string {
  if (line.bypassed.length > 0) return `${line.bypassed.join(", ")} bypassed`;
  if (line.driving.length > 0) return `${line.driving.join(" → ")} driving`;
  return "no module driving";
}
</script>

<div class="scrim">
  <div class="folder" role="dialog" aria-label="damage assessment">
    <div class="head">
      <div class="stamp">L.A.B.O.R. TRAINING SYSTEM</div>
      <div class="title">DAMAGE ASSESSMENT &mdash; EXERCISE DEBRIEF</div>
    </div>

    {#if citizen}
      <div class="fail">CITIZEN PROPERTY INVOLVED &middot; EXERCISE FAILED</div>
    {/if}

    <div class="lines">
      {#if lines.length === 0}
        <div class="empty">No damage on record. The folder is empty.</div>
      {:else}
        {#each lines as line, i (i)}
          <div class="line" class:citizen={line.category === "citizen asset"}>
            <div class="row1">
              <span class="what">{line.category} ({line.label}) {line.state}</span>
              <span class="yen">{yen(line.yen)}</span>
            </div>
            <div class="row2">
              {line.speed.toFixed(1)} m/s &middot; {line.energy.toFixed(0)} J of
              {line.toughness.toFixed(0)} &middot; {why(line)}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div class="total">
      <span>TOTAL ASSESSED</span>
      <span class="sum">{yen(bill)}</span>
    </div>
    <div class="verdict">{verdict}</div>

    <div class="actions">
      <button class="resume" onclick={onResume}>RESUME</button>
      <button class="reset" onclick={onReset}>RESET SIMULATOR</button>
    </div>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: rgba(6, 8, 9, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 14px;
  }
  .folder {
    width: min(360px, 100%);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: #14171a;
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 4px #0d1012, 0 20px 50px rgba(0, 0, 0, 0.7);
    font: 10px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #c6d0cb;
    letter-spacing: 0.05em;
  }
  .head {
    padding: 9px 12px;
    background: #23282a;
    border-bottom: 2px solid #0d1012;
  }
  .stamp {
    font-size: 8px;
    letter-spacing: 0.28em;
    color: #6d7a76;
  }
  .title {
    margin-top: 2px;
    font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.1em;
    color: #efe6cf;
  }
  .fail {
    padding: 5px 12px;
    background: #b81c0c;
    color: #ffe6e0;
    font-size: 9px;
    letter-spacing: 0.14em;
  }
  .lines {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }
  .empty {
    padding: 18px 12px;
    color: #6d7a76;
    text-align: center;
  }
  .line {
    padding: 5px 12px;
    border-top: 1px solid #23282a;
    border-left: 3px solid #3a4240;
  }
  .line.citizen {
    border-left-color: #e0503c;
  }
  .row1 {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .yen {
    color: #e8b53a;
    white-space: nowrap;
  }
  .row2 {
    font-size: 8px;
    color: #78827f;
  }
  .total {
    display: flex;
    justify-content: space-between;
    padding: 7px 12px;
    background: #23282a;
    border-top: 2px solid #0d1012;
    letter-spacing: 0.14em;
  }
  .sum {
    color: #e0503c;
    font-weight: 700;
  }
  .verdict {
    padding: 8px 12px;
    font-size: 9px;
    color: #9aa6a1;
    background: #191d20;
  }
  .actions {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    background: #14171a;
  }
  .actions button {
    flex: 1;
    font: inherit;
    letter-spacing: 0.12em;
    padding: 9px 0;
    border: 1px solid #0d1012;
    cursor: pointer;
  }
  .resume {
    background: #23282a;
    color: #c6d0cb;
  }
  .reset {
    background: #e8b53a;
    color: #14171a;
    font-weight: 700;
  }
</style>
