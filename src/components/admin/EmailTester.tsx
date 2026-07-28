'use client';

import { CheckCircle2, MailCheck, Send } from 'lucide-react';
import { useState } from 'react';

import { FormError, FormNotice } from '@/components/ui/Field';

/**
 * Sends one real message so the configuration above can be proved rather than
 * assumed.
 *
 * The sign-up and reset flows can never tell anyone that mail is broken — they
 * must behave identically for a registered and an unregistered address, which
 * means they cannot report a delivery failure either. So a wrong password
 * there is silent. This is the one place the mail server's own error is shown.
 */
export function EmailTester({ configured }: { configured: boolean }) {
  const [to, setTo] = useState('');
  const [pending, setPending] = useState<'plain' | 'otp' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function send(kind: 'plain' | 'otp') {
    setError(null);
    setNotice(null);
    setPending(kind);

    try {
      const res = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, kind }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.host
            ? `${data.error} (tried ${data.host}:${data.port} as ${data.user})`
            : (data.error ?? 'Could not send the test message.'),
        );
        return;
      }

      setNotice(
        kind === 'otp'
          ? `Sample verification email sent to ${to} via ${data.sentVia}. The code in it is 123456 and verifies nothing — it is there so you can read the wording.`
          : `Sent to ${to} via ${data.sentVia}, from ${data.from}. Check the inbox — and the spam folder.`,
      );
    } catch {
      setError('Network problem. Nothing was sent.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">Test email delivery</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
        Send yourself one message to prove the settings work. Do this after any change — sign-up
        and password reset cannot report a mail failure to the person using them, so an untested
        configuration fails silently.
      </p>

      {!configured && (
        <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-300">
          Email is not configured yet. Verification codes are not being sent, so nobody can
          register or reset a password. Fill in the Email section above and save first.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send('plain');
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <input
          type="email"
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="you@example.com"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[14px] text-white placeholder:text-ink-500 focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={Boolean(pending) || !to}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-flame-700 px-5 text-[13.5px] font-medium text-[#ffffff] transition-colors hover:bg-flame-800 disabled:opacity-50"
          >
            {pending === 'plain' ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            {pending === 'plain' ? 'Sending…' : 'Send test email'}
          </button>

          <button
            type="button"
            onClick={() => void send('otp')}
            disabled={Boolean(pending) || !to}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/12 px-5 text-[13.5px] font-medium text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400 disabled:opacity-50"
          >
            <MailCheck className="h-4 w-4" />
            {pending === 'otp' ? 'Sending…' : 'Send a sample verification email'}
          </button>
        </div>

        <p className="text-[11.5px] leading-relaxed text-ink-500">
          The sample is the real verification email customers receive, with the code 123456. It is
          generated on the spot and stored nowhere, so it cannot sign anyone in.
        </p>
      </form>

      {error && <div className="mt-4"><FormError message={error} /></div>}
      {notice && <div className="mt-4"><FormNotice message={notice} /></div>}
    </section>
  );
}
