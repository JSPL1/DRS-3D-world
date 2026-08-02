import { randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { canAccessAdmin } from '@/lib/auth/roles';
import { createSession, logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';
import { getSettings } from '@/lib/queries';

export const runtime = 'nodejs';

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const failTo = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, url));

  const settings = await getSettings();
  const clientId = settings.oauth_google_client_id;
  const clientSecret = settings.oauth_google_client_secret;
  if (!clientId || !clientSecret) return failTo('google_not_configured');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return failTo('google_failed');

  const stateCookie = req.headers
    .get('cookie')
    ?.split('; ')
    .find((c) => c.startsWith('oauth_state='))
    ?.slice('oauth_state='.length);

  let expectedState = '';
  let next = '';
  try {
    const parsed = JSON.parse(decodeURIComponent(stateCookie ?? '{}'));
    expectedState = parsed.state ?? '';
    next = parsed.next ?? '';
  } catch {
    // Missing or corrupt cookie — treated as a state mismatch below.
  }
  if (!expectedState || expectedState !== state) return failTo('google_state_mismatch');

  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return failTo('google_failed');
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return failTo('google_failed');

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return failTo('google_failed');
  const info = (await infoRes.json()) as GoogleUserInfo;
  if (!info.email) return failTo('google_failed');

  // Link by Google id first (repeat sign-in), then fall back to a matching
  // email (first time via Google, but the account already exists from a
  // normal sign-up) — never create a second account for the same address.
  let user = await one<{
    id: number; name: string; email: string; role: string; status: string; token_version: number;
  }>(`SELECT id, name, email, role, status, token_version FROM users WHERE oauth_google_id = ?`, [info.sub]);

  if (!user) {
    const existing = await one<{ id: number }>(`SELECT id FROM users WHERE email = ?`, [info.email.toLowerCase()]);
    if (existing) {
      await run(`UPDATE users SET oauth_google_id = ? WHERE id = ?`, [info.sub, existing.id]);
    } else {
      const randomPassword = bcrypt.hashSync(randomBytes(24).toString('hex'), 10);
      const result = await run(
        `INSERT INTO users (name, email, password_hash, role, status, oauth_google_id, email_verified_at)
         VALUES (?, ?, ?, 'customer', 'active', ?, NOW())`,
        [info.name || info.email, info.email.toLowerCase(), randomPassword, info.sub],
      );
      await run(`UPDATE users SET oauth_google_id = ? WHERE id = ?`, [info.sub, Number(result.lastInsertRowid)]);
    }
    user = await one<{
      id: number; name: string; email: string; role: string; status: string; token_version: number;
    }>(`SELECT id, name, email, role, status, token_version FROM users WHERE oauth_google_id = ?`, [info.sub]);
  }

  if (!user || user.status !== 'active') return failTo('google_account_inactive');

  await createSession(
    { id: user.id, name: user.name, email: user.email, role: user.role as never, token_version: user.token_version },
    true,
  );
  await logActivity(user.id, user.name, 'signed in with Google', 'user', user.id, 'OAuth sign-in');

  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const res = NextResponse.redirect(
    new URL(safeNext ?? (canAccessAdmin(user.role as never) ? '/admin' : '/account'), url),
  );
  res.cookies.delete('oauth_state');
  return res;
}
