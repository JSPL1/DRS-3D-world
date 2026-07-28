'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { OtpInput, OTP_LENGTH, type OtpInputHandle } from '@/components/auth/OtpInput';
import { Button } from '@/components/ui/Button';
import { FormError, FormNotice } from '@/components/ui/Field';

export default function VerifyOtpPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(600);

  const otpRef = useRef<OtpInputHandle>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('drs-reset-email');
    if (!stored) {
      router.replace('/forgot-password');
      return;
    }
    setEmail(stored);
    otpRef.current?.focus();
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function submit(code: string) {
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'That code did not work.');
        otpRef.current?.reset();
        return;
      }

      sessionStorage.setItem('drs-reset-ticket', data.ticket);
      router.push('/reset-password');
    } catch {
      setError('Network problem. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSecondsLeft(600);
    setNotice(data.devCode ? `Development mode — new code is ${data.devCode}` : 'A new code is on its way.');
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          We sent a six-digit code to <span className="text-white">{email || 'your inbox'}</span>.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <FormError message={error} />
        <FormNotice message={notice} />

        <OtpInput
          ref={otpRef}
          digits={digits}
          onDigitsChange={setDigits}
          onComplete={submit}
          disabled={pending}
        />

        <p className="text-center font-mono text-[12px] text-ink-500">
          {secondsLeft > 0 ? `Code expires in ${mm}:${ss}` : 'This code has expired.'}
        </p>

        <Button
          type="button"
          size="lg"
          disabled={pending || digits.some((d) => !d)}
          onClick={() => submit(digits.join(''))}
          className="w-full"
        >
          {pending ? 'Verifying…' : 'Verify code'}
        </Button>

        <button
          type="button"
          onClick={resend}
          className="text-center text-[13px] text-ink-400 transition-colors hover:text-flame-400"
        >
          Didn’t get it? Send another code
        </button>
      </div>

      <Link
        href="/forgot-password"
        className="mt-8 flex items-center justify-center gap-2 border-t border-white/5 pt-6 text-[13px] text-ink-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Use a different email
      </Link>
    </>
  );
}
