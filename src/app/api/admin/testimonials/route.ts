import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive().optional(),
  authorName: z.string().trim().min(2, 'A name is required.').max(120),
  authorRole: z.string().trim().max(120).optional().or(z.literal('')),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  quote: z.string().trim().min(10, 'The quote is too short.').max(2000),
  rating: z.number().int().min(1).max(5),
  avatarUrl: z.string().trim().max(400).optional().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  /** Pull the avatar from a registered customer instead of uploading one. */
  linkedUserId: z.number().int().positive().nullable().optional(),
});

async function resolveAvatar(input: z.infer<typeof schema>): Promise<string | null> {
  if (input.linkedUserId) {
    const user = await one<{ avatar_url: string | null }>(
      `SELECT avatar_url FROM users WHERE id = ?`,
      [input.linkedUserId],
    );
    if (user?.avatar_url) return user.avatar_url;
  }
  return input.avatarUrl?.trim() || null;
}

export async function POST(req: Request) {
  const { user, deny } = await guard('testimonials.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const t = parsed.data;

  const result = await run(
    `INSERT INTO testimonials (author_name, author_role, company, avatar_url, quote, rating,
                               is_featured, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM testimonials))`,
    [
      t.authorName, t.authorRole || null, t.company || null, await resolveAvatar(t),
      t.quote, t.rating, t.isFeatured ? 1 : 0, t.isActive ? 1 : 0,
    ],
  );

  await logActivity(user.id, user.name, 'added testimonial', 'testimonial', Number(result.lastInsertRowid), t.authorName);
  revalidatePath('/');

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PATCH(req: Request) {
  const { user, deny } = await guard('testimonials.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json(
      { error: parsed.success ? 'Missing testimonial id.' : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const t = parsed.data;

  const result = await run(
    `UPDATE testimonials
     SET author_name = ?, author_role = ?, company = ?, avatar_url = ?, quote = ?,
         rating = ?, is_featured = ?, is_active = ?
     WHERE id = ?`,
    [
      t.authorName, t.authorRole || null, t.company || null, await resolveAvatar(t),
      t.quote, t.rating, t.isFeatured ? 1 : 0, t.isActive ? 1 : 0, t.id,
    ],
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 });
  }

  await logActivity(user.id, user.name, 'updated testimonial', 'testimonial', t.id, t.authorName);
  revalidatePath('/');

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, deny } = await guard('testimonials.edit');
  if (deny) return deny;

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const existing = await one<{ author_name: string }>(
    `SELECT author_name FROM testimonials WHERE id = ?`,
    [id],
  );
  if (!existing) return NextResponse.json({ error: 'Testimonial not found.' }, { status: 404 });

  await run(`DELETE FROM testimonials WHERE id = ?`, [id]);
  await logActivity(user.id, user.name, 'deleted testimonial', 'testimonial', id, existing.author_name);
  revalidatePath('/');

  return NextResponse.json({ ok: true });
}
