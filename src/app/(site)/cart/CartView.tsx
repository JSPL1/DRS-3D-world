'use client';

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useCart } from '@/components/cart/CartProvider';
import { inr } from '@/components/products/BuyBox';

const GST_RATE = 0.18;
const FREE_DELIVERY_ABOVE = 10000;
const DELIVERY_FEE = 250;

export function CartView({ signedIn = false }: { signedIn?: boolean }) {
  const { lines, subtotal, count, ready, setQuantity, remove } = useCart();

  if (!ready) {
    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="glass flex flex-col items-center rounded-2xl px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-flame-600/30 bg-flame-700/10 text-flame-500">
          <ShoppingBag className="h-7 w-7" />
        </span>
        <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">Your cart is empty</h2>
        <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-400">
          Browse the catalogue, or send us your own file and we will price it in seconds.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-flame-700 px-6 text-sm font-medium text-white transition-colors hover:bg-flame-800"
          >
            Browse products
          </Link>
          <Link
            href="/quote"
            className="glass inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium transition-colors hover:bg-white/10"
          >
            Price your own file
          </Link>
        </div>
      </div>
    );
  }

  // Shown for reassurance only — the server recomputes all of this at checkout.
  const gst = subtotal * GST_RATE;
  const delivery = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const total = subtotal + gst + delivery;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
      <ul className="flex flex-col gap-4">
        {lines.map((line) => (
          <li
            key={`${line.productId}-${line.colorId ?? 'none'}`}
            className="glass flex gap-4 rounded-2xl p-4 sm:p-5"
          >
            <Link
              href={`/products/${line.slug}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-900 sm:h-28 sm:w-28"
            >
              {line.image && (
                <Image src={line.image} alt={line.name} fill sizes="112px" className="object-cover" />
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.slug}`}
                    className="font-display text-[16px] font-semibold leading-snug transition-colors hover:text-flame-500"
                  >
                    {line.name}
                  </Link>

                  {line.colorName && (
                    <span className="mt-1.5 flex items-center gap-2 text-[12.5px] text-ink-400">
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-black/20"
                        style={{ backgroundColor: line.colorHex ?? '#888' }}
                      />
                      {line.colorName}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => remove(line.productId, line.colorId)}
                  aria-label={`Remove ${line.name} from cart`}
                  className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="inline-flex items-center rounded-lg border border-white/12">
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productId, line.colorId, line.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="flex h-9 w-9 items-center justify-center rounded-l-lg text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center font-mono text-[13px] tabular-nums">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productId, line.colorId, line.quantity + 1)}
                    aria-label="Increase quantity"
                    className="flex h-9 w-9 items-center justify-center rounded-r-lg text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="font-display text-[17px] font-semibold">
                    {inr(line.unitPrice * line.quantity)}
                  </p>
                  {line.quantity > 1 && (
                    <p className="text-[11.5px] text-ink-500">{inr(line.unitPrice)} each</p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Summary */}
      <aside className="glass-strong rounded-2xl p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold tracking-tight">Order summary</h2>

        <dl className="mt-5 space-y-2.5 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-ink-400">
              Subtotal <span className="text-ink-500">({count} item{count === 1 ? '' : 's'})</span>
            </dt>
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

        {delivery > 0 && (
          <p className="mt-3 rounded-lg bg-flame-700/10 px-3 py-2 text-[12px] text-flame-500">
            Add {inr(FREE_DELIVERY_ABOVE - subtotal)} more for free delivery.
          </p>
        )}

        <Link
          href="/checkout"
          className="sheen mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-flame-700 py-4 text-sm font-semibold text-white transition-colors hover:bg-flame-800"
        >
          Proceed to checkout
          <ArrowRight className="h-4 w-4" />
        </Link>

        {!signedIn && (
          // Said here rather than sprung on them after the delivery form.
          <p className="mt-3 text-center text-[12px] text-ink-400">
            You&rsquo;ll sign in or create an account at the next step — orders are
            tied to an account so you can track them.
          </p>
        )}

        <Link
          href="/products"
          className="mt-3 block text-center text-[13px] text-ink-400 transition-colors hover:text-flame-500"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
