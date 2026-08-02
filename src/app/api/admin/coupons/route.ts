import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive().optional(),
  code: z.string().trim().min(2, 'A code is required.').max(40)
    .transform((v) => v.toUpperCase().replace(/\s+/g, '')),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  type: z.enum(['percent', 'fixed']),
  value: z.number().positive('Must be more than zero.'),
  minOrder: z.number().min(0).default(0),
  maxDiscount: z.number().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  startsAt: z.string().trim().optional().or(z.literal('')),
  expiresAt: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  const { user, deny } = await guard('coupons.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const c = parsed.data;

  if (c.type === 'percent' && c.value > 100) {
    return NextResponse.json({ error: 'A percentage discount cannot exceed 100.' }, { status: 400 });
  }

  const existing = await one<{ id: number }>(`SELECT id FROM coupons WHERE code = ?`, [c.code]);
  if (existing) {
    return NextResponse.json({ error: `Code ${c.code} already exists.` }, { status: 409 });
  }

  const result = await run(
    `INSERT INTO coupons (code, description, type, value, min_order, max_discount, usage_limit, starts_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.code, c.description || null, c.type, c.value, c.minOrder,
      c.maxDiscount || null, c.usageLimit || null, c.startsAt || null, c.expiresAt || null,
      c.isActive ? 1 : 0,
    ],
  );

  await logActivity(user.id, user.name, 'created coupon', 'coupon', Number(result.lastInsertRowid), c.code);
  revalidatePath('/admin/coupons');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('coupons.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing coupon id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const c = parsed.data;

  if (c.type === 'percent' && c.value > 100) {
    return NextResponse.json({ error: 'A percentage discount cannot exceed 100.' }, { status: 400 });
  }

  const codeTaken = await one<{ id: number }>(`SELECT id FROM coupons WHERE code = ? AND id != ?`, [c.code, c.id]);
  if (codeTaken) {
    return NextResponse.json({ error: `Code ${c.code} is already used by another coupon.` }, { status: 409 });
  }

  const result = await run(
    `UPDATE coupons
     SET code = ?, description = ?, type = ?, value = ?, min_order = ?, max_discount = ?,
         usage_limit = ?, starts_at = ?, expires_at = ?, is_active = ?
     WHERE id = ?`,
    [
      c.code, c.description || null, c.type, c.value, c.minOrder,
      c.maxDiscount || null, c.usageLimit || null, c.startsAt || null, c.expiresAt || null,
      c.isActive ? 1 : 0, c.id,
    ],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });
  }

  await logActivity(user.id, user.name, 'updated coupon', 'coupon', c.id, c.code);
  revalidatePath('/admin/coupons');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('coupons.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = await one<{ code: string }>(`SELECT code FROM coupons WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });

  await run(`DELETE FROM coupons WHERE id = ?`, [id]);
  await logActivity(user.id, user.name, 'deleted coupon', 'coupon', id, existing.code);
  revalidatePath('/admin/coupons');

  return NextResponse.json({ ok: true });
}
