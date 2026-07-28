import type { Metadata } from 'next';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your DRS 3D WORLD account.',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      nextPath={typeof params.next === 'string' ? params.next : undefined}
      justReset={params.reset === '1'}
    />
  );
}
