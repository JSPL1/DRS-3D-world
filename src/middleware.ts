import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt';
import { canAccessAdmin } from '@/lib/auth/roles';

/**
 * Edge gate. Cheap JWT check only — the authoritative re-validation against the
 * database happens in the server components behind these routes.
 */

const PROTECTED = [/^\/admin(\/|$)/, /^\/account(\/|$)/];
const AUTH_PAGES = [/^\/login$/, /^\/forgot-password$/, /^\/verify-otp$/, /^\/reset-password$/];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (PROTECTED.some((re) => re.test(pathname))) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/admin') && !canAccessAdmin(session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = '/account';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Already signed in? Skip the login screens.
  if (session && AUTH_PAGES.some((re) => re.test(pathname))) {
    const url = req.nextUrl.clone();
    url.pathname = canAccessAdmin(session.role) ? '/admin' : '/account';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/account/:path*',
    '/login',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
  ],
};
