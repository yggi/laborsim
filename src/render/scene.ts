/**
 * The renderer owns three.js and the scene graph. It is a *consumer* of
 * simulation, never a source of it — it reads snapshots and draws them.
 *
 * Architecture rule 3: Svelte never owns the canvas, and no reactive
 * scene-graph wrapper (Threlte and friends) may be introduced here. A reactive
 * scene graph fights a fixed-step imperative loop and reintroduces per-frame
 * reactivity cost on exactly the platform that cannot afford it.
 *
 * See doc/design/code/architecture-rules.md.
 */

import * as THREE from "three";
import { createEventReader } from "../core/events.ts";
import { makeRng } from "../core/rng.ts";
import type { PropPose, Snapshot } from "../core/snapshot.ts";
import { CAB, CLEARANCE, EYE, HULL, LEFT_X, RIGHT_X, TRACK } from "../core/spec.ts";
import type { MaterialId, MaterialSpec } from "../world/materials.ts";
import { MATERIAL } from "../world/materials.ts";
import { KIND, type Piece, PROP_BOX, type Prop } from "../world/props.ts";
import { sampleTerrain, type Terrain } from "../world/terrain.ts";
import type { Pin } from "../world/waypoints.ts";
import { cabCameraRotation, cabOffset, focalPixels } from "./camera.ts";
import { createResidue } from "./residue.ts";
import { ink, inked, terrainMaterial, toon } from "./toon.ts";

/**
 * Cab is the primary view: rung 1's whole claim is that the two-lever cage
 * with a clear windscreen is a genuinely good machine. Chase is the extra, and
 * it costs you the controls — see doc/design/cab/cockpit.md.
 */
export type CameraMode = "cab" | "chase";

export interface Viewport {
  render(snapshot: Snapshot): void;
  resize(width: number, height: number): void;
  setMode(mode: CameraMode): void;
  /** Head pan in the cab; orbit in chase. Same gesture, different meaning. */
  look(dx: number, dy: number): void;
  /**
   * Where the cab has swept to, in CSS pixels, for the DOM that is bolted to
   * it — the cage, the pods, the dash and the levers.
   *
   * The renderer publishes it because the renderer owns the projection. Read it
   * once per frame and write it to one custom property; never let it become
   * reactive state (architecture rule 3, and `doc/design/cab/components.md`).
   */
  head(): { x: number; y: number };
  /**
   * A hand is on the glass, or has come off it.
   *
   * The neck is sprung: it pulls back to straight ahead whenever nothing is
   * holding it. So the *hold* is the state worth telling the renderer about,
   * and the pointer that knows it lives in the shell.
   */
  hold(down: boolean): void;
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

/**
 * Time constant of the neck coming back, seconds. Slow enough to read as a
 * head turning rather than a camera snapping.
 *
 * **Per second, not per frame.** It was a flat 0.045 of the remaining angle
 * every frame, which is the same thing only at 60 fps: on a phone rendering at
 * 30 the eyes came back twice as slowly, and the whole point of the mobile-first
 * pillar is that the slow device is the real one. 0.37 s reproduces the old
 * feel at 60 fps exactly. Found from a screenshot bench that kept catching the
 * cab 25 px off centre and looking like a layout bug.
 */
const LOOK_TAU = 0.37;

export function createViewport(
  canvas: HTMLCanvasElement,
  terrain: Terrain,
  props: readonly Prop[],
  waypoints: readonly Pin[],
  /**
   * Where the props came to rest, from `world.poses()`.
   *
   * Separate from `props` because they answer different questions: that list is
   * where the generator *asked* for a thing, this is where the site's 120 settle
   * steps left it. Most of the site is asleep by tick 0 and so never appears in
   * `snapshot.props`, which meant a scene built from the spawn list alone drew
   * furniture in positions the sim had already left behind.
   */
  poses: readonly PropPose[] = [],
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
  const siteMats = siteMaterials();
  scene.add(buildProps(props, poses, siteMats, propNodes));
  /**
   * The two tiers the ledger has always had, and only one of which was ever
   * drawn. `scuffed` is *damaged* — 30% of toughness gone, a line already
   * written — and it existed as a number for as long as the ledger has and was
   * visible on no surface at all.
   *
   * **Both keep the material.** A single grey for every write-off was fine
   * while there were five kinds; with a material axis it throws away the one
   * thing the site is now made of, and four steel pipes on their sides came out
   * looking like felled logs. So a wreck is the stuff's own colour taken down,
   * which reads as ruined without pretending it has stopped being steel.
   */
  const wrecked = siteMaterials(0.58, 0.6);
  const scuffed = siteMaterials(0.8, 0.8);
  const ledger = createEventReader();

  /**
   * Loose pieces, driven from `snapshot.debris`.
   *
   * They are the prop's **own meshes**, lifted out of its node and hung here, so
   * coming apart costs no new geometry and no new draw calls — the art was
   * already built out of exactly these pieces, in exactly this order
   * (`world/props.ts`). Keyed `prop * 32 + piece`, which is comfortably above
   * the longest part list and saves a string key per piece per frame.
   */
  const debrisGroup = new THREE.Group();
  scene.add(debrisGroup);
  const shards = new Map<number, THREE.Object3D>();
  const residue = createResidue(scene, siteMats);

  greeble(machine, { accent, dark, hazard, lamp: lampMat });

  /* -- camera state ----------------------------------------------------- */
  let mode: CameraMode = "cab";
  let pan = 0;
  let tilt = 0;
  /** A hand is on the glass, so the sprung neck stays where it is put. */
  let held = false;
  /** Wall clock of the previous rendered frame, for a rate-independent ease. */
  let lastFrame = 0;
  let orbit = 2.4;
  let elevation = 0.35;
  /** Glass height in CSS pixels, which is what turns a look angle into a
   *  translate. Zero until the first resize, and zero is harmless. */
  let viewHeight = 0;
  const eye = new THREE.Vector3();
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
      // Wreckage that is still moving. Same rule as the props: only what is
      // awake, so a site whose pieces have come to rest costs nothing.
      for (const moved of snapshot.debris) {
        const shard = shards.get(moved.prop * 32 + moved.piece);
        if (!shard) continue;
        const [x, y, z] = moved.position;
        const [rx, ry, rz, rw] = moved.rotation;
        shard.position.set(x, y, z);
        shard.quaternion.set(rx, ry, rz, rw);
      }
      // New ledger lines since last frame. This was the third place in the
      // codebase keeping its own high-water mark into `snapshot.damage`, which
      // is what earned the event channel.
      const read = ledger.take(snapshot);
      if (read.rewound) {
        residue.clear();
      }
      for (const event of read.events) {
        if (event.kind !== "ledger") continue;
        const node = propNodes[event.line.prop];
        if (!node) continue;
        const pieces = KIND[event.line.kind].pieces;
        const paint = (into: ReadonlyMap<MaterialId, THREE.Material>) => {
          for (const [n, part] of node.parts.entries()) {
            const material = pieces[n]?.material;
            const swapped = material && into.get(material);
            if (swapped) part.material = swapped;
          }
        };
        if (event.line.state === "damaged") {
          paint(scuffed);
          continue;
        }
        paint(wrecked);
        // **It comes apart.** Every piece is lifted out of the prop's node and
        // hung on the scene, keeping the prop's own scale, and from here it is
        // driven by the sim like anything else. If the sim ran out of debris
        // budget the pieces simply never move again, which is what a repainted
        // box already looked like.
        const scale = node.node.scale.x;
        for (const [n, part] of node.parts.entries()) {
          const held = new THREE.Vector3();
          part.getWorldPosition(held);
          const spun = new THREE.Quaternion();
          part.getWorldQuaternion(spun);
          const size = part.scale;
          debrisGroup.add(part);
          part.position.copy(held);
          part.quaternion.copy(spun);
          part.scale.set(size.x * scale, size.y * scale, size.z * scale);
          shards.set(event.line.prop * 32 + n, part);
        }
        residue.burst(event.line, KIND[event.line.kind].pieces);
      }
      residue.step(snapshot.simSeconds);

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
        // **Eyes back on the road, and the neck is sprung.**
        //
        // A swipe is a glance, not a new heading: the view pulls back to
        // straight ahead the instant you let go of the glass. Without it every
        // look costs a second deliberate swipe to undo, and the cheapest way to
        // avoid that cost is to never look — the opposite of what a glance is
        // for.
        //
        // It used to wait 1.2 s before starting, which made a glance a thing
        // with a *dwell* in it; sprung, it is a thing you hold. Holding is what
        // `held` is: the hand is on the glass, so the spring is compressed and
        // the head stays where it has been put.
        //
        // Cab only. In chase you are outside the machine and free look is the
        // entire point of being there.
        //
        // Renderer-side on purpose: this is camera feel, never sim state, so it
        // can use the wall clock that rule 2 keeps out of the simulation.
        const now = performance.now();
        // Wall clock, clamped: a backgrounded tab comes back with a gap that
        // would otherwise snap the head round in a single frame.
        const frame = lastFrame === 0 ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
        lastFrame = now;
        if (!held) {
          // deterministic-exempt: camera feel, and it never reaches the sim.
          const eased = 1 - Math.exp(-frame / LOOK_TAU);
          pan += (0 - pan) * eased;
          tilt += (0 - tilt) * eased;
          if (Math.abs(pan) < 1e-3) pan = 0;
          if (Math.abs(tilt) < 1e-3) tilt = 0;
        }

        // The eye rides the hull, so the cab pitches and rolls with the
        // machine. Both halves of that are the hull's: the seat is at a fixed
        // point in the machine, and the head is at a fixed *attitude* in it —
        // a pan and a tilt in machine space, so "look left" means left of the
        // machine's own heading, and a hull leaning 20° puts the horizon 20°
        // across the glass. See render/camera.ts for why this is not `lookAt`.
        eye.set(EYE.x, EYE.y, EYE.z).applyMatrix4(machine.matrixWorld);
        camera.position.copy(eye);
        cabCameraRotation(machine.quaternion, pan, tilt, camera.quaternion);
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
      viewHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    head() {
      // Chase is outside the machine: there is no cab to sweep, and the only
      // furniture still on screen belongs to the rig rather than to the Labor.
      if (mode !== "cab") return { x: 0, y: 0 };
      return cabOffset(pan, tilt, focalPixels(camera.fov, viewHeight));
    },
    hold(down) {
      held = down;
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
        //
        // Both axes drag the *world*, not the head: pull the glass right and
        // you look left, pull it down and you look up. The vertical used to be
        // the other way round, which is the one combination nobody has a name
        // for — the horizontal was already grab-the-world, so the two axes
        // disagreed with each other.
        pan = clampNumber(pan - dx * 0.005, -1.5, 1.5);
        tilt = clampNumber(tilt + dy * 0.004, -0.7, 0.5);
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
 * One toon material per **material**, not per prop kind.
 *
 * The site is nobody's house (`doc/design/cab/sound.md`): a pipe stack is steel
 * whoever stacked it, so the stuff owns its colour for the same reason it owns
 * its voice. The renderer used to keep five hand-picked paints and guess which
 * one a kind wanted, which is how a boulder and a scooter ended up sharing a
 * palette by accident.
 */
function siteMaterials(shade = 1, rim = 0.75): Map<MaterialId, THREE.Material> {
  const made = new Map<MaterialId, THREE.Material>();
  for (const [id, spec] of Object.entries(MATERIAL) as [MaterialId, MaterialSpec][]) {
    made.set(
      id,
      toon(darken(spec.colour, shade), {
        rim: spec.rim,
        rimStrength: (id === "glass" ? 1.2 : 0.75) * rim,
      }),
    );
  }
  return made;
}

/** Scale every channel of a hex colour. Arithmetic; no three.js colour space. */
function darken(colour: number, by: number): number {
  const r = Math.round(((colour >> 16) & 0xff) * by);
  const g = Math.round(((colour >> 8) & 0xff) * by);
  const b = Math.round((colour & 0xff) * by);
  return (r << 16) | (g << 8) | b;
}

/**
 * A prop's scene node, and its pieces.
 *
 * `parts` used to exist only so a write-off could repaint every mesh without
 * traversing into the ink shells, which are children and must keep their own
 * material. It now also holds the pieces **in declaration order**, which is what
 * lets a destroyed prop come apart into exactly the solids `world/props.ts` says
 * it is made of — the art and the debris are the same list.
 */
interface PropNode {
  readonly node: THREE.Group;
  /** The base group the art hangs off, one half-height below the body centre. */
  readonly base: THREE.Group;
  readonly parts: THREE.Mesh[];
}

/**
 * Geometry for one declared piece, shared across every instance of that shape
 * and size. A cache rather than a table: the inventory is data now, so the
 * renderer cannot hold a list of what exists — it finds out by being handed one.
 */
function pieceGeometry(
  cache: Map<string, THREE.BufferGeometry>,
  piece: Piece,
): THREE.BufferGeometry {
  const [sx, sy, sz] = piece.size;
  const key = `${piece.shape}:${sx}:${sy}:${sz}`;
  const found = cache.get(key);
  if (found) return found;
  // Radial detail from the radius: a marker pole at 5 cm gets six sides and a
  // pipe at 30 cm gets ten. One rule, so a new kind never picks its own.
  const radius = Math.max(sx, sz);
  const sides = radius < 0.12 ? 6 : radius < 0.35 ? 8 : 10;
  const made =
    piece.shape === "box"
      ? new THREE.BoxGeometry(sx * 2, sy * 2, sz * 2)
      : piece.shape === "cylinder"
        ? new THREE.CylinderGeometry(sx, sz, sy * 2, sides)
        : piece.shape === "cone"
          ? new THREE.ConeGeometry(sx, sy * 2, sides)
          : // Faceted on purpose: the toon ramp needs flats to band across, and
            // it is what made a boulder read as a boulder rather than a ball.
            new THREE.IcosahedronGeometry(1, 0);
  cache.set(key, made);
  return made;
}

/**
 * Site furniture, drawn from the world's part lists rather than invented here.
 *
 * This was an if/else chain with one branch per kind and **a boulder in its
 * `else`**, so a kind the renderer had not been told about drew a rock and said
 * nothing. Nothing type-checked it, because a fallthrough is not a missing case.
 * Now the shapes, sizes, offsets and materials come from `world/props.ts` and
 * this is a loop — the thing you see is the thing you collide with and the thing
 * the ledger prices, because there is only one description of it.
 */
function buildProps(
  props: readonly Prop[],
  poses: readonly PropPose[],
  materials: Map<MaterialId, THREE.Material>,
  out: PropNode[],
): THREE.Group {
  const group = new THREE.Group();
  const cache = new Map<string, THREE.BufferGeometry>();

  for (const [index, prop] of props.entries()) {
    // The node sits where the *body* sits — the collider's centre — because it
    // has to be able to take a pose straight from the sim once something has
    // knocked it over. The art inside is built from the ground up, so it hangs
    // one half-height below.
    const [, hy] = PROP_BOX[prop.kind];
    const node = new THREE.Group();
    // **Where it came to rest, not where it was asked to go.** The site settles
    // for 120 steps inside `createWorld` and most of it is asleep by the time
    // anybody looks, so a scene built from the spawn list drew sleeping props in
    // positions the sim had already moved them out of.
    const settled = poses[index];
    if (settled) {
      const [x, y, z] = settled.position;
      const [rx, ry, rz, rw] = settled.rotation;
      node.position.set(x, y, z);
      node.quaternion.set(rx, ry, rz, rw);
    } else {
      node.position.set(prop.x, prop.y + hy * prop.scale, prop.z);
      node.quaternion.set(0, prop.yawY, 0, prop.yawW);
    }
    node.scale.setScalar(prop.scale);
    const base = new THREE.Group();
    base.position.y = -hy;
    node.add(base);

    const parts: THREE.Mesh[] = [];
    for (const piece of KIND[prop.kind].pieces) {
      const material =
        materials.get(piece.material) ?? (materials.get("steel") as THREE.Material);
      // Thin things get a finer line, or a 3.5 cm shell swallows a 4 cm flag.
      const thinnest = Math.min(piece.size[0], piece.size[1], piece.size[2]);
      const mesh = inked(
        pieceGeometry(cache, piece),
        material,
        thinnest < 0.06 ? 0.02 : undefined,
      );
      if (piece.shape === "sphere") mesh.scale.set(...piece.size);
      mesh.position.set(...piece.at);
      if (piece.turn) mesh.quaternion.set(...piece.turn);
      base.add(mesh);
      parts.push(mesh);
    }
    out[index] = { node, base, parts };
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
