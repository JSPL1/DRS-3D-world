import { FileText, LogOut, Package } from 'lucide-react';
import Link from 'next/link';

import { money, shortDate, StatusPill } from '@/components/admin/Shell';
import { LogoutButton } from '@/components/account/LogoutButton';
import { Logo } from '@/components/ui/Logo';
import { requireUser } from '@/lib/auth/session';
import { all } from '@/lib/db';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();

  const orders = all<{
    id: number;
    order_number: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
  }>(
    `SELECT id, order_number, total, status, payment_status, created_at
     FROM orders WHERE user_id = ? OR customer_email = ?
     ORDER BY created_at DESC LIMIT 25`,
    [user.id, user.email],
  );

  const quotes = all<{
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

  return (
    <div className="min-h-dvh bg-ink-950">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Hello, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-2 text-[14px] text-ink-400">{user.email}</p>

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
                  <span className="font-mono text-[13px] text-white">{order.order_number}</span>
                  <StatusPill status={order.status} />
                  <StatusPill status={order.payment_status} />
                  <span className="ml-auto font-display text-[15px] font-semibold text-white">
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
                  <span className="font-mono text-[13px] text-white">{quote.reference}</span>
                  <span className="text-[13px] text-ink-300">
                    {quote.material} · {quote.quantity} pc
                  </span>
                  <StatusPill status={quote.status} />
                  <span className="ml-auto font-display text-[15px] font-semibold text-white">
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

        <p className="mt-16 border-t border-white/5 pt-8 text-center text-[12.5px] text-ink-500">
          Questions about an order? Call {site.contact.phone} or email {site.contact.email}.
        </p>
      </main>
    </div>
  );
}
