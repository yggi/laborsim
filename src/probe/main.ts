/**
 * The profiling bench — a page you hold in your hand and press once.
 *
 * `sandbox.html` is every component in every state and `listen.html` is every
 * voice; this is the third bench and the first one that has to run **on the
 * device it is about**. That is the whole design constraint: the numbers are
 * worthless from a laptop, so the bench ships with the site (like the other
 * two, and for a stronger version of the same reason), it is one button, and
 * what it produces is text you can paste into a message from a phone.
 *
 * Deliberately plain DOM, as `sandbox/listen.ts` is. A Svelte component here
 * would be a fourth entry point's worth of machinery for a button and a `<pre>`
 * — and it would put a reactive framework inside the thing being timed.
 */

import { readDevice } from "./device.ts";
import { measurePayload } from "./payload.ts";
import { type Progress, runProfile } from "./profile.ts";
import { formatReport } from "./report.ts";

const root = document.getElementById("probe");
if (!root) throw new Error("missing #probe mount point");

const glass = document.createElement("div");
glass.className = "host";
document.body.append(glass);

const panel = document.createElement("div");
panel.className = "panel";
root.append(panel);

const status = document.createElement("p");
status.className = "status";

const run = document.createElement("button");
run.className = "go";
run.textContent = "RUN THE PROFILE";

const output = document.createElement("pre");
output.className = "out";
output.hidden = true;

const copy = document.createElement("button");
copy.className = "copy";
copy.textContent = "COPY";
copy.hidden = true;

panel.append(run, copy, status, output);

function describe(progress: Progress): string {
  const step = `${progress.index + 1}/${progress.total}`;
  const through = Math.round(progress.through * 100);
  const phase =
    progress.phase === "building"
      ? "building the site"
      : progress.phase === "warming"
        ? "warming"
        : progress.phase === "probing"
          ? "asking the GPU"
          : "measuring";
  return `${step} ${progress.pass.name} — ${phase} ${through}%`;
}

/**
 * A phone dims its screen after fifteen seconds and the run takes a minute.
 *
 * A dimmed panel is not a paused one, but a locked one is: the frame loop stops
 * and the pass never ends. Best-effort — a browser that refuses is a browser
 * where you hold the screen awake yourself, which the blurb says.
 */
async function keepAwake(): Promise<{ release(): void }> {
  const lock = await navigator.wakeLock?.request("screen").catch(() => undefined);
  return { release: () => void lock?.release().catch(() => undefined) };
}

let text = "";

run.addEventListener("click", async () => {
  run.disabled = true;
  run.textContent = "RUNNING";
  copy.hidden = true;
  output.hidden = true;
  document.body.classList.add("running");
  const awake = await keepAwake();

  try {
    status.textContent = "reading the device";
    const device = await readDevice();
    status.textContent = "fetching the app's payload";
    const payload = await measurePayload();
    const profile = await runProfile(glass, (progress) => {
      status.textContent = describe(progress);
    });
    text = formatReport(profile, payload, device, new Date().toISOString());
    output.textContent = text;
    output.hidden = false;
    copy.hidden = false;
    status.textContent = "done — copy this and send it back";
  } catch (error) {
    status.textContent = `failed: ${String(error)}`;
  } finally {
    awake.release();
    document.body.classList.remove("running");
    run.disabled = false;
    run.textContent = "RUN IT AGAIN";
  }
});

copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(text);
    copy.textContent = "COPIED";
  } catch {
    // No clipboard permission, or an insecure origin. Selecting the whole
    // block is what a person would do next anyway, so do it for them.
    const range = document.createRange();
    range.selectNodeContents(output);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    copy.textContent = "SELECTED — COPY IT";
  }
  setTimeout(() => {
    copy.textContent = "COPY";
  }, 2500);
});
