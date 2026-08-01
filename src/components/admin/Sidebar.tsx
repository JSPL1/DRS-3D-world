'use client';

import {
  Activity, BadgePercent, Bell, Boxes, ChartPie, DatabaseBackup, FileText,
  Folder, HelpCircle, Home, Image as ImageIcon, LayoutTemplate, LogOut,
  Menu, MessageSquareQuote, Package, Search, Settings, ShoppingCart,
  Star, Tags, Users, Video, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { can, ROLE_LABELS, type Permission, type Role } from '@/lib/auth/roles';

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission: Permission };

const GROUPS: Array<{ title: string; items: Item[] }> = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: Home, permission: 'dashboard.view' },
      { href: '/admin/analytics', label: 'Analytics', icon: ChartPie, permission: 'analytics.view' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package, permission: 'products.view' },
      { href: '/admin/categories', label: 'Categories', icon: Folder, permission: 'categories.edit' },
      { href: '/admin/brands', label: 'Brands', icon: Tags, permission: 'brands.edit' },
      { href: '/admin/coupons', label: 'Coupons', icon: BadgePercent, permission: 'coupons.edit' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, permission: 'orders.view' },
      { href: '/admin/quotes', label: 'Quotes', icon: FileText, permission: 'quotes.view' },
      { href: '/admin/leads', label: 'Leads', icon: MessageSquareQuote, permission: 'leads.view' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/homepage', label: 'Homepage', icon: LayoutTemplate, permission: 'homepage.edit' },
      { href: '/admin/banners', label: 'Banners', icon: ImageIcon, permission: 'banners.edit' },
      { href: '/admin/blogs', label: 'Blog', icon: FileText, permission: 'blogs.edit' },
      { href: '/admin/gallery', label: 'Gallery', icon: Boxes, permission: 'gallery.edit' },
      { href: '/admin/videos', label: 'Videos', icon: Video, permission: 'videos.edit' },
      { href: '/admin/testimonials', label: 'Testimonials', icon: Star, permission: 'testimonials.edit' },
      { href: '/admin/reviews', label: 'Reviews', icon: Star, permission: 'reviews.moderate' },
      { href: '/admin/faq', label: 'FAQ', icon: HelpCircle, permission: 'faq.edit' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users, permission: 'users.view' },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
      { href: '/admin/activity', label: 'Activity log', icon: Activity, permission: 'activity.view' },
      { href: '/admin/seo', label: 'SEO', icon: Search, permission: 'seo.edit' },
      { href: '/admin/settings', label: 'Settings', icon: Settings, permission: 'settings.edit' },
      { href: '/admin/backup', label: 'Backup', icon: DatabaseBackup, permission: 'backup.manage' },
    ],
  },
];

export function Sidebar({
  user,
  logoUrl = null,
  logoOnDarkChip = false,
}: {
  user: { name: string; email: string; role: Role };
  logoUrl?: string | null;
  logoOnDarkChip?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-5">
        <Link href="/admin" onClick={() => setOpen(false)}>
          <Logo src={logoUrl} compact={Boolean(logoUrl)} onDarkChip={logoOnDarkChip} />
        </Link>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="rounded-lg p-2 text-ink-400 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {GROUPS.map((group) => {
          // Hide a whole section when the role can't reach anything inside it.
          const visible = group.items.filter((item) => can(user.role, item.permission));
          if (visible.length === 0) return null;

          return (
            <div key={group.title} className="mb-6">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200',
                        isActive(item.href)
                          ? 'bg-flame-700/12 text-flame-400'
                          : 'text-ink-300 hover:bg-white/[0.04] hover:text-white',
                      )}
                    >
                      {isActive(item.href) && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-flame-500" />
                      )}
                      <item.icon className="h-[17px] w-[17px] shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-white/5 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flame-700 text-[13px] font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-ink-500">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-flame-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        <Link
          href="/"
          className="mt-2 block rounded-lg px-3 py-2 text-center text-[12px] text-ink-500 transition-colors hover:text-white"
        >
          View the website →
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl glass text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop */}
      <aside className="admin-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/5 lg:block">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/80 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="admin-sidebar fixed inset-y-0 left-0 z-50 w-72 border-r border-white/5 lg:hidden">
            {nav}
          </aside>
        </>
      )}
    </>
  );
}
