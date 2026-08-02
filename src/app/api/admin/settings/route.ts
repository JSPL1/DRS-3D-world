import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  settings: z.record(z.string().max(80), z.string().max(4000)),
});

export async function PATCH(req: Request) {
  const { user, deny } = await guard('settings.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
  }

  const entries = Object.entries(parsed.data.settings);
  if (entries.length === 0) {
    return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });
  }

  // One transaction so a partial save can't leave pricing half-updated.
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of entries) {
      await conn.query(
        `INSERT INTO settings (\`key\`, value, updated_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
        [key, value],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  await logActivity(user.id, user.name, 'updated settings', 'settings', undefined, `${entries.length} keys`);

  // 'layout' scope: the theme and logo live in the root layout, so the whole
  // shell has to be rebuilt, not just the page body.
  revalidatePath('/', 'layout');
  revalidatePath('/quote');

  return NextResponse.json({ ok: true, saved: entries.length });
}
