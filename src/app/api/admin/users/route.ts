import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { ROLES } from '@/lib/auth/roles';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';
import { isMobileNumber, normalisePhone } from '@/lib/phone';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  role: z.enum(ROLES),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
});

/**
 * Admin-created accounts skip the email-verification step that self-registered
 * ones go through: an administrator vouching for the address is the same trust
 * signal the code would have proven, and making them wait on a code they
 * didn't request would just be friction for no reason.
 */
export async function POST(req: Request) {
  const { user, deny } = await guard('users.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { name, email, role, password } = parsed.data;

  let phone: string | null = null;
  if (parsed.data.phone) {
    if (!isMobileNumber(parsed.data.phone)) {
      return NextResponse.json({ error: 'Enter a 10-digit Indian mobile number, or leave it blank.' }, { status: 400 });
    }
    phone = normalisePhone(parsed.data.phone);
  }

  const existing = await one<{ id: number }>(`SELECT id FROM users WHERE email = ?`, [email]);
  if (existing) {
    return NextResponse.json({ error: 'An account already exists with that email.' }, { status: 409 });
  }
  if (phone) {
    const phoneTaken = await one<{ id: number }>(`SELECT id FROM users WHERE phone = ?`, [phone]);
    if (phoneTaken) {
      return NextResponse.json({ error: 'That mobile number is already in use.' }, { status: 409 });
    }
  }

  const { lastInsertRowid } = await run(
    `INSERT INTO users (name, email, phone, password_hash, role, status, email_verified_at)
     VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
    [name, email, phone, bcrypt.hashSync(password, 10), role],
  );
  const id = Number(lastInsertRowid);

  await logActivity(user.id, user.name, 'created user', 'user', id, `${name} <${email}> as ${role}`);

  return NextResponse.json({ ok: true, id });
}
