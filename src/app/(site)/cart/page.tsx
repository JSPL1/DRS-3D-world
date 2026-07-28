import type { Metadata } from 'next';

import { getCurrentUser } from '@/lib/auth/session';

import { CartView } from './CartView';

export const metadata: Metadata = {
  title: 'Your cart',
  description: 'Review the pieces in your DRS 3D WORLD basket before checking out.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const user = await getCurrentUser();

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Your cart</h1>
        <div className="mt-10">
          <CartView signedIn={Boolean(user)} />
        </div>
      </div>
    </div>
  );
}
