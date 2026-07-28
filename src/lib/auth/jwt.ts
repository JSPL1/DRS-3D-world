import { jwtVerify, SignJWT } from 'jose';

import type { Role } from './roles';

/**
 * JWT signing/verification. Edge-safe (jose, Web Crypto) so middleware and
 * route handlers share exactly one implementation.
 */

export const SESSION_COOKIE = 'drs_session';

export type SessionPayload = {
  sub: string; // user id
  email: string;
  name: string;
  role: Role;
  /** Mirrors users.token_version — lets us invalidate every live token at once. */
  tv: number;
  /** Whether "remember me" was ticked, so we can apply the longer idle window. */
  rm: boolean;
};

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET must be set to at least 32 characters in production.',
      );
    }
    // Dev-only fallback so `npm run dev` works on a fresh clone with no .env.
    return new TextEncoder().encode('drs-3d-world-development-secret-key-change-me');
  }
  return new TextEncoder().encode(value);
}

export const SESSION_MINUTES = Number(process.env.SESSION_TIMEOUT_MINUTES ?? 60);
export const REMEMBER_DAYS = Number(process.env.REMEMBER_ME_DAYS ?? 30);

export async function signSession(payload: SessionPayload): Promise<string> {
  const maxAge = payload.rm ? REMEMBER_DAYS * 24 * 60 * 60 : SESSION_MINUTES * 60;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('drs-3d-world')
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'drs-3d-world' });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function cookieMaxAge(remember: boolean): number {
  return remember ? REMEMBER_DAYS * 24 * 60 * 60 : SESSION_MINUTES * 60;
}
