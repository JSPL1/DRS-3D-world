import 'server-only';

import { NextResponse } from 'next/server';

import { can, type Permission } from './roles';
import { getCurrentUser, type CurrentUser } from './session';

/**
 * Guard for admin API routes.
 *
 * Returns either the authenticated user or a ready-to-return response, so
 * handlers stay a single early-return line rather than repeating the
 * 401/403 shapes.
 */
export async function guard(
  permission: Permission,
): Promise<{ user: CurrentUser; deny?: never } | { user?: never; deny: NextResponse }> {
  const user = await getCurrentUser();

  if (!user) {
    return { deny: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) };
  }
  if (!can(user.role, permission)) {
    return {
      deny: NextResponse.json(
        { error: 'Your role does not allow this action.' },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
