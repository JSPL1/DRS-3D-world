import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import type { Permission } from '@/lib/auth/roles';
import { logActivity } from '@/lib/auth/session';
import { run } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Single endpoint for the small status/flag toggles scattered across the admin.
 *
 * Table, column and value are all whitelisted here rather than taken from the
 * request, so this can never become a way to write to an arbitrary column.
 */

type Entity = {
  table: string;
  column: string;
  values: readonly string[] | 'boolean';
  permission: Permission;
  label: string;
  revalidate?: string[];
};

const ENTITIES: Record<string, Entity> = {
  order: {
    table: 'orders',
    column: 'status',
    values: ['pending', 'confirmed', 'printing', 'post_processing', 'shipped', 'completed', 'cancelled', 'refunded'],
    permission: 'orders.edit',
    label: 'order',
  },
  orderPayment: {
    table: 'orders',
    column: 'payment_status',
    values: ['unpaid', 'partial', 'paid', 'refunded'],
    permission: 'orders.edit',
    label: 'order payment',
  },
  lead: {
    table: 'leads',
    column: 'status',
    values: ['new', 'contacted', 'qualified', 'won', 'lost'],
    permission: 'leads.edit',
    label: 'lead',
  },
  quote: {
    table: 'quotes',
    column: 'status',
    values: ['new', 'reviewed', 'sent', 'accepted', 'rejected'],
    permission: 'quotes.edit',
    label: 'quote',
  },
  review: {
    table: 'reviews',
    column: 'is_approved',
    values: 'boolean',
    permission: 'reviews.moderate',
    label: 'review',
    revalidate: ['/products'],
  },
  testimonial: {
    table: 'testimonials',
    column: 'is_active',
    values: 'boolean',
    permission: 'testimonials.edit',
    label: 'testimonial',
    revalidate: ['/'],
  },
  faq: {
    table: 'faqs',
    column: 'is_active',
    values: 'boolean',
    permission: 'faq.edit',
    label: 'FAQ',
    revalidate: ['/faq'],
  },
  coupon: {
    table: 'coupons',
    column: 'is_active',
    values: 'boolean',
    permission: 'coupons.edit',
    label: 'coupon',
  },
  category: {
    table: 'categories',
    column: 'is_active',
    values: 'boolean',
    permission: 'categories.edit',
    label: 'category',
    revalidate: ['/products'],
  },
  gallery: {
    table: 'gallery_items',
    column: 'is_active',
    values: 'boolean',
    permission: 'gallery.edit',
    label: 'gallery item',
    revalidate: ['/gallery'],
  },
  video: {
    table: 'videos',
    column: 'is_active',
    values: 'boolean',
    permission: 'videos.edit',
    label: 'video',
    revalidate: ['/videos'],
  },
  banner: {
    table: 'banners',
    column: 'is_active',
    values: 'boolean',
    permission: 'banners.edit',
    label: 'banner',
    revalidate: ['/'],
  },
  homepageSection: {
    table: 'homepage_sections',
    column: 'is_enabled',
    values: 'boolean',
    permission: 'homepage.edit',
    label: 'homepage section',
    revalidate: ['/'],
  },
  notification: {
    table: 'notifications',
    column: 'is_read',
    values: 'boolean',
    permission: 'notifications.view',
    label: 'notification',
  },
  userStatus: {
    table: 'users',
    column: 'status',
    values: ['active', 'suspended', 'pending'],
    permission: 'users.edit',
    label: 'user',
  },
};

const schema = z.object({
  entity: z.string(),
  id: z.number().int().positive(),
  value: z.union([z.string(), z.boolean()]),
});

export async function PATCH(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const entity = ENTITIES[parsed.data.entity];
  if (!entity) {
    return NextResponse.json({ error: 'Unknown entity.' }, { status: 400 });
  }

  const { user, deny } = await guard(entity.permission);
  if (deny) return deny;

  let value: string | number;
  if (entity.values === 'boolean') {
    if (typeof parsed.data.value !== 'boolean') {
      return NextResponse.json({ error: 'Expected a true/false value.' }, { status: 400 });
    }
    value = parsed.data.value ? 1 : 0;
  } else {
    if (typeof parsed.data.value !== 'string' || !entity.values.includes(parsed.data.value)) {
      return NextResponse.json({ error: 'That value is not allowed here.' }, { status: 400 });
    }
    value = parsed.data.value;
  }

  // `table` and `column` come only from the whitelist above, never the request.
  const result = await run(
    `UPDATE ${entity.table} SET ${entity.column} = ? WHERE id = ?`,
    [value, parsed.data.id],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Nothing was updated — does that record exist?' }, { status: 404 });
  }

  await logActivity(
    user.id,
    user.name,
    `updated ${entity.label}`,
    entity.table,
    parsed.data.id,
    `${entity.column} → ${parsed.data.value}`,
  );

  entity.revalidate?.forEach((path) => revalidatePath(path));

  return NextResponse.json({ ok: true });
}
