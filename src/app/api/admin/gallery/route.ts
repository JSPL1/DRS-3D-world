import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().max(160).optional().or(z.literal('')),
  caption: z.string().trim().max(300).optional().or(z.literal('')),
  url: z.string().trim().min(1, 'An image is required.').max(400),
  mediaType: z.enum(['image', 'video', '360', 'before_after', 'customer_photo']),
  category: z.string().trim().max(80).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  const { user, deny } = await guard('gallery.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const g = parsed.data;

  const result = await run(
    `INSERT INTO gallery_items (title, caption, url, thumb_url, media_type, category, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM gallery_items))`,
    [g.title || null, g.caption || null, g.url, g.url, g.mediaType, g.category || null, g.isActive ? 1 : 0],
  );

  await logActivity(user.id, user.name, 'added gallery item', 'gallery_item', Number(result.lastInsertRowid), g.title || g.url);
  revalidatePath('/gallery');
  revalidatePath('/admin/gallery');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('gallery.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing item id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const g = parsed.data;

  const result = await run(
    `UPDATE gallery_items SET title = ?, caption = ?, url = ?, thumb_url = ?, media_type = ?, category = ?, is_active = ?
     WHERE id = ?`,
    [g.title || null, g.caption || null, g.url, g.url, g.mediaType, g.category || null, g.isActive ? 1 : 0, g.id],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
  }

  await logActivity(user.id, user.name, 'updated gallery item', 'gallery_item', g.id, g.title || g.url);
  revalidatePath('/gallery');
  revalidatePath('/admin/gallery');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('gallery.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = await one<{ title: string | null }>(`SELECT title FROM gallery_items WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: 'Item not found.' }, { status: 404 });

  await run(`DELETE FROM gallery_items WHERE id = ?`, [id]);
  await logActivity(user.id, user.name, 'deleted gallery item', 'gallery_item', id, existing.title ?? `#${id}`);
  revalidatePath('/gallery');
  revalidatePath('/admin/gallery');

  return NextResponse.json({ ok: true });
}
