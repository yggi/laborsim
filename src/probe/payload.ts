/**
 * What the game costs before it has drawn anything — the other half of L-034.
 *
 * The board asked for "a written first-load and frame budget". The frame half
 * is `profile.ts`; this is the bytes. `NOTES.md` has carried the only numbers
 * anybody ever had — *3.44 MB raw / 1.25 MB gzipped, for an empty scaffold* —
 * measured on a laptop against a build that did nothing. Everything since then
 * (three.js's scene, the cockpit, the audio graph, the exercises) has landed on
 * top of a figure nobody re-took.
 *
 * It is measured **against the app, not against this page.** The bench loads
 * Rapier and three but not the Svelte cab, so its own resource list would
 * flatter the thing it is reporting on. So it fetches the app's own
 * `index.html`, reads the module graph Vite wrote into it, pulls every file in
 * that graph, and asks the browser what came down the wire.
 *
 * `encodedBodySize` is the number that matters — bytes over the air, after
 * whatever compression the host applied. `decodedBodySize` is what the phone
 * then has to parse, which is the number that costs time rather than data.
 */

export interface Asset {
  readonly file: string;
  /** Bytes on the wire, compressed as the server sent them. */
  readonly encoded: number;
  /** Bytes after decompression — what has to be parsed. */
  readonly decoded: number;
}

export interface Payload {
  readonly assets: readonly Asset[];
  readonly encoded: number;
  readonly decoded: number;
  /** Set when the numbers cannot be trusted, and why. */
  readonly caveat?: string;
}

/**
 * Everything the app's own document pulls in.
 *
 * A built `index.html` carries the whole first-load graph as `modulepreload`
 * links — that is what those links are *for* — so one level of parsing is the
 * whole set rather than the entry point of a chase. A dev server's document
 * carries a single `.ts` and discovers the rest at runtime, which is why that
 * case is refused rather than half-answered.
 */
function graphOf(html: string, base: string): { urls: string[]; unbundled: boolean } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const urls = new Set<string>();
  let unbundled = false;

  const take = (raw: string | null) => {
    if (!raw) return;
    if (/\.(ts|svelte)(\?|$)/.test(raw)) unbundled = true;
    urls.add(new URL(raw, base).href);
  };

  for (const script of doc.querySelectorAll("script[src]")) {
    take(script.getAttribute("src"));
  }
  for (const link of doc.querySelectorAll(
    'link[rel="modulepreload"], link[rel="stylesheet"], link[rel="preload"]',
  )) {
    take(link.getAttribute("href"));
  }
  return { urls: [...urls], unbundled };
}

/**
 * Sizes for a set of URLs, read off the browser's own resource timings.
 *
 * Not off `Content-Length`: a compressed response's header is the compressed
 * size and there is no header at all for the decompressed one, and the pair is
 * the whole point. Resource timing has both, and it is exactly what the network
 * did rather than what a header claimed.
 */
async function sizesOf(urls: readonly string[]): Promise<Asset[]> {
  // `no-store` so a second run measures the network again rather than reporting
  // a cache hit as a download. A cached first load is a different budget and
  // not the one anybody is worried about.
  await Promise.all(
    urls.map((url) => fetch(url, { cache: "no-store" }).then((r) => r.arrayBuffer())),
  );

  const timings = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const assets: Asset[] = [];
  for (const url of urls) {
    // The last entry wins: the fetch above is the most recent, and an earlier
    // one may have been served from cache with a zero transfer size.
    const entry = timings.filter((t) => t.name === url).pop();
    assets.push({
      file: url.slice(url.lastIndexOf("/") + 1),
      encoded: entry?.encodedBodySize ?? 0,
      decoded: entry?.decodedBodySize ?? 0,
    });
  }
  return assets.sort((a, b) => b.encoded - a.encoded);
}

export async function measurePayload(): Promise<Payload> {
  // The app sits beside this page in every build the site publishes — at the
  // root, or under `b/<branch>/`. Relative, so a branch build measures itself
  // rather than whatever `main` happens to be serving.
  const index = new URL("./index.html", location.href).href;
  let html: string;
  try {
    const response = await fetch(index, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status}`);
    html = await response.text();
  } catch (error) {
    return {
      assets: [],
      encoded: 0,
      decoded: 0,
      caveat: `could not read ${index} — ${String(error)}`,
    };
  }

  const { urls, unbundled } = graphOf(html, index);
  const documentSize = await sizesOf([index]);
  const assets = [...documentSize, ...(await sizesOf(urls))];
  const encoded = assets.reduce((total, a) => total + a.encoded, 0);
  const decoded = assets.reduce((total, a) => total + a.decoded, 0);

  return {
    assets,
    encoded,
    decoded,
    caveat: unbundled
      ? "dev server: modules are served unbundled and discovered at runtime, " +
        "so this is the entry point and not the payload. Run it against a build."
      : undefined,
  };
}
