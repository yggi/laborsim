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
import type { Prop } from "../world/props.ts";
import type { Terrain } from "../world/terrain.ts";
import type { Pin } from "../world/waypoints.ts";
import { ink, inked, toon } from "./toon.ts";

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
const SKY_LOW = 0xbfd4d8;
const SKY_HIGH = 0x5f8fb0;

/**
 * Layer for geometry the operator is sitting *inside*. Hidden from the cab
 * camera, shown from chase.
 *
 * Needed because ink shells are BackSide: from within a box, the shell's
 * interior is a solid wall rather than being culled away like the front-facing
 * mesh was. Turning the whole cab off for the cab camera is what the culling
 * used to do for free, and it keeps ink lines everywhere else.
 */
const LAYER_INTERIOR = 1;

export function createViewport(
  canvas: HTMLCanvasElement,
  terrain: Terrain,
  props: readonly Prop[],
  waypoints: readonly Pin[],
): Viewport {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKY, 70, 340);
  scene.add(buildSky());

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
  // Starts in the cab, so the interior layer starts hidden.
  camera.layers.disable(LAYER_INTERIOR);

  scene.add(buildTerrainMesh(terrain));

  /* -- the machine ----------------------------------------------------- */
  const machine = new THREE.Group();
  scene.add(machine);

  const paint = toon(0xdca42a, { rim: 0xffe9a8, rimStrength: 0.7 });
  const dark = toon(0x39413f, { rim: 0x9fdcf0, rimStrength: 0.95 });
  const accent = toon(0x93a3ab, { rim: 0xffffff, rimStrength: 1.05 });
  const rubber = toon(0x22282a, { rim: 0x7fbcd0, rimStrength: 0.6 });
  const hazard = toon(0xdca42a, { rim: 0xffe9a8, rimStrength: 0.8 });
  const stone = toon(0x6f7468, { rim: 0xbcd6e2, rimStrength: 0.7 });
  // Actually transparent: the eye sits behind this pane, so an opaque one is a
  // cyan wall. From outside it still reads as glass.
  const glass = new THREE.MeshLambertMaterial({
    color: 0x9fe8f2,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  const hull = inked(
    new THREE.BoxGeometry(HULL.width, HULL.height, HULL.length),
    paint,
  );
  hull.position.y = TRACK.height + CLEARANCE + HULL.height / 2;
  machine.add(hull);

  // A cab you can see out of. Rung 1 has nothing occluding the glass yet, and
  // that is the point — the panel budget only bites once instruments arrive.
  const cab = inked(new THREE.BoxGeometry(CAB.width, CAB.height, CAB.depth), dark);
  cab.position.set(0, CAB.y, CAB.z);
  cab.traverse((o) => o.layers.set(LAYER_INTERIOR));
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
  const bumper = inked(new THREE.BoxGeometry(HULL.width * 0.98, 0.18, 0.12), accent);
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
    const track = inked(
      new THREE.BoxGeometry(TRACK.width, TRACK.height, TRACK.length),
      rubber,
    );
    track.position.set(x, TRACK.height / 2, 0);
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
      ink(mesh);
      pivot.add(mesh);
      machine.add(pivot);
      wheels[name].push({ pivot, radius });
    }
  }

  scene.add(buildPins(waypoints));
  scene.add(buildProps(props, { hazard, dark, accent, stone, rubber }));

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
      if (next === "cab") camera.layers.disable(LAYER_INTERIOR);
      else camera.layers.enable(LAYER_INTERIOR);
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
  const mesh = new THREE.Mesh(faceted, toon(0x8f9678, { soft: true, rimStrength: 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

type PropMaterials = {
  hazard: THREE.Material;
  dark: THREE.Material;
  accent: THREE.Material;
  stone: THREE.Material;
  rubber: THREE.Material;
};

/**
 * Site furniture, drawn from the world's prop list rather than invented here.
 * Positions and sizes come from `src/world/props.ts` so the thing you see is
 * the thing you collide with — a cone you can drive through would be worse
 * than no cone at all.
 */
function buildProps(props: readonly Prop[], mat: PropMaterials): THREE.Group {
  const group = new THREE.Group();

  // Geometry is shared across every instance of a kind; only transforms differ.
  const geo = {
    cone: new THREE.ConeGeometry(0.34, 1, 8),
    coneBase: new THREE.BoxGeometry(0.8, 0.09, 0.8),
    pole: new THREE.CylinderGeometry(0.05, 0.05, 3, 6),
    flag: new THREE.BoxGeometry(0.6, 0.42, 0.04),
    pipe: new THREE.CylinderGeometry(0.3, 0.3, 2.6, 8),
    barrierPlank: new THREE.BoxGeometry(2.4, 0.5, 0.16),
    barrierLeg: new THREE.BoxGeometry(0.14, 1.0, 0.5),
    rock: new THREE.IcosahedronGeometry(1, 0),
  };

  for (const prop of props) {
    const node = new THREE.Group();
    node.position.set(prop.x, prop.y, prop.z);
    node.rotation.y = prop.yaw;
    node.scale.setScalar(prop.scale);

    if (prop.kind === "cone") {
      const cone = inked(geo.cone, mat.hazard);
      cone.position.y = 0.5;
      node.add(cone);
      const base = inked(geo.coneBase, mat.rubber);
      base.position.y = 0.045;
      node.add(base);
    } else if (prop.kind === "pole") {
      const pole = inked(geo.pole, mat.dark, 0.02);
      pole.position.y = 1.5;
      node.add(pole);
      const flag = inked(geo.flag, mat.hazard, 0.02);
      flag.position.set(0.3, 2.7, 0);
      node.add(flag);
    } else if (prop.kind === "pipes") {
      // Three down, one nested on top — a stack that has been there a while.
      for (const [i, offset] of [-0.68, 0, 0.68].entries()) {
        const pipe = inked(geo.pipe, mat.accent);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(offset, 0.32, i * 0.001);
        node.add(pipe);
      }
      const top = inked(geo.pipe, mat.accent);
      top.rotation.z = Math.PI / 2;
      top.position.set(-0.34, 0.9, 0);
      node.add(top);
    } else if (prop.kind === "barrier") {
      const plank = inked(geo.barrierPlank, mat.hazard);
      plank.position.y = 0.95;
      node.add(plank);
      for (const side of [-1, 1]) {
        const leg = inked(geo.barrierLeg, mat.dark);
        leg.position.set(side, 0.5, 0);
        node.add(leg);
      }
    } else {
      // Faceted on purpose: the toon ramp needs flats to band across.
      const rock = inked(geo.rock, mat.stone);
      rock.scale.set(1, 0.62, 1);
      rock.position.y = 0.7;
      node.add(rock);
    }
    group.add(node);
  }
  return group;
}

/**
 * A gradient dome rather than a flat clear colour or an HDRI. Anime skies are
 * flat washes with visible steps, so the shader quantizes the gradient and
 * blends the banded version back over the smooth one — the same trick as the
 * cel ramp, applied to the backdrop.
 */
function buildSky(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 14),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        low: { value: new THREE.Color(SKY_LOW) },
        high: { value: new THREE.Color(SKY_HIGH) },
      },
      vertexShader: `
        varying float vy;
        void main() {
          vy = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying float vy;
        uniform vec3 low;
        uniform vec3 high;
        void main() {
          float t = smoothstep(-0.08, 0.62, vy);
          vec3 c = mix(low, high, t);
          float band = floor(t * 7.0) / 7.0;
          gl_FragColor = vec4(mix(c, mix(low, high, band), 0.35), 1.0);
        }`,
    }),
  );
}

/**
 * NAV-1's route, staked out on the ground. The pins are visible because the
 * failure has to be legible: watching the machine grind toward a marker it can
 * see and a boulder it cannot is the whole lesson.
 */
function buildPins(waypoints: readonly Pin[]): THREE.Group {
  const group = new THREE.Group();
  const post = new THREE.CylinderGeometry(0.09, 0.09, 4, 6);
  const flag = new THREE.BoxGeometry(0.9, 0.7, 0.06);
  const mat = toon(0xe0503c, { rim: 0xffd2c8, rimStrength: 0.9 });
  for (const pin of waypoints) {
    const node = new THREE.Group();
    node.position.set(pin.x, pin.y, pin.z);
    const mast = inked(post, mat, 0.025);
    mast.position.y = 2;
    node.add(mast);
    const banner = inked(flag, mat, 0.025);
    banner.position.set(0.45, 3.5, 0);
    node.add(banner);
    group.add(node);
  }
  return group;
}
