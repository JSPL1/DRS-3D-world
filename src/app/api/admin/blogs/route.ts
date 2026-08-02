import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard, slugify } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(3, 'A title is required.').max(200),
  excerpt: z.string().trim().max(400).optional().or(z.literal('')),
  content: z.string().trim().max(50000).optional().or(z.literal('')),
  coverUrl: z.string().trim().max(400).optional().or(z.literal('')),
  category: z.string().trim().max(80).optional().or(z.literal('')),
  readingMinutes: z.number().int().min(1).max(120).default(3),
  status: z.enum(['draft', 'published', 'archived']),
});

async function uniqueSlug(title: string, excludeId?: number): Promise<string> {
  const base = slugify(title) || 'post';
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await one<{ id: number }>(`SELECT id FROM blogs WHERE slug = ?`, [slug]);
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function POST(req: Request) {
  const { user, deny } = await guard('blogs.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const b = parsed.data;
  const slug = await uniqueSlug(b.title);

  const result = await run(
    `INSERT INTO blogs (title, slug, excerpt, content, cover_url, author_id, category, reading_minutes, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      b.title, slug, b.excerpt || null, b.content || null, b.coverUrl || null, user.id,
      b.category || null, b.readingMinutes, b.status,
      b.status === 'published' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    ],
  );

  await logActivity(user.id, user.name, 'created blog post', 'blog', Number(result.lastInsertRowid), b.title);
  revalidatePath('/blog');
  revalidatePath('/admin/blogs');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid), slug });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('blogs.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing post id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const existing = await one<{ slug: string; status: string; published_at: string | null }>(
    `SELECT slug, status, published_at FROM blogs WHERE id = ?`,
    [b.id],
  );
  if (!existing) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

  // Publishing for the first time stamps the date; re-editing a published
  // post doesn't bump it back to "just now".
  const publishedAt =
    b.status === 'published'
      ? (existing.published_at ?? new Date().toISOString().slice(0, 19).replace('T', ' '))
      : existing.status === 'published' ? existing.published_at : null;

  await run(
    `UPDATE blogs SET title = ?, excerpt = ?, content = ?, cover_url = ?, category = ?,
                      reading_minutes = ?, status = ?, published_at = ?, updated_at = NOW()
     WHERE id = ?`,
    [b.title, b.excerpt || null, b.content || null, b.coverUrl || null, b.category || null, b.readingMinutes, b.status, publishedAt, b.id],
  );

  await logActivity(user.id, user.name, 'updated blog post', 'blog', b.id, b.title);
  revalidatePath('/blog');
  revalidatePath(`/blog/${existing.slug}`);
  revalidatePath('/admin/blogs');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('blogs.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = await one<{ title: string; slug: string }>(`SELECT title, slug FROM blogs WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

  await run(`DELETE FROM blogs WHERE id = ?`, [id]);
  await logActivity(user.id, user.name, 'deleted blog post', 'blog', id, existing.title);
  revalidatePath('/blog');
  revalidatePath('/admin/blogs');

  return NextResponse.json({ ok: true });
}
