/**
 * Minimal vector maths for the sim side. Deliberately not three.js: nothing
 * under src/sim may import a renderer (architecture rule 1), and the sim's
 * vectors have to survive in plain Node.
 *
 * Only arithmetic and `Math.sqrt` — both bit-portable across JS engines.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const add = (a: Vec3, b: Vec3): Vec3 => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Vec3, k: number): Vec3 => vec(a.x * k, a.y * k, a.z * k);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const cross = (a: Vec3, b: Vec3): Vec3 =>
  vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);

export const length = (a: Vec3): number => Math.sqrt(dot(a, a));

export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l > 1e-9 ? scale(a, 1 / l) : vec(0, 0, 0);
}

/** Component of `a` perpendicular to unit vector `n`. */
export const reject = (a: Vec3, n: Vec3): Vec3 => sub(a, scale(n, dot(a, n)));

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * The inverse of a unit rotation: same axis, opposite angle.
 *
 * `rotate(conjugate(hull), v)` takes a world vector into the body frame, which
 * is what anything bolted to the machine measures — an accelerometer does not
 * know which way north is.
 */
export const conjugate = (q: Quat): Quat => ({ x: -q.x, y: -q.y, z: -q.z, w: q.w });

/**
 * Compose two rotations: `a` after `b`, the usual quaternion product.
 *
 * Wanted the moment a thing on the site stopped being one box: a piece of a
 * written-off prop is drawn and collided in *its own* orientation within the
 * assembly, and it has to be lifted into the world by whatever the assembly had
 * turned to before it came apart (`sim/world.ts`, `comeApart`). Arithmetic only,
 * so a replay puts every fragment exactly where the run did.
 */
export const multiply = (a: Quat, b: Quat): Quat => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
});

/** Rotate a vector by a unit quaternion. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const u = vec(q.x, q.y, q.z);
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, q.w)), cross(u, t));
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** How much of a world offset is in front of the machine, and how much is to
 *  its right. See `bearing`. */
export interface Bearing {
  readonly ahead: number;
  readonly right: number;
}

/**
 * A world offset, in the machine's own frame, flattened to the ground plane.
 *
 * The machine's forward is +Z and its **right is −X** (`core/spec.ts`), so the
 * right axis is `(-forward.z, 0, forward.x)` and `right` is the offset's
 * component along it. Units are whatever you hand it: a unit vector gives the
 * cosine and sine of the bearing without a transcendental (rule 2), metres give
 * metres.
 *
 * It exists because that sign was written out twice — once in NAV-1's steering
 * and once in the route scope's plotting — and the two disagreed. The module
 * turned the right way and the instrument drew every pin on the wrong side, for
 * as long as the instrument had existed. One fact, one place
 * (`doc/design/code/conventions.md`).
 */
export function bearing(rotation: Quat, dx: number, dz: number): Bearing {
  const forward = rotate(rotation, vec(0, 0, 1));
  return {
    ahead: forward.x * dx + forward.z * dz,
    right: forward.x * dz - forward.z * dx,
  };
}
