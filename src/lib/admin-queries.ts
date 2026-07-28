import 'server-only';

import { all, count, one } from '@/lib/db';

/* ============================================================
   Dashboard metrics
   ============================================================ */

export type DashboardStats = {
  ordersToday: number;
  ordersTodayDelta: number;
  revenueMonth: number;
  revenueMonthDelta: number;
  pendingOrders: number;
  completedOrders: number;
  productCount: number;
  newLeads: number;
  openQuotes: number;
  visitors30d: number;
  visitorsDelta: number;
};

/** Percentage change, guarding against a zero baseline. */
function delta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getDashboardStats(): DashboardStats {
  const ordersToday = count(
    `SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')`,
  );
  const ordersYesterday = count(
    `SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now', '-1 day')`,
  );

  const revenueMonth =
    one<{ v: number }>(
      `SELECT COALESCE(SUM(total), 0) AS v FROM orders
       WHERE status NOT IN ('cancelled', 'refunded')
         AND created_at >= datetime('now', '-30 days')`,
    )?.v ?? 0;

  const revenuePrevMonth =
    one<{ v: number }>(
      `SELECT COALESCE(SUM(total), 0) AS v FROM orders
       WHERE status NOT IN ('cancelled', 'refunded')
         AND created_at >= datetime('now', '-60 days')
         AND created_at < datetime('now', '-30 days')`,
    )?.v ?? 0;

  const visitors30d = count(
    `SELECT COUNT(DISTINCT session_id) AS c FROM page_views
     WHERE created_at >= datetime('now', '-30 days')`,
  );
  const visitorsPrev = count(
    `SELECT COUNT(DISTINCT session_id) AS c FROM page_views
     WHERE created_at >= datetime('now', '-60 days')
       AND created_at < datetime('now', '-30 days')`,
  );

  return {
    ordersToday,
    ordersTodayDelta: delta(ordersToday, ordersYesterday),
    revenueMonth,
    revenueMonthDelta: delta(revenueMonth, revenuePrevMonth),
    pendingOrders: count(
      `SELECT COUNT(*) AS c FROM orders WHERE status IN ('pending','confirmed','printing','post_processing')`,
    ),
    completedOrders: count(`SELECT COUNT(*) AS c FROM orders WHERE status = 'completed'`),
    productCount: count(`SELECT COUNT(*) AS c FROM products WHERE status = 'published'`),
    newLeads: count(`SELECT COUNT(*) AS c FROM leads WHERE status = 'new'`),
    openQuotes: count(`SELECT COUNT(*) AS c FROM quotes WHERE status IN ('new','reviewed','sent')`),
    visitors30d,
    visitorsDelta: delta(visitors30d, visitorsPrev),
  };
}

/** Revenue and order count per day for the last N days, zero-filled. */
export function getRevenueSeries(days = 30) {
  const rows = all<{ day: string; revenue: number; orders: number }>(
    `SELECT date(created_at) AS day,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total ELSE 0 END), 0) AS revenue,
            COUNT(*) AS orders
     FROM orders
     WHERE created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day`,
    [`-${days} days`],
  );

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series: Array<{ day: string; label: string; revenue: number; orders: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key);

    series.push({
      day: key,
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: row?.revenue ?? 0,
      orders: row?.orders ?? 0,
    });
  }
  return series;
}

export function getVisitorSeries(days = 30) {
  const rows = all<{ day: string; views: number; visitors: number }>(
    `SELECT date(created_at) AS day, COUNT(*) AS views, COUNT(DISTINCT session_id) AS visitors
     FROM page_views WHERE created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day`,
    [`-${days} days`],
  );

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const series: Array<{ label: string; views: number; visitors: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const row = byDay.get(date.toISOString().slice(0, 10));
    series.push({
      label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      views: row?.views ?? 0,
      visitors: row?.visitors ?? 0,
    });
  }
  return series;
}

export function getOrderStatusBreakdown() {
  return all<{ status: string; c: number; value: number }>(
    `SELECT status, COUNT(*) AS c, COALESCE(SUM(total), 0) AS value
     FROM orders GROUP BY status ORDER BY c DESC`,
  );
}

export function getTopProducts(limit = 6) {
  return all<{ name: string; units: number; revenue: number }>(
    `SELECT oi.product_name AS name,
            SUM(oi.quantity) AS units,
            SUM(oi.total) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('cancelled','refunded')
     GROUP BY oi.product_name
     ORDER BY revenue DESC LIMIT ?`,
    [limit],
  );
}

export function getCategoryBreakdown() {
  return all<{ name: string; c: number }>(
    `SELECT COALESCE(c.name, 'Uncategorised') AS name, COUNT(p.id) AS c
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'published'
     GROUP BY c.name ORDER BY c DESC`,
  );
}

export function getTrafficByPath(limit = 8) {
  return all<{ path: string; views: number }>(
    `SELECT path, COUNT(*) AS views FROM page_views
     WHERE created_at >= datetime('now', '-30 days')
     GROUP BY path ORDER BY views DESC LIMIT ?`,
    [limit],
  );
}

export function getDeviceBreakdown() {
  return all<{ device: string; c: number }>(
    `SELECT device, COUNT(*) AS c FROM page_views
     WHERE created_at >= datetime('now', '-30 days') AND device IS NOT NULL
     GROUP BY device`,
  );
}

/* ============================================================
   Feeds
   ============================================================ */

export function getRecentOrders(limit = 8) {
  return all<{
    id: number;
    order_number: string;
    customer_name: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>(
    `SELECT id, order_number, customer_name, total, status, payment_status, created_at
     FROM orders ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export function getActivityFeed(limit = 10) {
  return all<{
    id: number;
    actor_name: string | null;
    action: string;
    entity_type: string | null;
    detail: string | null;
    created_at: string;
  }>(
    `SELECT id, actor_name, action, entity_type, detail, created_at
     FROM activity_logs ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export function getNotifications(limit = 12) {
  return all<{
    id: number;
    title: string;
    body: string | null;
    type: string;
    href: string | null;
    is_read: number;
    created_at: string;
  }>(
    `SELECT id, title, body, type, href, is_read, created_at
     FROM notifications ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

export function getUnreadNotificationCount() {
  return count(`SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0`);
}

/* ============================================================
   Module listings
   ============================================================ */

export function listAdminProducts(search?: string, limit = 60) {
  return all<{
    id: number;
    name: string;
    slug: string;
    sku: string;
    price: number;
    discount_price: number | null;
    stock: number;
    status: string;
    visibility: string;
    category_name: string | null;
    is_featured: number;
    view_count: number;
    thumb: string | null;
    updated_at: string;
    approval_status: string;
    created_by_name: string | null;
    updated_by_name: string | null;
  }>(
    `SELECT p.id, p.name, p.slug, p.sku, p.price, p.discount_price, p.stock, p.status,
            p.visibility, p.is_featured, p.view_count, p.updated_at,
            p.approval_status, p.created_by_name, p.updated_by_name,
            c.name AS category_name,
            (SELECT url FROM product_images i WHERE i.product_id = p.id AND i.kind='gallery'
              ORDER BY i.sort_order LIMIT 1) AS thumb
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     ${search ? 'WHERE p.name LIKE ? OR p.sku LIKE ?' : ''}
     ORDER BY p.updated_at DESC LIMIT ?`,
    search ? [`%${search}%`, `%${search}%`, limit] : [limit],
  );
}

export function listAdminOrders(status?: string, limit = 80) {
  return all<{
    id: number;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
    item_count: number;
  }>(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
     FROM orders o ${status ? 'WHERE o.status = ?' : ''}
     ORDER BY o.created_at DESC LIMIT ?`,
    status ? [status, limit] : [limit],
  );
}

export function listAdminLeads(status?: string, limit = 80) {
  return all<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    subject: string | null;
    message: string | null;
    source: string;
    status: string;
    created_at: string;
  }>(
    `SELECT * FROM leads ${status ? 'WHERE status = ?' : ''}
     ORDER BY created_at DESC LIMIT ?`,
    status ? [status, limit] : [limit],
  );
}

export function listAdminQuotes(limit = 80) {
  return all<{
    id: number;
    reference: string;
    customer_name: string | null;
    customer_email: string | null;
    file_name: string | null;
    material: string | null;
    technology: string | null;
    quantity: number;
    volume_cm3: number | null;
    weight_g: number | null;
    print_hours: number | null;
    total: number | null;
    status: string;
    created_at: string;
  }>(`SELECT * FROM quotes ORDER BY created_at DESC LIMIT ?`, [limit]);
}

export function listAdminUsers() {
  return all<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    last_login_at: string | null;
    created_at: string;
  }>(`SELECT id, name, email, phone, role, status, last_login_at, created_at
      FROM users ORDER BY role, name`);
}

export function listAdminCategories() {
  return all<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    sort_order: number;
    is_active: number;
    product_count: number;
  }>(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c ORDER BY c.sort_order`,
  );
}

export function listAdminCoupons() {
  return all<{
    id: number;
    code: string;
    description: string | null;
    type: string;
    value: number;
    min_order: number;
    usage_limit: number | null;
    used_count: number;
    expires_at: string | null;
    is_active: number;
  }>(`SELECT * FROM coupons ORDER BY created_at DESC`);
}

export function listAdminReviews() {
  return all<{
    id: number;
    author_name: string;
    rating: number;
    title: string | null;
    body: string | null;
    is_approved: number;
    created_at: string;
    product_name: string | null;
  }>(
    `SELECT r.*, p.name AS product_name FROM reviews r
     LEFT JOIN products p ON p.id = r.product_id
     ORDER BY r.created_at DESC`,
  );
}
