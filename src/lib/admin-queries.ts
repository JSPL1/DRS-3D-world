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

export async function getDashboardStats(): Promise<DashboardStats> {
  const ordersToday = await count(
    `SELECT COUNT(*) AS c FROM orders WHERE DATE(created_at) = CURDATE()`,
  );
  const ordersYesterday = await count(
    `SELECT COUNT(*) AS c FROM orders WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`,
  );

  const revenueMonth =
    (await one<{ v: number }>(
      `SELECT COALESCE(SUM(total), 0) AS v FROM orders
       WHERE status NOT IN ('cancelled', 'refunded')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    ))?.v ?? 0;

  const revenuePrevMonth =
    (await one<{ v: number }>(
      `SELECT COALESCE(SUM(total), 0) AS v FROM orders
       WHERE status NOT IN ('cancelled', 'refunded')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
         AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    ))?.v ?? 0;

  const visitors30d = await count(
    `SELECT COUNT(DISTINCT session_id) AS c FROM page_views
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );
  const visitorsPrev = await count(
    `SELECT COUNT(DISTINCT session_id) AS c FROM page_views
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
       AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );

  return {
    ordersToday,
    ordersTodayDelta: delta(ordersToday, ordersYesterday),
    revenueMonth,
    revenueMonthDelta: delta(revenueMonth, revenuePrevMonth),
    pendingOrders: await count(
      `SELECT COUNT(*) AS c FROM orders WHERE status IN ('pending','confirmed','printing','post_processing')`,
    ),
    completedOrders: await count(`SELECT COUNT(*) AS c FROM orders WHERE status = 'completed'`),
    productCount: await count(`SELECT COUNT(*) AS c FROM products WHERE status = 'published'`),
    newLeads: await count(`SELECT COUNT(*) AS c FROM leads WHERE status = 'new'`),
    openQuotes: await count(`SELECT COUNT(*) AS c FROM quotes WHERE status IN ('new','reviewed','sent')`),
    visitors30d,
    visitorsDelta: delta(visitors30d, visitorsPrev),
  };
}

/** Revenue and order count per day for the last N days, zero-filled. */
export async function getRevenueSeries(days = 30) {
  const rows = await all<{ day: string; revenue: number; orders: number }>(
    `SELECT DATE(created_at) AS day,
            COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total ELSE 0 END), 0) AS revenue,
            COUNT(*) AS orders
     FROM orders
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY day ORDER BY day`,
    [days],
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

export async function getVisitorSeries(days = 30) {
  const rows = await all<{ day: string; views: number; visitors: number }>(
    `SELECT DATE(created_at) AS day, COUNT(*) AS views, COUNT(DISTINCT session_id) AS visitors
     FROM page_views WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     GROUP BY day ORDER BY day`,
    [days],
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

export async function getOrderStatusBreakdown() {
  return all<{ status: string; c: number; value: number }>(
    `SELECT status, COUNT(*) AS c, COALESCE(SUM(total), 0) AS value
     FROM orders GROUP BY status ORDER BY c DESC`,
  );
}

export async function getTopProducts(limit = 6) {
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

export async function getCategoryBreakdown() {
  return all<{ name: string; c: number }>(
    `SELECT COALESCE(c.name, 'Uncategorised') AS name, COUNT(p.id) AS c
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'published'
     GROUP BY c.name ORDER BY c DESC`,
  );
}

export async function getTrafficByPath(limit = 8) {
  return all<{ path: string; views: number }>(
    `SELECT path, COUNT(*) AS views FROM page_views
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY path ORDER BY views DESC LIMIT ?`,
    [limit],
  );
}

export async function getDeviceBreakdown() {
  return all<{ device: string; c: number }>(
    `SELECT device, COUNT(*) AS c FROM page_views
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND device IS NOT NULL
     GROUP BY device`,
  );
}

/* ============================================================
   Feeds
   ============================================================ */

export async function getRecentOrders(limit = 8) {
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

export async function getActivityFeed(limit = 10) {
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

export async function getNotifications(limit = 12) {
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

export async function getUnreadNotificationCount() {
  return count(`SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0`);
}

/* ============================================================
   Module listings
   ============================================================ */

export async function listAdminProducts(search?: string, limit = 60) {
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

export async function listAdminOrders(status?: string, limit = 80) {
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
    first_product_name: string | null;
  }>(
    `SELECT o.*,
            (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count,
            (SELECT i.product_name FROM order_items i WHERE i.order_id = o.id ORDER BY i.id LIMIT 1) AS first_product_name
     FROM orders o ${status ? 'WHERE o.status = ?' : ''}
     ORDER BY o.created_at DESC LIMIT ?`,
    status ? [status, limit] : [limit],
  );
}

/** Batched — one query for every order on the page, not one query per row. */
export async function listOrderItemsForOrders(orderIds: number[]) {
  if (orderIds.length === 0) return [];
  const placeholders = orderIds.map(() => '?').join(',');
  return all<{
    order_id: number;
    product_name: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    total: number;
    color_name: string | null;
    color_hex: string | null;
  }>(
    `SELECT order_id, product_name, sku, quantity, unit_price, total, color_name, color_hex
     FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`,
    orderIds,
  );
}

export async function listAdminLeads(status?: string, limit = 80) {
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

export async function listAdminQuotes(limit = 80) {
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

export type AdminUserFilters = {
  search?: string;
  role?: string;
  status?: string;
};

export async function listAdminUsers(filters: AdminUserFilters = {}) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  if (filters.role) {
    where.push('u.role = ?');
    params.push(filters.role);
  }
  if (filters.status) {
    where.push('u.status = ?');
    params.push(filters.status);
  }

  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return all<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    email_verified_at: string | null;
    last_login_at: string | null;
    created_at: string;
    order_count: number;
  }>(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.email_verified_at,
            u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
     FROM users u
     ${clause}
     ORDER BY u.role, u.name`,
    params,
  );
}

export async function listAdminCategories() {
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

export async function listAdminCoupons() {
  return all<{
    id: number;
    code: string;
    description: string | null;
    type: string;
    value: number;
    min_order: number;
    max_discount: number | null;
    usage_limit: number | null;
    used_count: number;
    starts_at: string | null;
    expires_at: string | null;
    is_active: number;
  }>(`SELECT * FROM coupons ORDER BY created_at DESC`);
}

export async function listAdminReviews() {
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
