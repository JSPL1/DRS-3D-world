import { NextResponse } from 'next/server';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { ROLES } from '@/lib/auth/roles';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const patchSchema = z.object({ role: z.enum(ROLES) });

/** Changing a role, so any session already issued re-checks against the new one immediately. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await guard('users.edit');
  if (deny) return deny;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid user.' }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  const target = await one<{ id: number; name: string; role: string }>(
    `SELECT id, name, role FROM users WHERE id = ?`,
    [id],
  );
  if (!target) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }

  // A studio with zero administrators is locked out of its own panel with no
  // way back in — the same guard already applied to suspending an admin.
  if (target.role === 'admin' && parsed.data.role !== 'admin') {
    const otherAdmins = await one<{ c: number }>(
      `SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND id != ?`,
      [id],
    );
    if (!otherAdmins || otherAdmins.c === 0) {
      return NextResponse.json({ error: 'This is the last administrator — promote someone else first.' }, { status: 400 });
    }
  }

  await run(`UPDATE users SET role = ?, token_version = token_version + 1 WHERE id = ?`, [parsed.data.role, id]);

  await logActivity(user.id, user.name, 'changed role', 'user', id, `${target.name}: ${target.role} → ${parsed.data.role}`);

  return NextResponse.json({ ok: true });
}

/**
 * Orders and quotes keep the customer's name/email on the row itself and only
 * set `user_id` to null (see schema: `ON DELETE SET NULL`), so deleting an
 * account doesn't erase the studio's order history — it just detaches it from
 * a login that no longer exists.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, deny } = await guard('users.edit');
  if (deny) return deny;

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid user.' }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const target = await one<{ id: number; name: string; email: string; role: string }>(
    `SELECT id, name, email, role FROM users WHERE id = ?`,
    [id],
  );
  if (!target) {
    return NextResponse.json({ error: 'That account no longer exists.' }, { status: 404 });
  }

  if (target.role === 'admin') {
    const otherAdmins = await one<{ c: number }>(
      `SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND id != ?`,
      [id],
    );
    if (!otherAdmins || otherAdmins.c === 0) {
      return NextResponse.json({ error: 'This is the last administrator and cannot be deleted.' }, { status: 400 });
    }
  }

  await run(`DELETE FROM users WHERE id = ?`, [id]);

  await logActivity(user.id, user.name, 'deleted user', 'user', id, `${target.name} <${target.email}>`);

  return NextResponse.json({ ok: true });
}
