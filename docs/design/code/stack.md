# Stack — and what was rejected

Spilled from `MEMORY.md` § 9. The choices are settled; this file exists so the
rejected options are not relitigated in six months.

**TypeScript · Vite · Svelte 5 · Vitest · Biome · Three.js · Rapier (wasm).**

Use `@dimforge/rapier3d-deterministic`: bit-level cross-platform deterministic,
and `world.takeSnapshot()` hashes identically across machines, which makes
replay a test rather than an aspiration. It costs SIMD and parallel features,
and it rules out single-file HTML output — Rapier wants a bundler.

---

## Rejected

- **Godot** — its web export cannot run C# at all (no .NET in the browser
  sandbox) and is Compatibility-renderer only, so GDScript would be the only
  option for a control-loop-heavy sim on the one platform that must ship. Add an
  order-of-magnitude larger first load, and the fact that half this game is 2D
  UI where the DOM wins. *Would be reconsidered only if mobile-first browser
  stopped being a requirement — and it will not.*
- **Babylon.js** — genuinely competitive (TS-native, built-in inspector, Havok),
  but the switching cost lands exactly on the cel pipeline, which is Three-
  specific, already proven, and the artful part. Do not rewrite the proof.
- **Jolt** — better articulated-body support and it ships a tracked-vehicle
  controller, which rung 1 could use. Declined deliberately: **a black-box
  vehicle controller is an anti-feature here.** Differential drive with friction
  *is* the teaching layer; we write that one.

## A dividend worth naming

Rapier runs single-threaded, so nothing wants `SharedArrayBuffer` and no
COOP/COEP cross-origin isolation is needed. Plain static hosting is enough,
which is why GitHub Pages took one workflow and no server config. Godot's web
export would have needed the headers configured on the host.
