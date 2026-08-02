import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { one, run } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';

export const runtime = 'nodejs';

const OTP_TTL_MINUTES = 10;

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`forgot:${ip}`, 5, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await one<{ id: number; email: string; name: string }>(
    `SELECT id, email, name FROM users WHERE email = ?`,
    [email],
  );

  // Generated regardless so the response shape and timing don't reveal whether
  // the address is registered.
  const code = String(Math.floor(100000 + Math.random() * 900000));

  if (user) {
    // One live code per user: retire anything outstanding first.
    await run(
      `UPDATE otp_codes SET consumed_at = NOW()
       WHERE user_id = ? AND purpose = 'password_reset' AND consumed_at IS NULL`,
      [user.id],
    );
    await run(
      `INSERT INTO otp_codes (user_id, code_hash, purpose, expires_at)
       VALUES (?, ?, 'password_reset', DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [user.id, bcrypt.hashSync(code, 10), OTP_TTL_MINUTES],
    );
    await sendOtpEmail(user.email, code, OTP_TTL_MINUTES, {
      purpose: 'reset',
      name: user.name,
    });
  }

  return NextResponse.json({
    ok: true,
    message: 'If that address is registered, a verification code is on its way.',
    expiresInMinutes: OTP_TTL_MINUTES,
    // Development convenience only — never present in a production build.
    ...(process.env.NODE_ENV !== 'production' && user ? { devCode: code } : {}),
  });
}
