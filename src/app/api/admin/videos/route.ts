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
  description: z.string().trim().max(400).optional().or(z.literal('')),
  youtubeUrl: z.string().trim().max(300).optional().or(z.literal('')),
  thumbUrl: z.string().trim().max(400).optional().or(z.literal('')),
  durationSec: z.number().int().min(0).nullable().optional(),
  category: z.string().trim().max(80).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export async function POST(req: Request) {
  const { user, deny } = await guard('videos.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const v = parsed.data;

  const result = await run(
    `INSERT INTO videos (title, description, youtube_url, thumb_url, duration_sec, category, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM videos))`,
    [v.title, v.description || null, v.youtubeUrl || null, v.thumbUrl || null, v.durationSec || null, v.category || null, v.isActive ? 1 : 0],
  );

  await logActivity(user.id, user.name, 'added video', 'video', Number(result.lastInsertRowid), v.title);
  revalidatePath('/videos');
  revalidatePath('/admin/videos');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('videos.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing video id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const v = parsed.data;

  const result = await run(
    `UPDATE videos SET title = ?, description = ?, youtube_url = ?, thumb_url = ?, duration_sec = ?, category = ?, is_active = ?
     WHERE id = ?`,
    [v.title, v.description || null, v.youtubeUrl || null, v.thumbUrl || null, v.durationSec || null, v.category || null, v.isActive ? 1 : 0, v.id],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Video not found.' }, { status: 404 });
  }

  await logActivity(user.id, user.name, 'updated video', 'video', v.id, v.title);
  revalidatePath('/videos');
  revalidatePath('/admin/videos');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('videos.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = await one<{ title: string }>(`SELECT title FROM videos WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: 'Video not found.' }, { status: 404 });

  await run(`DELETE FROM videos WHERE id = ?`, [id]);
  await logActivity(user.id, user.name, 'deleted video', 'video', id, existing.title);
  revalidatePath('/videos');
  revalidatePath('/admin/videos');

  return NextResponse.json({ ok: true });
}
