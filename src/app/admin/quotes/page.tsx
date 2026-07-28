import { StatusSelect } from '@/components/admin/StatusSelect';
import {
  Card, EmptyState, money, PageHeader, shortDate, Table, Td, Th,
} from '@/components/admin/Shell';
import { listAdminQuotes } from '@/lib/admin-queries';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Quotes' };

const QUOTE_STATUSES = ['new', 'reviewed', 'sent', 'accepted', 'rejected'] as const;

export default async function AdminQuotesPage() {
  const user = await requirePermission('quotes.view');

  const quotes = listAdminQuotes();
  const editable = can(user.role, 'quotes.edit');

  const pipeline = quotes
    .filter((q) => ['new', 'reviewed', 'sent'].includes(q.status))
    .reduce((sum, q) => sum + (q.total ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Quotes"
        subtitle={`${quotes.length} request${quotes.length === 1 ? '' : 's'} · ${money(pipeline)} open in the pipeline`}
      />

      <Card>
        {quotes.length === 0 ? (
          <EmptyState
            title="No quote requests yet"
            body="Quotes submitted through the STL calculator will appear here."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Customer</Th>
                <Th>File</Th>
                <Th>Material</Th>
                <Th className="text-right">Volume</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Print time</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th className="text-right">Received</Th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="transition-colors hover:bg-white/[0.02]">
                  <Td className="font-mono text-[12.5px] text-white">{quote.reference}</Td>
                  <Td>
                    <span className="block font-medium text-white">{quote.customer_name ?? '—'}</span>
                    <span className="block text-[12px] text-ink-500">{quote.customer_email}</span>
                  </Td>
                  <Td className="max-w-[180px] truncate font-mono text-[12px] text-ink-400">
                    {quote.file_name ?? '—'}
                  </Td>
                  <Td className="text-[13px]">
                    <span className="block text-ink-200">{quote.material ?? '—'}</span>
                    <span className="block text-[11.5px] text-ink-500">{quote.technology}</span>
                  </Td>
                  <Td className="text-right font-mono tabular-nums text-ink-300">
                    {quote.volume_cm3 ? `${quote.volume_cm3.toFixed(1)} cm³` : '—'}
                  </Td>
                  <Td className="text-right tabular-nums text-ink-300">{quote.quantity}</Td>
                  <Td className="text-right font-mono tabular-nums text-ink-300">
                    {quote.print_hours ? `${quote.print_hours.toFixed(1)} h` : '—'}
                  </Td>
                  <Td className="text-right font-mono tabular-nums text-white">
                    {quote.total ? money(quote.total) : '—'}
                  </Td>
                  <Td>
                    {editable ? (
                      <StatusSelect entity="quote" id={quote.id} value={quote.status} options={QUOTE_STATUSES} />
                    ) : (
                      <span className="capitalize text-ink-300">{quote.status}</span>
                    )}
                  </Td>
                  <Td className="text-right text-[12.5px] text-ink-500">{shortDate(quote.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
