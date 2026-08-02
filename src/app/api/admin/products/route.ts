import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard, slugify } from '@/lib/auth/api-guard';
import { can } from '@/lib/auth/roles';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';
import { nextSku } from '@/lib/sku';

export const runtime = 'nodejs';

const productSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(200),
  categoryId: z.number().int().positive().nullable().optional(),
  brandId: z.number().int().positive().nullable().optional(),
  shortDescription: z.string().trim().max(500).optional().or(z.literal('')),
  description: z.string().trim().max(20000).optional().or(z.literal('')),
  features: z.array(z.string().trim().max(300)).max(30).optional(),
  specifications: z.array(z.object({ label: z.string().max(80), value: z.string().max(200) })).max(30).optional(),

  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().min(0),
  availability: z.enum(['in_stock', 'made_to_order', 'out_of_stock', 'preorder']),

  lengthMm: z.number().nonnegative().nullable().optional(),
  widthMm: z.number().nonnegative().nullable().optional(),
  heightMm: z.number().nonnegative().nullable().optional(),
  weightG: z.number().nonnegative().nullable().optional(),
  material: z.string().trim().max(120).optional().or(z.literal('')),
  printTechnology: z.string().trim().max(60).optional().or(z.literal('')),
  printTimeHours: z.number().nonnegative().nullable().optional(),
  layerHeightMm: z.number().nonnegative().nullable().optional(),
  infillPercent: z.number().int().min(0).max(100).nullable().optional(),
  color: z.string().trim().max(80).optional().or(z.literal('')),

  isFeatured: z.boolean(),
  isTrending: z.boolean(),
  isPopular: z.boolean(),
  isNewArrival: z.boolean(),
  isBestSeller: z.boolean(),
  visibility: z.enum(['public', 'private', 'hidden']),
  status: z.enum(['draft', 'published', 'archived']),

  youtubeUrl: z.string().trim().max(400).optional().or(z.literal('')),
  brochureUrl: z.string().trim().max(400).optional().or(z.literal('')),
  stlUrl: z.string().trim().max(400).optional().or(z.literal('')),

  seoTitle: z.string().trim().max(200).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(400).optional().or(z.literal('')),
  metaKeywords: z.string().trim().max(400).optional().or(z.literal('')),
});

/** Ensures the generated slug doesn't collide with another product. */
async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base || 'product';
  let n = 1;

  for (;;) {
    const clash = await one<{ id: number }>(`SELECT id FROM products WHERE slug = ?`, [slug]);
    if (!clash || clash.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

function toParams(data: z.infer<typeof productSchema>, slug: string, sku: string) {
  return {
    name: data.name,
    slug,
    sku,
    category_id: data.categoryId ?? null,
    brand_id: data.brandId ?? null,
    short_description: data.shortDescription || null,
    description: data.description || null,
    features: JSON.stringify(data.features ?? []),
    specifications: JSON.stringify(data.specifications ?? []),
    price: data.price,
    discount_price: data.discountPrice ?? null,
    stock: data.stock,
    availability: data.availability,
    length_mm: data.lengthMm ?? null,
    width_mm: data.widthMm ?? null,
    height_mm: data.heightMm ?? null,
    weight_g: data.weightG ?? null,
    material: data.material || null,
    print_technology: data.printTechnology || null,
    print_time_hours: data.printTimeHours ?? null,
    layer_height_mm: data.layerHeightMm ?? null,
    infill_percent: data.infillPercent ?? null,
    color: data.color || null,
    is_featured: data.isFeatured ? 1 : 0,
    is_trending: data.isTrending ? 1 : 0,
    is_popular: data.isPopular ? 1 : 0,
    is_new_arrival: data.isNewArrival ? 1 : 0,
    is_best_seller: data.isBestSeller ? 1 : 0,
    visibility: data.visibility,
    status: data.status,
    youtube_url: data.youtubeUrl || null,
    brochure_url: data.brochureUrl || null,
    stl_url: data.stlUrl || null,
    seo_title: data.seoTitle || null,
    seo_description: data.seoDescription || null,
    meta_keywords: data.metaKeywords || null,
  };
}

const COLUMNS = [
  'name', 'slug', 'sku', 'category_id', 'brand_id', 'short_description', 'description',
  'features', 'specifications', 'price', 'discount_price', 'stock', 'availability',
  'length_mm', 'width_mm', 'height_mm', 'weight_g', 'material', 'print_technology',
  'print_time_hours', 'layer_height_mm', 'infill_percent', 'color',
  'is_featured', 'is_trending', 'is_popular', 'is_new_arrival', 'is_best_seller',
  'visibility', 'status', 'youtube_url', 'brochure_url', 'stl_url',
  'seo_title', 'seo_description', 'meta_keywords',
] as const;

/**
 * Approval.
 *
 * Managers and sales staff enter products; an administrator signs them off.
 * Until then the row exists and is fully editable in the panel, but the
 * public site does not select it — see `approval_status` in lib/queries.
 * An administrator's own edits are approved as they are made, because
 * requiring them to approve themselves is theatre, not control.
 */
type Approval = {
  approval_status: 'approved' | 'pending';
  approved_by_name: string | null;
  approved_at: string | null;
};

function approvalFor(role: Parameters<typeof can>[0], userName: string): Approval {
  return can(role, 'products.approve')
    ? { approval_status: 'approved', approved_by_name: userName, approved_at: new Date().toISOString().slice(0, 19).replace('T', ' ') }
    : { approval_status: 'pending', approved_by_name: null, approved_at: null };
}

const APPROVAL_COLUMNS = ['approval_status', 'approved_by_name', 'approved_at'] as const;

function revalidateProduct(slug: string) {
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${slug}`);
}

export async function POST(req: Request) {
  const { user, deny } = await guard('products.edit');
  if (deny) return deny;

  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid product data.' },
      { status: 400 },
    );
  }

  const slug = await uniqueSlug(slugify(parsed.data.name));
  const sku = await nextSku();
  const approval = approvalFor(user.role, user.name);

  const insertColumns = [
    ...COLUMNS, ...APPROVAL_COLUMNS, 'created_by', 'created_by_name', 'updated_by_name',
  ];
  const params: Record<string, unknown> = {
    ...toParams(parsed.data, slug, sku),
    ...approval,
    created_by: user.id,
    created_by_name: user.name,
    updated_by_name: user.name,
  };

  const result = await run(
    `INSERT INTO products (${insertColumns.join(', ')})
     VALUES (${insertColumns.map(() => '?').join(', ')})`,
    insertColumns.map((c) => params[c]),
  );
  const id = Number(result.lastInsertRowid);

  await logActivity(user.id, user.name, 'created product', 'product', id, `${parsed.data.name} (${sku})`);

  // An administrator has to know there is something waiting for them.
  if (approval.approval_status === 'pending') {
    await run(
      `INSERT INTO notifications (title, body, type, href)
       VALUES (?, ?, 'warning', ?)`,
      [
        'Product awaiting approval',
        `${user.name} added “${parsed.data.name}”. It is not on the site until you approve it.`,
        `/admin/products/${id}`,
      ],
    );
  }

  revalidateProduct(slug);

  return NextResponse.json({
    ok: true,
    id,
    slug,
    sku,
    approvalStatus: approval.approval_status,
  });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('products.edit');
  if (deny) return deny;

  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing product id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const id = parsed.data.id;
  const current = await one<{ slug: string; sku: string; approval_status: string }>(
    `SELECT slug, sku, approval_status FROM products WHERE id = ?`,
    [id],
  );
  if (!current) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  // A product issued before codes were automatic keeps the code it was sold
  // under; only ones with no code at all are given one.
  const sku = current.sku?.trim() || (await nextSku());

  const slug = await uniqueSlug(slugify(parsed.data.name), id);

  // Editing an approved product sends it back for approval, unless the person
  // editing can approve. Otherwise sign-off would only ever cover the first
  // version of a product and the price could be changed afterwards unchecked.
  const approval = approvalFor(user.role, user.name);

  const updateColumns = [...COLUMNS, ...APPROVAL_COLUMNS, 'updated_by_name'];
  const params: Record<string, unknown> = {
    ...toParams(parsed.data, slug, sku),
    ...approval,
    updated_by_name: user.name,
  };

  await run(
    `UPDATE products SET ${updateColumns.map((c) => `${c} = ?`).join(', ')},
       updated_at = NOW()
     WHERE id = ?`,
    [...updateColumns.map((c) => params[c]), id],
  );

  await logActivity(user.id, user.name, 'updated product', 'product', id, parsed.data.name);

  if (approval.approval_status === 'pending' && current.approval_status !== 'pending') {
    await run(
      `INSERT INTO notifications (title, body, type, href)
       VALUES (?, ?, 'warning', ?)`,
      [
        'Product edit awaiting approval',
        `${user.name} changed “${parsed.data.name}”. The previous version is off the site until you approve it.`,
        `/admin/products/${id}`,
      ],
    );
  }

  revalidateProduct(slug);
  if (current.slug !== slug) revalidatePath(`/products/${current.slug}`);

  return NextResponse.json({ ok: true, id, slug, sku, approvalStatus: approval.approval_status });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('products.delete');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });
  }

  const product = await one<{ name: string; slug: string }>(
    `SELECT name, slug FROM products WHERE id = ?`,
    [id],
  );
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  await run(`DELETE FROM products WHERE id = ?`, [id]);

  await logActivity(user.id, user.name, 'deleted product', 'product', id, product.name);
  revalidateProduct(product.slug);

  return NextResponse.json({ ok: true });
}
