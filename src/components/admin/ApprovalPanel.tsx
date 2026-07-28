'use client';

import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormError } from '@/components/ui/Field';

export type ApprovalState = {
  status: 'approved' | 'pending' | 'rejected';
  createdByName: string | null;
  updatedByName: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  reviewNote: string | null;
};

/**
 * Where a product stands, and — for an administrator — the decision.
 *
 * Shown to everyone with access to the product, not only to approvers: the
 * person who entered it needs to see that it is waiting, and needs to read the
 * note if it came back.
 */
export function ApprovalPanel({
  productId,
  state,
  canApprove,
}: {
  productId: number;
  state: ApprovalState;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/admin/products/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, decision, note }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not record that decision.');
        return;
      }

      setNote('');
      router.refresh();
    } catch {
      setError('Network problem. Nothing was changed.');
    } finally {
      setPending(false);
    }
  }

  const tone =
    state.status === 'approved'
      ? { border: 'border-emerald-500/25', bg: 'bg-emerald-500/[0.06]', text: 'text-emerald-400' }
      : state.status === 'rejected'
        ? { border: 'border-red-500/25', bg: 'bg-red-500/[0.06]', text: 'text-red-400' }
        : { border: 'border-amber-500/25', bg: 'bg-amber-500/[0.07]', text: 'text-amber-300' };

  const Icon =
    state.status === 'approved' ? CheckCircle2 : state.status === 'rejected' ? RotateCcw : Clock;

  const headline =
    state.status === 'approved'
      ? 'Approved and on the website'
      : state.status === 'rejected'
        ? 'Sent back for changes'
        : 'Waiting for an administrator';

  return (
    <section className={`rounded-2xl border ${tone.border} ${tone.bg} p-5`}>
      <div className="flex flex-wrap items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text}`} />

        <div className="min-w-0 flex-1">
          <h2 className={`font-display text-[15px] font-semibold tracking-tight ${tone.text}`}>
            {headline}
          </h2>

          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-ink-400">
            {state.createdByName && (
              <div className="flex gap-1.5">
                <dt>Added by</dt>
                <dd className="text-ink-200">{state.createdByName}</dd>
              </div>
            )}
            {state.updatedByName && state.updatedByName !== state.createdByName && (
              <div className="flex gap-1.5">
                <dt>Last edited by</dt>
                <dd className="text-ink-200">{state.updatedByName}</dd>
              </div>
            )}
            {state.status === 'approved' && state.approvedByName && (
              <div className="flex gap-1.5">
                <dt>Approved by</dt>
                <dd className="text-ink-200">{state.approvedByName}</dd>
              </div>
            )}
          </dl>

          {state.reviewNote && state.status !== 'approved' && (
            <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] leading-relaxed text-ink-200">
              {state.reviewNote}
            </p>
          )}

          {state.status !== 'approved' && !canApprove && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">
              {state.status === 'rejected'
                ? 'Make the changes above and save — it goes back into the queue.'
                : 'You will get a notification when it has been reviewed.'}
            </p>
          )}

          {canApprove && state.status !== 'approved' && (
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-ink-400">
                  Note <span className="text-ink-500">(sent to whoever entered it)</span>
                </span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. price looks wrong, and we need a photo of the bronze finish"
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px]"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide('approve')}
                  disabled={pending}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-[13px] font-medium text-[#ffffff] transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve and publish
                </button>
                <button
                  type="button"
                  onClick={() => decide('reject')}
                  disabled={pending}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-4 text-[13px] font-medium text-ink-200 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Send back
                </button>
              </div>
            </div>
          )}

          {canApprove && state.status === 'approved' && (
            <button
              type="button"
              onClick={() => decide('reject')}
              disabled={pending}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3.5 text-[12.5px] text-ink-300 transition-colors hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Take it off the site
            </button>
          )}
        </div>
      </div>

      {error && <div className="mt-4"><FormError message={error} /></div>}
    </section>
  );
}
