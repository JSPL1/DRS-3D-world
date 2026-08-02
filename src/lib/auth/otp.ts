import 'server-only';

import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

import { one, run } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';

/**
 * One-time codes, issued and checked in one place.
 *
 * Password reset grew its own copy of this logic first; email verification
 * needs exactly the same rules, and two implementations of "how many guesses
 * does an attacker get" is one too many.
 */

export type OtpPurpose = 'password_reset' | 'email_verify' | 'login_2fa';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * `randomInt` rather than `Math.random`: this is the only thing standing
 * between an email address and an account, so it has to come from the CSPRNG.
 */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Issues a code, retires any outstanding one for the same purpose, and emails
 * it. Returns the plaintext code so development builds can surface it; never
 * return it to a client in production.
 */
export async function issueOtp(
  user: { id: number; email: string; name?: string | null },
  purpose: OtpPurpose,
): Promise<string> {
  const code = generateCode();

  // One live code per user per purpose, so an old email can't be replayed.
  await run(
    `UPDATE otp_codes SET consumed_at = NOW()
     WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL`,
    [user.id, purpose],
  );
  await run(
    `INSERT INTO otp_codes (user_id, code_hash, purpose, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, bcrypt.hashSync(code, 10), purpose, OTP_TTL_MINUTES],
  );

  // The email says "confirm your address" or "reset your password" depending
  // on why it was sent — a single generic wording leaves the reader guessing
  // which of the two they are in the middle of.
  await sendOtpEmail(user.email, code, OTP_TTL_MINUTES, {
    purpose: purpose === 'password_reset' ? 'reset' : 'verify',
    name: user.name ?? null,
  });
  return code;
}

export type OtpResult =
  | { ok: true }
  | { ok: false; error: string };

/** Consumes the code on success; counts the attempt on failure. */
export async function consumeOtp(userId: number, purpose: OtpPurpose, code: string): Promise<OtpResult> {
  const invalid = { ok: false as const, error: 'That code is not valid or has expired.' };

  const otp = await one<{ id: number; code_hash: string; attempts: number }>(
    `SELECT id, code_hash, attempts FROM otp_codes
     WHERE user_id = ? AND purpose = ?
       AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [userId, purpose],
  );
  if (!otp) return invalid;

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await run(`UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?`, [otp.id]);
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (!bcrypt.compareSync(code, otp.code_hash)) {
    await run(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`, [otp.id]);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return {
      ok: false,
      error: `That code is not correct. ${left} attempt${left === 1 ? '' : 's'} remaining.`,
    };
  }

  await run(`UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?`, [otp.id]);
  return { ok: true };
}

/** Development builds echo the code so the flow is testable without a mailbox. */
export function devCode(code: string) {
  return process.env.NODE_ENV !== 'production' ? { devCode: code } : {};
}
