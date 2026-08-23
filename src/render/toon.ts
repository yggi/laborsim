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

/**
 * The ground's ramp, deliberately lifted off black.
 *
 * A terrain band at 70/255 makes any slope facing away from the key light read
 * as a hard-edged black wedge across the site — which looks exactly like a
 * shadow bug, and is not one: it is the cel ramp doing its job on a bumpy
 * heightfield. Ground is big enough that its darkest band has to stay legible.
 */
const RAMP_GROUND = ramp([150, 198, 255]);

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

/**
 * The ground: cel bands, plus survey contours and hill shading.
 *
 * Contours are the training-rig register showing through — a site you are
 * being taught to work is a *surveyed* site, so it comes with elevation lines
 * on it. They also do real work: on a smooth cel-shaded slope there is
 * otherwise almost no cue for how steep the ground is, and steepness is the
 * whole of rung 1.
 *
 * Hill shading darkens by slope on top of the light, which is the
 * cartographer's trick rather than the renderer's, and reads even where the
 * key light does not reach.
 */
export function terrainMaterial(color: number): THREE.MeshToonMaterial {
  const material = new THREE.MeshToonMaterial({ color, gradientMap: RAMP_GROUND });

  material.onBeforeCompile = (shader) => {
    // Guarded like the rim: without these anchors the ground renders plain
    // rather than not at all.
    if (
      !shader.fragmentShader.includes("#include <dithering_fragment>") ||
      !shader.vertexShader.includes("#include <begin_vertex>")
    ) {
      return;
    }

    shader.vertexShader = `varying vec3 vSurveyPos;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n  vSurveyPos = (modelMatrix * vec4(position, 1.0)).xyz;",
    );

    shader.fragmentShader =
      `varying vec3 vSurveyPos;\n${shader.fragmentShader}`.replace(
        "#include <dithering_fragment>",
        `
      // World-space normal from the derivatives of the world position.
      //
      // three's fragment-stage \`normal\` is **view space**, so using it for
      // slope measured "faces the camera" instead of "steep", and whole
      // hillsides darkened as the camera tilted. Deriving it here also avoids
      // depending on a vertex chunk name for a varying.
      vec3 surveyN = normalize(cross(dFdx(vSurveyPos), dFdy(vSurveyPos)));
      float steep = clamp(1.0 - abs(surveyN.y), 0.0, 1.0);
      gl_FragColor.rgb *= 1.0 - steep * 0.22;

      // Contours. fwidth keeps a line about a pixel wide however far away the
      // ground is, so they thin out with distance instead of moiring.
      float minorU = vSurveyPos.y / 1.0;
      float majorU = vSurveyPos.y / 5.0;
      float minorLine = 1.0 - smoothstep(0.0, 1.4,
        abs(fract(minorU - 0.5) - 0.5) / max(fwidth(minorU), 1e-5));
      float majorLine = 1.0 - smoothstep(0.0, 1.6,
        abs(fract(majorU - 0.5) - 0.5) / max(fwidth(majorU), 1e-5));

      // Gate on relief. Flat ground has no contours — and without this it is
      // worse than pointless: a perfectly level area sitting *on* a contour
      // multiple has both a vanishing derivative and a vanishing distance to
      // the line, so the whole area passes the line test at once and renders
      // as one enormous dark slab. The graded starting pad is at exactly 0 m,
      // which is a multiple of both spacings, so it did precisely that.
      float relief = smoothstep(0.015, 0.10, steep);
      float legible = relief * (1.0 - smoothstep(0.55, 0.85, steep));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.74,
        minorLine * 0.5 * legible);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.46,
        majorLine * 0.85 * legible);

      #include <dithering_fragment>`,
      );
  };
  return material;
}
