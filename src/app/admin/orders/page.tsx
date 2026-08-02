import { LiveRefresh } from '@/components/admin/LiveRefresh';
import Link from 'next/link';

import { Card, EmptyState, money, PageHeader } from '@/components/admin/Shell';
import { OrderTable } from '@/components/admin/OrderTable';
import { listAdminOrders, listOrderItemsForOrders } from '@/lib/admin-queries';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';
import { cn } from '@/lib/cn';
import { all } from '@/lib/db';

export const metadata = { title: 'Orders' };

const ORDER_STATUSES = [
  'pending', 'confirmed', 'printing', 'post_processing',
  'shipped', 'completed', 'cancelled', 'refunded',
] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission('orders.view');
  const { status } = await searchParams;

  const validStatus = ORDER_STATUSES.includes(status as never) ? status : undefined;
  const orders = await listAdminOrders(validStatus);
  const editable = can(user.role, 'orders.edit');

  // Order-level extras (address, gift wrap, notes) shown in the expanded row —
  // not part of listAdminOrders' summary shape, fetched once for this page.
  const extraRows =
    orders.length > 0
      ? await all<{
          id: number;
          shipping_address: string | null;
          notes: string | null;
          gift_wrap: number;
          gift_note: string | null;
          shipping_method: string | null;
        }>(
          `SELECT id, shipping_address, notes, gift_wrap, gift_note, shipping_method
           FROM orders WHERE id IN (${orders.map(() => '?').join(',')})`,
          orders.map((o) => o.id),
        )
      : [];
  const extrasById = new Map(extraRows.map((e) => [e.id, e]));

  const ordersWithExtras = orders.map((o) => ({ ...o, ...extrasById.get(o.id) }));

  const items = await listOrderItemsForOrders(orders.map((o) => o.id));
  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const revenue = orders
    .filter((o) => !['cancelled', 'refunded'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <>
      <LiveRefresh watch="orders" />

      <PageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'} · ${money(revenue)} excluding cancellations`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={cn(
            'rounded-lg px-3.5 py-2 text-[12.5px] font-medium capitalize transition-colors',
            !validStatus ? 'bg-flame-500/15 text-flame-400' : 'text-ink-400 hover:text-ink-100',
          )}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={cn(
              'rounded-lg px-3.5 py-2 text-[12.5px] font-medium capitalize transition-colors',
              validStatus === s ? 'bg-flame-500/15 text-flame-400' : 'text-ink-400 hover:text-ink-100',
            )}
          >
            {s.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>

      <Card>
        {orders.length === 0 ? (
          <EmptyState
            title="No orders here"
            body={validStatus ? 'Nothing currently has that status.' : 'Orders will appear here as they come in.'}
          />
        ) : (
          <OrderTable orders={ordersWithExtras} itemsByOrder={itemsByOrder} editable={editable} />
        )}
      </Card>
    </>
  );
}
