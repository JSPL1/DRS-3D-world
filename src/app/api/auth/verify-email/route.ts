import { NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeOtp, devCode, issueOtp, OTP_TTL_MINUTES } from '@/lib/auth/otp';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import type { Role } from '@/lib/auth/roles';
import { createSession, logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

type PendingUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
  token_version: number;
};

async function findPending(email: string) {
  return one<PendingUser>(
    `SELECT id, name, email, role, status, token_version FROM users WHERE email = ?`,
    [email],
  );
}

/** Confirms the emailed code and signs the customer straight in. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`verify-email:${ip}`, 12, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  const parsed = verifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const user = await findPending(parsed.data.email);

  // Same message whether the address is unknown or the code is wrong, so this
  // endpoint can't be used to discover which addresses have accounts.
  const invalid = { error: 'That code is not valid or has expired.' };
  if (!user) return NextResponse.json(invalid, { status: 400 });

  if (user.status === 'suspended') {
    return NextResponse.json(
      { error: 'This account is not active. Please contact the studio.' },
      { status: 403 },
    );
  }

  const result = await consumeOtp(user.id, 'email_verify', parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await run(
    `UPDATE users SET status = 'active', email_verified_at = NOW(),
                      updated_at = NOW()
     WHERE id = ?`,
    [user.id],
  );

  // Any guest order already placed with this address belongs to the account
  // now — otherwise the customer's first order is invisible to them.
  const claimed = await run(
    `UPDATE orders SET user_id = ? WHERE user_id IS NULL AND LOWER(customer_email) = ?`,
    [user.id, user.email],
  );

  await createSession({ ...user, role: user.role }, true);
  await logActivity(user.id, user.name, 'verified email', 'user', user.id, `Verified from ${ip}`);

  return NextResponse.json({
    ok: true,
    redirectTo: '/account',
    ordersLinked: claimed.changes,
  });
}

/** Sends a fresh code — the "didn't get it?" button. */
export async function PUT(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`verify-email-resend:${ip}`, 4, 15 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'A code was sent recently. Please wait a few minutes before asking for another.' },
      { status: 429 },
    );
  }

  const parsed = resendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const user = await findPending(parsed.data.email);
  const code = user && user.status === 'pending' ? await issueOtp(user, 'email_verify') : null;

  // Unconditionally the same response: a verified address and an unknown one
  // must be indistinguishable from out here.
  return NextResponse.json({
    ok: true,
    message: 'If that account is waiting to be verified, a new code is on its way.',
    expiresInMinutes: OTP_TTL_MINUTES,
    ...(code ? devCode(code) : {}),
  });
}
