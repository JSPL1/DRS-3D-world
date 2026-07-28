import { NextResponse } from 'next/server';

import { destroySession, getCurrentUser, logActivity } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const user = await getCurrentUser();
  if (user) logActivity(user.id, user.name, 'logged out', 'user', user.id);
  await destroySession();
  return NextResponse.json({ ok: true });
}
