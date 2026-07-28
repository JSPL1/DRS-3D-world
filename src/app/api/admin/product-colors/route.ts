import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { getDb, one } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  productId: z.number().int().positive(),
  colors: z
    .array(
      z.object({
        colorId: z.number().int().positive(),
        imageUrl: z.string().trim().max(400).nullable().optional(),
        priceDelta: z.number().min(-100000).max(100000).default(0),
        isDefault: z.boolean().default(false),
      }),
    )
    .max(40),
});

/** Replaces a product's colour set in one transaction. */
export async function PUT(req: Request) {
  const { user, deny } = await guard('products.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data.' }, { status: 400 });
  }

  const { productId, colors } = parsed.data;

  const product = one<{ slug: string; name: string }>(
    `SELECT slug, name FROM products WHERE id = ?`,
    [productId],
  );
  if (!product) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  // Exactly one default, so the product page always has a colour to open on.
  let defaulted = false;
  const rows = colors.map((c, index) => {
    const isDefault = !defaulted && (c.isDefault || index === colors.length - 1);
    if (isDefault) defaulted = true;
    return { ...c, isDefault, sortOrder: index };
  });
  if (rows.length > 0 && !rows.some((r) => r.isDefault)) rows[0].isDefault = true;

  const db = getDb();
  const clear = db.prepare(`DELETE FROM product_colors WHERE product_id = ?`);
  const insert = db.prepare(
    `INSERT INTO product_colors (product_id, color_id, image_url, price_delta, is_default, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    clear.run(productId);
    for (const row of rows) {
      insert.run(
        productId,
        row.colorId,
        row.imageUrl?.trim() || null,
        row.priceDelta,
        row.isDefault ? 1 : 0,
        row.sortOrder,
      );
    }
  })();

  logActivity(
    user.id, user.name, 'updated product colours', 'product', productId,
    `${rows.length} colour(s) on ${product.name}`,
  );

  revalidatePath(`/products/${product.slug}`);
  revalidatePath('/products');

  return NextResponse.json({ ok: true, count: rows.length });
}
