/**
 * STL parsing and print-cost estimation.
 *
 * Runs in the browser so a customer's geometry never has to leave their
 * machine to get a price — only the derived numbers are submitted with an
 * enquiry.
 */

export type MeshStats = {
  triangleCount: number;
  /** Signed volume of the closed mesh, in mm³. Negative means inverted normals. */
  volumeMm3: number;
  surfaceAreaMm2: number;
  bbox: { x: number; y: number; z: number };
  /** True when the volume came out negative or implausibly small for the bbox. */
  suspect: boolean;
};

/* ============================================================
   Parsing
   ============================================================ */

function isBinarySTL(buffer: ArrayBuffer): boolean {
  // An ASCII STL starts with "solid", but so do some binary files written by
  // careless exporters. The reliable check is whether the declared triangle
  // count matches the actual file length.
  if (buffer.byteLength < 84) return false;

  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  const expected = 84 + triangles * 50;
  if (expected === buffer.byteLength) return true;

  const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 5)).toLowerCase();
  return header !== 'solid';
}

function parseBinary(buffer: ArrayBuffer): Float32Array {
  const view = new DataView(buffer);
  const triangles = view.getUint32(80, true);
  const positions = new Float32Array(triangles * 9);

  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    offset += 12; // skip the normal
    for (let v = 0; v < 9; v++) {
      positions[i * 9 + v] = view.getFloat32(offset, true);
      offset += 4;
    }
    offset += 2; // attribute byte count
  }
  return positions;
}

function parseAscii(buffer: ArrayBuffer): Float32Array {
  const text = new TextDecoder().decode(buffer);
  const values: number[] = [];
  const vertexPattern = /vertex\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)\s+(-?[\d.eE+-]+)/g;

  let match: RegExpExecArray | null;
  while ((match = vertexPattern.exec(text)) !== null) {
    values.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  return new Float32Array(values);
}

/** Throws a human-readable Error if the file can't be understood. */
export function parseSTL(buffer: ArrayBuffer): MeshStats {
  if (buffer.byteLength < 84) {
    throw new Error('That file is too small to be a valid STL.');
  }

  const positions = isBinarySTL(buffer) ? parseBinary(buffer) : parseAscii(buffer);

  if (positions.length === 0 || positions.length % 9 !== 0) {
    throw new Error('We could not read any triangles from that file. Is it a valid STL?');
  }

  const triangleCount = positions.length / 9;

  let volume = 0;
  let area = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 9) {
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
    const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5];
    const cx = positions[i + 6], cy = positions[i + 7], cz = positions[i + 8];

    // Signed volume of the tetrahedron from the origin to this face.
    volume +=
      (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;

    // Half the magnitude of the cross product of two edges.
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;

    minX = Math.min(minX, ax, bx, cx); maxX = Math.max(maxX, ax, bx, cx);
    minY = Math.min(minY, ay, by, cy); maxY = Math.max(maxY, ay, by, cy);
    minZ = Math.min(minZ, az, bz, cz); maxZ = Math.max(maxZ, az, bz, cz);
  }

  const bbox = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
  const bboxVolume = bbox.x * bbox.y * bbox.z;
  const absVolume = Math.abs(volume);

  // A closed mesh should occupy a sane fraction of its bounding box. Anything
  // below ~0.1% is almost certainly non-manifold or has flipped normals.
  const suspect = volume < 0 || bboxVolume === 0 || absVolume / bboxVolume < 0.001;

  return {
    triangleCount,
    volumeMm3: absVolume,
    surfaceAreaMm2: area,
    bbox,
    suspect,
  };
}

/* ============================================================
   Pricing
   ============================================================ */

export type Material = {
  id: string;
  name: string;
  technology: 'FDM' | 'SLA';
  /** g/cm³ */
  density: number;
  /** ₹ per kg (FDM) or per litre-equivalent kg (SLA) */
  pricePerKg: number;
  /** Multiplier on machine time — resin is slower per cm³. */
  speedFactor: number;
  note: string;
};

export const MATERIALS: Material[] = [
  { id: 'pla', name: 'PLA', technology: 'FDM', density: 1.24, pricePerKg: 1400, speedFactor: 1, note: 'Display pieces, models. Softens around 55 °C.' },
  { id: 'petg', name: 'PETG', technology: 'FDM', density: 1.27, pricePerKg: 1650, speedFactor: 1.1, note: 'Tougher than PLA, good to about 75 °C.' },
  { id: 'abs', name: 'ABS', technology: 'FDM', density: 1.04, pricePerKg: 1750, speedFactor: 1.25, note: 'Heat-resistant to 95 °C, vapour-smoothable.' },
  { id: 'pacf', name: 'PA-CF (Carbon Fibre Nylon)', technology: 'FDM', density: 1.16, pricePerKg: 5200, speedFactor: 1.4, note: 'Stiff, light, impact-absorbing. Engineering parts.' },
  { id: 'tpu', name: 'TPU (Flexible)', technology: 'FDM', density: 1.21, pricePerKg: 3200, speedFactor: 1.9, note: 'Rubber-like. Gaskets, grips, protective parts.' },
  { id: 'resin-std', name: 'Standard Resin', technology: 'SLA', density: 1.12, pricePerKg: 4800, speedFactor: 2.2, note: 'Fine detail for figurines and models.' },
  { id: 'resin-tough', name: 'Tough Resin', technology: 'SLA', density: 1.15, pricePerKg: 6900, speedFactor: 2.4, note: 'Detail plus impact resistance.' },
  { id: 'resin-cast', name: 'Castable Resin', technology: 'SLA', density: 1.10, pricePerKg: 9500, speedFactor: 2.6, note: 'Jewellery masters. Clean burnout, no ash.' },
];

export type QuoteInput = {
  stats: MeshStats;
  materialId: string;
  layerHeightMm: number;
  infillPercent: number;
  quantity: number;
  needsSupport: boolean;
  /** Rates, so the admin can retune pricing without a code change. */
  rates: QuoteRates;
};

export type QuoteRates = {
  machinePerHour: number;
  labourPerHour: number;
  electricityPerKwh: number;
  printerWatts: number;
  profitMarginPercent: number;
  setupFee: number;
  gstPercent: number;
  freeDeliveryAbove: number;
  deliveryFee: number;
};

export const DEFAULT_RATES: QuoteRates = {
  machinePerHour: 120,
  labourPerHour: 250,
  electricityPerKwh: 8,
  printerWatts: 180,
  profitMarginPercent: 35,
  setupFee: 150,
  gstPercent: 18,
  freeDeliveryAbove: 10000,
  deliveryFee: 250,
};

export type QuoteBreakdown = {
  material: Material;
  /** Solid volume adjusted for infill and shells, cm³. */
  effectiveVolumeCm3: number;
  supportVolumeCm3: number;
  weightG: number;
  printHours: number;
  materialCost: number;
  machineCost: number;
  labourCost: number;
  electricityCost: number;
  setupFee: number;
  subtotal: number;
  profit: number;
  beforeTax: number;
  gst: number;
  delivery: number;
  total: number;
  perUnit: number;
};

export function calculateQuote(input: QuoteInput): QuoteBreakdown {
  const material = MATERIALS.find((m) => m.id === input.materialId) ?? MATERIALS[0];
  const { rates } = input;

  const solidCm3 = input.stats.volumeMm3 / 1000;
  const shellCm3 = (input.stats.surfaceAreaMm2 * 1.2) / 1000; // ~1.2 mm of wall

  // Interior beyond the shell is only filled to the chosen infill density.
  const interiorCm3 = Math.max(0, solidCm3 - shellCm3);
  const effectiveVolumeCm3 =
    material.technology === 'SLA'
      ? solidCm3 // resin prints solid
      : Math.min(solidCm3, shellCm3 + interiorCm3 * (input.infillPercent / 100));

  const supportVolumeCm3 = input.needsSupport ? effectiveVolumeCm3 * 0.14 : 0;
  const totalVolumeCm3 = effectiveVolumeCm3 + supportVolumeCm3;

  const weightG = totalVolumeCm3 * material.density;

  // Throughput scales with layer height: thinner layers, proportionally longer.
  const baseRateCm3PerHour = 14 * (input.layerHeightMm / 0.2);
  const printHours = Math.max(
    0.25,
    (totalVolumeCm3 / Math.max(baseRateCm3PerHour, 1)) * material.speedFactor,
  );

  const materialCost = (weightG / 1000) * material.pricePerKg;
  const machineCost = printHours * rates.machinePerHour;

  // Labour is setup plus finishing, not the whole print duration — the machine
  // runs unattended.
  const labourHours = 0.4 + printHours * 0.12 + (input.needsSupport ? 0.25 : 0);
  const labourCost = labourHours * rates.labourPerHour;

  const electricityCost =
    ((rates.printerWatts / 1000) * printHours) * rates.electricityPerKwh;

  const perUnitCost = materialCost + machineCost + labourCost + electricityCost;
  const subtotal = perUnitCost * input.quantity + rates.setupFee;

  const profit = subtotal * (rates.profitMarginPercent / 100);
  const beforeTax = subtotal + profit;
  const gst = beforeTax * (rates.gstPercent / 100);
  const delivery = beforeTax >= rates.freeDeliveryAbove ? 0 : rates.deliveryFee;
  const total = beforeTax + gst + delivery;

  return {
    material,
    effectiveVolumeCm3,
    supportVolumeCm3,
    weightG: weightG * input.quantity,
    printHours: printHours * input.quantity,
    materialCost: materialCost * input.quantity,
    machineCost: machineCost * input.quantity,
    labourCost: labourCost * input.quantity,
    electricityCost: electricityCost * input.quantity,
    setupFee: rates.setupFee,
    subtotal,
    profit,
    beforeTax,
    gst,
    delivery,
    total,
    perUnit: total / Math.max(1, input.quantity),
  };
}

/** Max single-piece build volume, mm. Anything larger gets split and bonded. */
export const BUILD_VOLUME = { x: 256, y: 256, z: 256 };

export function exceedsBuildVolume(bbox: MeshStats['bbox']) {
  const dims = [bbox.x, bbox.y, bbox.z].sort((a, b) => b - a);
  const limits = [BUILD_VOLUME.x, BUILD_VOLUME.y, BUILD_VOLUME.z].sort((a, b) => b - a);
  return dims.some((d, i) => d > limits[i]);
}
