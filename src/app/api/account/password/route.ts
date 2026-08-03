import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import type { Role } from '@/lib/auth/roles';
import { createSession, getCurrentUser, logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(200, 'That password is too long.')
    .regex(/[a-z]/, 'Include a lower-case letter.')
    .regex(/[A-Z]/, 'Include an upper-case letter.')
    .regex(/[0-9]/, 'Include a number.'),
});

/**
 * Changing your own password.
 *
 * Everyone signed in can do this, administrators included — until now the
 * only routes to a new password were the emailed reset code, or asking an
 * administrator to set one, and an administrator had no way to change their
 * own at all.
 *
 * The current password is required. Without it, anyone who found an unlocked
 * browser could lock the real owner out of their own account.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  // Keyed on the account, not the connection: this is a guessing attack on one
  // password, and coming from a new IP each time should not buy more attempts.
  const ip = clientIp(req.headers);
  const limit = rateLimit(`change-password:${user.id}`, 10, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const row = await one<{
    id: number;
    name: string;
    email: string;
    role: Role;
    password_hash: string;
    token_version: number;
  }>(
    `SELECT id, name, email, role, password_hash, token_version FROM users WHERE id = ?`,
    [user.id],
  );
  if (!row) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }

  if (!bcrypt.compareSync(parsed.data.currentPassword, row.password_hash)) {
    return NextResponse.json({ error: 'That is not your current password.' }, { status: 400 });
  }

  if (bcrypt.compareSync(parsed.data.newPassword, row.password_hash)) {
    return NextResponse.json(
      { error: 'That is already your password. Choose a different one.' },
      { status: 400 },
    );
  }

  // Bumping token_version invalidates every session issued under the old
  // password — the point of changing it. That includes this browser, so a
  // fresh session is issued immediately afterwards: the person who just
  // proved they know both passwords should not be signed out for it.
  const tokenVersion = row.token_version + 1;
  await run(
    `UPDATE users
        SET password_hash = ?, token_version = ?, updated_at = NOW()
      WHERE id = ?`,
    [bcrypt.hashSync(parsed.data.newPassword, 10), tokenVersion, row.id],
  );

  await createSession(
    {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      token_version: tokenVersion,
    },
    true,
  );

  // Never the password itself, only that it changed and from where.
  await logActivity(row.id, row.name, 'changed their own password', 'user', row.id, `From ${ip}`);

  return NextResponse.json({
    ok: true,
    message: 'Password changed. Any other device you were signed in on has been signed out.',
  });
}
