import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit, sweepRateLimits } from '@/lib/auth/rate-limit';
import type { Role } from '@/lib/auth/roles';
import { canAccessAdmin } from '@/lib/auth/roles';
import { createSession, logActivity } from '@/lib/auth/session';
import { devCode, issueOtp, OTP_TTL_MINUTES } from '@/lib/auth/otp';
import { one } from '@/lib/db';
import { looksLikePhone, normalisePhone } from '@/lib/phone';

export const runtime = 'nodejs';

const schema = z.object({
  // One field, two kinds of value. Customers reliably remember one of their
  // email address and their mobile number, rarely which one they signed up
  // with, so the form asks for "email or mobile" and this sorts it out.
  identifier: z.string().trim().min(1, 'Enter your email address or mobile number.').max(160),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  sweepRateLimits();

  const ip = clientIp(req.headers);
  const limit = rateLimit(`login:${ip}`, 8, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  const { identifier, password, remember } = parsed.data;

  // Look up by whichever the customer typed. The phone side goes through
  // `normalisePhone` so `+91 98610 00001` finds the row stored as
  // `9861000001`.
  const byPhone = looksLikePhone(identifier);
  const key = byPhone ? normalisePhone(identifier) : identifier.toLowerCase();

  const user = key
    ? await one<{
        id: number;
        name: string;
        email: string;
        role: Role;
        status: string;
        password_hash: string;
        token_version: number;
      }>(
        `SELECT id, name, email, role, status, password_hash, token_version
         FROM users WHERE ${byPhone ? 'phone' : 'email'} = ?`,
        [key],
      )
    : undefined;

  // Same message and comparable timing whether the account exists or not, so
  // this endpoint can't be used to enumerate registered emails.
  const hash = user?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const passwordOk = bcrypt.compareSync(password, hash);

  if (!user || !passwordOk) {
    return NextResponse.json(
      { error: 'Those details do not match an account.' },
      { status: 401 },
    );
  }

  // A registration that was never confirmed. The password was right, so this
  // is the account's owner — send them a fresh code rather than a dead end.
  if (user.status === 'pending') {
    const code = await issueOtp(user, 'email_verify');
    return NextResponse.json(
      {
        error: 'Your email address has not been verified yet. We have sent you a new code.',
        needsVerification: true,
        email: user.email,
        expiresInMinutes: OTP_TTL_MINUTES,
        ...devCode(code),
      },
      { status: 403 },
    );
  }

  if (user.status !== 'active') {
    return NextResponse.json(
      { error: 'This account is not active. Please contact the administrator.' },
      { status: 403 },
    );
  }

  await createSession(user, remember);
  await logActivity(user.id, user.name, 'logged in', 'user', user.id, `Signed in from ${ip}`);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    redirectTo: canAccessAdmin(user.role) ? '/admin' : '/account',
  });
}
