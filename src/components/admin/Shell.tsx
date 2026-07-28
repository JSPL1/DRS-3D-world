import Link from 'next/link';

import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14px] text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn('glass rounded-2xl', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          {title && <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  hint,
  href,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  href?: string;
}) {
  const positive = (delta ?? 0) >= 0;

  const body = (
    <div className="glass h-full rounded-2xl p-5 transition-all duration-400 hover:-translate-y-0.5 hover:border-flame-500/25">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</p>

      <div className="mt-2 flex items-center gap-2">
        {typeof delta === 'number' && (
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium',
              positive ? 'bg-emerald-500/12 text-emerald-400' : 'bg-red-500/12 text-red-400',
            )}
          >
            {positive ? '+' : ''}
            {delta}%
          </span>
        )}
        {hint && <span className="text-[11.5px] text-ink-500">{hint}</span>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

const STATUS_STYLES: Record<string, string> = {
  // Orders
  pending: 'bg-amber-500/12 text-amber-400',
  confirmed: 'bg-sky-500/12 text-sky-400',
  printing: 'bg-flame-500/15 text-flame-400',
  post_processing: 'bg-violet-500/12 text-violet-400',
  shipped: 'bg-blue-500/12 text-blue-400',
  completed: 'bg-emerald-500/12 text-emerald-400',
  cancelled: 'bg-red-500/12 text-red-400',
  refunded: 'bg-ink-500/20 text-ink-300',
  // Payment
  unpaid: 'bg-red-500/12 text-red-400',
  partial: 'bg-amber-500/12 text-amber-400',
  paid: 'bg-emerald-500/12 text-emerald-400',
  // Leads / quotes
  new: 'bg-flame-500/15 text-flame-400',
  contacted: 'bg-sky-500/12 text-sky-400',
  qualified: 'bg-violet-500/12 text-violet-400',
  won: 'bg-emerald-500/12 text-emerald-400',
  lost: 'bg-ink-500/20 text-ink-300',
  reviewed: 'bg-sky-500/12 text-sky-400',
  sent: 'bg-violet-500/12 text-violet-400',
  accepted: 'bg-emerald-500/12 text-emerald-400',
  rejected: 'bg-red-500/12 text-red-400',
  // Content
  published: 'bg-emerald-500/12 text-emerald-400',
  draft: 'bg-ink-500/20 text-ink-300',
  archived: 'bg-ink-500/20 text-ink-400',
  active: 'bg-emerald-500/12 text-emerald-400',
  suspended: 'bg-red-500/12 text-red-400',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium capitalize',
        STATUS_STYLES[status] ?? 'bg-ink-500/20 text-ink-300',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <p className="font-display text-lg font-semibold text-ink-200">{title}</p>
      <p className="mt-2 max-w-sm text-[13.5px] text-ink-500">{body}</p>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[13.5px]">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-white/5 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-white/[0.04] px-6 py-3.5 text-ink-200', className)}>
      {children}
    </td>
  );
}

export const money = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value);

export const shortDate = (value: string) =>
  new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });

export const relativeTime = (value: string) => {
  const then = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z').getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(value);
};
