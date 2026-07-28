/**
 * Role and permission model.
 *
 * Deliberately dependency-free so both Edge middleware and Node route handlers
 * can import it.
 */

export const ROLES = ['admin', 'manager', 'sales', 'customer', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'dashboard.view',
  'products.view', 'products.edit', 'products.delete', 'products.approve',
  'orders.view', 'orders.edit',
  'categories.edit', 'brands.edit', 'coupons.edit', 'banners.edit',
  'blogs.edit', 'gallery.edit', 'videos.edit',
  'leads.view', 'leads.edit',
  'quotes.view', 'quotes.edit',
  'reviews.moderate', 'testimonials.edit', 'faq.edit',
  'users.view', 'users.edit',
  'analytics.view', 'seo.edit', 'settings.edit',
  'homepage.edit', 'notifications.view', 'activity.view',
  'backup.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS] as Permission[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,

  manager: [
    'dashboard.view',
    'products.view', 'products.edit', 'products.delete',
    'orders.view', 'orders.edit',
    'categories.edit', 'brands.edit', 'coupons.edit', 'banners.edit',
    'blogs.edit', 'gallery.edit', 'videos.edit',
    'leads.view', 'leads.edit',
    'quotes.view', 'quotes.edit',
    'reviews.moderate', 'testimonials.edit', 'faq.edit',
    'analytics.view', 'seo.edit',
    'homepage.edit', 'notifications.view', 'activity.view',
  ],

  sales: [
    'dashboard.view',
    // Sales may enter a product but not publish it: everything they create
    // waits for an administrator's approval before it reaches the site.
    'products.view', 'products.edit',
    'orders.view', 'orders.edit',
    'leads.view', 'leads.edit',
    'quotes.view', 'quotes.edit',
    'notifications.view',
  ],

  // Customers get the account area, never the admin panel.
  customer: [],

  viewer: [
    'dashboard.view',
    'products.view', 'orders.view', 'leads.view', 'quotes.view',
    'analytics.view', 'notifications.view', 'activity.view',
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  sales: 'Sales',
  customer: 'Customer',
  viewer: 'Viewer',
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Anyone with dashboard.view may open /admin. */
export function canAccessAdmin(role: Role | undefined): boolean {
  return can(role, 'dashboard.view');
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
