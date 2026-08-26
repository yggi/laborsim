/**
 * Dust — what a thing leaves in the air when it comes apart.
 *
 * The third rendering of one description. A written-off prop produces the same
 * residue three ways: **bodies**, which the sim spawns from the part list and
 * throws (`sim/world.ts`); **grains**, which the ear hears as a screech, a
 * shatter or a crumble (`audio/voices.ts`); and **motes**, which is this. Each
 * is driven off the same ledger line and the same materials, so a concrete panel
 * that crumbles loudly also crumbles dustily, from one number in one table
 * (`MaterialSpec.rubble.dust`) rather than from three opinions.
 *
 * It is **render-side only**, and that is not a shortcut. Dust is not a
 * simulated quantity — it does not push anything, and nothing can be measured
 * off it — so putting it in the sim would be inventing state to justify a
 * picture. What it *is* is a rendering of a discrete event, which is exactly
 * what an impact's sound already is, and it lives on the same side of the
 * boundary for the same reason. It therefore cannot affect a replay, and the
 * only thing it costs is draw calls.
 *
 * Drawn the way the rest of the world is drawn: **flat-shaded chunks in the
 * material's own toon paint, which expand, slow, and pop out of existence.**
 * A soft alpha billboard would look more like dust and less like this game —
 * the world is a diagram on purpose (`CLAUDE.md`, principle 7), and a puff that
 * fades is the one thing in it that would admit to being a particle system.
 *
 * Cost: one `InstancedMesh` per material that has actually been broken, hidden
 * while it holds nothing. At most nine, against a cab budget of 500 calls and a
 * measured 224 in use (`doc/design/code/mobile-budget.md`).
 */

import * as THREE from "three";
import { makeRng } from "../core/rng.ts";
import type { DamageEvent } from "../sim/damage.ts";
import { MATERIAL, type MaterialId } from "../world/materials.ts";
import type { Piece } from "../world/props.ts";

/** Motes one material may have in the air at once. Oldest is recycled. */
const PER_MATERIAL = 40;

/** Seconds a mote lives. Short: this is a puff, not weather. */
const LIFE = 0.9;

/** How fast a mote grows over its life, as a multiple of its birth size. */
const SWELL = 2.6;

/** Metres per second squared. Dust is light — it does not fall like a brick. */
const SETTLE = 3.4;

interface Mote {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  spin: number;
  born: number;
}

export interface Residue {
  /** A thing has been written off: put its dust in the air. */
  burst(line: DamageEvent, pieces: readonly Piece[]): void;
  /** Advance to this sim time. Driven by the snapshot's clock, not the wall's,
   *  so a replay's dust moves exactly as the run's did. */
  step(seconds: number): void;
  /** The run went backwards. Nothing in the air belongs to this run any more. */
  clear(): void;
  dispose(): void;
}

/** One material's worth of motes, and the instanced mesh that draws them. */
interface Pool {
  readonly mesh: THREE.InstancedMesh;
  readonly motes: Mote[];
  next: number;
}

export function createResidue(
  scene: THREE.Scene,
  materials: ReadonlyMap<MaterialId, THREE.Material>,
): Residue {
  // One faceted lump, shared by every mote of every material. Low-poly on
  // purpose: the toon ramp needs flats to band across, and a sphere would read
  // as a bubble.
  const chunk = new THREE.IcosahedronGeometry(0.5, 0);
  const pools = new Map<MaterialId, Pool>();
  const matrix = new THREE.Matrix4();
  const spin = new THREE.Quaternion();
  const axis = new THREE.Vector3(0.4, 0.8, 0.45).normalize();
  const at = new THREE.Vector3();
  const size = new THREE.Vector3();
  let now = 0;

  function poolFor(material: MaterialId): Pool {
    const found = pools.get(material);
    if (found) return found;
    const paint = materials.get(material);
    const mesh = new THREE.InstancedMesh(
      chunk,
      paint ?? new THREE.MeshBasicMaterial(),
      PER_MATERIAL,
    );
    // Dust does not take part in the shadow map. It is a handful of chunks in
    // the air for under a second, and shadow-casting them costs a second pass
    // over every one for something nobody would be able to name.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    const made: Pool = { mesh, motes: [], next: 0 };
    pools.set(material, made);
    return made;
  }

  return {
    burst(line, pieces) {
      // Seeded off the ledger line's tick and prop, both of which are on the
      // recording. Two playbacks of one run raise the same dust.
      const rng = makeRng(line.tick * 7919 + line.prop);
      const [ax, ay, az] = line.at;
      // How violently it went, as the sound sees it: `√(energy / toughness)`,
      // clamped. A thing written off at exactly its rating puffs; one hit at
      // three times its rating throws dust.
      const force = Math.min(2, Math.sqrt(line.energy / Math.max(line.toughness, 1)));

      for (const piece of pieces) {
        const spec = MATERIAL[piece.material];
        // **The dust is the material's**, and the count is its `dust` number
        // times how big this piece of it is. A concrete panel makes a cloud; the
        // steel bracket holding it up does not, and neither says so anywhere but
        // in the one table.
        const bulk = Math.max(piece.size[0], piece.size[1], piece.size[2]);
        const count = Math.round(spec.rubble.dust * force * (2 + 6 * bulk));
        if (count <= 0) continue;
        const pool = poolFor(piece.material);
        for (let i = 0; i < count; i++) {
          const mote: Mote = {
            x: ax + rng.range(-0.4, 0.4),
            y: ay + rng.range(-0.2, 0.5),
            z: az + rng.range(-0.4, 0.4),
            vx: rng.range(-1.4, 1.4) * force,
            vy: rng.range(0.4, 2.2) * force,
            vz: rng.range(-1.4, 1.4) * force,
            size: (0.06 + 0.16 * bulk) * rng.range(0.6, 1.4),
            spin: rng.range(-4, 4),
            born: now,
          };
          if (pool.motes.length < PER_MATERIAL) pool.motes.push(mote);
          else pool.motes[pool.next] = mote;
          pool.next = (pool.next + 1) % PER_MATERIAL;
        }
      }
    },

    step(seconds) {
      // Sim seconds, and clamped: a tab that was in the background for a minute
      // must not integrate a minute of dust in one frame.
      const dt = Math.min(Math.max(seconds - now, 0), 0.1);
      now = seconds;
      for (const pool of pools.values()) {
        let live = 0;
        for (const mote of pool.motes) {
          const age = (now - mote.born) / LIFE;
          // **Popped, not faded.** Past its life it simply is not drawn.
          if (age < 0 || age >= 1) continue;
          if (dt > 0) {
            mote.vy -= SETTLE * dt;
            // Air. Without it every mote flies a clean parabola and the whole
            // burst reads as a firework rather than as a cloud.
            const drag = 1 - Math.min(1, 2.6 * dt);
            mote.vx *= drag;
            mote.vy *= drag;
            mote.vz *= drag;
            mote.x += mote.vx * dt;
            mote.y += mote.vy * dt;
            mote.z += mote.vz * dt;
          }
          const grown = mote.size * (1 + SWELL * age);
          at.set(mote.x, mote.y, mote.z);
          spin.setFromAxisAngle(axis, mote.spin * (now - mote.born));
          size.setScalar(grown);
          matrix.compose(at, spin, size);
          pool.mesh.setMatrixAt(live, matrix);
          live++;
        }
        pool.mesh.count = live;
        pool.mesh.visible = live > 0;
        if (live > 0) pool.mesh.instanceMatrix.needsUpdate = true;
      }
    },

    clear() {
      for (const pool of pools.values()) {
        pool.motes.length = 0;
        pool.next = 0;
        pool.mesh.count = 0;
        pool.mesh.visible = false;
      }
    },

    dispose() {
      for (const pool of pools.values()) {
        scene.remove(pool.mesh);
        pool.mesh.dispose();
      }
      pools.clear();
      chunk.dispose();
    },
  };
}
