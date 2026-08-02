import type { Metadata } from 'next';

import { getSettings } from '@/lib/queries';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your DRS 3D WORLD account.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const settings = await getSettings();

  return (
    <LoginForm
      nextPath={typeof params.next === 'string' ? params.next : undefined}
      justReset={params.reset === '1'}
      oauthError={params.error}
      googleEnabled={Boolean(settings.oauth_google_client_id)}
    />
  );
}
