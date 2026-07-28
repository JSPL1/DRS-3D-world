'use client';

import { CheckCircle2, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { inr } from '@/components/products/BuyBox';
import { Field, FormError } from '@/components/ui/Field';

const GST_RATE = 0.18;
const FREE_DELIVERY_ABOVE = 10000;
const DELIVERY_FEE = 250;

export function CheckoutForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const { lines, subtotal, ready, clear } = useCart();

  const [form, setForm] = useState({
    customerName: defaultName,
    customerEmail: defaultEmail,
    customerPhone: '',
    address: '',
    notes: '',
    couponCode: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ orderNumber: string; total: number } | null>(null);
  // The session can expire while the form is open. The message alone isn't
  // enough then — they need the link back to sign-in.
  const [signedOut, setSignedOut] = useState(false);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const gst = subtotal * GST_RATE;
  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total = subtotal + gst + delivery;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSignedOut(false);
    setPending(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: lines.map((l) => ({
            productId: l.productId,
            colorId: l.colorId,
            quantity: l.quantity,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'We could not place that order.');
        setSignedOut(Boolean(data.requiresSignIn));
        return;
      }

      setPlaced({ orderNumber: data.orderNumber, total: data.totals.total });
      clear();
      router.refresh();
    } catch {
      setError('Network problem. Your order was not placed — nothing has been charged.');
    } finally {
      setPending(false);
    }
  }

  /* ---------------- Confirmation ---------------- */
  if (placed) {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl px-8 py-14 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="mt-6 font-display text-3xl font-bold tracking-tight">Order placed</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-300">
          Your reference is{' '}
          <strong className="font-mono text-flame-500">{placed.orderNumber}</strong>. We will call to
          confirm the details and arrange payment before printing starts.
        </p>
        <p className="mt-4 font-display text-2xl font-bold">{inr(placed.total)}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-flame-700 px-6 text-sm font-medium text-white transition-colors hover:bg-flame-800"
          >
            Continue shopping
          </Link>
          <Link
            href="/account"
            className="glass inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium transition-colors hover:bg-white/10"
          >
            View your orders
          </Link>
        </div>
      </div>
    );
  }

  if (ready && lines.length === 0) {
    return (
      <div className="glass rounded-2xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight">Nothing to check out</h2>
        <p className="mt-3 text-[14px] text-ink-400">Your cart is empty.</p>
        <Link
          href="/products"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-flame-700 px-6 text-sm font-medium text-white transition-colors hover:bg-flame-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* Details */}
      <div className="flex flex-col gap-5">
        <section className="glass rounded-2xl p-6 sm:p-7">
          <h2 className="font-display text-lg font-semibold tracking-tight">Delivery details</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field
              label="Full name"
              required
              value={form.customerName}
              onChange={set('customerName')}
              placeholder="Your name"
            />
            <Field
              label="Phone"
              type="tel"
              required
              value={form.customerPhone}
              onChange={set('customerPhone')}
              placeholder="10-digit mobile"
              hint="We call to confirm before printing."
            />
            <div className="sm:col-span-2">
              <Field
                label="Email"
                type="email"
                required
                value={form.customerEmail}
                onChange={set('customerEmail')}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <label className="mt-5 flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-200">Delivery address</span>
            <textarea
              required
              rows={4}
              value={form.address}
              onChange={set('address')}
              placeholder="House / flat, street, area, city, state, PIN code"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[14.5px] leading-relaxed placeholder:text-ink-500 transition-all focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
            />
          </label>

          <label className="mt-5 flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-200">
              Anything we should know? <span className="text-ink-500">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Engraving text, deadline, finish preference…"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[14.5px] leading-relaxed placeholder:text-ink-500 transition-all focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
            />
          </label>
        </section>

        <section className="glass rounded-2xl p-6 sm:p-7">
          <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
            <CreditCard className="h-4.5 w-4.5 text-flame-500" />
            Payment
          </h2>
          <p className="mt-3 rounded-xl border border-flame-600/25 bg-flame-700/[0.08] px-4 py-3.5 text-[13px] leading-relaxed text-flame-500">
            Online payment is not switched on yet. Place the order and we will call you to arrange
            UPI or bank transfer — nothing is charged now.
          </p>
        </section>
      </div>

      {/* Summary */}
      <aside className="glass-strong rounded-2xl p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold tracking-tight">Your order</h2>

        <ul className="mt-5 flex flex-col gap-3 border-b border-white/8 pb-5">
          {lines.map((line) => (
            <li key={`${line.productId}-${line.colorId ?? 'none'}`} className="flex gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-900">
                {line.image && (
                  <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                )}
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-700 px-1 text-[10px] font-bold text-white">
                  {line.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{line.name}</span>
                {line.colorName && (
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-400">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
                      style={{ backgroundColor: line.colorHex ?? '#888' }}
                    />
                    {line.colorName}
                  </span>
                )}
              </span>
              <span className="font-mono text-[13px] tabular-nums">
                {inr(line.unitPrice * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <Field
          label="Coupon code"
          className="mt-5"
          value={form.couponCode}
          onChange={set('couponCode')}
          placeholder="e.g. DRS10"
          hint="Applied when the order is placed."
        />

        <dl className="mt-5 space-y-2.5 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-ink-400">Subtotal</dt>
            <dd className="font-mono tabular-nums">{inr(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">GST (18%)</dt>
            <dd className="font-mono tabular-nums">{inr(gst)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">Delivery</dt>
            <dd className="font-mono tabular-nums">
              {delivery === 0 ? <span className="text-emerald-400">Free</span> : inr(delivery)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-4">
            <dt className="font-display text-base font-semibold">Total</dt>
            <dd className="font-display text-xl font-bold text-flame-500">{inr(total)}</dd>
          </div>
        </dl>

        <p className="mt-2 text-[11.5px] text-ink-500">
          Any coupon is applied server-side, so the final figure may be lower than shown here.
        </p>

        {error && <div className="mt-4"><FormError message={error} /></div>}

        {signedOut && (
          <Link
            href={`/login?next=${encodeURIComponent('/checkout')}`}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-flame-600/40 bg-flame-700/10 text-sm font-semibold text-flame-500 transition-colors hover:bg-flame-700/20"
          >
            Sign in and come back
          </Link>
        )}

        <button
          type="submit"
          disabled={pending || !ready || lines.length === 0}
          className="sheen mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-flame-700 text-sm font-semibold text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          {pending ? 'Placing order…' : 'Place order'}
        </button>

        <p className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your details are only used to fulfil this order.
        </p>
      </aside>
    </form>
  );
}
