import { NextResponse } from 'next/server';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

/** Invalidates every session token already issued to this account, without touching the password. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await guard('users.edit');
  if (deny) return deny;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid user.' }, { status: 400 });
  }

  const target = await one<{ id: number; name: string }>(`SELECT id, name FROM users WHERE id = ?`, [id]);
  if (!target) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }

  await run(`UPDATE users SET token_version = token_version + 1 WHERE id = ?`, [id]);

  await logActivity(user.id, user.name, 'signed out everywhere for', 'user', id, target.name);

  return NextResponse.json({ ok: true });
}
