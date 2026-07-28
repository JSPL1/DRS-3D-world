'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, FormError, FormNotice } from '@/components/ui/Field';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not send a code.');
        return;
      }

      sessionStorage.setItem('drs-reset-email', email);

      // Development builds echo the code back so the flow is testable without
      // a mail provider wired up.
      if (data.devCode) {
        setNotice(`Development mode — your code is ${data.devCode}`);
        setTimeout(() => router.push('/verify-otp'), 2200);
      } else {
        router.push('/verify-otp');
      }
    } catch {
      setError('Network problem. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          Enter the email on your account and we will send a six-digit code to verify it is you.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormError message={error} />
        <FormNotice message={notice} />

        <Field
          label="Email address"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="you@company.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Sending…' : 'Send verification code'}
          {!pending && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-8 flex items-center justify-center gap-2 border-t border-white/5 pt-6 text-[13px] text-ink-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </>
  );
}
