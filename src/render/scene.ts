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
import { createEventReader } from "../core/events.ts";
import { makeRng } from "../core/rng.ts";
import type { Snapshot } from "../core/snapshot.ts";
import { CAB, CLEARANCE, EYE, HULL, LEFT_X, RIGHT_X, TRACK } from "../core/spec.ts";
import { PROP_BOX, type Prop } from "../world/props.ts";
import { sampleTerrain, type Terrain } from "../world/terrain.ts";
import type { Pin } from "../world/waypoints.ts";
import { ink, inked, terrainMaterial, toon } from "./toon.ts";

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

/** How long a look is left alone before the view starts easing forward, ms. */
const LOOK_HOLD_MS = 1200;
/** Per-frame fraction of the remaining angle. Slow enough to feel like a neck. */
const LOOK_RETURN = 0.045;

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
  key.shadow.mapSize.set(2048, 2048);
  const shadowCam = key.shadow.camera;
  // Wide enough to cover the near field the chase camera can see. Too small a
  // frustum makes ground *outside* it sample as shadowed, which showed up as a
  // hard black wedge across the site and read as a shading bug.
  const SHADOW_REACH = 62;
  shadowCam.left = -SHADOW_REACH;
  shadowCam.right = SHADOW_REACH;
  shadowCam.top = SHADOW_REACH;
  shadowCam.bottom = -SHADOW_REACH;
  shadowCam.far = 190;
  key.shadow.bias = -0.0012;
  scene.add(key);
  scene.add(key.target);
  // Generous sky fill. With a cel ramp, ground facing away from the key light
  // lands on the darkest band across a whole hillside at once, which reads as
  // a hole rather than a slope unless the shade side is lifted.
  scene.add(new THREE.HemisphereLight(0xbcdcea, 0x6a6250, 1.85));

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

  // Undercarriage. The belly clearance is real — 0.42 m of nothing between the
  // top of each belt and the underside of the hull — and with nothing drawn in
  // it the tracks read as *detached*, which is exactly how it looked the first
  // time the machine ended up on its roof. Frames and a cross-member.
  const frameY = TRACK.height + CLEARANCE / 2;
  for (const x of [LEFT_X, RIGHT_X]) {
    const frame = inked(
      new THREE.BoxGeometry(TRACK.width * 0.72, CLEARANCE, TRACK.length * 0.66),
      dark,
    );
    frame.position.set(x, frameY, 0);
    machine.add(frame);
  }
  for (const z of [-TRACK.length * 0.26, TRACK.length * 0.24]) {
    const beam = inked(
      new THREE.BoxGeometry(LEFT_X - RIGHT_X, CLEARANCE * 0.45, 0.2),
      dark,
    );
    beam.position.set(0, frameY, z);
    machine.add(beam);
  }

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
  /**
   * Drawn a little inside the belt that wraps them, so they read as wheels
   * behind a track rather than drums stuck on the side of one. They still spin
   * at the belt's rate — the spin is a cue about slip, not a measurement.
   */
  const WHEEL_INSET = 0.88;
  const wheelGeom = {
    sprocket: new THREE.CylinderGeometry(
      SPROCKET_R * WHEEL_INSET,
      SPROCKET_R * WHEEL_INSET,
      TRACK.width * 1.05,
      10,
    ),
    idler: new THREE.CylinderGeometry(
      IDLER_R * WHEEL_INSET,
      IDLER_R * WHEEL_INSET,
      TRACK.width * 1.05,
      8,
    ),
  };

  interface Wheel {
    pivot: THREE.Group;
    radius: number;
  }
  const wheels: { left: Wheel[]; right: Wheel[] } = { left: [], right: [] };

  /**
   * Track grousers — the plates that actually bite the ground.
   *
   * They travel at **commanded** track speed, not at the speed the machine is
   * making over the ground. That difference is slip, and this is the only place
   * you can *see* it: belt racing under a machine that is not moving. The
   * telemetry number said the same thing, but a number is something you read
   * and this is something you notice.
   */
  // Oversized on purpose: chunky plates read as *tracks* at a glance and at a
  // distance, and they suit the slightly cartoonish register. Fewer, fatter
  // plates beat many thin ones for legibility, which is the whole reason the
  // belt is drawn at all — it is how you see slip.
  const GROUSERS = 11;
  const GROUSER_PITCH = TRACK.length / GROUSERS;
  /** The straight runs, wheel centre to wheel centre, and the nose-up rise. */
  const RUN_REAR = -(TRACK.length / 2 - SPROCKET_R);
  const RUN_FRONT = TRACK.length / 2 - IDLER_R;
  const BELT_RISE = SPROCKET_R - IDLER_R;
  const grouserGeom = new THREE.BoxGeometry(TRACK.width * 1.08, 0.09, 0.17);
  const grousers: { left: THREE.Mesh[]; right: THREE.Mesh[] } = {
    left: [],
    right: [],
  };
  const beltPhase = { left: 0, right: 0 };

  for (const [name, x] of [
    ["left", LEFT_X],
    ["right", RIGHT_X],
  ] as const) {
    const track = inked(beltGeometry(SPROCKET_R, IDLER_R), rubber);
    track.rotation.y = -Math.PI / 2;
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

    // Two runs: the plates come back over the top, so the belt reads as a loop
    // rather than a row of blocks sliding along the ground.
    for (let i = 0; i < GROUSERS * 2; i++) {
      const plate = new THREE.Mesh(grouserGeom, rubber);
      plate.castShadow = true;
      ink(plate, 0.018);
      plate.position.x = x;
      machine.add(plate);
      grousers[name].push(plate);
    }
  }

  scene.add(buildPins(waypoints));
  const propNodes: PropNode[] = [];
  scene.add(buildProps(props, { hazard, dark, accent, stone, rubber }, propNodes));
  // Anything written off is repainted once, when the ledger says so.
  const wrecked = toon(0x4a4640, { rim: 0x8fa0a8, rimStrength: 0.45 });
  const ledger = createEventReader();

  greeble(machine, { accent, dark, hazard, lamp: lampMat });

  /* -- camera state ----------------------------------------------------- */
  let mode: CameraMode = "cab";
  let pan = 0;
  let tilt = 0;
  /** When the pilot last moved the view. Wall clock: camera feel, not sim. */
  let lastLook = 0;
  let orbit = 2.4;
  let elevation = 0.35;
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  // Wheel spin is integrated from snapshot time, not wall time, so a replay
  // turns them exactly as the live run did.
  let lastSimSeconds: number | undefined;

  return {
    render(snapshot: Snapshot) {
      // Site furniture that is moving — usually nothing, briefly everything.
      for (const moved of snapshot.props) {
        const node = propNodes[moved.index];
        if (!node) continue;
        const [x, y, z] = moved.position;
        const [rx, ry, rz, rw] = moved.rotation;
        node.node.position.set(x, y, z);
        node.node.quaternion.set(rx, ry, rz, rw);
      }
      // New ledger lines since last frame. A write-off gets repainted; the
      // physics already threw it wherever it went. This was the third place in
      // the codebase keeping its own high-water mark into `snapshot.damage`,
      // which is what earned the event channel.
      for (const event of ledger.take(snapshot).events) {
        if (event.kind !== "ledger" || event.line.state !== "destroyed") continue;
        const node = propNodes[event.line.prop];
        if (!node) continue;
        for (const part of node.parts) part.material = wrecked;
      }

      const [px, py, pz] = snapshot.machine.pose.position;
      const [qx, qy, qz, qw] = snapshot.machine.pose.rotation;
      machine.position.set(px, py, pz);
      machine.quaternion.set(qx, qy, qz, qw);
      machine.updateMatrixWorld(true);

      key.position.set(px - 52, py + 78, pz + 38);
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

          // Advance the belt and wrap it into one pitch. The sign is negative
          // because the *ground-contact* run must travel rearward under a
          // machine driving forward — the wheels already spin that way, and a
          // belt that ran the other way disagreed with its own sprockets. A
          // track's plates move opposite to the vehicle, on the bottom.
          const loop = TRACK.length * 2;
          beltPhase[name] =
            (((beltPhase[name] - track.commanded * dt) % loop) + loop) % loop;
          const plates = grousers[name];
          for (let i = 0; i < plates.length; i++) {
            const plate = plates[i];
            if (!plate) continue;
            const along = (i * GROUSER_PITCH + beltPhase[name]) % loop;
            // Plates ride the tangent runs between the two wheels, not the
            // full box: the idler is smaller than the sprocket, so the belt
            // lifts towards the nose. That rise is the shape of the machine.
            const t =
              along < TRACK.length ? along / TRACK.length : 2 - along / TRACK.length;
            const z = RUN_REAR + t * (RUN_FRONT - RUN_REAR);
            if (along < TRACK.length) {
              // Bottom run, travelling forward under the machine.
              plate.position.set(plate.position.x, t * BELT_RISE + 0.03, z);
              plate.rotation.set(0, 0, 0);
            } else {
              // Top run, coming back the other way.
              plate.position.set(
                plate.position.x,
                TRACK.height - t * BELT_RISE - 0.03,
                z,
              );
              plate.rotation.set(Math.PI, 0, 0);
            }
          }
        }
      }

      if (mode === "cab") {
        // **Eyes back on the road.**
        //
        // A swipe is a glance, not a new heading: once you stop moving, the view
        // eases back to straight ahead on its own. Without it every look costs
        // a second deliberate swipe to undo, and the cheapest way to avoid that
        // cost is to never look — which is the opposite of what a glance is for.
        //
        // Cab only. In chase you are outside the machine and free look is the
        // entire point of being there.
        //
        // Renderer-side and frame-rate-coupled on purpose: this is camera feel,
        // never sim state, so it can use the wall clock that rule 2 keeps out of
        // the simulation.
        if (performance.now() - lastLook > LOOK_HOLD_MS) {
          pan += (0 - pan) * LOOK_RETURN;
          tilt += (0 - tilt) * LOOK_RETURN;
          if (Math.abs(pan) < 1e-3) pan = 0;
          if (Math.abs(tilt) < 1e-3) tilt = 0;
        }

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
        const cx = px + Math.sin(orbit) * Math.cos(elevation) * dist;
        const cz = pz + Math.cos(orbit) * Math.cos(elevation) * dist;
        // Never let the observer end up underground. Without this, dragging
        // down puts the camera beneath the heightfield and the site turns into
        // a dark band with sky below it — which looked like a shading bug and
        // was not one.
        const floor = sampleTerrain(terrain, cx, cz) + 1.6;
        camera.position.set(
          cx,
          Math.max(py + 2.2 + Math.sin(elevation) * dist, floor),
          cz,
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
      lastLook = performance.now();
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
 * The belt's silhouette: the hull of the two wheels it runs on, rather than a
 * box. A track is not a slab — it is a loop wrapped round a big drive sprocket
 * at the back and a small idler at the front, and drawing it as a box makes the
 * machine read as blocks stacked on blocks.
 *
 * The **collider stays a box** (`src/sim/tracked.ts`), so this shape is very
 * slightly smaller than the thing that actually collides, at the four corners
 * the rounding removes. That is a deliberate mismatch and the cheap way round:
 * the corners are above the contact rays and below the hull, so nothing the
 * player can see or feel happens there. Revisit it if the belt ever has to
 * catch on anything.
 *
 * Built in the length/height plane and extruded across the width, so the mesh
 * is turned a quarter turn about Y when it is placed.
 */
function beltGeometry(rearRadius: number, frontRadius: number): THREE.ExtrudeGeometry {
  const rear = -(TRACK.length / 2 - rearRadius);
  const front = TRACK.length / 2 - frontRadius;
  const shape = new THREE.Shape();
  shape.moveTo(rear, rearRadius);
  shape.lineTo(front, frontRadius);
  shape.absarc(front, 0, frontRadius, Math.PI / 2, -Math.PI / 2, true);
  shape.lineTo(rear, -rearRadius);
  shape.absarc(rear, 0, rearRadius, -Math.PI / 2, Math.PI / 2, true);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: TRACK.width,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -TRACK.width / 2);
  return geometry;
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
  const mesh = new THREE.Mesh(faceted, terrainMaterial(0x8f9678));
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * A prop's scene node, plus the meshes whose material can be swapped when it
 * is written off. The ink shells are children of those meshes and must keep
 * their own material, which is why this holds the parts rather than traversing.
 */
interface PropNode {
  readonly node: THREE.Group;
  readonly parts: THREE.Mesh[];
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
function buildProps(
  props: readonly Prop[],
  mat: PropMaterials,
  out: PropNode[],
): THREE.Group {
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
    scooterBody: new THREE.BoxGeometry(0.34, 0.3, 1.15),
    scooterSeat: new THREE.BoxGeometry(0.3, 0.14, 0.44),
    scooterStem: new THREE.BoxGeometry(0.1, 0.62, 0.1),
    scooterBar: new THREE.BoxGeometry(0.54, 0.07, 0.07),
    scooterWheel: new THREE.CylinderGeometry(0.26, 0.26, 0.11, 10),
  };

  for (const [index, prop] of props.entries()) {
    // The node sits where the *body* sits — the collider's centre — because it
    // has to be able to take a pose straight from the sim once something has
    // knocked it over. The art inside is built from the ground up, so it hangs
    // one half-height below.
    const [, hy] = PROP_BOX[prop.kind];
    const node = new THREE.Group();
    node.position.set(prop.x, prop.y + hy * prop.scale, prop.z);
    node.quaternion.set(0, prop.yawY, 0, prop.yawW);
    node.scale.setScalar(prop.scale);
    const base = new THREE.Group();
    base.position.y = -hy;
    node.add(base);
    const parts: THREE.Mesh[] = [];
    const add = (mesh: THREE.Mesh) => {
      base.add(mesh);
      parts.push(mesh);
      return mesh;
    };

    if (prop.kind === "cone") {
      add(inked(geo.cone, mat.hazard)).position.y = 0.5;
      add(inked(geo.coneBase, mat.rubber)).position.y = 0.045;
    } else if (prop.kind === "pole") {
      add(inked(geo.pole, mat.dark, 0.02)).position.y = 1.5;
      add(inked(geo.flag, mat.hazard, 0.02)).position.set(0.3, 2.7, 0);
    } else if (prop.kind === "pipes") {
      // Three down, one nested on top — a stack that has been there a while.
      for (const [i, offset] of [-0.68, 0, 0.68].entries()) {
        const pipe = add(inked(geo.pipe, mat.accent));
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(offset, 0.32, i * 0.001);
      }
      const top = add(inked(geo.pipe, mat.accent));
      top.rotation.z = Math.PI / 2;
      top.position.set(-0.34, 0.9, 0);
    } else if (prop.kind === "barrier") {
      add(inked(geo.barrierPlank, mat.hazard)).position.y = 0.95;
      for (const side of [-1, 1]) {
        add(inked(geo.barrierLeg, mat.dark)).position.set(side, 0.5, 0);
      }
    } else if (prop.kind === "scooter") {
      // Somebody rode this to work. It is the one thing on site that belongs
      // to a person, and the ledger prices it accordingly.
      add(inked(geo.scooterBody, mat.accent, 0.02)).position.set(0, 0.42, 0.05);
      add(inked(geo.scooterSeat, mat.rubber, 0.02)).position.set(0, 0.63, -0.2);
      add(inked(geo.scooterStem, mat.dark, 0.02)).position.set(0, 0.7, 0.52);
      add(inked(geo.scooterBar, mat.dark, 0.02)).position.set(0, 0.98, 0.52);
      for (const z of [-0.42, 0.55]) {
        const wheel = add(inked(geo.scooterWheel, mat.rubber, 0.02));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.26, z);
      }
    } else {
      // Faceted on purpose: the toon ramp needs flats to band across.
      const rock = add(inked(geo.rock, mat.stone));
      rock.scale.set(1, 0.62, 1);
      rock.position.y = 0.7;
    }
    out[index] = { node, parts };
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

/**
 * Greebles — small procedural surface detail: panels, vents, hatches, grab
 * rails, exhaust stacks.
 *
 * Cheap, and they do more than decorate. A bare box has no scale: it could be
 * a metre or ten. Hatches and rails are things a human body uses, so they tell
 * you how big the machine is, and they make the cel ink lines land on
 * something instead of tracing one silhouette.
 *
 * Seeded, so the machine looks the same every reload. Renderer-side only: none
 * of this exists to the sim, and none of it can be hit.
 */
function greeble(
  machine: THREE.Group,
  mat: {
    accent: THREE.Material;
    dark: THREE.Material;
    hazard: THREE.Material;
    lamp: THREE.Material;
  },
): void {
  const rng = makeRng(0x1a80);
  const deckY = TRACK.height + CLEARANCE + HULL.height;
  const half = { x: HULL.width / 2, z: HULL.length / 2 };

  // Deck plates, scattered over the hull roof but kept clear of the cab.
  for (let i = 0; i < 9; i++) {
    const w = rng.range(0.22, 0.55);
    const d = rng.range(0.22, 0.5);
    const x = rng.range(-half.x + 0.25, half.x - 0.25);
    const z = rng.range(-half.z + 0.25, half.z - 0.25);
    if (Math.abs(x) < CAB.width * 0.7 && Math.abs(z - CAB.z) < CAB.depth * 0.8)
      continue;
    const plate = inked(
      new THREE.BoxGeometry(w, rng.range(0.05, 0.13), d),
      mat.accent,
      0.02,
    );
    plate.position.set(x, deckY, z);
    machine.add(plate);
  }

  // Flank ribs. Mirrored, because a machine is built symmetrically even when
  // its clutter is not.
  const ribCount = 5;
  for (let i = 0; i < ribCount; i++) {
    const z = -half.z + 0.5 + (i / (ribCount - 1)) * (HULL.length - 1);
    const h = rng.range(0.3, 0.7);
    for (const side of [-1, 1]) {
      const rib = inked(
        new THREE.BoxGeometry(0.07, h, rng.range(0.1, 0.22)),
        mat.dark,
        0.02,
      );
      rib.position.set(side * (half.x + 0.03), deckY - HULL.height / 2, z);
      machine.add(rib);
    }
  }

  // Grab rail up the side of the cab: the clearest scale cue on the machine.
  for (const side of [-1, 1]) {
    const rail = inked(new THREE.BoxGeometry(0.05, 0.9, 0.05), mat.accent, 0.02);
    rail.position.set(side * (CAB.width / 2 + 0.1), CAB.y, CAB.z - CAB.depth / 2);
    machine.add(rail);
  }

  // Exhaust stacks and a dorsal pack behind the cab.
  for (const side of [-1, 1]) {
    const stack = inked(
      new THREE.CylinderGeometry(0.08, 0.1, 0.75, 8),
      mat.dark,
      0.025,
    );
    stack.position.set(side * 0.42, deckY + 0.37, -half.z + 0.55);
    machine.add(stack);
  }
  const pack = inked(new THREE.BoxGeometry(1.0, 0.42, 0.6), mat.dark, 0.025);
  pack.position.set(0, deckY + 0.21, -half.z + 1.25);
  machine.add(pack);

  // A hazard stripe panel and a unit-number plate, low on the flanks.
  for (const side of [-1, 1]) {
    const stripe = inked(new THREE.BoxGeometry(0.06, 0.24, 0.9), mat.hazard, 0.02);
    stripe.position.set(
      side * (half.x + 0.02),
      deckY - HULL.height + 0.3,
      half.z - 0.8,
    );
    machine.add(stripe);
  }

  // A single beacon on the cab roof. Machines that move on foot-traffic sites
  // have one, and it is the loudest "this is industrial plant" signal there is.
  const beacon = inked(
    new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8),
    mat.hazard,
    0.02,
  );
  beacon.position.set(-CAB.width / 2 + 0.16, CAB.y + CAB.height / 2 + 0.08, CAB.z);
  machine.add(beacon);
}
