'use client';

import { CheckCircle2, Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, FormError } from '@/components/ui/Field';

const SUBJECTS = [
  'General enquiry',
  '3D printing job',
  'Custom figurine or statue',
  'Prototype / product development',
  'Architectural model',
  'Medical model',
  'Corporate gifts (bulk)',
  'Something else',
];

function ContactFormInner() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get('product');

  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: productSlug ? '3D printing job' : SUBJECTS[0],
    message: productSlug
      ? `I would like to enquire about the "${productSlug.replace(/-/g, ' ')}".\n\n`
      : '',
  });

  const update = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not send your message.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network problem. Please try again, or call us instead.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-flame-500/30 bg-flame-500/10 text-flame-500">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">Message sent</h2>
        <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-ink-300">
          Thank you — we have it. Someone will come back to you within one working day, usually
          sooner. If it is urgent, WhatsApp is faster than email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <FormError message={error} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" required value={form.name} onChange={update('name')} placeholder="Full name" />
        <Field label="Company" value={form.company} onChange={update('company')} placeholder="Optional" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" type="email" required value={form.email} onChange={update('email')} placeholder="you@company.com" />
        <Field label="Phone" type="tel" value={form.phone} onChange={update('phone')} placeholder="Optional" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className="text-[13px] font-medium text-ink-200">
          What is it about?
        </label>
        <select
          id="subject"
          value={form.subject}
          onChange={update('subject')}
          className="h-12 rounded-xl border border-white/10 bg-ink-900 px-4 text-[14.5px] text-white transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-[13px] font-medium text-ink-200">
          Tell us about it
        </label>
        <textarea
          id="message"
          required
          rows={6}
          value={form.message}
          onChange={update('message')}
          placeholder="What are you making, how many, and when do you need it? If you have dimensions or a material in mind, include those."
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[14.5px] leading-relaxed text-white placeholder:text-ink-500 transition-all duration-300 focus:border-flame-500/60 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-flame-500/10"
        />
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-500">
        Have a file ready? The{' '}
        <a href="/quote" className="text-flame-500 hover:text-flame-400">instant quote calculator</a>{' '}
        will price it in seconds — no form needed.
      </p>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending ? 'Sending…' : 'Send message'}
        {!pending && <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}

export function ContactForm() {
  return (
    <Suspense fallback={<div className="skeleton h-[520px] w-full" />}>
      <ContactFormInner />
    </Suspense>
  );
}
