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
import { CAB, CLEARANCE, EYE, HULL, LEFT_X, RIGHT_X, TRACK } from "../core/spec.ts";
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
  const accent = new THREE.MeshLambertMaterial({ color: 0x8a8f84 });
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

  // Front markers. The hull is a symmetric box, so without these there is no
  // way to tell which end you are looking at — which is exactly how mirrored
  // steering shipped unnoticed once. Lamps read as "front" instantly and at
  // any angle, which a painted stripe does not.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const noseZ = HULL.length / 2 + 0.03;
  const noseY = TRACK.height + CLEARANCE + HULL.height * 0.72;
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.08), lampMat);
    lamp.position.set(side * HULL.width * 0.33, noseY, noseZ);
    machine.add(lamp);
  }
  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(HULL.width * 0.98, 0.18, 0.12),
    accent,
  );
  bumper.position.set(0, TRACK.height + CLEARANCE + 0.16, noseZ);
  machine.add(bumper);

  /**
   * Sprockets and idlers, one pair per track. They exist for three reasons and
   * every one of them is load-bearing:
   *
   *   - a big drive sprocket at the rear and a small idler at the front make
   *     the machine's facing unmistakable;
   *   - they spin at *commanded* track speed, so a spinning track under a
   *     stationary machine is slip you can see rather than only read;
   *   - left and right spin independently, so mirrored steering would now be
   *     visible instead of silent.
   */
  const SPROCKET_R = TRACK.height / 2;
  const IDLER_R = TRACK.height * 0.38;
  const wheelGeom = {
    sprocket: new THREE.CylinderGeometry(
      SPROCKET_R,
      SPROCKET_R,
      TRACK.width * 1.05,
      10,
    ),
    idler: new THREE.CylinderGeometry(IDLER_R, IDLER_R, TRACK.width * 1.05, 8),
  };

  interface Wheel {
    pivot: THREE.Group;
    radius: number;
  }
  const wheels: { left: Wheel[]; right: Wheel[] } = { left: [], right: [] };

  for (const [name, x] of [
    ["left", LEFT_X],
    ["right", RIGHT_X],
  ] as const) {
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK.width, TRACK.height, TRACK.length),
      dark,
    );
    track.position.set(x, TRACK.height / 2, 0);
    track.castShadow = true;
    machine.add(track);

    for (const [kind, z, radius] of [
      ["sprocket", -(TRACK.length / 2 - SPROCKET_R), SPROCKET_R],
      ["idler", TRACK.length / 2 - IDLER_R, IDLER_R],
    ] as const) {
      // The pivot spins about X; the mesh inside is turned to put the
      // cylinder's axis along X. Doing both on one object needs Euler-order
      // care, and a group needs none.
      const pivot = new THREE.Group();
      pivot.position.set(x, TRACK.height / 2, z);
      const mesh = new THREE.Mesh(wheelGeom[kind], accent);
      mesh.rotation.z = Math.PI / 2;
      mesh.castShadow = true;
      pivot.add(mesh);
      machine.add(pivot);
      wheels[name].push({ pivot, radius });
    }
  }

  /* -- camera state ----------------------------------------------------- */
  let mode: CameraMode = "cab";
  let pan = 0;
  let tilt = 0;
  let orbit = 2.4;
  let elevation = 0.35;
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  // Wheel spin is integrated from snapshot time, not wall time, so a replay
  // turns them exactly as the live run did.
  let lastSimSeconds: number | undefined;

  return {
    render(snapshot: Snapshot) {
      const [px, py, pz] = snapshot.machine.pose.position;
      const [qx, qy, qz, qw] = snapshot.machine.pose.rotation;
      machine.position.set(px, py, pz);
      machine.quaternion.set(qx, qy, qz, qw);
      machine.updateMatrixWorld(true);

      key.position.set(px - 30, py + 42, pz + 22);
      key.target.position.set(px, py, pz);

      const dt =
        lastSimSeconds === undefined ? 0 : snapshot.simSeconds - lastSimSeconds;
      lastSimSeconds = snapshot.simSeconds;
      if (dt > 0) {
        for (const [name, track] of [
          ["left", snapshot.machine.left],
          ["right", snapshot.machine.right],
        ] as const) {
          for (const wheel of wheels[name]) {
            wheel.pivot.rotation.x += (track.commanded / wheel.radius) * dt;
          }
        }
      }

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
