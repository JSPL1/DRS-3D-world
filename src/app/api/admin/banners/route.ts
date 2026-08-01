import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(2, 'A title is required.').max(160),
  subtitle: z.string().trim().max(240).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(400).optional().or(z.literal('')),
  ctaLabel: z.string().trim().max(60).optional().or(z.literal('')),
  ctaHref: z.string().trim().max(300).optional().or(z.literal('')),
  placement: z.string().trim().min(1).max(60),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  const { user, deny } = await guard('banners.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const b = parsed.data;

  const result = run(
    `INSERT INTO banners (title, subtitle, image_url, cta_label, cta_href, placement, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM banners WHERE placement = ?))`,
    [b.title, b.subtitle || null, b.imageUrl || null, b.ctaLabel || null, b.ctaHref || null, b.placement, b.isActive ? 1 : 0, b.placement],
  );

  logActivity(user.id, user.name, 'created banner', 'banner', Number(result.lastInsertRowid), b.title);
  revalidatePath('/');
  revalidatePath('/admin/banners');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('banners.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing banner id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const result = run(
    `UPDATE banners SET title = ?, subtitle = ?, image_url = ?, cta_label = ?, cta_href = ?, placement = ?, is_active = ?
     WHERE id = ?`,
    [b.title, b.subtitle || null, b.imageUrl || null, b.ctaLabel || null, b.ctaHref || null, b.placement, b.isActive ? 1 : 0, b.id],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Banner not found.' }, { status: 404 });
  }

  logActivity(user.id, user.name, 'updated banner', 'banner', b.id, b.title);
  revalidatePath('/');
  revalidatePath('/admin/banners');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('banners.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = one<{ title: string }>(`SELECT title FROM banners WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: 'Banner not found.' }, { status: 404 });

  run(`DELETE FROM banners WHERE id = ?`, [id]);
  logActivity(user.id, user.name, 'deleted banner', 'banner', id, existing.title);
  revalidatePath('/');
  revalidatePath('/admin/banners');

  return NextResponse.json({ ok: true });
}
