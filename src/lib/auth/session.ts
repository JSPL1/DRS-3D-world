import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { one, run } from '@/lib/db';
import { cookieMaxAge, SESSION_COOKIE, signSession, verifySession, type SessionPayload } from './jwt';
import { can, canAccessAdmin, type Permission, type Role } from './roles';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

/**
 * Reads the session cookie and re-checks it against the database, so a
 * suspended account or a password change takes effect immediately rather than
 * whenever the token happens to expire.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const row = one<{
    id: number;
    name: string;
    email: string;
    role: Role;
    status: string;
    token_version: number;
    avatar_url: string | null;
  }>(
    `SELECT id, name, email, role, status, token_version, avatar_url FROM users WHERE id = ?`,
    [Number(payload.sub)],
  );

  if (!row || row.status !== 'active' || row.token_version !== payload.tv) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url,
  };
}

export async function createSession(
  user: { id: number; name: string; email: string; role: Role; token_version: number },
  remember: boolean,
) {
  const payload: SessionPayload = {
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    tv: user.token_version,
    rm: remember,
  };

  const token = await signSession(payload);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: cookieMaxAge(remember),
  });

  run(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, [user.id]);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/* ---------- Guards for server components ---------- */

export async function requireUser(redirectTo = '/login'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (!canAccessAdmin(user.role)) redirect('/account');
  return user;
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireAdmin();
  if (!can(user.role, permission)) redirect('/admin?denied=1');
  return user;
}

export function logActivity(
  userId: number | null,
  actorName: string,
  action: string,
  entityType?: string,
  entityId?: number,
  detail?: string,
) {
  run(
    `INSERT INTO activity_logs (user_id, actor_name, action, entity_type, entity_id, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, actorName, action, entityType ?? null, entityId ?? null, detail ?? null],
  );
}
