/**
 * The renderer owns three.js and the scene graph. It is a *consumer* of
 * simulation, never a source of it — it reads snapshots and draws them.
 *
 * Architecture rule 3: Svelte never owns the canvas, and no reactive
 * scene-graph wrapper (Threlte and friends) may be introduced here. A reactive
 * scene graph fights a fixed-step imperative loop and reintroduces per-frame
 * reactivity cost on exactly the platform that cannot afford it.
 *
 * See docs/design/architecture-rules.md.
 */

import * as THREE from "three";
import type { Snapshot } from "../core/snapshot.ts";
import { CAB, CLEARANCE, EYE, GAUGE, HULL, TRACK } from "../core/spec.ts";
import type { Terrain } from "../world/terrain.ts";

/**
 * Cab is the primary view: rung 1's whole claim is that the two-lever cage
 * with a clear windscreen is a genuinely good machine. Chase is the extra, and
 * it costs you the controls — see docs/design/cockpit.md.
 */
export type CameraMode = "cab" | "chase";

export interface Viewport {
  render(snapshot: Snapshot): void;
  resize(width: number, height: number): void;
  setMode(mode: CameraMode): void;
  /** Head pan in the cab; orbit in chase. Same gesture, different meaning. */
  look(dx: number, dy: number): void;
  dispose(): void;
}

const SKY = 0xb9ccd2;

export function createViewport(canvas: HTMLCanvasElement, terrain: Terrain): Viewport {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 70, 340);

  const key = new THREE.DirectionalLight(0xfff0d8, 2.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const shadowCam = key.shadow.camera;
  shadowCam.left = -24;
  shadowCam.right = 24;
  shadowCam.top = 24;
  shadowCam.bottom = -24;
  shadowCam.far = 120;
  key.shadow.bias = -0.0012;
  scene.add(key);
  scene.add(key.target);
  scene.add(new THREE.HemisphereLight(0xa8ccdd, 0x4a4033, 1.1));

  const camera = new THREE.PerspectiveCamera(58, 1, 0.15, 900);

  scene.add(buildTerrainMesh(terrain));

  /* -- the machine ----------------------------------------------------- */
  const machine = new THREE.Group();
  scene.add(machine);

  const paint = new THREE.MeshLambertMaterial({ color: 0xdca42a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x39413f });
  // Actually transparent: the eye sits behind this pane, so an opaque one is a
  // cyan wall. From outside it still reads as glass.
  const glass = new THREE.MeshLambertMaterial({
    color: 0x9fe8f2,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(HULL.width, HULL.height, HULL.length),
    paint,
  );
  hull.position.y = TRACK.height + CLEARANCE + HULL.height / 2;
  hull.castShadow = true;
  machine.add(hull);

  // A cab you can see out of. Rung 1 has nothing occluding the glass yet, and
  // that is the point — the panel budget only bites once instruments arrive.
  const cab = new THREE.Mesh(
    new THREE.BoxGeometry(CAB.width, CAB.height, CAB.depth),
    dark,
  );
  cab.position.set(0, CAB.y, CAB.z);
  cab.castShadow = true;
  machine.add(cab);
  const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.06), glass);
  windscreen.position.set(0, CAB.y + 0.1, CAB.z + CAB.depth / 2 + 0.02);
  machine.add(windscreen);

  for (const side of [-1, 1]) {
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK.width, TRACK.height, TRACK.length),
      dark,
    );
    track.position.set((side * GAUGE) / 2, TRACK.height / 2, 0);
    track.castShadow = true;
    machine.add(track);
  }

  /* -- camera state ----------------------------------------------------- */
  let mode: CameraMode = "cab";
  let pan = 0;
  let tilt = 0;
  let orbit = 2.4;
  let elevation = 0.35;
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();

  return {
    render(snapshot: Snapshot) {
      const [px, py, pz] = snapshot.machine.pose.position;
      const [qx, qy, qz, qw] = snapshot.machine.pose.rotation;
      machine.position.set(px, py, pz);
      machine.quaternion.set(qx, qy, qz, qw);
      machine.updateMatrixWorld(true);

      key.position.set(px - 30, py + 42, pz + 22);
      key.target.position.set(px, py, pz);

      if (mode === "cab") {
        // The eye rides the hull, so the cab pitches and rolls with the machine.
        eye.set(EYE.x, EYE.y, EYE.z).applyMatrix4(machine.matrixWorld);
        // Aim swings in machine space: "look left" means left of the machine's
        // own heading, not of the world.
        const cp = Math.cos(pan);
        const sp = Math.sin(pan);
        const ct = Math.cos(tilt);
        const st = Math.sin(tilt);
        aim
          .set(EYE.x - sp * ct * 20, EYE.y + st * 20, EYE.z + cp * ct * 20)
          .applyMatrix4(machine.matrixWorld);
        camera.position.copy(eye);
        camera.lookAt(aim);
      } else {
        const dist = 13;
        camera.position.set(
          px + Math.sin(orbit) * Math.cos(elevation) * dist,
          py + 2.2 + Math.sin(elevation) * dist,
          pz + Math.cos(orbit) * Math.cos(elevation) * dist,
        );
        camera.lookAt(px, py + 1, pz);
      }

      renderer.render(scene, camera);
    },
    resize(width, height) {
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    setMode(next) {
      mode = next;
      pan = 0;
      tilt = 0;
    },
    look(dx, dy) {
      if (mode === "cab") {
        // Limited travel: you are strapped into a seat, not floating.
        pan = clampNumber(pan - dx * 0.005, -1.5, 1.5);
        tilt = clampNumber(tilt - dy * 0.004, -0.7, 0.5);
      } else {
        orbit -= dx * 0.006;
        elevation = clampNumber(elevation + dy * 0.005, -0.15, 1.1);
      }
    },
    dispose() {
      renderer.dispose();
    },
  };
}

function clampNumber(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Built by hand rather than from PlaneGeometry so the index mapping provably
 * matches the collider: Rapier's slow-varying index is X, the fast one is Z.
 * That was verified against a real heightfield, not assumed.
 */
function buildTerrainMesh(terrain: Terrain): THREE.Mesh {
  const n = Math.round(Math.sqrt(terrain.heights.length));
  const grid = n - 1;
  const positions = new Float32Array(n * n * 3);
  for (let ix = 0; ix < n; ix++) {
    for (let iz = 0; iz < n; iz++) {
      const i = (ix * n + iz) * 3;
      positions[i] = (ix / grid - 0.5) * terrain.extent;
      positions[i + 1] = terrain.heights[ix * n + iz] as number;
      positions[i + 2] = (iz / grid - 0.5) * terrain.extent;
    }
  }
  const indices: number[] = [];
  for (let ix = 0; ix < grid; ix++) {
    for (let iz = 0; iz < grid; iz++) {
      const a = ix * n + iz;
      const b = (ix + 1) * n + iz;
      const c = (ix + 1) * n + iz + 1;
      const d = ix * n + iz + 1;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  // Flat shading needs genuine per-face normals, so split the vertices. The
  // probe hit this too: MeshToonMaterial ignores flatShading in that era.
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  const mesh = new THREE.Mesh(
    faceted,
    new THREE.MeshLambertMaterial({ color: 0x8f9678 }),
  );
  mesh.receiveShadow = true;
  return mesh;
}
