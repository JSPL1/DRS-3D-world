import { randomBytes } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getSettings } from '@/lib/queries';

export const runtime = 'nodejs';

/**
 * Kicks off Google sign-in. Dormant until an admin pastes a real client ID
 * into Settings → Integrations — same "not configured" pattern as SMTP.
 */
export async function GET(req: Request) {
  const settings = await getSettings();
  const clientId = settings.oauth_google_client_id;

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/login?error=google_not_configured', req.url),
    );
  }

  const url = new URL(req.url);
  const next = url.searchParams.get('next');
  const state = randomBytes(16).toString('hex');

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authorizeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid email profile');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('prompt', 'select_account');

  const res = NextResponse.redirect(authorizeUrl);
  // Short-lived, httpOnly — read back in the callback to confirm the
  // redirect wasn't forged, and to carry the post-login destination.
  res.cookies.set('oauth_state', JSON.stringify({ state, next: next ?? '' }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}
