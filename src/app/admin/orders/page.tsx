import { LiveRefresh } from '@/components/admin/LiveRefresh';
import Link from 'next/link';

import { StatusSelect } from '@/components/admin/StatusSelect';
import {
  Card, EmptyState, money, PageHeader, shortDate, Table, Td, Th,
} from '@/components/admin/Shell';
import { listAdminOrders } from '@/lib/admin-queries';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Orders' };

const ORDER_STATUSES = [
  'pending', 'confirmed', 'printing', 'post_processing',
  'shipped', 'completed', 'cancelled', 'refunded',
] as const;

const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded'] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission('orders.view');
  const { status } = await searchParams;

  const validStatus = ORDER_STATUSES.includes(status as never) ? status : undefined;
  const orders = listAdminOrders(validStatus);
  const editable = can(user.role, 'orders.edit');

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
            !validStatus ? 'bg-flame-500/15 text-flame-400' : 'text-ink-400 hover:text-white',
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
              validStatus === s ? 'bg-flame-500/15 text-flame-400' : 'text-ink-400 hover:text-white',
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
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th className="text-right">Items</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Placed</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                  <Td className="font-mono text-[12.5px] text-white">{order.order_number}</Td>
                  <Td>
                    <span className="block font-medium text-white">{order.customer_name}</span>
                    <span className="block text-[12px] text-ink-500">{order.customer_email}</span>
                  </Td>
                  <Td className="text-right tabular-nums text-ink-300">{order.item_count}</Td>
                  <Td className="text-right font-mono tabular-nums text-white">{money(order.total)}</Td>
                  <Td>
                    {editable ? (
                      <StatusSelect entity="order" id={order.id} value={order.status} options={ORDER_STATUSES} />
                    ) : (
                      <span className="capitalize text-ink-300">{order.status.replace(/_/g, ' ')}</span>
                    )}
                  </Td>
                  <Td>
                    {editable ? (
                      <StatusSelect
                        entity="orderPayment"
                        id={order.id}
                        value={order.payment_status}
                        options={PAYMENT_STATUSES}
                      />
                    ) : (
                      <span className="capitalize text-ink-300">{order.payment_status}</span>
                    )}
                  </Td>
                  <Td className="text-right text-[12.5px] text-ink-500">{shortDate(order.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
