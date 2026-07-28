import type { Vector3Tuple } from 'three';

/**
 * The printer's bill of materials.
 *
 * One entry per component that separates during the scroll-driven teardown.
 * `dir` is the unit-ish direction the part travels when exploding and `dist`
 * how far — tuned so nothing collides mid-flight and the assembly stays
 * readable from the hero camera angle.
 *
 * `order` staggers the separation: low numbers peel away first, which reads as
 * a deliberate disassembly rather than everything flying apart at once.
 */

export type PartId =
  | 'base'
  | 'psu'
  | 'mainboard'
  | 'uprightFL' | 'uprightFR' | 'uprightBL' | 'uprightBR'
  | 'topFrame'
  | 'yRailL' | 'yRailR'
  | 'xGantry'
  | 'belts'
  | 'stepperX' | 'stepperY' | 'stepperZ' | 'stepperE'
  | 'toolhead'
  | 'hotend'
  | 'partFan'
  | 'heatsinkFan'
  | 'extruder'
  | 'buildPlate'
  | 'bedCarriage'
  | 'leadscrewL' | 'leadscrewR'
  | 'display'
  | 'spoolHolder'
  | 'filamentTube'
  | 'fasteners';

export type PartSpec = {
  id: PartId;
  /** Shown in the scrolling label panel. */
  label: string;
  /** One sentence — what it does, in plain language. */
  detail: string;
  dir: Vector3Tuple;
  dist: number;
  /** Extra rotation applied at full explosion, radians. */
  spin?: Vector3Tuple;
  order: number;
  /** Grouped for the label panel so we don't list 28 items one by one. */
  group: 'Frame' | 'Motion' | 'Toolhead' | 'Bed' | 'Electronics';
};

export const PARTS: PartSpec[] = [
  /* ---------------- Frame ---------------- */
  {
    id: 'base',
    label: 'Chassis base',
    detail: 'Cast aluminium floor plate. Everything else references off it, so its flatness sets the machine’s.',
    dir: [0, -1, 0], dist: 1.6, order: 0, group: 'Frame',
  },
  {
    id: 'topFrame',
    label: 'Top crossbeam',
    detail: 'Ties the four uprights together and stops the gantry racking under acceleration.',
    dir: [0, 1, 0], dist: 1.9, order: 1, group: 'Frame',
  },
  {
    id: 'uprightFL',
    label: 'Upright — front left',
    detail: '2020 extrusion. Four of these carry the entire moving mass.',
    dir: [-1, 0.15, 1], dist: 1.5, order: 2, group: 'Frame',
  },
  {
    id: 'uprightFR',
    label: 'Upright — front right',
    detail: 'Paired with the front left; the front pair takes the bed’s cantilever load.',
    dir: [1, 0.15, 1], dist: 1.5, order: 2, group: 'Frame',
  },
  {
    id: 'uprightBL',
    label: 'Upright — back left',
    detail: 'Carries the left leadscrew bearing block.',
    dir: [-1, 0.15, -1], dist: 1.5, order: 2, group: 'Frame',
  },
  {
    id: 'uprightBR',
    label: 'Upright — back right',
    detail: 'Carries the right leadscrew bearing block.',
    dir: [1, 0.15, -1], dist: 1.5, order: 2, group: 'Frame',
  },

  /* ---------------- Motion ---------------- */
  {
    id: 'yRailL',
    label: 'Y-axis linear rail — left',
    detail: 'Ground steel rail. The gantry rides it front to back with under 20 microns of play.',
    dir: [-1, 0.5, 0], dist: 2.1, spin: [0, 0, 0.3], order: 3, group: 'Motion',
  },
  {
    id: 'yRailR',
    label: 'Y-axis linear rail — right',
    detail: 'Its twin. Both must be parallel to within a hair or the gantry binds.',
    dir: [1, 0.5, 0], dist: 2.1, spin: [0, 0, -0.3], order: 3, group: 'Motion',
  },
  {
    id: 'xGantry',
    label: 'X-axis gantry beam',
    detail: 'Carries the toolhead left to right. Kept light — every gram here costs you print speed.',
    dir: [0, 1, 0.7], dist: 2.4, order: 4, group: 'Motion',
  },
  {
    id: 'belts',
    label: 'CoreXY belt loops',
    detail: 'Two crossed loops. Both motors turning together moves X; opposed moves Y.',
    dir: [0, 1.2, -0.5], dist: 2.6, order: 5, group: 'Motion',
  },
  {
    id: 'stepperX',
    label: 'Stepper — A motor',
    detail: 'NEMA 17, 1.8° per step, microstepped to 256 for silence.',
    dir: [-1, 0.9, -0.6], dist: 2.3, spin: [0.4, 0.6, 0], order: 6, group: 'Motion',
  },
  {
    id: 'stepperY',
    label: 'Stepper — B motor',
    detail: 'The other half of the CoreXY pair. Mirror-imaged, identical part.',
    dir: [1, 0.9, -0.6], dist: 2.3, spin: [0.4, -0.6, 0], order: 6, group: 'Motion',
  },
  {
    id: 'stepperZ',
    label: 'Stepper — Z axis',
    detail: 'Drives both leadscrews through a belt, so the bed cannot tilt out of level.',
    dir: [0, -1, -1], dist: 1.9, order: 7, group: 'Motion',
  },
  {
    id: 'leadscrewL',
    label: 'Leadscrew — left',
    detail: 'T8 trapezoidal, 8 mm lead. One turn lifts the bed 8 mm.',
    dir: [-1.2, 0.2, -0.3], dist: 2.5, spin: [0, 0, 0.5], order: 7, group: 'Motion',
  },
  {
    id: 'leadscrewR',
    label: 'Leadscrew — right',
    detail: 'Synchronised to the left by belt, never by two separate motors.',
    dir: [1.2, 0.2, -0.3], dist: 2.5, spin: [0, 0, -0.5], order: 7, group: 'Motion',
  },

  /* ---------------- Toolhead ---------------- */
  {
    id: 'toolhead',
    label: 'Toolhead carriage',
    detail: 'The moving assembly that carries everything below. Under 200 g all-in.',
    dir: [0, 0.4, 1.4], dist: 2.2, order: 8, group: 'Toolhead',
  },
  {
    id: 'extruder',
    label: 'Dual-drive extruder',
    detail: 'Two hardened gears grip the filament from both sides and push it into the hotend.',
    dir: [0, 1.1, 1.1], dist: 2.4, spin: [0.5, 0, 0.3], order: 9, group: 'Toolhead',
  },
  {
    id: 'heatsinkFan',
    label: 'Heatsink fan',
    detail: 'Keeps the cold side cold. If this stops, the filament softens too early and jams.',
    dir: [-1.1, 0.7, 0.9], dist: 2.3, spin: [0, 0.8, 0], order: 10, group: 'Toolhead',
  },
  {
    id: 'partFan',
    label: 'Part cooling fan',
    detail: 'Blows across the freshly laid line so it freezes before the next one lands on it.',
    dir: [1.1, 0.7, 0.9], dist: 2.3, spin: [0, -0.8, 0], order: 10, group: 'Toolhead',
  },
  {
    id: 'hotend',
    label: 'Hotend & nozzle',
    detail: 'Heats to 260 °C and meters a 0.4 mm line. This is where the part actually happens.',
    dir: [0, -0.9, 1.5], dist: 2.0, order: 11, group: 'Toolhead',
  },
  {
    id: 'filamentTube',
    label: 'PTFE guide tube',
    detail: 'Guides filament from the spool to the extruder without letting it kink.',
    dir: [0.4, 1.4, -0.9], dist: 2.6, order: 12, group: 'Toolhead',
  },

  /* ---------------- Bed ---------------- */
  {
    id: 'buildPlate',
    label: 'Textured build plate',
    detail: 'Spring steel with a PEI coating. Flex it once and the part pops off cold.',
    dir: [0, 0.3, 1.6], dist: 2.3, spin: [0.35, 0, 0], order: 13, group: 'Bed',
  },
  {
    id: 'bedCarriage',
    label: 'Heated bed carriage',
    detail: 'Holds the plate at up to 110 °C so the first layer stays put.',
    dir: [0, -0.6, 1.2], dist: 2.0, order: 14, group: 'Bed',
  },

  /* ---------------- Electronics ---------------- */
  {
    id: 'mainboard',
    label: 'Control board',
    detail: '32-bit controller running closed-loop motion planning and input shaping.',
    dir: [-1.2, -0.8, -0.4], dist: 2.2, spin: [0, 0.4, 0.2], order: 15, group: 'Electronics',
  },
  {
    id: 'psu',
    label: 'Power supply',
    detail: '350 W. Most of it goes to the bed, not the motors.',
    dir: [1.2, -0.8, -0.4], dist: 2.2, order: 15, group: 'Electronics',
  },
  {
    id: 'display',
    label: 'Touch display',
    detail: 'Where you start the job, watch the layer count and, occasionally, cancel in a panic.',
    dir: [0, -0.35, 1.8], dist: 2.1, spin: [0.3, 0, 0], order: 16, group: 'Electronics',
  },
  {
    id: 'spoolHolder',
    label: 'Spool holder',
    detail: 'Feeds a kilogram of filament without letting it tangle behind the machine.',
    dir: [0, 0.6, -1.6], dist: 2.4, order: 17, group: 'Electronics',
  },
  {
    id: 'fasteners',
    label: 'Fasteners',
    detail: 'Ninety-four screws. Every one of them matters when the gantry is moving at 500 mm/s.',
    dir: [0.8, 1.3, 0.4], dist: 2.9, spin: [1.2, 1.4, 0.8], order: 18, group: 'Electronics',
  },
];

export const MAX_ORDER = Math.max(...PARTS.map((p) => p.order));

export const PART_MAP: Record<PartId, PartSpec> = Object.fromEntries(
  PARTS.map((p) => [p.id, p]),
) as Record<PartId, PartSpec>;

/** Label panel groups, in the order the teardown reveals them. */
export const PART_GROUPS = ['Frame', 'Motion', 'Toolhead', 'Bed', 'Electronics'] as const;
