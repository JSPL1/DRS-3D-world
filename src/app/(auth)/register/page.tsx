import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create your DRS 3D WORLD account to track orders and reorder faster.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getCurrentUser()) redirect('/account');

  const params = await searchParams;

  return (
    <RegisterForm
      nextPath={str(params.next)}
      defaultName={str(params.name) ?? ''}
      defaultEmail={str(params.email) ?? ''}
      defaultPhone={str(params.phone) ?? ''}
      fromOrder={str(params.order)}
    />
  );
}
