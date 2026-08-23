/**
 * The cel pipeline, carried across from `prototype/concept-3` — mechanism, not
 * structure. Three parts, and the probe proved all three:
 *
 *   (a) a stepped gradient ramp on MeshToonMaterial → banded diffuse
 *   (b) a fresnel rim injected via onBeforeCompile → the anime edge light
 *   (c) inverted-hull backface shells → the ink line
 *
 * The rim injection is **guarded**: if a future three.js drops the varying it
 * needs, the material renders without a rim rather than throwing a black
 * screen. That guard is in the probe's findings for a reason.
 */

import * as THREE from "three";

/** Ink line thickness, in metres. Constant in world space, not in pixels. */
export const INK = 0.035;

const inkMaterial = new THREE.MeshBasicMaterial({
  color: 0x101a1e,
  side: THREE.BackSide,
});

/** A stepped greyscale ramp. Nearest filtering is what makes the bands hard. */
function ramp(steps: number[]): THREE.DataTexture {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => {
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  const texture = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

const RAMP_HARD = ramp([52, 116, 186, 255]);
const RAMP_SOFT = ramp([70, 150, 255]);

export interface ToonOptions {
  /** Rim light colour. Defaults to a cool sky bounce. */
  rim?: number;
  /** Rim strength. 0 disables it. */
  rimStrength?: number;
  /** Three bands instead of four — for large surfaces like ground. */
  soft?: boolean;
}

export function toon(color: number, options: ToonOptions = {}): THREE.MeshToonMaterial {
  const { rim = 0xa9ecff, rimStrength = 0.85, soft = false } = options;
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: soft ? RAMP_SOFT : RAMP_HARD,
  });

  if (rimStrength > 0) {
    material.onBeforeCompile = (shader) => {
      // Guard: only inject if this build still exposes what we read.
      if (
        !shader.fragmentShader.includes("vViewPosition") ||
        !shader.fragmentShader.includes("#include <dithering_fragment>")
      ) {
        return;
      }
      shader.uniforms.uRimColor = { value: new THREE.Color(rim) };
      shader.uniforms.uRimStrength = { value: rimStrength };
      shader.fragmentShader = `uniform vec3 uRimColor;\nuniform float uRimStrength;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `float rimF = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
         rimF = smoothstep(0.52, 0.78, pow(rimF, 1.9));
         gl_FragColor.rgb += uRimColor * rimF * uRimStrength;
         #include <dithering_fragment>`,
      );
    };
  }
  return material;
}

/**
 * Add an inverted-hull ink shell to a mesh.
 *
 * Scaled **per axis** from the geometry's own bounds, so a flat plate and a
 * chunky block get the same apparent line weight. A uniform scale would make
 * thin parts look outlined in marker and thick parts in pencil.
 */
export function ink(mesh: THREE.Mesh, thickness = INK): THREE.Mesh {
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  const shell = new THREE.Mesh(mesh.geometry, inkMaterial);
  if (box) {
    const size = new THREE.Vector3();
    box.getSize(size);
    shell.scale.set(
      size.x > 1e-4 ? (size.x + 2 * thickness) / size.x : 1,
      size.y > 1e-4 ? (size.y + 2 * thickness) / size.y : 1,
      size.z > 1e-4 ? (size.z + 2 * thickness) / size.z : 1,
    );
  }
  mesh.add(shell);
  return shell;
}

/** A mesh with its ink shell already attached, and shadows on. */
export function inked(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  thickness = INK,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  ink(mesh, thickness);
  return mesh;
}
