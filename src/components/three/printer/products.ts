import {
  BufferGeometry,
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The queue of objects the hero printer produces, one after another.
 *
 * Each is generated procedurally rather than loaded — no asset downloads, no
 * licensing, and the silhouettes stay recognisable at hero scale. `radiusAt`
 * tells the nozzle how wide the part is at a given height so the toolhead
 * traces the actual perimeter instead of an arbitrary circle.
 */

export type PrintProduct = {
  id: string;
  /** Shown in the caption while this one prints. */
  name: string;
  category: string;
  /** One line of supporting detail. */
  note: string;
  /** Model height in scene units. */
  height: number;
  /** Approximate cross-section radius at normalised height 0→1. */
  radiusAt: (t: number) => number;
  build: () => BufferGeometry;
  /** Filament colour for this job. */
  color: string;
};

/* ---------------- Geometry builders ---------------- */

function lathe(points: Array<[number, number]>, segments = 64): BufferGeometry {
  return new LatheGeometry(
    points.map(([x, y]) => new Vector2(Math.max(x, 0.001), y)),
    segments,
  );
}

/**
 * Hanuman seated in padmasana — modelled from the studio's own reference:
 * right hand raised in abhaya mudra, a book resting in the left hand, crown,
 * and the tail sweeping up behind in its characteristic S-curve.
 *
 * The silhouette is what has to read at hero scale, so the mass is built as a
 * wide seated base tapering into the torso, rather than the upright column a
 * simple lathe would give. Proportions below are fractions of `height`.
 */
function buildStatue(): BufferGeometry {
  const H = 1.25;
  const parts: BufferGeometry[] = [];

  /* ---- Plinth: stepped and slightly wider than the figure ---- */
  const plinthBase = new CylinderGeometry(0.46, 0.5, 0.045, 44);
  plinthBase.translate(0, 0.022, 0);
  parts.push(plinthBase);

  const plinthTop = new CylinderGeometry(0.42, 0.46, 0.035, 44);
  plinthTop.translate(0, 0.062, 0);
  parts.push(plinthTop);

  /* ---- Seated mass: crossed legs flaring wide, tapering to the waist ---- */
  const seated: Array<[number, number]> = [
    [0.00, 0.080],
    [0.30, 0.080],
    [0.40, 0.095],
    [0.44, 0.130],
    [0.45, 0.175],   // widest — the knees
    [0.43, 0.215],
    [0.37, 0.250],
    [0.30, 0.280],
    [0.25, 0.310],   // waist
    [0.235, 0.350],
    [0.24, 0.400],
    [0.255, 0.450],  // chest
    [0.26, 0.490],
    [0.24, 0.530],
    [0.20, 0.560],   // shoulders narrow to neck
    [0.115, 0.585],
    [0.085, 0.605],  // neck
    [0.00, 0.615],
  ];
  parts.push(lathe(seated.map(([r, y]) => [r, y * H]), 56));

  /* ---- Head ---- */
  const head = new SphereGeometry(0.125, 28, 22);
  head.scale(1, 1.18, 1.02);
  head.translate(0, H * 0.665, 0.005);
  parts.push(head);

  // Muzzle — the detail that makes it read as Hanuman rather than a generic figure.
  const muzzle = new SphereGeometry(0.062, 18, 14);
  muzzle.scale(1, 0.8, 1.15);
  muzzle.translate(0, H * 0.645, 0.105);
  parts.push(muzzle);

  /* ---- Crown (mukut): tapering tiers with a finial ---- */
  const crownBand = new CylinderGeometry(0.125, 0.135, 0.045, 26);
  crownBand.translate(0, H * 0.735, 0);
  parts.push(crownBand);

  const crownCone = new CylinderGeometry(0.055, 0.12, 0.12, 26);
  crownCone.translate(0, H * 0.815, 0);
  parts.push(crownCone);

  const finial = new SphereGeometry(0.042, 16, 12);
  finial.translate(0, H * 0.888, 0);
  parts.push(finial);

  /* ---- Right arm raised in abhaya mudra (blessing) ---- */
  const upperArmR = new CylinderGeometry(0.052, 0.046, 0.20, 14);
  upperArmR.rotateZ(-0.55);
  upperArmR.translate(-0.215, H * 0.505, 0.02);
  parts.push(upperArmR);

  const forearmR = new CylinderGeometry(0.044, 0.040, 0.20, 14);
  forearmR.rotateZ(-0.08);
  forearmR.translate(-0.30, H * 0.585, 0.03);
  parts.push(forearmR);

  const palmR = new BoxGeometry(0.085, 0.105, 0.035);
  palmR.translate(-0.315, H * 0.665, 0.035);
  parts.push(palmR);

  /* ---- Left arm resting, holding the book ---- */
  const upperArmL = new CylinderGeometry(0.052, 0.046, 0.20, 14);
  upperArmL.rotateZ(0.75);
  upperArmL.translate(0.215, H * 0.480, 0.03);
  parts.push(upperArmL);

  const forearmL = new CylinderGeometry(0.042, 0.038, 0.19, 14);
  forearmL.rotateZ(1.35);
  forearmL.translate(0.145, H * 0.365, 0.115);
  parts.push(forearmL);

  // The open book across the lap.
  const book = new BoxGeometry(0.21, 0.028, 0.15);
  book.rotateX(-0.28);
  book.translate(0.01, H * 0.345, 0.16);
  parts.push(book);

  /* ---- Tail: swept up behind in an S, ending in a curl ---- */
  const tailCurve = new CatmullRomCurve3([
    new Vector3(0.34, H * 0.13, -0.14),
    new Vector3(0.46, H * 0.30, -0.30),
    new Vector3(0.44, H * 0.55, -0.40),
    new Vector3(0.30, H * 0.78, -0.34),
    new Vector3(0.12, H * 0.92, -0.22),
    new Vector3(-0.02, H * 0.95, -0.10),
    new Vector3(-0.08, H * 0.89, -0.02),
  ]);
  parts.push(new TubeGeometry(tailCurve, 48, 0.038, 12, false));

  /* ---- Gada (mace) resting at the right ---- */
  const gadaHead = new SphereGeometry(0.085, 18, 14);
  gadaHead.translate(0.40, H * 0.145, 0.16);
  parts.push(gadaHead);

  const gadaShaft = new CylinderGeometry(0.022, 0.022, 0.16, 10);
  gadaShaft.rotateZ(0.5);
  gadaShaft.translate(0.33, H * 0.105, 0.16);
  parts.push(gadaShaft);

  /* ---- Necklace / mala, suggested as a torus at the chest ---- */
  const mala = new TorusGeometry(0.15, 0.016, 8, 30);
  mala.rotateX(Math.PI / 2 - 0.25);
  mala.translate(0, H * 0.455, 0.04);
  parts.push(mala);

  return mergeGeometries(parts, false)!;
}

/** Parametric Voronoi-ish table lamp. */
function buildLamp(): BufferGeometry {
  const height = 1.0;
  const points: Array<[number, number]> = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;
    // Waisted profile with a soft flare top and bottom.
    const r = 0.16 + Math.sin(t * Math.PI) * 0.24 + Math.sin(t * Math.PI * 5) * 0.022;
    points.push([r, y]);
  }
  points.push([0.001, height]);
  return lathe(points, 72);
}

/** Spur gear — the engineering piece. */
function buildGear(): BufferGeometry {
  const shape = new Shape();
  const teeth = 18;
  const rOuter = 0.42;
  const rRoot = 0.35;

  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth / 4;
    const pts: Array<[number, number]> = [
      [Math.cos(a0) * rRoot, Math.sin(a0) * rRoot],
      [Math.cos(a0 + step) * rOuter, Math.sin(a0 + step) * rOuter],
      [Math.cos(a0 + step * 2) * rOuter, Math.sin(a0 + step * 2) * rOuter],
      [Math.cos(a0 + step * 3) * rRoot, Math.sin(a0 + step * 3) * rRoot],
    ];
    pts.forEach(([x, y], k) => (i === 0 && k === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  }
  shape.closePath();

  // Bore + lightening holes
  const bore = new Shape();
  bore.absarc(0, 0, 0.1, 0, Math.PI * 2, false);
  shape.holes.push(bore);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const hole = new Shape();
    hole.absarc(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.05, 0, Math.PI * 2, false);
    shape.holes.push(hole);
  }

  const geo = new ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.22, 0);
  return geo;
}

/** Architectural massing model — a stepped tower on a podium. */
function buildTower(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const podium = new CylinderGeometry(0.46, 0.5, 0.09, 4);
  podium.rotateY(Math.PI / 4);
  podium.translate(0, 0.045, 0);
  parts.push(podium);

  let y = 0.09;
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = 0.34 - t * 0.2;
    const h = 0.15;
    const block = new CylinderGeometry(r, r * 1.04, h, 4);
    block.rotateY(Math.PI / 4 + i * 0.14);
    block.translate(0, y + h / 2, 0);
    parts.push(block);
    y += h;
  }

  const spire = new CylinderGeometry(0.012, 0.05, 0.22, 10);
  spire.translate(0, y + 0.11, 0);
  parts.push(spire);

  return mergeGeometries(parts, false)!;
}

/** FPV drone frame — flat X plate with arms. */
function buildDroneFrame(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new CylinderGeometry(0.055, 0.075, 0.62, 6);
    arm.rotateZ(Math.PI / 2);
    arm.rotateY(-a);
    arm.translate(Math.cos(a) * 0.31, 0.05, Math.sin(a) * 0.31);
    parts.push(arm);

    const motorMount = new CylinderGeometry(0.09, 0.09, 0.05, 16);
    motorMount.translate(Math.cos(a) * 0.58, 0.055, Math.sin(a) * 0.58);
    parts.push(motorMount);
  }

  const plateBottom = new CylinderGeometry(0.24, 0.24, 0.035, 6);
  plateBottom.translate(0, 0.018, 0);
  parts.push(plateBottom);

  const standoffs: BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const s = new CylinderGeometry(0.022, 0.022, 0.16, 8);
    s.translate(Math.cos(a) * 0.13, 0.1, Math.sin(a) * 0.13);
    standoffs.push(s);
  }
  parts.push(...standoffs);

  const plateTop = new CylinderGeometry(0.2, 0.2, 0.03, 6);
  plateTop.translate(0, 0.195, 0);
  parts.push(plateTop);

  return mergeGeometries(parts, false)!;
}

/** Castable ring master on its sprue. */
function buildRing(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const base = new CylinderGeometry(0.2, 0.24, 0.05, 32);
  base.translate(0, 0.025, 0);
  parts.push(base);

  const sprue = new CylinderGeometry(0.03, 0.04, 0.2, 12);
  sprue.translate(0, 0.15, 0);
  parts.push(sprue);

  const band = new TorusGeometry(0.19, 0.035, 16, 48);
  band.rotateX(Math.PI / 2);
  band.rotateZ(0.2);
  band.translate(0, 0.34, 0);
  parts.push(band);

  const stone = new SphereGeometry(0.06, 16, 12);
  stone.scale(1, 0.7, 1);
  stone.translate(0, 0.42, 0.02);
  parts.push(stone);

  return mergeGeometries(parts, false)!;
}

/* ---------------- The queue ---------------- */

export const PRINT_PRODUCTS: PrintProduct[] = [
  {
    id: 'statue',
    name: 'Hanuman Statue',
    category: 'Devotional · SLA Resin',
    note: '25 micron layers, hand-finished in antique bronze.',
    height: 1.25,
    // Follows the seated silhouette: plinth, flaring out to the knees around
    // a seventh of the way up, drawing in at the waist, then the head and
    // crown. The tail widens the sweep through the upper half.
    radiusAt: (t) => {
      if (t < 0.06) return 0.50;            // plinth
      if (t < 0.16) return 0.45;            // knees — widest
      if (t < 0.26) return 0.34;            // thighs drawing in
      if (t < 0.36) return 0.26;            // waist
      if (t < 0.46) return 0.30;            // chest + arms
      if (t < 0.58) return 0.34;            // raised hand and tail
      if (t < 0.70) return 0.22;            // shoulders to head
      if (t < 0.80) return 0.17;            // head
      return 0.13;                          // crown
    },
    build: buildStatue,
    // The caption says antique bronze; the filament was blue. Matches the
    // finish the product page actually sells now.
    color: '#a8703a',
  },
  {
    id: 'lamp',
    name: 'Voronoi Table Lamp',
    category: 'Lighting · FDM PLA',
    note: 'Translucent PLA at 0.12 mm for an even light gradient.',
    height: 1.0,
    radiusAt: (t) => 0.16 + Math.sin(t * Math.PI) * 0.24,
    build: buildLamp,
    color: '#e8b06a',
  },
  {
    id: 'gear',
    name: 'Planetary Gear',
    category: 'Engineering · PA-CF Nylon',
    note: 'Carbon-fibre nylon, 4 Nm continuous duty.',
    height: 0.24,
    radiusAt: () => 0.42,
    build: buildGear,
    color: '#3a4048',
  },
  {
    id: 'tower',
    name: 'Architectural Massing Model',
    category: 'Architecture · 1:200 Scale',
    note: 'Built from the practice’s own Revit export.',
    height: 1.24,
    radiusAt: (t) => Math.max(0.06, 0.5 - t * 0.42),
    build: buildTower,
    color: '#d8dce2',
  },
  {
    id: 'drone',
    name: 'FPV Drone Frame',
    category: 'Aerospace · PA-CF Nylon',
    note: '128 g airframe that survives what carbon does not.',
    height: 0.22,
    radiusAt: () => 0.6,
    build: buildDroneFrame,
    color: '#1a1a20',
  },
  {
    id: 'ring',
    name: 'Castable Ring Master',
    category: 'Jewellery · Castable Resin',
    note: 'Burns out clean — no ash left for the caster.',
    height: 0.48,
    radiusAt: (t) => (t < 0.35 ? 0.22 : 0.2),
    build: buildRing,
    color: '#4f7fe0',
  },
];
