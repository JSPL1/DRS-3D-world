import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { VerifyEmailForm } from './VerifyEmailForm';

export const metadata: Metadata = {
  title: 'Confirm your email',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = str(params.email);

  // Nothing to verify without an address — send them back to sign up.
  if (!email) redirect('/register');

  return (
    <VerifyEmailForm
      email={email}
      nextPath={str(params.next)}
      alreadyResent={params.resent === '1'}
    />
  );
}
