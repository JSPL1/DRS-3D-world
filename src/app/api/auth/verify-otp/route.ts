import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;
const TICKET_TTL_MINUTES = 15;

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`otp:${ip}`, 12, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const invalid = { error: 'That code is not valid or has expired.' };

  const user = one<{ id: number }>(`SELECT id FROM users WHERE email = ?`, [email]);
  if (!user) return NextResponse.json(invalid, { status: 400 });

  const otp = one<{ id: number; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM otp_codes
     WHERE user_id = ? AND purpose = 'password_reset'
       AND consumed_at IS NULL AND expires_at > datetime('now')
     ORDER BY id DESC LIMIT 1`,
    [user.id],
  );
  if (!otp) return NextResponse.json(invalid, { status: 400 });

  if (otp.attempts >= MAX_ATTEMPTS) {
    run(`UPDATE otp_codes SET consumed_at = datetime('now') WHERE id = ?`, [otp.id]);
    return NextResponse.json(
      { error: 'Too many incorrect attempts. Please request a new code.' },
      { status: 400 },
    );
  }

  if (!bcrypt.compareSync(code, otp.code_hash)) {
    run(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`, [otp.id]);
    return NextResponse.json(
      { error: `That code is not correct. ${MAX_ATTEMPTS - otp.attempts - 1} attempts remaining.` },
      { status: 400 },
    );
  }

  run(`UPDATE otp_codes SET consumed_at = datetime('now') WHERE id = ?`, [otp.id]);

  // Issue a single-use ticket; only the hash is stored, so a database read
  // alone can't be replayed against the reset endpoint.
  const ticket = randomBytes(32).toString('hex');
  run(
    `INSERT INTO reset_tickets (user_id, token_hash, expires_at)
     VALUES (?, ?, datetime('now', ?))`,
    [user.id, createHash('sha256').update(ticket).digest('hex'), `+${TICKET_TTL_MINUTES} minutes`],
  );

  return NextResponse.json({ ok: true, ticket, expiresInMinutes: TICKET_TTL_MINUTES });
}
