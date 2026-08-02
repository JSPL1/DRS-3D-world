import { NextResponse } from 'next/server';

import { guard } from '@/lib/auth/api-guard';
import { one } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A cheap "has anything changed?" endpoint for the admin panel.
 *
 * Two people share this panel — a manager adds a product, an administrator
 * approves it — and a screen that only tells the truth when someone presses
 * reload is a screen that shows the wrong thing most of the time.
 *
 * Polling rather than a socket: this deploys behind a caching proxy on shared
 * hosting where a long-lived connection is the first thing to be dropped, and
 * a single indexed aggregate every few seconds costs less than the connection
 * would. The response is a fingerprint, not the data — the client re-renders
 * through the server only when the fingerprint moves.
 */
const WATCHERS: Record<string, string> = {
  products: `SELECT CONCAT(COUNT(*), ':', COALESCE(MAX(updated_at), ''), ':',
                    COALESCE(SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END), 0)) AS rev
             FROM products`,
  orders: `SELECT CONCAT(COUNT(*), ':', COALESCE(MAX(created_at), '')) AS rev FROM orders`,
  quotes: `SELECT CONCAT(COUNT(*), ':', COALESCE(MAX(created_at), '')) AS rev FROM quotes`,
  leads: `SELECT CONCAT(COUNT(*), ':', COALESCE(MAX(created_at), '')) AS rev FROM leads`,
  notifications: `SELECT CONCAT(COUNT(*), ':', COALESCE(SUM(is_read), 0)) AS rev FROM notifications`,
};

export async function GET(req: Request) {
  const { deny } = await guard('dashboard.view');
  if (deny) return deny;

  const requested = new URL(req.url).searchParams.get('watch') ?? 'products';

  // Names are looked up in a fixed table, never interpolated: this parameter
  // comes from the URL and must not be able to reach the query text.
  const sql = WATCHERS[requested];
  if (!sql) {
    return NextResponse.json({ error: 'Unknown watch target.' }, { status: 400 });
  }

  const row = await one<{ rev: string }>(sql);

  return NextResponse.json(
    { revision: row?.rev ?? '' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
