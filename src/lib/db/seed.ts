import 'server-only';

import bcrypt from 'bcryptjs';
import type mysql from 'mysql2/promise';

/**
 * First-run seed. Runs inside a transaction and only when the users table is
 * empty, so a fresh deploy comes up with a populated, demoable site.
 */

const img = (title: string, seed: number, w = 1200, h = 900) =>
  `/api/tile?title=${encodeURIComponent(title)}&seed=${seed}&w=${w}&h=${h}`;

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Drs@12345';

/** Turns SQLite's `datetime('now', spec)` offsets into an actual MySQL DATETIME literal. */
function offsetDate(spec: string): string {
  const match = /^([+-]?\d+)\s+(minute|hour|day)s?$/.exec(spec.trim());
  const ms = Date.now();
  const date = new Date(ms);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === 'minute') date.setMinutes(date.getMinutes() + amount);
    if (unit === 'hour') date.setHours(date.getHours() + amount);
    if (unit === 'day') date.setDate(date.getDate() + amount);
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function seedIfEmpty(pool: mysql.Pool) {
  const [existingRows] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS c FROM users');
  if ((existingRows[0] as { c: number }).c > 0) return;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const insert = async (sql: string, params: unknown[] = []) => {
      const [result] = await conn.query<mysql.ResultSetHeader>(sql, params);
      return result.insertId;
    };

    /* ---------------- Users: one per role ---------------- */
    const userSql = `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, 'active')`;
    const adminId = await insert(userSql, ['DRS Administrator', 'drs3dworld@gmail.com', '6371989465', hash, 'admin']);
    await insert(userSql, ['Production Manager', 'manager@drs3dworld.com', '6371989466', hash, 'manager']);
    await insert(userSql, ['Sales Executive', 'sales@drs3dworld.com', '6371989467', hash, 'sales']);
    await insert(userSql, ['Ananya Mohanty', 'customer@example.com', '9861000001', hash, 'customer']);
    await insert(userSql, ['Read Only', 'viewer@drs3dworld.com', null, hash, 'viewer']);

    /* ---------------- Categories ---------------- */
    const categories: Array<[string, string, string, string]> = [
      ['Statues & Idols', 'statues-idols', 'Devotional and decorative figures printed in fine detail.', 'Sparkles'],
      ['Custom Figurines', 'custom-figurines', 'Personalised miniatures printed from your photographs.', 'Users'],
      ['Lighting & Decor', 'lighting-decor', 'Sculptural lamps and interior pieces.', 'Lamp'],
      ['Engineering Parts', 'engineering-parts', 'Functional components in engineering-grade polymers.', 'Cog'],
      ['Prototypes', 'prototypes', 'Fast, accurate concept and functional prototypes.', 'Rocket'],
      ['Architectural Models', 'architectural-models', 'Scale models for practices and developers.', 'Building2'],
      ['Medical Models', 'medical-models', 'Anatomical models for surgical planning and teaching.', 'HeartPulse'],
      ['Corporate Gifts', 'corporate-gifts', 'Branded awards, desk pieces and mementos.', 'Gift'],
      ['Drone & RC Parts', 'drone-rc-parts', 'Lightweight, impact-resistant airframe components.', 'Plane'],
      ['Jewellery', 'jewellery', 'Castable masters and wearable resin pieces.', 'Gem'],
      ['Robotics', 'robotics', 'Chassis, brackets and gearboxes for robotics teams.', 'Bot'],
      ['Automobile Parts', 'automobile-parts', 'Jigs, fixtures and trim under the bonnet.', 'Car'],
    ];
    const catIds: Record<string, number> = {};
    for (const [i, [name, slug, description, icon]] of categories.entries()) {
      catIds[slug] = await insert(
        `INSERT INTO categories (name, slug, description, icon, sort_order, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, slug, description, icon, i, img(name, i + 11, 800, 600)],
      );
    }

    /* ---------------- Brands / material partners ---------------- */
    const brands: Array<[string, string, string, string | null]> = [
      ['DRS Signature', 'drs-signature', 'Our own in-house finished range.', null],
      ['Bambu Lab', 'bambu-lab', 'High-speed CoreXY production platform.', 'https://bambulab.com'],
      ['Prusa Research', 'prusa-research', 'Open-source FDM workhorses.', 'https://prusa3d.com'],
      ['Formlabs', 'formlabs', 'Precision SLA resin systems.', 'https://formlabs.com'],
    ];
    const brandIds: Record<string, number> = {};
    for (const [n, s, d, w] of brands) {
      brandIds[s] = await insert(`INSERT INTO brands (name, slug, description, website) VALUES (?, ?, ?, ?)`, [n, s, d, w]);
    }

    /* ---------------- Products ---------------- */
    const productInsertSql = `
      INSERT INTO products (
        name, slug, sku, category_id, brand_id, short_description, description,
        features, specifications, price, discount_price, stock, availability,
        length_mm, width_mm, height_mm, weight_g, material, print_technology,
        print_time_hours, layer_height_mm, infill_percent, color,
        is_featured, is_trending, is_popular, is_new_arrival, is_best_seller,
        youtube_url, seo_title, seo_description, meta_keywords,
        rating_avg, rating_count, view_count, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    type Seed = {
      name: string;
      category: string;
      brand: string;
      sku: string;
      short: string;
      description: string;
      features: string[];
      specs: Array<{ label: string; value: string }>;
      price: number;
      discount?: number;
      stock: number;
      dims: [number, number, number];
      weight: number;
      material: string;
      tech: string;
      hours: number;
      layer: number;
      infill: number;
      color: string;
      tags: string[];
      flags?: Partial<
        Record<'featured' | 'trending' | 'popular' | 'newArrival' | 'bestSeller', boolean>
      >;
      rating: [number, number];
    };

    const productSeeds: Seed[] = [
      {
        name: 'Hanuman Statue — Heritage Edition',
        category: 'statues-idols',
        brand: 'drs-signature',
        sku: 'DRS-ST-HNM-001',
        short: 'A 300 mm devotional Hanuman murti, resin-printed at 25 micron and hand-finished in antique bronze.',
        description:
          'Sculpted from a high-density mesh and printed on a precision SLA system at a 25 micron layer height, this Hanuman statue holds detail down to individual strands of fur and the folds of the gada. Each piece is washed, UV-cured, hand-sanded through four grits, then finished with a bronze patina and sealed with a matte UV-stable lacquer. Supplied on a weighted base with a felt underside.',
        features: [
          '25 micron layer height — no visible layer lines',
          'Hand-applied antique bronze patina',
          'UV-stable lacquer, safe for indoor display',
          'Weighted base with protective felt underside',
          'Available in 150 mm, 300 mm and 600 mm',
        ],
        specs: [
          { label: 'Finish', value: 'Antique bronze patina' },
          { label: 'Base', value: 'Weighted composite, felt-lined' },
          { label: 'Lead time', value: '5–7 working days' },
          { label: 'Packaging', value: 'Foam-lined presentation box' },
        ],
        price: 8500,
        discount: 6999,
        stock: 12,
        dims: [140, 120, 300],
        weight: 620,
        material: 'Tough Resin',
        tech: 'SLA',
        hours: 14.5,
        layer: 0.025,
        infill: 100,
        color: 'Antique Bronze',
        tags: ['devotional', 'statue', 'resin', 'gift'],
        flags: { featured: true, bestSeller: true, popular: true },
        rating: [4.9, 47],
      },
      {
        name: 'Custom Couple Statue — From Your Photos',
        category: 'custom-figurines',
        brand: 'drs-signature',
        sku: 'DRS-FG-CPL-002',
        short: 'Send us three photographs; we sculpt, print and hand-paint a 180 mm likeness of the two of you.',
        description:
          'Our sculptors build a likeness from the photographs you upload, share a render for your approval, then print in full-colour resin. Faces are hand-detailed after printing, clothing is painted to match your reference, and the piece ships on an engraved base with your names and date. The most requested wedding and anniversary gift we make.',
        features: [
          'Sculpted by hand from your photographs',
          'Render approval before anything is printed',
          'Hand-painted faces and clothing',
          'Engraved base with names and date',
          'Two revision rounds included',
        ],
        specs: [
          { label: 'Photos needed', value: '3 per person — front, side, full body' },
          { label: 'Approval', value: 'Render shared within 48 hours' },
          { label: 'Lead time', value: '10–14 working days' },
          { label: 'Revisions', value: '2 rounds included' },
        ],
        price: 14500,
        discount: 11999,
        stock: 0,
        dims: [120, 100, 180],
        weight: 410,
        material: 'Full-Colour Resin',
        tech: 'SLA',
        hours: 22,
        layer: 0.025,
        infill: 100,
        color: 'Full Colour',
        tags: ['custom', 'wedding', 'gift', 'figurine'],
        flags: { featured: true, trending: true, bestSeller: true },
        rating: [5.0, 63],
      },
      {
        name: 'Voronoi Table Lamp',
        category: 'lighting-decor',
        brand: 'drs-signature',
        sku: 'DRS-LM-VRN-003',
        short: 'An organic Voronoi shade that throws a lattice of shadow across the room. Warm 3 W LED included.',
        description:
          'Generated with a parametric Voronoi algorithm so no two shades carry quite the same cell pattern. Printed in warm-white translucent PLA with a 0.12 mm layer height for a smooth diffusion gradient, then fitted with a dimmable 3 W warm LED module and a fabric-braided cable with an inline switch.',
        features: [
          'Parametric Voronoi shell — every piece differs',
          'Dimmable 3 W warm-white LED included',
          'Fabric-braided cable with inline switch',
          '0.12 mm layers for even light diffusion',
          'Weighted base, 1.8 m cable',
        ],
        specs: [
          { label: 'Bulb', value: '3 W warm white, dimmable' },
          { label: 'Cable', value: '1.8 m fabric braided' },
          { label: 'Power', value: '230 V, Indian 2-pin' },
          { label: 'Lead time', value: '3–5 working days' },
        ],
        price: 3200,
        discount: 2499,
        stock: 24,
        dims: [180, 180, 260],
        weight: 340,
        material: 'Translucent PLA',
        tech: 'FDM',
        hours: 9,
        layer: 0.12,
        infill: 15,
        color: 'Warm White',
        tags: ['lamp', 'decor', 'voronoi', 'lighting'],
        flags: { featured: true, popular: true, newArrival: true },
        rating: [4.7, 31],
      },
      {
        name: 'Planetary Gearbox — Functional Assembly',
        category: 'engineering-parts',
        brand: 'prusa-research',
        sku: 'DRS-EN-GBX-004',
        short: 'A 5:1 planetary reduction printed in carbon-fibre nylon. Prints assembled, turns straight off the bed.',
        description:
          'Printed as a pre-assembled unit in carbon-fibre reinforced nylon with 0.15 mm layers and tuned clearances, so it comes off the plate turning freely with no post-assembly. Rated for continuous duty at up to 4 Nm. Supplied with a NEMA 17 mounting face as standard; other faces on request.',
        features: [
          '5:1 reduction, 4 Nm continuous',
          'Prints fully assembled — no fasteners',
          'Carbon-fibre nylon, dimensionally stable',
          'NEMA 17 mounting face as standard',
          'Annealed for elevated-temperature service',
        ],
        specs: [
          { label: 'Ratio', value: '5:1' },
          { label: 'Rated torque', value: '4 Nm continuous' },
          { label: 'Mount', value: 'NEMA 17 (others on request)' },
          { label: 'Service temp', value: 'Up to 110 °C after annealing' },
        ],
        price: 4800,
        stock: 8,
        dims: [70, 70, 62],
        weight: 145,
        material: 'PA-CF (Carbon Fibre Nylon)',
        tech: 'FDM',
        hours: 6.5,
        layer: 0.15,
        infill: 60,
        color: 'Matte Black',
        tags: ['gearbox', 'functional', 'nylon', 'engineering'],
        flags: { trending: true, popular: true },
        rating: [4.8, 22],
      },
      {
        name: 'Rapid Prototype Service — Concept Model',
        category: 'prototypes',
        brand: 'bambu-lab',
        sku: 'DRS-PR-CNC-005',
        short: 'Upload a CAD file before noon and collect a finished concept model the next working day.',
        description:
          'A same-week concept prototyping service running on our CoreXY production floor. Send STEP, STL or 3MF; we check the geometry for printability, flag anything below minimum wall thickness, print at 0.2 mm and return a finished part. Priced per 100 cm³ of material — the calculator on our quote page gives you an exact figure in seconds.',
        features: [
          'Next-working-day turnaround on files received before noon',
          'Free printability check with a written report',
          'STEP, STL, 3MF, OBJ and IGES accepted',
          'Priced per 100 cm³ — no minimum order',
          'NDA signed on request',
        ],
        specs: [
          { label: 'Turnaround', value: 'Next working day' },
          { label: 'Formats', value: 'STEP, STL, 3MF, OBJ, IGES' },
          { label: 'Max build', value: '256 × 256 × 256 mm' },
          { label: 'Tolerance', value: '±0.2 mm or ±0.2 %' },
        ],
        price: 1200,
        stock: 999,
        dims: [256, 256, 256],
        weight: 100,
        material: 'PLA / PETG / ABS',
        tech: 'FDM',
        hours: 4,
        layer: 0.2,
        infill: 20,
        color: 'Your choice',
        tags: ['prototype', 'service', 'rapid', 'cad'],
        flags: { featured: true, trending: true },
        rating: [4.9, 88],
      },
      {
        name: 'Architectural Scale Model — 1:200 Tower',
        category: 'architectural-models',
        brand: 'drs-signature',
        sku: 'DRS-AR-TWR-006',
        short: 'Presentation-grade massing models with frosted glazing and an edge-lit acrylic base.',
        description:
          'Built from your Revit or SketchUp export at 1:200 or 1:500. Massing prints in matte white PLA, glazing in frosted translucent resin, landscaping and roads laser-cut and inlaid. The whole model sits on an edge-lit acrylic base with an engraved title block and can be supplied under a dust cover for boardroom display.',
        features: [
          'Built from Revit, SketchUp, Rhino or IFC',
          'Frosted resin glazing against matte massing',
          'Edge-lit acrylic base with engraved title block',
          'Laser-cut landscaping and road inlays',
          'Optional acrylic dust cover',
        ],
        specs: [
          { label: 'Scales', value: '1:100, 1:200, 1:500' },
          { label: 'Source files', value: 'RVT, SKP, 3DM, IFC, STL' },
          { label: 'Base', value: 'Edge-lit acrylic, engraved' },
          { label: 'Lead time', value: '12–18 working days' },
        ],
        price: 45000,
        discount: 39500,
        stock: 0,
        dims: [600, 400, 350],
        weight: 3800,
        material: 'PLA + Frosted Resin',
        tech: 'FDM + SLA',
        hours: 96,
        layer: 0.1,
        infill: 10,
        color: 'Matte White',
        tags: ['architecture', 'scale model', 'presentation'],
        flags: { popular: true },
        rating: [4.9, 14],
      },
      {
        name: 'Anatomical Heart — Surgical Planning Model',
        category: 'medical-models',
        brand: 'formlabs',
        sku: 'DRS-MD-HRT-007',
        short: 'Patient-specific cardiac models segmented from CT/MRI, printed in tissue-analogue resin.',
        description:
          'We segment the patient DICOM series, isolate the chambers and great vessels, and print in a flexible tissue-analogue resin that cuts and sutures like the real thing. Used by surgical teams for rehearsal and by teaching hospitals for chamber-by-chamber demonstration. Colour-coded variants separate arterial and venous structures.',
        features: [
          'Segmented directly from patient DICOM',
          'Flexible tissue-analogue resin — cuts and sutures',
          'Colour-coded arterial and venous structures',
          'Sectioned variants for teaching',
          'Handled under a signed data-protection agreement',
        ],
        specs: [
          { label: 'Input', value: 'DICOM series (CT or MRI)' },
          { label: 'Segmentation', value: 'Included, clinician-reviewed' },
          { label: 'Material', value: 'Flexible tissue-analogue resin' },
          { label: 'Lead time', value: '6–9 working days' },
        ],
        price: 18500,
        stock: 0,
        dims: [130, 110, 140],
        weight: 480,
        material: 'Flexible Resin',
        tech: 'SLA',
        hours: 18,
        layer: 0.05,
        infill: 100,
        color: 'Anatomical',
        tags: ['medical', 'surgical', 'anatomy', 'dicom'],
        flags: { featured: true, newArrival: true },
        rating: [5.0, 9],
      },
      {
        name: 'Corporate Award — Engraved Crystal Form',
        category: 'corporate-gifts',
        brand: 'drs-signature',
        sku: 'DRS-CG-AWD-008',
        short: 'Faceted awards in clear polished resin with your logo embedded inside the body.',
        description:
          'A faceted award printed in clear resin, vapour-polished to optical clarity, with your logo suspended inside the body as an internal void that catches the light. Sits on a black anodised aluminium base with laser-engraved recipient details. Minimum order five pieces; unit price falls sharply above twenty.',
        features: [
          'Vapour-polished to optical clarity',
          'Logo embedded inside the body as a light-catching void',
          'Black anodised aluminium base',
          'Laser-engraved recipient details',
          'Volume pricing from 20 pieces',
        ],
        specs: [
          { label: 'Minimum order', value: '5 pieces' },
          { label: 'Artwork', value: 'AI, EPS, SVG or high-res PNG' },
          { label: 'Base', value: 'Black anodised aluminium' },
          { label: 'Lead time', value: '8–10 working days' },
        ],
        price: 2800,
        discount: 2299,
        stock: 40,
        dims: [90, 60, 220],
        weight: 520,
        material: 'Clear Resin',
        tech: 'SLA',
        hours: 11,
        layer: 0.05,
        infill: 100,
        color: 'Optical Clear',
        tags: ['award', 'corporate', 'bulk', 'engraved'],
        flags: { bestSeller: true, popular: true },
        rating: [4.6, 55],
      },
      {
        name: 'FPV Drone Frame — 5 Inch Freestyle',
        category: 'drone-rc-parts',
        brand: 'bambu-lab',
        sku: 'DRS-DR-FRM-009',
        short: 'A 128 g impact-resistant 5" freestyle airframe in PA-CF. Survives the crashes that snap carbon.',
        description:
          'Designed around a 5-inch freestyle build with 30 × 30 mm stack mounting and generous prop clearance. Printed in carbon-fibre nylon, which flexes and returns instead of shattering — pilots consistently report walking away from impacts that would have cracked a carbon plate. Arms are individually replaceable.',
        features: [
          '128 g all-up frame weight',
          'Individually replaceable arms',
          '30 × 30 mm stack mounting',
          'Impact-absorbing PA-CF construction',
          'TPU camera mount included',
        ],
        specs: [
          { label: 'Prop size', value: '5 inch' },
          { label: 'Stack', value: '30 × 30 mm' },
          { label: 'Weight', value: '128 g frame only' },
          { label: 'Spares', value: 'Arms sold individually' },
        ],
        price: 3600,
        stock: 18,
        dims: [220, 220, 40],
        weight: 128,
        material: 'PA-CF (Carbon Fibre Nylon)',
        tech: 'FDM',
        hours: 7,
        layer: 0.15,
        infill: 50,
        color: 'Carbon Black',
        tags: ['drone', 'fpv', 'frame', 'nylon'],
        flags: { trending: true, newArrival: true },
        rating: [4.7, 36],
      },
      {
        name: 'Castable Ring Master — Filigree Band',
        category: 'jewellery',
        brand: 'formlabs',
        sku: 'DRS-JW-RNG-010',
        short: 'Castable resin masters at 25 micron, burning out clean with no ash for your caster.',
        description:
          'Printed in castable wax-filled resin at a 25 micron layer height, these masters carry filigree detail down to 0.3 mm and burn out completely with no residual ash. Supplied sprued and ready for investment, in any ring size from 6 to 26. We work directly with your caster or ours.',
        features: [
          '25 micron layers, 0.3 mm minimum detail',
          'Clean burnout — no residual ash',
          'Supplied sprued, ready for investment',
          'Any size from 6 to 26',
          'Design service available from a sketch',
        ],
        specs: [
          { label: 'Material', value: 'Castable wax-filled resin' },
          { label: 'Sizes', value: '6 to 26' },
          { label: 'Min detail', value: '0.3 mm' },
          { label: 'Lead time', value: '4–6 working days' },
        ],
        price: 1800,
        discount: 1499,
        stock: 60,
        dims: [24, 24, 9],
        weight: 4,
        material: 'Castable Resin',
        tech: 'SLA',
        hours: 3,
        layer: 0.025,
        infill: 100,
        color: 'Castable Blue',
        tags: ['jewellery', 'castable', 'ring', 'filigree'],
        flags: { newArrival: true },
        rating: [4.8, 27],
      },
      {
        name: 'Robotics Chassis Kit — Competition Spec',
        category: 'robotics',
        brand: 'prusa-research',
        sku: 'DRS-RB-CHS-011',
        short: 'A complete differential-drive chassis for school and college robotics teams.',
        description:
          'Everything structural for a competition differential-drive robot: chassis plates, motor mounts for N20 and 25 mm gearmotors, castor housing, battery cradle and sensor brackets. Printed in PETG for impact resistance and supplied with a printed assembly guide. Bolt pattern matches the common Indian competition specifications.',
        features: [
          'Complete differential-drive chassis',
          'Mounts for N20 and 25 mm gearmotors',
          'Battery cradle and sensor brackets included',
          'PETG — tougher than PLA under impact',
          'Printed assembly guide in the box',
        ],
        specs: [
          { label: 'Drive', value: 'Differential, 2 motor' },
          { label: 'Motors', value: 'N20 / 25 mm gearmotor' },
          { label: 'Footprint', value: '200 × 160 mm' },
          { label: 'Spares', value: 'All parts individually replaceable' },
        ],
        price: 5400,
        discount: 4599,
        stock: 15,
        dims: [200, 160, 85],
        weight: 390,
        material: 'PETG',
        tech: 'FDM',
        hours: 12,
        layer: 0.2,
        infill: 35,
        color: 'Flame Orange',
        tags: ['robotics', 'education', 'chassis', 'kit'],
        flags: { popular: true },
        rating: [4.7, 41],
      },
      {
        name: 'Intake Manifold Prototype — ABS',
        category: 'automobile-parts',
        brand: 'drs-signature',
        sku: 'DRS-AU-MNF-012',
        short: 'Flow-testable intake prototypes in heat-resistant ABS, printed in an enclosed chamber.',
        description:
          'Printed in an actively heated chamber to keep ABS from warping across a long part, then vapour-smoothed to seal the layer lines so the runner can be flow-tested wet. Suitable for fitment checks, flow bench work and pattern-making up to 85 °C. Not for service under the bonnet.',
        features: [
          'Enclosed heated chamber — no warp across length',
          'Vapour-smoothed to a sealed internal surface',
          'Flow-bench testable',
          'Serviceable to 85 °C',
          'Pattern-making variant available',
        ],
        specs: [
          { label: 'Material', value: 'ABS, vapour-smoothed' },
          { label: 'Max temp', value: '85 °C' },
          { label: 'Use', value: 'Prototype and pattern only' },
          { label: 'Lead time', value: '7–9 working days' },
        ],
        price: 9800,
        stock: 5,
        dims: [320, 180, 150],
        weight: 680,
        material: 'ABS',
        tech: 'FDM',
        hours: 26,
        layer: 0.2,
        infill: 30,
        color: 'Graphite',
        tags: ['automotive', 'prototype', 'abs', 'manifold'],
        flags: { trending: true },
        rating: [4.5, 12],
      },
    ];

    const slugify = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const productIds: number[] = [];

    for (const [i, p] of productSeeds.entries()) {
      const slug = slugify(p.name);
      const id = await insert(productInsertSql, [
        p.name, slug, p.sku, catIds[p.category], brandIds[p.brand], p.short, p.description,
        JSON.stringify(p.features), JSON.stringify(p.specs), p.price, p.discount ?? null,
        p.stock, p.stock > 0 ? 'in_stock' : 'made_to_order',
        p.dims[0], p.dims[1], p.dims[2], p.weight, p.material, p.tech,
        p.hours, p.layer, p.infill, p.color,
        p.flags?.featured ? 1 : 0, p.flags?.trending ? 1 : 0, p.flags?.popular ? 1 : 0,
        p.flags?.newArrival ? 1 : 0, p.flags?.bestSeller ? 1 : 0,
        null, p.name, p.short, p.tags.join(', '),
        p.rating[0], p.rating[1], 120 + i * 37, i,
      ]);
      productIds.push(id);

      // Gallery + a small 360 ring so the viewer has frames to spin through.
      for (let k = 0; k < 4; k++) {
        await conn.query(
          `INSERT INTO product_images (product_id, url, alt, kind, sort_order) VALUES (?, ?, ?, 'gallery', ?)`,
          [id, img(p.name, id * 10 + k), `${p.name} — view ${k + 1}`, k],
        );
      }
      for (let k = 0; k < 24; k++) {
        await conn.query(
          `INSERT INTO product_images (product_id, url, alt, kind, sort_order) VALUES (?, ?, ?, '360', ?)`,
          [id, img(`${p.name} ${k * 15}°`, id * 100 + k, 900, 900), `${p.name} — ${k * 15}°`, k],
        );
      }
      for (const t of p.tags) {
        await conn.query(`INSERT IGNORE INTO product_tags (product_id, tag) VALUES (?, ?)`, [id, t]);
      }
    }

    // Relate every product to its two neighbours — enough for the carousel.
    for (const [i, id] of productIds.entries()) {
      const relSql = `INSERT IGNORE INTO product_relations (product_id, related_id) VALUES (?, ?)`;
      await conn.query(relSql, [id, productIds[(i + 1) % productIds.length]]);
      await conn.query(relSql, [id, productIds[(i + 2) % productIds.length]]);
      await conn.query(relSql, [id, productIds[(i + 5) % productIds.length]]);
    }

    /* ----------------------------------------------------------------
       Orders and quotes are deliberately NOT seeded.

       They were, with ninety days of invented history, and it made the
       admin dashboard look alive on a fresh install. But the studio has to
       run this panel for real: a demo order is indistinguishable from a
       customer's order once it is sitting in the same list, and revenue
       figures built on invented rows are worse than an empty chart.
       The only pseudo-random left is for page views, which drive the
       traffic graph and are not business records.
       ---------------------------------------------------------------- */

    // Deterministic pseudo-random so every fresh deploy looks identical.
    let s = 20260726;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    /* ---------------- Leads ---------------- */
    const leadSql = `INSERT INTO leads (name, email, phone, company, subject, message, source, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const leads: Array<[string, string, string, string, string, string, string, string, string]> = [
      ['Rakesh Sahoo', 'rakesh@example.com', '9861100001', 'Sahoo Industries', 'Bulk prototype enquiry', 'We need 40 functional prototypes of a housing in ABS. Can you quote for a monthly repeat order?', 'contact_form', 'qualified', '-2 days'],
      ['Priya Nayak', 'priya@example.com', '9861100002', '', 'Wedding couple statue', 'Looking for a couple statue for my sister\'s wedding on the 14th. Is that timeline possible?', 'contact_form', 'contacted', '-4 days'],
      ['Dr. S. Mishra', 'mishra@hospital.example', '9861100003', 'City Hospital', 'Anatomical models for teaching', 'We would like a set of six anatomical models for our teaching lab. Please share pricing.', 'quote_form', 'new', '-1 days'],
      ['Arjun Behera', 'arjun@example.com', '9861100004', 'Behera Motors', 'Intake manifold', 'Need a manifold prototype flow-tested. Sending STEP file separately.', 'whatsapp', 'won', '-9 days'],
      ['Sneha Rout', 'sneha@example.com', '9861100005', 'Rout Jewellers', 'Castable masters', 'Interested in a monthly run of 50 castable ring masters.', 'contact_form', 'qualified', '-6 days'],
      ['Vikram Singh', 'vikram@example.com', '9861100006', 'Defence Labs', 'Drone frame batch', 'Require 25 FPV frames in PA-CF. What is your lead time?', 'quote_form', 'contacted', '-3 days'],
      ['Lipsa Panda', 'lipsa@example.com', '9861100007', '', 'Hanuman statue 600mm', 'Do you make the Hanuman statue in the 600 mm size? What is the price?', 'contact_form', 'new', '-1 days'],
      ['Kiran Jena', 'kiran@example.com', '9861100008', 'Jena Architects', '1:200 tower model', 'We have a Revit model ready. Need it by month end for a client presentation.', 'contact_form', 'lost', '-16 days'],
    ];
    for (const l of leads) {
      await conn.query(leadSql, [...l.slice(0, 8), offsetDate(l[8])]);
    }

    /* ---------------- Testimonials ---------------- */
    const testimonialSql = `INSERT INTO testimonials (author_name, author_role, company, quote, rating, is_featured, sort_order, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const testimonials: Array<[string, string, string, string, number, number]> = [
      ['Rakesh Sahoo', 'Head of Production', 'Sahoo Industries', 'We had a housing redesign stuck for three weeks waiting on a supplier. DRS turned the first article around in two days and caught a wall-thickness problem our own CAD team had missed.', 5, 1],
      ['Dr. S. Mishra', 'Consultant Cardiologist', 'City Hospital', 'The cardiac model was accurate enough that we rehearsed the approach on it the evening before. It changed how we planned the procedure.', 5, 1],
      ['Priya Nayak', 'Customer', '', 'They sent a render for approval, I asked for the saree drape to change, and they redid it without a word of complaint. My sister cried when she opened it.', 5, 1],
      ['Kiran Jena', 'Principal Architect', 'Jena Architects', 'The edge-lit base was their suggestion, not ours, and it was the thing the client photographed. Genuinely good instincts.', 5, 0],
      ['Vikram Singh', 'Project Lead', 'Defence Labs', 'Twenty-five frames, all within tolerance, delivered a day early. We have not needed to look elsewhere since.', 5, 0],
      ['Sneha Rout', 'Owner', 'Rout Jewellers', 'Burnout is completely clean. My caster asked me where I was getting them done.', 5, 0],
    ];
    for (const [i, t] of testimonials.entries()) {
      await conn.query(testimonialSql, [t[0], t[1], t[2], t[3], t[4], t[5], i, img(t[0], 500 + i, 200, 200)]);
    }

    /* ---------------- FAQs ---------------- */
    const faqSql = `INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)`;
    const faqs: Array<[string, string, string]> = [
      ['What file formats do you accept?', 'STL, OBJ, 3MF, STEP, IGES and native Rhino or SketchUp files. If your file is in something else, send it across — we can usually open it or convert it for you.', 'Files'],
      ['How long does a typical print take?', 'Small parts are usually ready the next working day. Larger assemblies and multi-part models take 5–14 working days depending on finishing. Every quote carries a specific date, not a range.', 'Lead time'],
      ['Do you print in colour?', 'Yes. Full-colour resin for figurines and models, and hand-painting for pieces that need it. For single-colour parts we stock over thirty filament colours.', 'Materials'],
      ['What is the largest thing you can print?', '256 × 256 × 256 mm in a single piece. Beyond that we split the model along hidden seams and bond it — our architectural models routinely run past a metre.', 'Capability'],
      ['Can you sign an NDA?', 'Yes, as a matter of course for commercial work. Send us your standard document or use ours.', 'Commercial'],
      ['Do you deliver outside Bhubaneswar?', 'We ship across India. Local delivery within Bhubaneswar is free on orders above ₹10,000.', 'Delivery'],
      ['Will you tell me if my design will not print?', 'Always, before we take payment. Thin walls, unsupported overhangs and trapped volumes get flagged with a written note and a suggested fix.', 'Files'],
      ['Do you do one-off pieces or only bulk?', 'Both. A single custom figurine is as welcome as a run of 500 corporate awards.', 'Commercial'],
    ];
    for (const [i, f] of faqs.entries()) {
      await conn.query(faqSql, [f[0], f[1], f[2], i]);
    }

    /* ---------------- Blog ---------------- */
    const blogSql = `
      INSERT INTO blogs (title, slug, excerpt, content, cover_url, author_id, category, tags,
                         reading_minutes, status, view_count, seo_title, seo_description, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)
    `;
    const posts = [
      {
        title: 'FDM or SLA: choosing the right process for your part',
        excerpt: 'The honest version — where each process wins, where it loses, and the questions we ask before quoting.',
        category: 'Guides',
        tags: ['fdm', 'sla', 'materials'],
        minutes: 7,
        views: 1840,
        days: '-3 days',
        content: `Most people arrive asking for "3D printing" as if it were one thing. It is at least two, and picking wrong costs you either money or a part that fails.\n\n## FDM: strength, size, cost\n\nFused deposition lays down molten polymer line by line. It is the cheapest process per cubic centimetre, handles engineering materials like nylon and polycarbonate, and scales to large parts without the price running away.\n\nIt loses on surface finish. Layer lines are visible at any height, and fine detail below about 0.8 mm gets soft. If your part is going inside a machine, that rarely matters. If it is going on a mantelpiece, it does.\n\n## SLA: detail, finish, fidelity\n\nStereolithography cures liquid resin with a laser. At 25 micron layers the lines disappear entirely and detail holds down to 0.3 mm — which is why every figurine and jewellery master we produce is resin.\n\nThe trade-offs are real: resin parts are more brittle, they degrade under prolonged UV, and the price per cubic centimetre is roughly four times FDM.\n\n## What we actually ask\n\nBefore quoting, we want to know three things. Will anyone look at it closely? Will it carry load? Will it sit in sunlight? Those three answers decide the process nine times out of ten.`,
      },
      {
        title: 'Why your model has thin walls (and what we do about it)',
        excerpt: 'The single most common reason a file comes back flagged, explained without the CAD jargon.',
        category: 'Guides',
        tags: ['design', 'printability', 'cad'],
        minutes: 5,
        views: 1210,
        days: '-11 days',
        content: `Every week we flag a file for thin walls, and every week somebody replies that it looked fine on screen. It did. Screens do not have a minimum feature size; nozzles do.\n\n## The number that matters\n\nOur standard nozzle is 0.4 mm. A wall thinner than that cannot be drawn at all — the slicer silently deletes it. Between 0.4 and 0.8 mm it gets drawn as a single fragile line. Below 1.2 mm on a part that carries any load, expect it to fail.\n\nFor resin the floor is lower, around 0.3 mm, but the failure is different: thin resin sections cure, then warp as they finish curing over the following days.\n\n## What we do\n\nWe run every incoming file through a wall-thickness analysis and send you a coloured map of anything under threshold, with a suggested thickness. It costs you nothing and takes us about ten minutes.\n\nMost fixes are a single offset operation in your CAD package. It is a far better conversation to have before printing than after.`,
      },
      {
        title: 'Inside a 96-hour architectural model build',
        excerpt: 'A 1:200 tower, four print farms running in parallel, and the mistake we made on day two.',
        category: 'Case Study',
        tags: ['architecture', 'case study', 'process'],
        minutes: 9,
        views: 2260,
        days: '-19 days',
        content: `The brief arrived on a Tuesday: a 1:200 massing model of a 34-storey tower, plus podium and landscaping, for a client presentation the following Monday.\n\n## Splitting the model\n\nAt 1:200 the tower stood 340 mm — beyond a single build. We split it into four sections along floor lines, where the horizontal seam would read as architecture rather than as a join.\n\n## The mistake\n\nWe printed the glazing before finalising the massing colour. When the matte white came out warmer than the sample, the frosted resin read as grey-blue against it rather than as glass. We reprinted the glazing on day four. Forty hours of machine time, entirely avoidable, and now we always finalise the massing first.\n\n## The base\n\nEdge-lighting the acrylic base was not in the brief. We suggested it, absorbed the cost, and it became the detail the client photographed and put in their own deck.\n\n## What we would do differently\n\nOrder the finishing sequence by what constrains what. Colour decisions cascade; make them first.`,
      },
      {
        title: 'Five materials we keep on the shelf, and when we reach for each',
        excerpt: 'PLA, PETG, ABS, PA-CF and tough resin — a working guide from the people who print with them daily.',
        category: 'Materials',
        tags: ['materials', 'pla', 'petg', 'nylon'],
        minutes: 6,
        views: 980,
        days: '-27 days',
        content: `## PLA\n\nStiff, dimensionally accurate, prints beautifully, and softens at around 55 °C. Perfect for display pieces and architectural models. Useless in a car in May.\n\n## PETG\n\nTougher than PLA, survives to about 75 °C, and takes impact without shattering. Our default for anything a student will drop.\n\n## ABS\n\nGood to 95 °C and vapour-smoothable to a sealed surface. Needs an enclosed heated chamber or it warps across any length. We print it in enclosures only.\n\n## PA-CF\n\nCarbon-fibre nylon. Stiff, light, and it flexes and returns rather than shattering. Everything that flies or crashes gets printed in this.\n\n## Tough resin\n\nWhere detail matters more than toughness. Figurines, jewellery masters, medical models. Keep it out of direct sunlight.`,
      },
    ];
    for (const p of posts) {
      const slug = slugify(p.title);
      await conn.query(blogSql, [
        p.title, slug, p.excerpt, p.content, img(p.title, 900 + p.minutes, 1600, 900),
        adminId, p.category, JSON.stringify(p.tags), p.minutes, p.views,
        p.title, p.excerpt, offsetDate(p.days),
      ]);
    }

    /* ---------------- Gallery ---------------- */
    const gallerySql = `INSERT INTO gallery_items (title, caption, url, thumb_url, media_type, category, width, height, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const galleryTitles = [
      'Hanuman murti — bronze patina', 'Couple statue — hand painted', 'Voronoi lamp lit',
      'Planetary gearbox exploded', 'Tower model — edge lit base', 'Cardiac model sectioned',
      'Corporate awards — batch of 40', 'FPV frame after 200 flights', 'Ring masters, sprued',
      'Robotics chassis assembled', 'Manifold on the flow bench', 'Print farm at 2am',
      'Nozzle close-up, first layer', 'Resin wash station', 'Support removal bench',
      'Colour matching session', 'Ganesh idol — 450mm', 'Miniature terrain set',
      'Architectural podium detail', 'Filament wall',
    ];
    for (const [i, t] of galleryTitles.entries()) {
      const tall = i % 3 === 0;
      await conn.query(gallerySql, [
        t, t, img(t, 300 + i, tall ? 800 : 1200, tall ? 1200 : 800),
        img(t, 300 + i, 400, tall ? 600 : 400),
        i % 7 === 0 ? 'before_after' : i % 5 === 0 ? 'video' : 'image',
        i % 4 === 0 ? 'Statues' : i % 3 === 0 ? 'Engineering' : 'Studio',
        tall ? 800 : 1200, tall ? 1200 : 800, i,
      ]);
    }

    /* ---------------- Videos ---------------- */
    const videoSql = `INSERT INTO videos (title, description, thumb_url, duration_sec, category, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`;
    const videos: Array<[string, string, number, string]> = [
      ['Hanuman statue — 14 hours in 60 seconds', 'A full SLA build compressed into a minute.', 62, 'Timelapse'],
      ['Planetary gearbox printed fully assembled', 'Off the plate and turning, no assembly.', 48, 'Engineering'],
      ['Voronoi lamp — light test', 'What the lattice does to a dark room.', 35, 'Product'],
      ['Inside the DRS print farm', 'A walk through the floor at full capacity.', 128, 'Studio'],
      ['Support removal, start to finish', 'The unglamorous half of resin printing.', 95, 'Process'],
      ['Tower model assembly timelapse', 'Four sections becoming one building.', 110, 'Architecture'],
    ];
    for (const [i, v] of videos.entries()) {
      await conn.query(videoSql, [v[0], v[1], img(v[0], 700 + i, 1280, 720), v[2], v[3], i]);
    }

    /* ---------------- Banners ---------------- */
    const bannerSql = `INSERT INTO banners (title, subtitle, image_url, cta_label, cta_href, placement, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await conn.query(bannerSql, ['Bringing your ideas to life', 'One layer at a time', img('Hero', 1, 1920, 1080), 'Get an instant quote', '/quote', 'home_hero', 0]);
    await conn.query(bannerSql, ['Next-day prototyping', 'Files in before noon, part in your hands tomorrow', img('Prototype', 2, 1920, 700), 'Upload your file', '/quote', 'home_mid', 1]);

    /* ---------------- Coupons ---------------- */
    const couponSql = `INSERT INTO coupons (code, description, type, value, min_order, max_discount, usage_limit, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await conn.query(couponSql, ['DRS10', 'Ten percent off your first order', 'percent', 10, 2000, 2500, 500, offsetDate('90 days')]);
    await conn.query(couponSql, ['FESTIVE500', 'Flat ₹500 off orders above ₹5,000', 'fixed', 500, 5000, null, 200, offsetDate('45 days')]);
    await conn.query(couponSql, ['BULK15', 'Fifteen percent off orders above ₹25,000', 'percent', 15, 25000, 10000, 100, offsetDate('180 days')]);

    /* ---------------- Homepage builder sections ---------------- */
    const sectionSql = `INSERT INTO homepage_sections (\`key\`, title, subtitle, config, sort_order, is_enabled)
       VALUES (?, ?, ?, ?, ?, ?)`;
    const sections: Array<[string, string, string, string]> = [
      ['hero', 'Cinematic 3D hero', 'Live printer, scroll-driven teardown', '{"autoplay":true,"quality":"auto"}'],
      ['marquee', 'Capability marquee', 'Scrolling capability strip', '{"speed":30}'],
      ['services', 'What we do', 'Six core services', '{"columns":3}'],
      ['featured', 'Featured work', 'Hand-picked products', '{"limit":6}'],
      ['process', 'How it works', 'Upload, approve, print, deliver', '{}'],
      ['industries', 'Industries we serve', 'Fourteen sectors', '{}'],
      ['stats', 'By the numbers', 'Counters', '{}'],
      ['testimonials', 'What clients say', 'Rotating quotes', '{"limit":6}'],
      ['gallery', 'From the floor', 'Masonry gallery preview', '{"limit":8}'],
      ['cta', 'Start your project', 'Quote calculator call to action', '{}'],
    ];
    for (const [i, s] of sections.entries()) {
      await conn.query(sectionSql, [s[0], s[1], s[2], s[3], i, 1]);
    }

    /* ---------------- Settings ---------------- */
    const settingSql = `INSERT INTO settings (\`key\`, value, \`group\`) VALUES (?, ?, ?)`;
    const settingDefaults: Array<[string, string, string]> = [
      ['site_theme', 'dark', 'appearance'],
      ['site_logo_url', '', 'appearance'],
      ['site_favicon_url', '', 'appearance'],
      ['site_name', 'DRS 3D WORLD', 'general'],
      ['site_tagline', '3D Printing & Innovation', 'general'],
      ['site_slogan', 'Bringing your ideas to life, one layer at a time', 'general'],
      ['contact_email', 'drs3dworld@gmail.com', 'contact'],
      ['contact_phone', '6371989465', 'contact'],
      ['whatsapp_number', '916371989465', 'contact'],
      ['address', 'N-6-363, Block N6, IRC Village, Nayapalli, Bhubaneswar, 751013, Odisha, India', 'contact'],
      ['currency', 'INR', 'commerce'],
      ['gst_percent', '18', 'commerce'],
      ['free_delivery_above', '10000', 'commerce'],
      ['quote_machine_rate_per_hour', '120', 'quote'],
      ['quote_labour_rate_per_hour', '250', 'quote'],
      ['quote_electricity_rate_per_kwh', '8', 'quote'],
      ['quote_printer_watts', '180', 'quote'],
      ['quote_profit_margin_percent', '35', 'quote'],
      ['quote_setup_fee', '150', 'quote'],
      ['seo_title', 'DRS 3D WORLD — 3D Printing & Innovation in Bhubaneswar', 'seo'],
      ['seo_description', 'Professional 3D printing, 3D design, rapid prototyping and model making in Bhubaneswar, Odisha.', 'seo'],
      ['session_timeout_minutes', '60', 'security'],
      ['remember_me_days', '30', 'security'],
    ];
    for (const s of settingDefaults) {
      await conn.query(settingSql, s);
    }

    /* ---------------- Reviews ---------------- */
    const reviewSql = `INSERT INTO reviews (product_id, author_name, rating, title, body, is_approved)
       VALUES (?, ?, ?, ?, ?, 1)`;
    const reviews: Array<[number, string, number, string, string]> = [
      [0, 'Subrat M.', 5, 'Better than the photos', 'The patina work is what sells it. Photos do not capture the depth.'],
      [0, 'Jyoti P.', 5, 'Gifted to my father', 'He has put it in the puja room. Highest compliment available.'],
      [1, 'Ritesh & Anu', 5, 'Wedding gift, perfect', 'The render approval step meant no surprises. Faces are genuinely recognisable.'],
      [2, 'Manoj K.', 4, 'Lovely light, cable a bit short', 'The shadows are gorgeous. I would have liked a longer cable for my setup.'],
      [3, 'Ashutosh R.', 5, 'Turns freely off the plate', 'Did not believe it until I held it. No assembly at all.'],
      [4, 'Sneha D.', 5, 'Next day, as promised', 'Uploaded at 11am, collected the following afternoon.'],
    ];
    for (const r of reviews) {
      await conn.query(reviewSql, [productIds[r[0]], r[1], r[2], r[3], r[4]]);
    }

    /* ---------------- Notifications & activity ---------------- */
    // Nothing here may reference an order or a quote — none are seeded, so a
    // notification about one would link to a record that does not exist.
    const notifSql = `INSERT INTO notifications (user_id, title, body, type, href, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const notifications: Array<[number, string, string, string, string, number, string]> = [
      [adminId, 'Welcome to your control room', 'Products, colours and content are ready to edit. Orders and quotes will appear here as customers place them.', 'success', '/admin/products', 0, '-2 minutes'],
      [adminId, 'Set your studio rates', 'Check the quote calculator rates under Settings before sharing the instant-quote link.', 'warning', '/admin/settings', 0, '-1 minutes'],
    ];
    for (const n of notifications) {
      await conn.query(notifSql, [...n.slice(0, 6), offsetDate(n[6])]);
    }

    const logSql = `INSERT INTO activity_logs (user_id, actor_name, action, entity_type, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const logs: Array<[string, string, string]> = [
      ['seeded catalogue', 'product', '-2 minutes'],
      ['seeded settings', 'settings', '-2 minutes'],
    ];
    for (const l of logs) {
      await conn.query(logSql, [adminId, 'DRS Administrator', l[0], l[1], null, 'Installed the starter product catalogue', offsetDate(l[2])]);
    }

    /* ---------------- Page views (analytics chart data) ---------------- */
    const viewSql = `INSERT INTO page_views (path, referrer, country, device, session_id, created_at)
       VALUES (?, ?, 'IN', ?, ?, ?)`;
    const paths = ['/', '/products', '/quote', '/gallery', '/services', '/contact', '/blog'];
    for (let d = 29; d >= 0; d--) {
      const hits = 40 + Math.floor(rnd() * 90);
      for (let i = 0; i < hits; i++) {
        await conn.query(viewSql, [
          paths[Math.floor(rnd() * paths.length)],
          rnd() > 0.6 ? 'https://www.google.com/' : null,
          rnd() > 0.45 ? 'mobile' : 'desktop',
          `s${d}-${i}`,
          offsetDate(`-${d} days`),
        ]);
      }
    }

    await conn.commit();
    console.log('[drs] database seeded');
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
