import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { one, run } from '@/lib/db';

export const runtime = 'nodejs';

const schema = z.object({
  id: z.number().int().positive(),
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional().or(z.literal('')),
});

/**
 * An administrator signing off — or sending back — a product entered by a
 * manager or a member of the sales team.
 *
 * Rejection does not delete anything. The row stays exactly as it was, with a
 * note explaining what to fix, so the person who entered it can correct and
 * resubmit rather than start again.
 */
export async function POST(req: Request) {
  const { user, deny } = await guard('products.approve');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { id, decision, note } = parsed.data;

  const product = one<{ name: string; slug: string; created_by: number | null }>(
    `SELECT name, slug, created_by FROM products WHERE id = ?`,
    [id],
  );
  if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  const approved = decision === 'approve';

  run(
    `UPDATE products
       SET approval_status = ?,
           approved_by_name = ?,
           approved_at = ?,
           review_note = ?,
           updated_at = datetime('now')
     WHERE id = ?`,
    [
      approved ? 'approved' : 'rejected',
      approved ? user.name : null,
      approved ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
      note?.trim() || null,
      id,
    ],
  );

  // Tell whoever entered it. Without this, "rejected" is a state only the
  // administrator can see and nothing ever gets corrected.
  if (product.created_by) {
    run(
      `INSERT INTO notifications (user_id, title, body, type, href) VALUES (?, ?, ?, ?, ?)`,
      [
        product.created_by,
        approved ? 'Your product is live' : 'Your product needs changes',
        approved
          ? `${user.name} approved “${product.name}”. It is on the site now.`
          : `${user.name} sent “${product.name}” back${note?.trim() ? `: ${note.trim()}` : '.'}`,
        approved ? 'success' : 'warning',
        `/admin/products/${id}`,
      ],
    );
  }

  logActivity(
    user.id, user.name,
    approved ? 'approved product' : 'rejected product',
    'product', id, product.name,
  );

  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath(`/products/${product.slug}`);

  return NextResponse.json({ ok: true, approvalStatus: approved ? 'approved' : 'rejected' });
}
