import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters.').max(200, 'That password is too long.'),
});

/**
 * An administrator sets a new password directly — for a support call where
 * the customer is on the phone and locked out, this is faster than a reset
 * email and doesn't require the mailbox to be reachable.
 *
 * Bumps `token_version`, so every session issued under the old password stops
 * working immediately rather than staying valid until it expires — the same
 * behaviour a self-service password change already gets.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await guard('users.edit');
  if (deny) return deny;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid user.' }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const target = await one<{ id: number; name: string }>(`SELECT id, name FROM users WHERE id = ?`, [id]);
  if (!target) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }

  const hash = bcrypt.hashSync(parsed.data.password, 10);
  await run(`UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?`, [hash, id]);

  // Never log the password itself — only that it changed and who did it.
  await logActivity(user.id, user.name, 'set a new password for', 'user', id, target.name);

  return NextResponse.json({ ok: true });
}
