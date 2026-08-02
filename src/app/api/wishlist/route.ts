import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentUser } from '@/lib/auth/session';
import { all, one, run } from '@/lib/db';

export const runtime = 'nodejs';

/** Every product id the signed-in customer has hearted. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ productIds: [] });

  const rows = await all<{ product_id: number }>(
    `SELECT product_id FROM wishlists WHERE user_id = ?`,
    [user.id],
  );
  return NextResponse.json({ productIds: rows.map((r) => r.product_id) });
}

const schema = z.object({ productId: z.number().int().positive() });

/**
 * Toggles the heart on one product. Idempotent by design — the unique index
 * on (user_id, product_id) is the actual source of truth for "is this
 * already wishlisted", not client state, so two rapid clicks from two tabs
 * can't desync into a duplicate row or a stuck heart.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to save items to your wishlist.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
  }

  const { productId } = parsed.data;

  const product = await one<{ id: number }>(`SELECT id FROM products WHERE id = ?`, [productId]);
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const existing = await one<{ id: number }>(
    `SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?`,
    [user.id, productId],
  );

  if (existing) {
    await run(`DELETE FROM wishlists WHERE id = ?`, [existing.id]);
    return NextResponse.json({ ok: true, wishlisted: false });
  }

  await run(`INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)`, [user.id, productId]);
  return NextResponse.json({ ok: true, wishlisted: true });
}
