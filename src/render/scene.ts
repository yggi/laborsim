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

export interface Viewport {
  render(snapshot: Snapshot): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createViewport(canvas: HTMLCanvasElement): Viewport {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb9ccd2);
  scene.add(new THREE.HemisphereLight(0xa8ccdd, 0x4a4033, 1.4));

  const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 900);
  camera.position.set(6, 5, 9);
  camera.lookAt(0, 1, 0);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(100, 1, 100),
    new THREE.MeshStandardMaterial({ color: 0x8f9678 }),
  );
  scene.add(ground);

  // One mesh per simulated body, created on first sight and reused after.
  const meshes = new Map<string, THREE.Mesh>();
  const crateGeometry = new THREE.BoxGeometry(1, 1, 1);
  const crateMaterial = new THREE.MeshStandardMaterial({ color: 0xdca42a });

  return {
    render(snapshot: Snapshot) {
      for (const body of snapshot.bodies) {
        let mesh = meshes.get(body.id);
        if (!mesh) {
          mesh = new THREE.Mesh(crateGeometry, crateMaterial);
          meshes.set(body.id, mesh);
          scene.add(mesh);
        }
        mesh.position.set(...body.position);
        mesh.quaternion.set(...body.rotation);
      }
      renderer.render(scene, camera);
    },
    resize(width: number, height: number) {
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      crateGeometry.dispose();
      crateMaterial.dispose();
      renderer.dispose();
    },
  };
}
