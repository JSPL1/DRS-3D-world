import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { issueOtp, devCode, OTP_TTL_MINUTES } from '@/lib/auth/otp';
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/auth/rate-limit';
import { one, run } from '@/lib/db';
import { isMailConfigured } from '@/lib/mailer';
import { isMobileNumber, normalisePhone } from '@/lib/phone';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().min(1, 'Enter your mobile number.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(200, 'That password is too long.'),
});

/**
 * Customer self-registration.
 *
 * The account is created immediately but sits at `status = 'pending'` until
 * the emailed code is entered — an unverified row can't sign in, so an address
 * the registrant doesn't own is worth nothing to them.
 */
export async function POST(req: Request) {
  sweepRateLimits();

  const ip = clientIp(req.headers);
  const limit = rateLimit(`register:${ip}`, 5, 30 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many sign-up attempts. Please try again later.' },
      { status: 429 },
    );
  }

  // Registration cannot complete without the emailed code, so a site with no
  // mail configured must say so rather than create an account that can never
  // be verified and report "check your inbox".
  if (!isMailConfigured()) {
    return NextResponse.json(
      {
        error: `Email is not set up on this site yet, so we cannot send you a code. Please contact the studio on ${site.contact.phone}.`,
      },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  if (!isMobileNumber(parsed.data.phone)) {
    return NextResponse.json(
      { error: 'Enter a 10-digit Indian mobile number.' },
      { status: 400 },
    );
  }
  const phone = normalisePhone(parsed.data.phone)!;

  const existing = one<{ id: number; email: string; name: string; status: string }>(
    `SELECT id, email, name, status FROM users WHERE email = ? OR phone = ?`,
    [email, phone],
  );

  if (existing) {
    // A half-finished sign-up shouldn't lock the address out forever: if the
    // account never got verified, re-send the code and let them carry on.
    if (existing.status === 'pending') {
      const code = await issueOtp(existing, 'email_verify');
      return NextResponse.json({
        ok: true,
        email: existing.email,
        message: 'That address is already waiting to be verified. A new code is on its way.',
        expiresInMinutes: OTP_TTL_MINUTES,
        ...devCode(code),
      });
    }

    return NextResponse.json(
      { error: 'An account already exists with those details. Sign in instead.', existingAccount: true },
      { status: 409 },
    );
  }

  const id = Number(
    run(
      `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'customer', 'pending')`,
      [name, email, phone, bcrypt.hashSync(password, 10)],
    ).lastInsertRowid,
  );

  const code = await issueOtp({ id, email, name }, 'email_verify');

  return NextResponse.json({
    ok: true,
    email,
    message: 'Account created. Enter the code we emailed you to finish.',
    expiresInMinutes: OTP_TTL_MINUTES,
    ...devCode(code),
  });
}
