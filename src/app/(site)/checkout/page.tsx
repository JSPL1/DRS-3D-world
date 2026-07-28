import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import { CheckoutForm } from './CheckoutForm';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Confirm your DRS 3D WORLD order.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // An account is required to order. Sent to sign-in before the form rather
  // than after it is filled in: asking for a name, address and phone number
  // and only then refusing the order is the worst version of this rule.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/checkout')}`);

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Checkout</h1>
        <p className="mt-3 text-[15px] text-ink-400">
          One step. We confirm your colours and finish before anything goes on the printer.
        </p>

        <div className="mt-10">
          <CheckoutForm defaultName={user.name} defaultEmail={user.email} />
        </div>
      </div>
    </div>
  );
}
