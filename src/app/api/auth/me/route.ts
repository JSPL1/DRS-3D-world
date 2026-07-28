import { NextResponse } from 'next/server';

import { ROLE_PERMISSIONS } from '@/lib/auth/roles';
import { getCurrentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user,
    permissions: ROLE_PERMISSIONS[user.role],
  });
}
