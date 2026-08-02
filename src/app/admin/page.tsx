import { LiveRefresh } from '@/components/admin/LiveRefresh';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

import { OrdersBarChart, RankedBarChart, RevenueChart, TrafficChart } from '@/components/admin/Charts';
import {
  Card, EmptyState, money, PageHeader, relativeTime, StatCard, StatusPill,
  Table, Td, Th,
} from '@/components/admin/Shell';
import {
  getActivityFeed, getCategoryBreakdown, getDashboardStats, getOrderStatusBreakdown,
  getRecentOrders, getRevenueSeries, getTopProducts, getTrafficByPath, getVisitorSeries,
} from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Dashboard' };

export default async function AdminDashboard() {
  const user = await requirePermission('dashboard.view');

  const stats = await getDashboardStats();
  const revenue = await getRevenueSeries(30);
  const visitors = await getVisitorSeries(30);
  const statusBreakdown = await getOrderStatusBreakdown();
  const topProducts = await getTopProducts(6);
  const categories = await getCategoryBreakdown();
  const traffic = await getTrafficByPath(7);
  const recentOrders = await getRecentOrders(7);
  const activity = await getActivityFeed(8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <LiveRefresh watch="orders" />

      <PageHeader
        title={`${greeting}, ${user.name.split(' ')[0]}`}
        subtitle="Here is what has happened across the studio."
      />

      {/* Headline numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders today"
          value={String(stats.ordersToday)}
          delta={stats.ordersTodayDelta}
          hint="vs yesterday"
          href="/admin/orders"
        />
        <StatCard
          label="Revenue · 30 days"
          value={money(stats.revenueMonth)}
          delta={stats.revenueMonthDelta}
          hint="vs previous 30"
          href="/admin/orders"
        />
        <StatCard
          label="Visitors · 30 days"
          value={stats.visitors30d.toLocaleString('en-IN')}
          delta={stats.visitorsDelta}
          hint="unique sessions"
          href="/admin/analytics"
        />
        <StatCard
          label="Open quotes"
          value={String(stats.openQuotes)}
          hint={`${stats.newLeads} new leads`}
          href="/admin/quotes"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending orders" value={String(stats.pendingOrders)} href="/admin/orders?status=pending" />
        <StatCard label="Completed orders" value={String(stats.completedOrders)} href="/admin/orders?status=completed" />
        <StatCard label="Published products" value={String(stats.productCount)} href="/admin/products" />
        <StatCard label="New leads" value={String(stats.newLeads)} href="/admin/leads?status=new" />
      </div>

      {/* Revenue + traffic */}
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue — last 30 days" className="xl:col-span-2">
          <div className="p-6 pt-5">
            <RevenueChart data={revenue} />
          </div>
        </Card>

        <Card title="Orders per day">
          <div className="p-6 pt-5">
            <OrdersBarChart data={revenue.map((d) => ({ label: d.label, orders: d.orders }))} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Traffic — last 30 days" className="xl:col-span-2">
          <div className="p-6 pt-5">
            <TrafficChart data={visitors} />
          </div>
        </Card>

        <Card title="Most visited pages">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={traffic.map((t) => ({ name: t.path, value: t.views }))}
              valueLabel="views"
              height={210}
            />
          </div>
        </Card>
      </div>

      {/* Breakdowns */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Top products by revenue">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={topProducts.map((p) => ({ name: p.name, value: p.revenue }))}
              valueLabel="rupees"
              format="money"
            />
          </div>
        </Card>

        <Card title="Orders by status">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={statusBreakdown.map((s) => ({
                name: s.status.replace(/_/g, ' '),
                value: s.c,
              }))}
              valueLabel="orders"
            />
          </div>
        </Card>

        <Card title="Products by category">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={categories.map((c) => ({ name: c.name, value: c.c }))}
              valueLabel="products"
            />
          </div>
        </Card>
      </div>

      {/* Feeds */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Recent orders"
          className="lg:col-span-2"
          action={
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-[12.5px] text-flame-500 hover:text-flame-400"
            >
              All orders <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" body="Orders placed through the site will appear here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Placed</Th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                    <Td className="font-mono text-[12.5px] text-white">{order.order_number}</Td>
                    <Td>{order.customer_name}</Td>
                    <Td><StatusPill status={order.status} /></Td>
                    <Td><StatusPill status={order.payment_status} /></Td>
                    <Td className="text-right font-mono tabular-nums text-white">{money(order.total)}</Td>
                    <Td className="text-right text-[12.5px] text-ink-500">{relativeTime(order.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Activity">
          <ul className="divide-y divide-white/[0.04]">
            {activity.map((entry) => (
              <li key={entry.id} className="px-6 py-3.5">
                <p className="text-[13px] text-ink-100">
                  <span className="font-medium text-white">{entry.actor_name ?? 'System'}</span>{' '}
                  {entry.action}
                </p>
                {entry.detail && (
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-500">{entry.detail}</p>
                )}
                <p className="mt-1 text-[11px] text-ink-500">{relativeTime(entry.created_at)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
