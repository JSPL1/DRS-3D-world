'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormNotice } from '@/components/ui/Field';

export function RegisterForm({
  nextPath,
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
  fromOrder,
  googleEnabled = false,
}: {
  nextPath?: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  /** Order number the customer just placed, when they arrived from checkout. */
  fromOrder?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not create your account.');
        return;
      }

      const params = new URLSearchParams({ email: data.email ?? email });
      if (nextPath) params.set('next', nextPath);
      router.push(`/verify-email?${params.toString()}`);
    } catch {
      setError('Network problem. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-2 text-[14px] text-ink-400">
          Track every print, reorder in one click, and skip re-typing your details.
        </p>
      </div>

      {fromOrder && (
        <div className="mb-5">
          <FormNotice
            message={`Order ${fromOrder} is confirmed. Set a password and it will appear in your account.`}
          />
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormError message={error} />

        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Ananya Mohanty"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Field
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          hint="Your verification code and every order update go here."
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Field
          label="Mobile number"
          type="tel"
          name="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98610 00001"
          hint="You can sign in with this instead of your email."
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? 'Creating your account…' : 'Create account'}
          {!pending && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-800" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">or</span>
        <span className="h-px flex-1 bg-ink-800" />
      </div>

      <div className="mt-6">
        <OAuthButtons googleEnabled={googleEnabled} facebookEnabled={false} next={nextPath} />
      </div>

      <p className="mt-8 border-t border-white/5 pt-6 text-center text-[13px] text-ink-400">
        Already have an account?{' '}
        <Link
          href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
          className="font-medium text-flame-500 hover:text-flame-400"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
