import { FileText, Gift, Heart, Package, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { money, shortDate, StatusPill } from '@/components/admin/Shell';
import { LogoutButton } from '@/components/account/LogoutButton';
import { ProductCard } from '@/components/sections/ProductCard';
import { Logo } from '@/components/ui/Logo';
import { requireUser } from '@/lib/auth/session';
import { all, one } from '@/lib/db';
import { getColorCounts, getProductBySlug } from '@/lib/queries';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const TIERS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 500 },
  { name: 'Gold', min: 2000 },
  { name: 'Platinum', min: 5000 },
] as const;

function tierFor(points: number) {
  let tier: (typeof TIERS)[number] = TIERS[0];
  for (const t of TIERS) if (points >= t.min) tier = t;
  const next = TIERS[TIERS.indexOf(tier) + 1];
  return { tier, next };
}

export default async function AccountPage() {
  const user = await requireUser();

  const loyalty = await one<{ loyalty_points: number }>(
    `SELECT loyalty_points FROM users WHERE id = ?`,
    [user.id],
  );
  const points = loyalty?.loyalty_points ?? 0;
  const { tier, next } = tierFor(points);

  const orders = await all<{
    id: number;
    order_number: string;
    total: number;
    status: string;
    payment_status: string;
    gift_wrap: number;
    created_at: string;
  }>(
    `SELECT id, order_number, total, status, payment_status, gift_wrap, created_at
     FROM orders WHERE user_id = ? OR customer_email = ?
     ORDER BY created_at DESC LIMIT 25`,
    [user.id, user.email],
  );

  const quotes = await all<{
    id: number;
    reference: string;
    material: string | null;
    quantity: number;
    total: number | null;
    status: string;
    created_at: string;
  }>(
    `SELECT id, reference, material, quantity, total, status, created_at
     FROM quotes WHERE user_id = ? OR customer_email = ?
     ORDER BY created_at DESC LIMIT 25`,
    [user.id, user.email],
  );

  const wishlistRows = await all<{ slug: string }>(
    `SELECT p.slug FROM wishlists w
     JOIN products p ON p.id = w.product_id
     WHERE w.user_id = ? AND p.status = 'published'
     ORDER BY w.created_at DESC`,
    [user.id],
  );
  const wishlistProducts = await Promise.all(wishlistRows.map((r) => getProductBySlug(r.slug)));
  const wishlist = wishlistProducts.filter((p): p is NonNullable<typeof p> => p !== null);

  const colorCounts = await getColorCounts();

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Hello, {user.name.split(' ')[0]}
            </h1>
            <p className="mt-2 text-[14px] text-ink-400">{user.email}</p>
          </div>

          {/* Loyalty tier card */}
          <div className="glass flex items-center gap-4 rounded-2xl px-5 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-flame-500/25 bg-flame-500/10 text-flame-500">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{tier.name} member</p>
              <p className="font-display text-lg font-bold tracking-tight">{points} points</p>
              {next && (
                <p className="text-[11.5px] text-ink-500">
                  {next.min - points} more to {next.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Orders */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
            <Package className="h-5 w-5 text-flame-500" />
            Your orders
          </h2>

          {orders.length === 0 ? (
            <div className="glass mt-5 rounded-2xl px-6 py-12 text-center">
              <p className="text-[14px] text-ink-300">You have no orders yet.</p>
              <Link
                href="/products"
                className="mt-4 inline-block rounded-xl bg-flame-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-flame-800"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {orders.map((order) => (
                <li key={order.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-5">
                  <span className="font-mono text-[13px] text-ink-100">{order.order_number}</span>
                  <StatusPill status={order.status} />
                  <StatusPill status={order.payment_status} />
                  {Boolean(order.gift_wrap) && (
                    <span className="flex items-center gap-1 text-[11.5px] text-flame-600">
                      <Gift className="h-3.5 w-3.5" />
                      Gift wrapped
                    </span>
                  )}
                  <span className="ml-auto font-display text-[15px] font-semibold text-ink-100">
                    {money(order.total)}
                  </span>
                  <span className="w-full text-[12px] text-ink-500 sm:w-auto">
                    {shortDate(order.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Wishlist */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
            <Heart className="h-5 w-5 text-flame-500" />
            Your wishlist
          </h2>

          {wishlist.length === 0 ? (
            <div className="glass mt-5 rounded-2xl px-6 py-12 text-center">
              <p className="text-[14px] text-ink-300">
                Nothing saved yet — tap the heart on any product to keep it here.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-block rounded-xl bg-flame-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-flame-800"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {wishlist.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  colorCount={colorCounts[product.id] ?? 0}
                  wishlisted
                  signedIn
                />
              ))}
            </div>
          )}
        </section>

        {/* Quotes */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
            <FileText className="h-5 w-5 text-flame-500" />
            Your quotes
          </h2>

          {quotes.length === 0 ? (
            <div className="glass mt-5 rounded-2xl px-6 py-12 text-center">
              <p className="text-[14px] text-ink-300">No quote requests yet.</p>
              <Link
                href="/quote"
                className="mt-4 inline-block rounded-xl bg-flame-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-flame-800"
              >
                Price a file
              </Link>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-3">
              {quotes.map((quote) => (
                <li key={quote.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-5">
                  <span className="font-mono text-[13px] text-ink-100">{quote.reference}</span>
                  <span className="text-[13px] text-ink-300">
                    {quote.material} · {quote.quantity} pc
                  </span>
                  <StatusPill status={quote.status} />
                  <span className="ml-auto font-display text-[15px] font-semibold text-ink-100">
                    {quote.total ? money(quote.total) : '—'}
                  </span>
                  <span className="w-full text-[12px] text-ink-500 sm:w-auto">
                    {shortDate(quote.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-16 border-t border-ink-800 pt-8 text-center text-[12.5px] text-ink-500">
          Questions about an order? Call {site.contact.phone} or email {site.contact.email}.
        </p>
      </main>
    </div>
  );
}
