import { Eye, Plus, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { DeleteProductButton } from '@/components/admin/DeleteProductButton';
import {
  Card, EmptyState, money, PageHeader, relativeTime, StatusPill, Table, Td, Th,
} from '@/components/admin/Shell';
import { LiveRefresh } from '@/components/admin/LiveRefresh';
import { listAdminProducts } from '@/lib/admin-queries';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Products' };

/** Whether an administrator has signed the product off. Never colour alone. */
function ApprovalPill({ status }: { status: string }) {
  const style =
    status === 'approved'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : status === 'rejected'
        ? 'border-red-500/30 bg-red-500/10 text-red-400'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-400';

  const label =
    status === 'approved' ? 'Approved' : status === 'rejected' ? 'Sent back' : 'Awaiting approval';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${style}`}>
      {label}
    </span>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePermission('products.view');
  const { q } = await searchParams;

  const products = listAdminProducts(q);
  const editable = can(user.role, 'products.edit');
  const deletable = can(user.role, 'products.delete');

  const awaiting = products.filter((p) => p.approval_status === 'pending').length;

  return (
    <>
      {/* The panel is shared: a colleague can add a product while this list is
          open, and an administrator's approval changes what is on the site.
          Polling keeps the table honest without anyone pressing reload. */}
      <LiveRefresh watch="products" />

      <PageHeader
        title="Products"
        subtitle={
          awaiting > 0
            ? `${products.length} product${products.length === 1 ? '' : 's'} · ${awaiting} awaiting approval`
            : `${products.length} product${products.length === 1 ? '' : 's'} in the catalogue`
        }
        action={
          editable && (
            <Link
              href="/admin/products/new"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800"
            >
              <Plus className="h-4 w-4" />
              New product
            </Link>
          )
        }
      />

      <form action="/admin/products" className="mb-5 flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or SKU…"
          className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[14px] text-white placeholder:text-ink-500 focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10 sm:max-w-sm"
        />
        <button
          type="submit"
          className="h-11 rounded-xl border border-white/10 px-5 text-[13.5px] text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400"
        >
          Search
        </button>
      </form>

      <Card>
        {products.length === 0 ? (
          <EmptyState
            title={q ? 'No products match that search' : 'No products yet'}
            body={
              q
                ? 'Try a different name or SKU.'
                : 'Create your first product to see it here and on the website.'
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Added by</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Stock</Th>
                <Th>Status</Th>
                <Th>Approval</Th>
                <Th className="text-right">Views</Th>
                <Th className="text-right">Updated</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-white/[0.02]">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                        {product.thumb && (
                          <Image src={product.thumb} alt="" fill sizes="44px" className="object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-white">{product.name}</span>
                          {product.is_featured === 1 && (
                            <Star className="h-3 w-3 shrink-0 fill-flame-500 text-flame-500" />
                          )}
                        </span>
                        <span className="block font-mono text-[11px] text-ink-500">{product.sku}</span>
                      </span>
                    </div>
                  </Td>
                  <Td className="text-[13px] text-ink-400">
                    <span className="block truncate">{product.created_by_name ?? '—'}</span>
                    {product.updated_by_name &&
                      product.updated_by_name !== product.created_by_name && (
                        <span className="block truncate text-[11.5px] text-ink-500">
                          edited by {product.updated_by_name}
                        </span>
                      )}
                  </Td>
                  <Td className="text-right font-mono tabular-nums">
                    {product.discount_price ? (
                      <span>
                        <span className="text-white">{money(product.discount_price)}</span>
                        <span className="ml-2 text-[11px] text-ink-500 line-through">
                          {money(product.price)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-white">{money(product.price)}</span>
                    )}
                  </Td>
                  <Td className="text-right font-mono tabular-nums">
                    <span className={product.stock === 0 ? 'text-amber-400' : 'text-ink-200'}>
                      {product.stock}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill status={product.status} />
                  </Td>
                  <Td>
                    <ApprovalPill status={product.approval_status} />
                  </Td>
                  <Td className="text-right font-mono tabular-nums text-ink-400">
                    {product.view_count.toLocaleString('en-IN')}
                  </Td>
                  <Td className="text-right text-[12.5px] text-ink-500">
                    {relativeTime(product.updated_at)}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        aria-label={`View ${product.name} on the site`}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {editable && (
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="rounded-lg px-3 py-1.5 text-[12.5px] text-flame-500 transition-colors hover:bg-flame-500/10"
                        >
                          Edit
                        </Link>
                      )}
                      {deletable && <DeleteProductButton id={product.id} name={product.name} />}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
