import { OrdersBarChart, RankedBarChart, RevenueChart, TrafficChart } from '@/components/admin/Charts';
import { Card, money, PageHeader, StatCard } from '@/components/admin/Shell';
import {
  getCategoryBreakdown, getDashboardStats, getDeviceBreakdown, getOrderStatusBreakdown,
  getRevenueSeries, getTopProducts, getTrafficByPath, getVisitorSeries,
} from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Analytics' };

export default async function AdminAnalyticsPage() {
  await requirePermission('analytics.view');

  const stats = await getDashboardStats();
  const revenue = await getRevenueSeries(30);
  const visitors = await getVisitorSeries(30);
  const statuses = await getOrderStatusBreakdown();
  const topProducts = await getTopProducts(8);
  const categories = await getCategoryBreakdown();
  const traffic = await getTrafficByPath(10);
  const devices = await getDeviceBreakdown();

  const totalOrders = statuses.reduce((s, r) => s + r.c, 0);
  const totalViews = visitors.reduce((s, d) => s + d.views, 0);
  const avgOrder = totalOrders > 0 ? stats.revenueMonth / Math.max(1, stats.completedOrders) : 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle="The last thirty days across the site and the studio." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(stats.revenueMonth)} delta={stats.revenueMonthDelta} hint="30 days" />
        <StatCard label="Page views" value={totalViews.toLocaleString('en-IN')} hint="30 days" />
        <StatCard label="Unique visitors" value={stats.visitors30d.toLocaleString('en-IN')} delta={stats.visitorsDelta} hint="30 days" />
        <StatCard label="Average order" value={money(avgOrder)} hint="completed orders" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card title="Revenue" className="xl:col-span-2">
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

      <div className="mt-4">
        <Card title="Traffic">
          <div className="p-6 pt-5">
            <TrafficChart data={visitors} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card title="Top products by revenue">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={topProducts.map((p) => ({ name: p.name, value: p.revenue }))}
              valueLabel="rupees"
              format="money"
              height={300}
            />
          </div>
        </Card>

        <Card title="Most visited pages">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={traffic.map((t) => ({ name: t.path, value: t.views }))}
              valueLabel="views"
              height={300}
            />
          </div>
        </Card>

        <Card title="Orders by status">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={statuses.map((s) => ({ name: s.status.replace(/_/g, ' '), value: s.c }))}
              valueLabel="orders"
              height={300}
            />
          </div>
        </Card>

        <Card title="Catalogue & devices">
          <div className="p-6 pt-5">
            <RankedBarChart
              data={categories.slice(0, 6).map((c) => ({ name: c.name, value: c.c }))}
              valueLabel="products"
              height={140}
            />
            <div className="mt-6 border-t border-white/5 pt-5">
              <RankedBarChart
                data={devices.map((d) => ({ name: d.device, value: d.c }))}
                valueLabel="views"
                height={80}
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
