import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive().optional(),
  productId: z.number().int().positive('Choose a product.'),
  authorName: z.string().trim().min(2, 'A name is required.').max(120),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().max(2000).optional().or(z.literal('')),
  isApproved: z.boolean().default(false),
});

export async function POST(req: Request) {
  const { user, deny } = await guard('reviews.moderate');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const r = parsed.data;

  const product = await one<{ id: number }>(`SELECT id FROM products WHERE id = ?`, [r.productId]);
  if (!product) return NextResponse.json({ error: 'That product no longer exists.' }, { status: 404 });

  const result = await run(
    `INSERT INTO reviews (product_id, author_name, rating, title, body, is_approved)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [r.productId, r.authorName, r.rating, r.title || null, r.body || null, r.isApproved ? 1 : 0],
  );

  await logActivity(user.id, user.name, 'added review', 'review', Number(result.lastInsertRowid), r.authorName);
  revalidatePath('/products');
  revalidatePath('/admin/reviews');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('reviews.moderate');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing review id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const r = parsed.data;

  const product = await one<{ id: number }>(`SELECT id FROM products WHERE id = ?`, [r.productId]);
  if (!product) return NextResponse.json({ error: 'That product no longer exists.' }, { status: 404 });

  const result = await run(
    `UPDATE reviews SET product_id = ?, author_name = ?, rating = ?, title = ?, body = ?, is_approved = ?
     WHERE id = ?`,
    [r.productId, r.authorName, r.rating, r.title || null, r.body || null, r.isApproved ? 1 : 0, r.id],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
  }

  await logActivity(user.id, user.name, 'updated review', 'review', r.id, r.authorName);
  revalidatePath('/products');
  revalidatePath('/admin/reviews');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('reviews.moderate');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = await one<{ author_name: string }>(`SELECT author_name FROM reviews WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });

  await run(`DELETE FROM reviews WHERE id = ?`, [id]);
  await logActivity(user.id, user.name, 'deleted review', 'review', id, existing.author_name);
  revalidatePath('/products');
  revalidatePath('/admin/reviews');

  return NextResponse.json({ ok: true });
}
