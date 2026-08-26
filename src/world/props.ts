/**
 * Site furniture.
 *
 * These are **world data, not decoration.** They live here rather than in the
 * renderer for three reasons: they need to be deterministic from the seed, the
 * sim gives them real colliders so you can actually hit them, and the damage
 * ledger names and prices each one. A cone painted on by the renderer could
 * never be `site fixture (cone) damaged −¥400`.
 *
 * ## A prop is a part list over materials
 *
 * Everything about a kind used to be a lookup keyed on that kind: mass and price
 * here, a collider box here, a voice in `audio/voices.ts`, and its art as a
 * branch of an if/else chain in `render/scene.ts` — a chain with no
 * exhaustiveness check, so a new kind that forgot the renderer silently drew a
 * boulder. Four places, one of them silent, which is why the inventory sat at
 * five kinds and a scooter for as long as it did.
 *
 * Now a kind declares **what it is made of and what shape those parts are**, and
 * five consumers read that one declaration:
 *
 * - the **collider**, as a single box (declared, and guarded against the parts);
 * - the **art**: `render/scene.ts` loops over the pieces;
 * - the **voice**: the dominant material's, from `materials.ts`;
 * - the **toughness**: derived, never typed — see `MaterialSpec.tough`;
 * - the **debris**: the same pieces, as bodies, when it is written off.
 *
 * Adding a kind is a part list. It cannot fall through to a default, because
 * there is no default left to fall through to.
 */

import { makeRng, randomYawQuat } from "../core/rng.ts";
import { type MaterialId, toughnessOf } from "./materials.ts";
import { sampleTerrain, type Terrain } from "./terrain.ts";

export type PropKind =
  | "cone"
  | "pole"
  | "pipes"
  | "barrier"
  | "rock"
  | "scooter"
  | "drum"
  | "pallet"
  | "crate"
  | "block"
  | "slab"
  | "floodlight"
  | "spool"
  | "sandbags";

/**
 * What the rig calls this when it bills you for it.
 *
 * `landscape` is the category that **cannot be billed**, and it earns its place
 * by being the honest answer: you can drive into a boulder all day and nobody
 * sends an invoice. It also stops the ledger from being a list of everything
 * you touched, which would teach nothing.
 */
export type PropCategory = "site fixture" | "citizen asset" | "landscape";

/** The four solids everything on site is made of. */
export type Shape = "box" | "cylinder" | "cone" | "sphere";

/** A rotation as a quaternion. Written out rather than derived from an angle:
 *  `Math.sin` is not bit-portable and this reaches a collider (rule 2). */
export type Turn = readonly [number, number, number, number];

/** A quarter turn about Z — what a pipe or a wheel lying on its side is. */
export const LAID_Z: Turn = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
/** A quarter turn about X — a drum on its side, rolling along X. */
export const LAID_X: Turn = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];

/**
 * One solid of an assembly: a shape, of a stuff, somewhere.
 *
 * Offsets are measured from the prop's **base** — `y = 0` is the ground it
 * stands on — because that is how a person describes a thing standing up, and
 * because the renderer and the debris spawner both need the same origin.
 */
export interface Piece {
  readonly shape: Shape;
  /**
   * Half-extents in metres, before the prop's scale. For a `cylinder` or a
   * `cone` that is `[radius, halfHeight, radius]`; for a `sphere` it is the
   * three semi-axes of an ellipsoid.
   */
  readonly size: readonly [number, number, number];
  /** Centre, relative to the base. */
  readonly at: readonly [number, number, number];
  readonly turn?: Turn;
  readonly material: MaterialId;
  /**
   * Whether this piece is part of the thing you can hit. Defaults to `true`.
   *
   * It exists because the collider is deliberately **not** the art's bounding
   * box: a marker pole's flag reaches 0.6 m sideways and hitting a flag from
   * half a metre away would be a bug you could see. Fabric, slack cable and
   * glass sunk into a housing are drawn and thrown, and collide with nothing.
   */
  readonly solid?: boolean;
}

export interface KindSpec {
  readonly label: string;
  readonly category: PropCategory;
  /** Kilograms. `undefined` means it never moves — landscape. */
  readonly mass?: number;
  /** Yen, if anyone is going to be billed for it. */
  readonly price?: number;
  /**
   * Collider half-extents, in metres, before `scale`.
   *
   * **Declared rather than derived, and that is deliberate.** It is a collision
   * *proxy*: a single box standing in for an assembly, chosen to be the thing
   * you can hit rather than the thing you can see. `tests/damage.test.ts` holds
   * it to the solid pieces within a factor either way, so a transposed number
   * cannot ship while a deliberate simplification still can.
   */
  readonly box: readonly [number, number, number];
  /** How often the generator reaches for it, relative to the others. */
  readonly weight: number;
  readonly pieces: readonly Piece[];
}

/**
 * The inventory.
 *
 * Quarry tier: plenty to wreck, nobody to hurt. Prices spread from ¥300 to
 * ¥14,000 on purpose — a ledger where everything costs about ¥1,000 is a
 * ledger that teaches you to ignore it, and the card asks for *a list, not a
 * line*.
 */
export const KIND: Record<PropKind, KindSpec> = {
  cone: {
    label: "cone",
    category: "site fixture",
    mass: 6,
    price: 400,
    box: [0.34, 0.5, 0.34],
    weight: 20,
    pieces: [
      { shape: "cone", size: [0.34, 0.5, 0.34], at: [0, 0.5, 0], material: "plastic" },
      { shape: "box", size: [0.4, 0.045, 0.4], at: [0, 0.045, 0], material: "rubber" },
    ],
  },
  pole: {
    label: "marker pole",
    category: "site fixture",
    mass: 24,
    price: 1200,
    // A 3 m pole on a 0.16 m base — which is the exact pair L-057 named as the
    // reason it could not stand. It used to be 0.6 m across in X and 0.16 in Z,
    // an asymmetry with nothing behind it: a marker pole is round.
    box: [0.08, 1.5, 0.08],
    weight: 12,
    pieces: [
      {
        shape: "cylinder",
        size: [0.05, 1.5, 0.05],
        at: [0, 1.5, 0],
        material: "tube",
      },
      // Fabric. Drawn and thrown; collides with nothing.
      {
        shape: "box",
        size: [0.3, 0.21, 0.02],
        at: [0.3, 2.7, 0],
        material: "plastic",
        solid: false,
      },
    ],
  },
  pipes: {
    label: "pipe stack",
    category: "site fixture",
    mass: 260,
    price: 2600,
    box: [1.3, 0.6, 0.9],
    weight: 11,
    // Three down, one nested on top — a stack that has been there a while, and
    // four pipes that roll when it stops being a stack.
    //
    // **Laid side by side across their own length**, which is what the collider
    // box has always said and what the art never did: the offsets used to run
    // along X, the same axis the pipes themselves lie on, so three 2.6 m pipes
    // were drawn overlapping end to end inside a box 0.9 m deep that nothing
    // filled. You could hit a pipe stack from half a metre away on a side where
    // there was no pipe. Found by measuring the pieces against the box.
    pieces: [
      {
        shape: "cylinder",
        size: [0.3, 1.3, 0.3],
        at: [0, 0.32, -0.62],
        turn: LAID_Z,
        material: "tube",
      },
      {
        shape: "cylinder",
        size: [0.3, 1.3, 0.3],
        at: [0, 0.32, 0],
        turn: LAID_Z,
        material: "tube",
      },
      {
        shape: "cylinder",
        size: [0.3, 1.3, 0.3],
        at: [0, 0.32, 0.62],
        turn: LAID_Z,
        material: "tube",
      },
      {
        shape: "cylinder",
        size: [0.3, 1.3, 0.3],
        at: [0, 0.86, -0.31],
        turn: LAID_Z,
        material: "tube",
      },
    ],
  },
  barrier: {
    label: "barrier",
    category: "site fixture",
    mass: 42,
    price: 900,
    box: [1.2, 0.6, 0.12],
    weight: 12,
    pieces: [
      { shape: "box", size: [1.2, 0.25, 0.08], at: [0, 0.95, 0], material: "plastic" },
      { shape: "box", size: [0.07, 0.5, 0.25], at: [-1, 0.5, 0], material: "steel" },
      { shape: "box", size: [0.07, 0.5, 0.25], at: [1, 0.5, 0], material: "steel" },
    ],
  },
  // The canonical ledger line, and the one that is not the site's property.
  scooter: {
    label: "scooter",
    category: "citizen asset",
    mass: 95,
    price: 3000,
    box: [0.28, 0.55, 0.85],
    weight: 3,
    pieces: [
      {
        shape: "box",
        size: [0.17, 0.15, 0.575],
        at: [0, 0.42, 0.05],
        material: "steel",
      },
      {
        shape: "box",
        size: [0.15, 0.07, 0.22],
        at: [0, 0.63, -0.2],
        material: "rubber",
      },
      { shape: "box", size: [0.05, 0.31, 0.05], at: [0, 0.7, 0.52], material: "steel" },
      {
        shape: "box",
        size: [0.27, 0.035, 0.035],
        at: [0, 0.98, 0.52],
        material: "steel",
      },
      {
        shape: "cylinder",
        size: [0.26, 0.055, 0.26],
        at: [0, 0.26, -0.42],
        turn: LAID_Z,
        material: "rubber",
      },
      {
        shape: "cylinder",
        size: [0.26, 0.055, 0.26],
        at: [0, 0.26, 0.55],
        turn: LAID_Z,
        material: "rubber",
      },
      // A headlamp, so the one nobody wants to hear also tinkles.
      {
        shape: "box",
        size: [0.08, 0.06, 0.03],
        at: [0, 0.62, 0.62],
        material: "glass",
        solid: false,
      },
    ],
  },
  /* -- the quarry tier ---------------------------------------------------- */
  drum: {
    label: "fuel drum",
    category: "site fixture",
    mass: 180,
    price: 1800,
    box: [0.3, 0.44, 0.3],
    weight: 9,
    pieces: [
      {
        shape: "cylinder",
        size: [0.29, 0.44, 0.29],
        at: [0, 0.44, 0],
        material: "tube",
      },
      {
        shape: "cylinder",
        size: [0.31, 0.03, 0.31],
        at: [0, 0.2, 0],
        material: "steel",
      },
      {
        shape: "cylinder",
        size: [0.31, 0.03, 0.31],
        at: [0, 0.68, 0],
        material: "steel",
      },
    ],
  },
  pallet: {
    label: "pallet",
    category: "site fixture",
    mass: 28,
    price: 300,
    box: [0.6, 0.075, 0.5],
    weight: 10,
    pieces: [
      { shape: "box", size: [0.6, 0.02, 0.5], at: [0, 0.13, 0], material: "timber" },
      { shape: "box", size: [0.6, 0.02, 0.5], at: [0, 0.02, 0], material: "timber" },
      {
        shape: "box",
        size: [0.07, 0.045, 0.5],
        at: [-0.5, 0.075, 0],
        material: "timber",
      },
      { shape: "box", size: [0.07, 0.045, 0.5], at: [0, 0.075, 0], material: "timber" },
      {
        shape: "box",
        size: [0.07, 0.045, 0.5],
        at: [0.5, 0.075, 0],
        material: "timber",
      },
    ],
  },
  crate: {
    label: "crate",
    category: "site fixture",
    mass: 140,
    price: 2200,
    box: [0.62, 0.5, 0.5],
    weight: 8,
    pieces: [
      { shape: "box", size: [0.6, 0.48, 0.48], at: [0, 0.5, 0], material: "timber" },
      { shape: "box", size: [0.62, 0.03, 0.5], at: [0, 0.24, 0], material: "steel" },
      { shape: "box", size: [0.62, 0.03, 0.5], at: [0, 0.78, 0], material: "steel" },
    ],
  },
  block: {
    label: "concrete block",
    category: "site fixture",
    /**
     * **Tall, and that is not a drawing decision.**
     *
     * It began as a 1.6 × 0.6 × 0.8 m slab at 420 kg and absorbed *zero joules*
     * from a full-speed hit — rated for damage it could never receive, which is
     * the silent half of the indestructible-cone scar. Lightening it changed
     * nothing. Shape did: **the machine climbs anything shorter than its own
     * tracks**, and a thing it drives over is pushed downward rather than
     * struck, so no step's energy gain ever clears the floor. Measured, by
     * driving into every kind on the site — at a half-height of 0.45 m it still
     * absorbed nothing; at 0.6 m it takes 439 J and is written off.
     *
     * That is a real mechanic rather than a tuning slip, and it is worth
     * knowing before adding a low breakable: under about a metre tall, a thing
     * is something you drive over.
     */
    mass: 320,
    price: 700,
    box: [0.35, 0.6, 0.35],
    weight: 9,
    pieces: [
      { shape: "box", size: [0.35, 0.6, 0.35], at: [0, 0.6, 0], material: "concrete" },
    ],
  },
  slab: {
    label: "precast panel",
    category: "site fixture",
    mass: 900,
    price: 5400,
    box: [1.5, 1.1, 0.12],
    weight: 6,
    pieces: [
      { shape: "box", size: [1.5, 1.1, 0.1], at: [0, 1.1, 0], material: "concrete" },
      { shape: "box", size: [0.06, 0.14, 0.06], at: [-0.9, 2.3, 0], material: "steel" },
      { shape: "box", size: [0.06, 0.14, 0.06], at: [0.9, 2.3, 0], material: "steel" },
    ],
  },
  floodlight: {
    label: "floodlight",
    category: "site fixture",
    mass: 62,
    price: 4200,
    box: [0.42, 1.35, 0.42],
    weight: 6,
    pieces: [
      {
        shape: "cylinder",
        size: [0.045, 1.15, 0.045],
        at: [0, 1.15, 0],
        material: "tube",
      },
      { shape: "box", size: [0.4, 0.03, 0.4], at: [0, 0.03, 0], material: "steel" },
      { shape: "box", size: [0.3, 0.2, 0.14], at: [0, 2.4, 0], material: "steel" },
      // The head. It is what makes a floodlight worth ¥4,200 and worth hearing.
      {
        shape: "box",
        size: [0.26, 0.17, 0.03],
        at: [0, 2.4, 0.14],
        material: "glass",
        solid: false,
      },
    ],
  },
  spool: {
    label: "cable drum",
    category: "site fixture",
    mass: 340,
    price: 14_000,
    // Cheeks facing along X, so it is narrow across and tall-and-deep the other
    // two ways. The box had X and Z the wrong way round.
    box: [0.47, 0.85, 0.85],
    weight: 5,
    // On its side, cheeks vertical, so it rolls along X the moment it is pushed.
    pieces: [
      {
        shape: "cylinder",
        size: [0.85, 0.05, 0.85],
        at: [-0.42, 0.85, 0],
        turn: LAID_Z,
        material: "timber",
      },
      {
        shape: "cylinder",
        size: [0.85, 0.05, 0.85],
        at: [0.42, 0.85, 0],
        turn: LAID_Z,
        material: "timber",
      },
      {
        shape: "cylinder",
        size: [0.52, 0.38, 0.52],
        at: [0, 0.85, 0],
        turn: LAID_Z,
        material: "steel",
      },
    ],
  },
  sandbags: {
    label: "ballast bags",
    category: "site fixture",
    mass: 320,
    price: 500,
    box: [0.7, 0.28, 0.45],
    weight: 8,
    pieces: [
      {
        shape: "sphere",
        size: [0.36, 0.14, 0.24],
        at: [-0.32, 0.14, 0],
        material: "ballast",
      },
      {
        shape: "sphere",
        size: [0.36, 0.14, 0.24],
        at: [0.32, 0.14, 0],
        material: "ballast",
      },
      {
        shape: "sphere",
        size: [0.36, 0.14, 0.24],
        at: [0, 0.42, 0],
        material: "ballast",
      },
    ],
  },
  // No mass, no price: it is the ground, and the ground is not an asset.
  rock: {
    label: "boulder",
    category: "landscape",
    box: [1, 0.7, 1],
    weight: 14,
    pieces: [
      { shape: "sphere", size: [1, 0.62, 1], at: [0, 0.7, 0], material: "stone" },
    ],
  },
};

export const PROP_KINDS = Object.keys(KIND) as readonly PropKind[];

/**
 * How much space a shape of these half-extents takes up, in units of the box
 * that contains it. Constants, not `Math.PI` calls: only the *ratio* between
 * pieces is ever used, and rule 2 wants no transcendental near a collider.
 */
const FILL: Record<Shape, number> = {
  box: 8,
  cylinder: 6.2832,
  cone: 2.0944,
  sphere: 4.1888,
};

/**
 * A piece's half-extents along the world axes, with its turn applied.
 *
 * The axis-aligned bound of a rotated box is `|R| · size` — the rotation matrix
 * with every entry taken positive. Exact for the quarter turns the part lists
 * use and correct for any other, which matters because it is what holds the
 * declared collider box honest against the art it stands in for.
 *
 * It found two things the moment it existed: a pipe stack drawn end-to-end
 * where its collider said side-by-side, and a cable drum whose box was on the
 * wrong axis. Both had been shipped, and neither was visible without measuring.
 */
export function pieceExtent(piece: Piece): [number, number, number] {
  const [sx, sy, sz] = piece.size;
  if (!piece.turn) return [sx, sy, sz];
  const [x, y, z, w] = piece.turn;
  const m = [
    Math.abs(1 - 2 * (y * y + z * z)),
    Math.abs(2 * (x * y - z * w)),
    Math.abs(2 * (x * z + y * w)),
    Math.abs(2 * (x * y + z * w)),
    Math.abs(1 - 2 * (x * x + z * z)),
    Math.abs(2 * (y * z - x * w)),
    Math.abs(2 * (x * z - y * w)),
    Math.abs(2 * (y * z + x * w)),
    Math.abs(1 - 2 * (x * x + y * y)),
  ] as const;
  return [
    (m[0] as number) * sx + (m[1] as number) * sy + (m[2] as number) * sz,
    (m[3] as number) * sx + (m[4] as number) * sy + (m[5] as number) * sz,
    (m[6] as number) * sx + (m[7] as number) * sy + (m[8] as number) * sz,
  ];
}

export const volumeOf = (piece: Piece): number =>
  FILL[piece.shape] * piece.size[0] * piece.size[1] * piece.size[2];

/**
 * The material a thing is mostly made of, by volume.
 *
 * Used for the two things a body can only have one of — the note it rings at,
 * and how much it can take. Everything that *can* be per-piece stays per-piece:
 * a scooter comes apart into steel, rubber and one small piece of glass, and
 * you hear all three.
 */
function dominantOf(kind: PropKind): MaterialId {
  const totals = new Map<MaterialId, number>();
  let best: MaterialId = "steel";
  let bestVolume = -1;
  for (const piece of KIND[kind].pieces) {
    const volume = (totals.get(piece.material) ?? 0) + volumeOf(piece);
    totals.set(piece.material, volume);
    if (volume > bestVolume) {
      bestVolume = volume;
      best = piece.material;
    }
  }
  return best;
}

/** Computed once: it is a fact about the table, not about a run. */
export const DOMINANT: Record<PropKind, MaterialId> = Object.fromEntries(
  PROP_KINDS.map((kind) => [kind, dominantOf(kind)]),
) as Record<PropKind, MaterialId>;

/**
 * Mass, price and toughness — the three numbers that decide what an impact
 * means, as the ledger and the sim want them.
 *
 * **Toughness is derived and can no longer be typed in.** It is
 * `MaterialSpec.tough × ½·m·v_max²`: a fraction of what the drivetrain can
 * actually deliver into that mass. Rating a cone at 22 J once made it
 * indestructible by any means the game has, and the fix was not a better number.
 */
export interface PropSpec {
  readonly label: string;
  readonly category: PropCategory;
  readonly material: MaterialId;
  readonly mass?: number;
  readonly price?: number;
  /** Joules absorbed before it is written off. Derived. */
  readonly toughness?: number;
}

export const PROP_SPEC: Record<PropKind, PropSpec> = Object.fromEntries(
  PROP_KINDS.map((kind) => {
    const spec = KIND[kind];
    const material = DOMINANT[kind];
    return [
      kind,
      {
        label: spec.label,
        category: spec.category,
        material,
        mass: spec.mass,
        price: spec.price,
        toughness:
          spec.mass === undefined ? undefined : toughnessOf(material, spec.mass),
      } satisfies PropSpec,
    ];
  }),
) as Record<PropKind, PropSpec>;

/** Everything that can be knocked over, and therefore billed for. */
export const isBreakable = (kind: PropKind): boolean => KIND[kind].mass !== undefined;

export interface Prop {
  readonly kind: PropKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Heading as a half-angle quaternion about Y. Not an angle: see rng.ts. */
  readonly yawY: number;
  readonly yawW: number;
  /** Uniform size multiplier. Rocks vary; the rest are stock parts. */
  readonly scale: number;
}

/** Collider half-extents, in metres, before `scale`. Renderer draws to match. */
export const PROP_BOX: Record<PropKind, readonly [number, number, number]> =
  Object.fromEntries(PROP_KINDS.map((kind) => [kind, KIND[kind].box])) as Record<
    PropKind,
    readonly [number, number, number]
  >;

/**
 * How far a thing can be leaned before it goes over, as a **gradient**.
 *
 * `halfBase / centreOfMassHeight` — the classic tipping criterion, and the whole
 * of L-057 in one line. A marker pole is 3 m tall on a 0.16 m base, which is a
 * limit of 0.1, or about 6°: it cannot stand on 20° noise, and no amount of
 * settling was ever going to change that.
 *
 * A gradient rather than an angle so that `atan` never appears near world
 * generation (rule 2). The comparison downstream is `rise / run` against this.
 */
export function tipGradient(kind: PropKind): number {
  const [hx, hy, hz] = KIND[kind].box;
  const halfBase = Math.min(hx, hz);
  // Centre of mass at half the box height is the honest approximation for a
  // uniform solid, and pessimistic for anything bottom-heavy — which is the
  // right way round for a test that decides whether to place something.
  return halfBase / Math.max(hy, 0.01);
}

/**
 * How much of its own tipping limit a thing is allowed to use.
 *
 * Not a fudge factor, and it was measured before it was chosen. The footing
 * test compares the ground against a **static** limit, but the ground the prop
 * actually lands on is not the ground the test read: `sampleTerrain` is bilinear
 * across a 2 m cell and Rapier's heightfield collider is **triangulated**, and
 * the two disagree by centimetres on a steep cell. So a prop placed at its
 * limit is dropped further than the 3 cm it was asked to fall, arrives with
 * energy, and goes over.
 *
 * Measured: the three props still on their sides on the default seed were each
 * alone (nearest neighbour 12–26 m, so nothing pushed them), each far from any
 * pad, each within a whisker of their limit — and each had **moved 1.3–2.4 m**,
 * which is a slide, not a topple. Dropping them from 2 mm instead of 30 mm
 * changed nothing at all, which is what ruled the spawn height out.
 */
const FOOTING_MARGIN = 0.85;

/** Spawned a hair above the ground so it settles down onto it rather than
 *  being pushed out of it. */
const DROP = 0.03;

/** Nothing spawns inside this radius: it is the graded pad you start on. */
const CLEAR_RADIUS = 17;

/** Metres of daylight demanded between two pieces of furniture. */
const SEPARATION = 0.4;

function crowded(
  placed: readonly Prop[],
  x: number,
  z: number,
  radius: number,
): boolean {
  for (const other of placed) {
    const [ox, , oz] = PROP_BOX[other.kind];
    const gap = radius + Math.max(ox, oz) * other.scale + SEPARATION;
    const dx = x - other.x;
    const dz = z - other.z;
    if (dx * dx + dz * dz < gap * gap) return true;
  }
  return false;
}

/**
 * Whether this ground will hold this thing up.
 *
 * Samples the four corners of the footprint and compares the steepest rise
 * across it with the thing's own tipping gradient. That is the fix L-057 asked
 * for, stated as a rule rather than as a number: *place kit only where it can
 * stand*. It costs four `sampleTerrain` calls per candidate and it is why a
 * marker pole no longer ends up on the side of a hill.
 *
 * **Rejected, and recorded on the card:** sitting a box on the highest point of
 * its own footprint. That drops it onto one corner and toppled thirteen more
 * cones than it saved.
 */
export function standsOn(
  terrain: Terrain,
  x: number,
  z: number,
  kind: PropKind,
  scale: number,
): boolean {
  const [hx, , hz] = PROP_BOX[kind];
  const rx = Math.max(hx * scale, 0.2);
  const rz = Math.max(hz * scale, 0.2);
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const sx of [-rx, rx]) {
    for (const sz of [-rz, rz]) {
      const h = sampleTerrain(terrain, x + sx, z + sz);
      if (h < low) low = h;
      if (h > high) high = h;
    }
  }
  // The run is the shorter footprint span, because that is the axis a thing
  // topples across first.
  const run = 2 * Math.min(rx, rz);
  return (high - low) / run <= tipGradient(kind) * FOOTING_MARGIN;
}

/** The spawn roll, as a table rather than as a ladder of `?:`. */
const TOTAL_WEIGHT = PROP_KINDS.reduce((sum, kind) => sum + KIND[kind].weight, 0);

function rollKind(roll: number): PropKind {
  let at = roll * TOTAL_WEIGHT;
  for (const kind of PROP_KINDS) {
    at -= KIND[kind].weight;
    if (at <= 0) return kind;
  }
  return "rock";
}

export function generateProps(terrain: Terrain, count = 130): Prop[] {
  // Own generator, own seed offset, so adding a prop cannot shift the terrain.
  const rng = makeRng(terrain.seed ^ 0x5f37);
  const props: Prop[] = [];
  const reach = terrain.extent / 2 - 12;

  /**
   * The work areas are the **graded pads**, not six centres invented here.
   *
   * They used to be: `generateProps` rolled its own six points and the ground
   * knew nothing about them, so furniture clustered on whatever the noise
   * happened to be doing there. The site plan now grades the ground under each
   * one and hands the same list to both, which is the other half of L-057 —
   * the ground and the furniture had to stop disagreeing about where the work
   * is before either could be fixed.
   */
  const centres: Array<[number, number]> = terrain.pads
    .filter((pad) => pad.furnished)
    .map((pad) => [pad.x, pad.z]);

  for (let i = 0; i < count; i++) {
    const kind = rollKind(rng.next());
    const scale = kind === "rock" ? rng.range(0.7, 2.1) : rng.range(0.9, 1.15);
    const [hx, , hz] = PROP_BOX[kind];
    const radius = Math.max(hx, hz) * scale;

    // Most furniture sits near a work area rather than scattered evenly — a
    // site reads as *worked* when things cluster, and as litter when they do
    // not. Rocks are the exception: they are landscape, not equipment.
    let x = 0;
    let z = 0;
    let placed = false;
    const clustered = kind !== "rock" && centres.length > 0 && rng.next() < 0.85;
    for (let attempt = 0; attempt < 24; attempt++) {
      if (clustered) {
        const centre = centres[Math.floor(rng.next() * centres.length)] ?? [0, 0];
        x = (centre[0] as number) + rng.range(-9, 9);
        z = (centre[1] as number) + rng.range(-9, 9);
      } else {
        x = rng.range(-reach, reach);
        z = rng.range(-reach, reach);
      }
      if (Math.sqrt(x * x + z * z) <= CLEAR_RADIUS) continue;
      // **Nothing spawns inside anything else.** These are dynamic bodies now,
      // and two barriers born overlapping are shoved apart hard enough to
      // destroy each other — the site billed itself ¥55,690 before the machine
      // had moved. Separation at spawn is the fix; settling is the belt.
      if (crowded(props, x, z, radius)) continue;
      // …and nothing spawns where it cannot stand up.
      if (kind !== "rock" && !standsOn(terrain, x, z, kind, scale)) continue;
      placed = true;
      break;
    }
    // A candidate that never found footing is **dropped, not placed anyway**.
    // The old loop fell through with its last try, which is how seventeen of
    // eighteen marker poles came to be lying down before anyone had touched
    // them. A site with four fewer cones is a site; a site of fallen poles is
    // an accusation nobody made.
    if (!placed) continue;

    props.push({
      kind,
      x,
      z,
      // Rocks sit part-buried; everything else stands on the surface, a hair
      // above it so it settles down onto the ground rather than being pushed
      // out of it.
      y: sampleTerrain(terrain, x, z) + (kind === "rock" ? -0.35 * scale : DROP),
      ...(() => {
        const q = randomYawQuat(rng);
        return { yawY: q.y, yawW: q.w };
      })(),
      scale,
    });
  }
  return props;
}
