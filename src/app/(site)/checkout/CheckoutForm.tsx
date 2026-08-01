'use client';

import {
  Banknote, Building2, CheckCircle2, CreditCard, Gift, Landmark, Loader2, Lock, MapPin,
  QrCode, Rocket, ShieldCheck, Truck, Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { inr } from '@/components/products/BuyBox';
import { Field, FormError, FormNotice } from '@/components/ui/Field';

const GST_RATE = 0.18;
const FREE_DELIVERY_ABOVE = 10000;

const SHIPPING_TIERS = [
  { id: 'standard', label: 'Standard', days: '5-7 working days', fee: 250, icon: Truck },
  { id: 'express', label: 'Express', days: '2-3 working days', fee: 600, icon: Zap },
  { id: 'priority', label: 'Priority', days: 'Next working day', fee: 1200, icon: Rocket },
] as const;

type ShippingId = (typeof SHIPPING_TIERS)[number]['id'];

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: QrCode },
  { id: 'card', label: 'Cards', icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', icon: Landmark },
  { id: 'cod', label: 'Cash on delivery', icon: Banknote },
] as const;

/** Slippy-map tile containing a point, at a fixed zoom — no API key needed. */
function tileFor(lat: number, lng: number, zoom = 15) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y, zoom };
}

export function CheckoutForm({
  defaultName,
  defaultEmail,
}: {
  defaultName: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const { lines, subtotal, ready, giftWrap, giftNote, giftWrapFee, clear } = useCart();

  const [form, setForm] = useState({
    customerName: defaultName,
    customerEmail: defaultEmail,
    customerPhone: '',
    address: '',
    notes: '',
    couponCode: '',
  });
  const [shippingMethod, setShippingMethod] = useState<ShippingId>('standard');
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]['id']>('upi');

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [landmark, setLandmark] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ orderNumber: string; total: number } | null>(null);
  // The session can expire while the form is open. The message alone isn't
  // enough then — they need the link back to sign-in.
  const [signedOut, setSignedOut] = useState(false);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const tier = SHIPPING_TIERS.find((t) => t.id === shippingMethod) ?? SHIPPING_TIERS[0];
  const wrapFee = giftWrap ? giftWrapFee : 0;
  const gst = (subtotal + wrapFee) * GST_RATE;
  const delivery = shippingMethod === 'standard' && subtotal >= FREE_DELIVERY_ABOVE ? 0 : tier.fee;
  const total = subtotal + wrapFee + gst + delivery;

  function pinLocation() {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location. Add a landmark instead.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Could not get your location. You can still add a landmark below.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

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
          giftWrap,
          giftNote,
          shippingMethod,
          deliveryLat: pin?.lat ?? null,
          deliveryLng: pin?.lng ?? null,
          deliveryLandmark: landmark,
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
            className="glass inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium transition-colors hover:border-ink-600"
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
              className="rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-4 py-3.5 text-[14.5px] leading-relaxed text-ink-100 placeholder:text-ink-600 transition-all focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
            />
          </label>

          {/* GPS pin */}
          <div className="mt-5 rounded-xl border border-ink-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[13px] font-medium text-ink-200">
                <MapPin className="h-4 w-4 text-flame-500" />
                Pin your exact location
                <span className="text-ink-500">(optional)</span>
              </span>
              <button
                type="button"
                onClick={pinLocation}
                disabled={locating}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-700 px-3 text-[12px] font-semibold text-ink-200 transition-colors hover:border-flame-500/50 hover:text-flame-500 disabled:opacity-50"
              >
                {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                {locating ? 'Locating…' : pin ? 'Update pin' : 'Use my location'}
              </button>
            </div>

            {locationError && <p className="mt-2 text-[12px] text-red-400">{locationError}</p>}

            {pin && (
              <div className="mt-3 overflow-hidden rounded-lg border border-ink-800">
                <div className="relative h-36 w-full bg-ink-900">
                  <Image
                    src={`https://tile.openstreetmap.org/${tileFor(pin.lat, pin.lng).zoom}/${tileFor(pin.lat, pin.lng).x}/${tileFor(pin.lat, pin.lng).y}.png`}
                    alt="Map preview of your pinned location"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-flame-600 shadow-[0_0_0_4px_rgba(255,106,0,0.35)]" />
                </div>
                <p className="bg-[var(--surface)] px-3 py-2 font-mono text-[11px] text-ink-500">
                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                </p>
              </div>
            )}

            <Field
              label="Nearest landmark"
              className="mt-3"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Opposite City Mall"
            />
          </div>

          <label className="mt-5 flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-200">
              Anything we should know? <span className="text-ink-500">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Engraving text, deadline, finish preference…"
              className="rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-4 py-3.5 text-[14.5px] leading-relaxed text-ink-100 placeholder:text-ink-600 transition-all focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
            />
          </label>
        </section>

        {/* Shipping speed */}
        <section className="glass rounded-2xl p-6 sm:p-7">
          <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
            <Truck className="h-4.5 w-4.5 text-flame-500" />
            Shipping speed
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {SHIPPING_TIERS.map((option) => {
              const active = shippingMethod === option.id;
              const free = option.id === 'standard' && subtotal >= FREE_DELIVERY_ABOVE;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setShippingMethod(option.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                    active
                      ? 'border-flame-500 bg-flame-500/[0.06]'
                      : 'border-ink-800 hover:border-ink-600'
                  }`}
                >
                  <option.icon className={`h-5 w-5 ${active ? 'text-flame-500' : 'text-ink-400'}`} />
                  <span className="text-[13.5px] font-semibold">{option.label}</span>
                  <span className="text-[11.5px] text-ink-500">{option.days}</span>
                  <span className="font-mono text-[13px] font-semibold text-flame-600">
                    {free ? 'Free' : inr(option.fee)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Payment */}
        <section className="glass rounded-2xl p-6 sm:p-7">
          <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
            <CreditCard className="h-4.5 w-4.5 text-flame-500" />
            Payment
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-center transition-all duration-200 ${
                    active
                      ? 'border-flame-500 bg-flame-500/[0.06]'
                      : 'border-ink-800 hover:border-ink-600'
                  }`}
                >
                  <method.icon className={`h-5 w-5 ${active ? 'text-flame-500' : 'text-ink-400'}`} />
                  <span className="text-[12px] font-semibold">{method.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <FormNotice message="Online payment is not switched on yet. Place the order and we will call you to arrange payment by your chosen method — nothing is charged now." />
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="glass-strong rounded-2xl p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-lg font-semibold tracking-tight">Your order</h2>

        <ul className="mt-5 flex flex-col gap-3 border-b border-ink-800 pb-5">
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

          {giftWrap && (
            <li className="flex items-center gap-2 text-[12.5px] text-flame-600">
              <Gift className="h-3.5 w-3.5" />
              Gift wrapped{giftNote ? ` — "${giftNote}"` : ''}
            </li>
          )}
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
          {giftWrap && (
            <div className="flex justify-between">
              <dt className="text-ink-400">Gift wrap</dt>
              <dd className="font-mono tabular-nums">{inr(wrapFee)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-400">GST (18%)</dt>
            <dd className="font-mono tabular-nums">{inr(gst)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">Delivery ({tier.label})</dt>
            <dd className="font-mono tabular-nums">
              {delivery === 0 ? <span className="text-emerald-400">Free</span> : inr(delivery)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-ink-700 pt-4">
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
