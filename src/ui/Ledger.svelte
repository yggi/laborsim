<script lang="ts">
/**
 * The ledger, arriving line by line as it happens.
 *
 * This is not the end-of-run report (BOARD L-029) — it is the running account
 * you glance at while driving, in the same voice. What it has to get right is
 * the register: **condescending institutional politeness**. The rig is not
 * angry with you. It is disappointed, patiently, and it is writing it down.
 * See docs/design/tone.md.
 *
 * Two rules the design leans on, both visible here:
 *
 *   - **Itemised, never aggregated.** "¥5,200 of damage" teaches nothing. The
 *     total is shown, but it is never the only thing shown.
 *   - **Harming a citizen is not a line item.** A citizen *asset* is priced;
 *     a person never is. The scooter line is the closest the ledger gets, and
 *     it is called out as a category rather than as a bigger number.
 *
 * Each line also carries **what was driving**, because a ledger that says what
 * without why is a score, and scores do not teach.
 *
 * Architecture rule 3: reads a snapshot. It cannot tell live from replay.
 */
import type { Snapshot } from "../core/snapshot.ts";

const { snapshot }: { snapshot: Snapshot | undefined } = $props();

/** How many lines stay on the glass. The full account is the end-of-run job. */
const SHOWN = 4;

const damage = $derived(snapshot?.damage ?? []);
const recent = $derived(damage.slice(-SHOWN).reverse());
const bill = $derived(snapshot?.bill ?? 0);
const citizen = $derived(damage.some((d) => d.category === "citizen asset"));

const yen = (n: number) => `−¥${n.toLocaleString("en-US")}`;

/**
 * What the rig blames. Bypassed modules first: switching a component off is a
 * decision, and it is the one the rig is most interested in.
 */
function attribution(line: (typeof damage)[number]): string {
  if (line.bypassed.length > 0) return `${line.bypassed.join(", ")} bypassed`;
  if (line.driving.length > 0) return `${line.driving.join(" → ")} driving`;
  return "no module driving";
}
</script>

{#if damage.length}
  <div class="ledger">
    <div class="head">
      <span>DAMAGE ACCOUNT</span>
      <span class="total">{yen(bill)}</span>
    </div>

    {#if citizen}
      <!-- Categorical, not a bigger number. -->
      <div class="flag">CITIZEN PROPERTY INVOLVED &mdash; THIS EXERCISE IS A FAILURE</div>
    {/if}

    {#each recent as line (line.tick + ":" + line.prop)}
      <div class="line" class:citizen={line.category === "citizen asset"}>
        <div class="what">
          <span>{line.category} ({line.label}) {line.state}</span>
          <span class="yen">{yen(line.yen)}</span>
        </div>
        <div class="why">
          {line.speed.toFixed(1)} m/s &middot; {line.energy.toFixed(0)} J of
          {line.toughness.toFixed(0)} &middot; {attribution(line)}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .ledger {
    position: fixed;
    left: 12px;
    bottom: calc(env(safe-area-inset-bottom) + 108px);
    width: min(300px, calc(100vw - 24px));
    background: rgba(16, 19, 21, 0.92);
    border: 1px solid #333a3b;
    box-shadow: 0 0 0 3px #0d1012;
    font: 9px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    letter-spacing: 0.06em;
    color: #c6d0cb;
    pointer-events: none;
  }
  .head {
    display: flex;
    justify-content: space-between;
    padding: 3px 7px;
    background: #23282a;
    font-size: 8px;
    letter-spacing: 0.16em;
    color: #6d7a76;
  }
  .total {
    color: #e0503c;
  }
  .flag {
    padding: 4px 7px;
    font-size: 8px;
    letter-spacing: 0.12em;
    color: #14171a;
    background: #e0503c;
  }
  .line {
    padding: 4px 7px;
    border-top: 1px solid #23282a;
  }
  .line.citizen {
    border-left: 3px solid #e0503c;
  }
  .what {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .yen {
    color: #e8b53a;
    white-space: nowrap;
  }
  .why {
    font-size: 8px;
    color: #6d7a76;
  }
</style>
