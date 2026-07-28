import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { all, getDb, one, run } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * A product's gallery.
 *
 * Adding is append-only rather than a whole-list replace: photos arrive one
 * upload at a time, often several at once, and a replace would lose any that
 * landed while the browser was holding a stale copy of the list.
 */

const addSchema = z.object({
  productId: z.number().int().positive(),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(400),
        alt: z.string().trim().max(200).optional().or(z.literal('')),
      }),
    )
    .min(1)
    .max(20),
});

const orderSchema = z.object({
  productId: z.number().int().positive(),
  ids: z.array(z.number().int().positive()).max(200),
});

function productOr404(productId: number) {
  return one<{ id: number; name: string; slug: string }>(
    `SELECT id, name, slug FROM products WHERE id = ?`,
    [productId],
  );
}

function revalidateFor(slug: string) {
  revalidatePath('/products');
  revalidatePath(`/products/${slug}`);
}

/** Append newly uploaded photographs to the gallery. */
export async function POST(req: Request) {
  const { user, deny } = await guard('products.edit');
  if (deny) return deny;

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const product = productOr404(parsed.data.productId);
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const db = getDb();
  const last = one<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM product_images WHERE product_id = ? AND kind = 'gallery'`,
    [product.id],
  );
  let order = (last?.max ?? -1) + 1;

  const insert = db.prepare(
    `INSERT INTO product_images (product_id, url, alt, kind, sort_order)
     VALUES (?, ?, ?, 'gallery', ?)`,
  );

  db.transaction(() => {
    for (const image of parsed.data.images) {
      insert.run(product.id, image.url, image.alt?.trim() || product.name, order);
      order += 1;
    }
  })();

  logActivity(
    user.id, user.name, 'added product photos', 'product', product.id,
    `${parsed.data.images.length} photo(s) on ${product.name}`,
  );
  revalidateFor(product.slug);

  return NextResponse.json({ ok: true, added: parsed.data.images.length });
}

/** Reorder the gallery. The first photo is the one used on cards. */
export async function PATCH(req: Request) {
  const { deny } = await guard('products.edit');
  if (deny) return deny;

  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const product = productOr404(parsed.data.productId);
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  // Only ids that actually belong to this product are touched, so a crafted
  // request can't reorder someone else's gallery.
  const owned = new Set(
    all<{ id: number }>(
      `SELECT id FROM product_images WHERE product_id = ? AND kind = 'gallery'`,
      [product.id],
    ).map((r) => r.id),
  );

  const db = getDb();
  const update = db.prepare(`UPDATE product_images SET sort_order = ? WHERE id = ?`);
  db.transaction(() => {
    parsed.data.ids.filter((id) => owned.has(id)).forEach((id, index) => update.run(index, id));
  })();

  revalidateFor(product.slug);
  return NextResponse.json({ ok: true });
}

/** Remove one photograph. */
export async function DELETE(req: Request) {
  const { user, deny } = await guard('products.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid image id.' }, { status: 400 });
  }

  const image = one<{ product_id: number; url: string }>(
    `SELECT product_id, url FROM product_images WHERE id = ?`,
    [id],
  );
  if (!image) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });

  const product = productOr404(image.product_id);

  // The row goes; the file stays. It may be in use as a colour photograph or
  // referenced by an older order, and deleting it would break those silently.
  run(`DELETE FROM product_images WHERE id = ?`, [id]);

  logActivity(user.id, user.name, 'removed product photo', 'product', image.product_id, image.url);
  if (product) revalidateFor(product.slug);

  return NextResponse.json({ ok: true });
}
