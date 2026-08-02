import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { getSettings } from '@/lib/queries';
import { one, run } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { calculateQuote, DEFAULT_RATES, MATERIALS, type QuoteRates } from '@/lib/stl';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const schema = z.object({
  customerName: z.string().trim().min(2, 'Please give us your name.').max(120),
  customerEmail: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  customerPhone: z.string().trim().max(30).optional().or(z.literal('')),
  fileName: z.string().trim().max(255).nullable().optional(),
  stats: z.object({
    triangleCount: z.number().int().nonnegative(),
    volumeMm3: z.number().nonnegative(),
    surfaceAreaMm2: z.number().nonnegative(),
    bbox: z.object({
      x: z.number().nonnegative(),
      y: z.number().nonnegative(),
      z: z.number().nonnegative(),
    }),
    suspect: z.boolean(),
  }),
  materialId: z.string().trim(),
  layerHeightMm: z.number().positive().max(1),
  infillPercent: z.number().int().min(0).max(100),
  quantity: z.number().int().min(1).max(500),
  needsSupport: z.boolean(),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`quote:${ip}`, 10, 60 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'You have sent several quotes already. Please email us directly.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const input = parsed.data;

  if (!MATERIALS.some((m) => m.id === input.materialId)) {
    return NextResponse.json({ error: 'Unknown material.' }, { status: 400 });
  }

  // Recalculated server-side from the submitted geometry: the browser's figure
  // is for display, this one is what we store and act on.
  const settings = await getSettings();
  const num = (key: string, fallback: number) => {
    const value = Number(settings[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const rates: QuoteRates = {
    machinePerHour: num('quote_machine_rate_per_hour', DEFAULT_RATES.machinePerHour),
    labourPerHour: num('quote_labour_rate_per_hour', DEFAULT_RATES.labourPerHour),
    electricityPerKwh: num('quote_electricity_rate_per_kwh', DEFAULT_RATES.electricityPerKwh),
    printerWatts: num('quote_printer_watts', DEFAULT_RATES.printerWatts),
    profitMarginPercent: num('quote_profit_margin_percent', DEFAULT_RATES.profitMarginPercent),
    setupFee: num('quote_setup_fee', DEFAULT_RATES.setupFee),
    gstPercent: num('gst_percent', DEFAULT_RATES.gstPercent),
    freeDeliveryAbove: num('free_delivery_above', DEFAULT_RATES.freeDeliveryAbove),
    deliveryFee: DEFAULT_RATES.deliveryFee,
  };

  const quote = calculateQuote({
    stats: input.stats,
    materialId: input.materialId,
    layerHeightMm: input.layerHeightMm,
    infillPercent: input.infillPercent,
    quantity: input.quantity,
    needsSupport: input.needsSupport,
    rates,
  });

  // Sequential, human-readable reference.
  const last = await one<{ reference: string }>(
    `SELECT reference FROM quotes ORDER BY id DESC LIMIT 1`,
  );
  const nextNumber = last ? Number(last.reference.replace(/\D/g, '')) + 1 : 24900;
  const reference = `QT-${nextNumber}`;

  await run(
    `INSERT INTO quotes (
       reference, customer_name, customer_email, customer_phone, file_name,
       volume_cm3, bbox_x_mm, bbox_y_mm, bbox_z_mm, triangle_count, surface_area_cm2,
       material, technology, layer_height_mm, infill_percent, quantity, needs_support,
       weight_g, print_hours, material_cost, machine_cost, labour_cost,
       electricity_cost, support_cost, profit, gst, delivery, total, status
     ) VALUES (?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?, 'new')`,
    [
      reference,
      input.customerName,
      input.customerEmail,
      input.customerPhone || null,
      input.fileName ?? null,
      input.stats.volumeMm3 / 1000,
      input.stats.bbox.x,
      input.stats.bbox.y,
      input.stats.bbox.z,
      input.stats.triangleCount,
      input.stats.surfaceAreaMm2 / 100,
      quote.material.name,
      quote.material.technology,
      input.layerHeightMm,
      input.infillPercent,
      input.quantity,
      input.needsSupport ? 1 : 0,
      quote.weightG,
      quote.printHours,
      quote.materialCost,
      quote.machineCost,
      quote.labourCost,
      quote.electricityCost,
      quote.supportVolumeCm3,
      quote.profit,
      quote.gst,
      quote.delivery,
      quote.total,
    ],
  );

  await run(
    `INSERT INTO notifications (title, body, type, href)
     VALUES (?, ?, 'quote', '/admin/quotes')`,
    [
      `New quote ${reference}`,
      `${input.customerName} — ${quote.material.name}, ${input.quantity} pc, ₹${quote.total.toFixed(0)}`,
    ],
  );

  await sendMail({
    to: site.contact.email,
    subject: `New quote request ${reference} — ${input.customerName}`,
    text: [
      `File: ${input.fileName ?? 'not named'}`,
      `Material: ${quote.material.name} (${quote.material.technology})`,
      `Quantity: ${input.quantity}`,
      `Volume: ${(input.stats.volumeMm3 / 1000).toFixed(1)} cm³`,
      `Bounding box: ${input.stats.bbox.x.toFixed(0)} × ${input.stats.bbox.y.toFixed(0)} × ${input.stats.bbox.z.toFixed(0)} mm`,
      input.stats.suspect ? 'WARNING: mesh may not be watertight — verify by hand.' : '',
      '',
      `Estimated total: ₹${quote.total.toFixed(2)}`,
      '',
      `Contact: ${input.customerEmail} ${input.customerPhone ?? ''}`,
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return NextResponse.json({ ok: true, reference, total: quote.total });
}
