import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  ticket: z.string().trim().min(32, 'This reset link is no longer valid.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .regex(/[a-z]/, 'Include a lower-case letter.')
    .regex(/[A-Z]/, 'Include an upper-case letter.')
    .regex(/[0-9]/, 'Include a number.'),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`reset:${ip}`, 10, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { ticket, password } = parsed.data;
  const tokenHash = createHash('sha256').update(ticket).digest('hex');

  const record = await one<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM reset_tickets
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash],
  );
  if (!record) {
    return NextResponse.json(
      { error: 'This reset link has expired. Please start again.' },
      { status: 400 },
    );
  }

  const user = await one<{ id: number; name: string }>(`SELECT id, name FROM users WHERE id = ?`, [
    record.user_id,
  ]);
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 400 });
  }

  // Bumping token_version signs out every existing session on this account —
  // the point of a password reset.
  await run(
    `UPDATE users
     SET password_hash = ?, token_version = token_version + 1, updated_at = NOW()
     WHERE id = ?`,
    [bcrypt.hashSync(password, 10), user.id],
  );
  await run(`UPDATE reset_tickets SET used_at = NOW() WHERE id = ?`, [record.id]);

  await logActivity(user.id, user.name, 'reset password', 'user', user.id, `Reset from ${ip}`);

  return NextResponse.json({ ok: true, message: 'Password updated. You can sign in now.' });
}
