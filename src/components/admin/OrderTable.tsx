'use client';

import { Plus, Printer, Truck } from 'lucide-react';
import { Fragment, useState } from 'react';

import { StatusSelect } from '@/components/admin/StatusSelect';
import { money, shortDate, Table, Td, Th } from '@/components/admin/Shell';
import { cn } from '@/lib/cn';

const ORDER_STATUSES = [
  'pending', 'confirmed', 'printing', 'post_processing',
  'shipped', 'completed', 'cancelled', 'refunded',
] as const;

const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'refunded'] as const;

export type AdminOrderRow = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  item_count: number;
  first_product_name: string | null;
  shipping_address?: string | null;
  notes?: string | null;
  gift_wrap?: number;
  gift_note?: string | null;
  shipping_method?: string | null;
};

export type OrderItemRow = {
  order_id: number;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  color_name: string | null;
  color_hex: string | null;
};

export function OrderTable({
  orders,
  itemsByOrder,
  editable,
}: {
  orders: AdminOrderRow[];
  itemsByOrder: Map<number, OrderItemRow[]>;
  editable: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Table>
      <thead>
        <tr>
          <Th>Order</Th>
          <Th>Product</Th>
          <Th>Customer</Th>
          <Th className="text-right">Items</Th>
          <Th className="text-right">Total</Th>
          <Th>Status</Th>
          <Th>Payment</Th>
          <Th className="text-right">Placed</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          const items = itemsByOrder.get(order.id) ?? [];
          const moreCount = order.item_count - 1;

          return (
            <Fragment key={order.id}>
              <tr className={cn('transition-colors', isOpen ? 'bg-flame-500/[0.06]' : 'hover:bg-white/[0.02]')}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Hide' : 'Show'} full details for ${order.order_number}`}
                      className={cn(
                        'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all',
                        isOpen
                          ? 'rotate-45 border-flame-500 bg-flame-500/15 text-flame-500'
                          : 'border-flame-500/40 text-flame-500 hover:border-flame-500 hover:bg-flame-500/10',
                      )}
                    >
                      {!isOpen && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-500/30" />
                      )}
                      <Plus className="relative h-3.5 w-3.5" />
                    </button>
                    <span className={cn('font-mono text-[12.5px]', isOpen ? 'font-semibold text-flame-500' : 'text-ink-100')}>
                      {order.order_number}
                    </span>
                  </div>
                </Td>
                <Td className="text-[13px] text-ink-300">
                  <span className="block truncate max-w-[180px]">{order.first_product_name ?? '—'}</span>
                  {moreCount > 0 && (
                    <span className="text-[11.5px] text-ink-500">+{moreCount} more</span>
                  )}
                </Td>
                <Td>
                  <span className="block font-medium text-ink-100">{order.customer_name}</span>
                  <span className="block text-[12px] text-ink-500">{order.customer_email}</span>
                </Td>
                <Td className="text-right tabular-nums text-ink-300">{order.item_count}</Td>
                <Td className="text-right font-mono tabular-nums text-ink-100">{money(order.total)}</Td>
                <Td>
                  {editable ? (
                    <StatusSelect entity="order" id={order.id} value={order.status} options={ORDER_STATUSES} />
                  ) : (
                    <span className="capitalize text-ink-300">{order.status.replace(/_/g, ' ')}</span>
                  )}
                </Td>
                <Td>
                  {editable ? (
                    <StatusSelect entity="orderPayment" id={order.id} value={order.payment_status} options={PAYMENT_STATUSES} />
                  ) : (
                    <span className="capitalize text-ink-300">{order.payment_status}</span>
                  )}
                </Td>
                <Td className="text-right text-[12.5px] text-ink-500">{shortDate(order.created_at)}</Td>
              </tr>

              {isOpen && (
                <tr>
                  <td colSpan={8} className="bg-[var(--surface-sunken)] p-0">
                    {/* The running neon ring: on only while this order is
                        expanded, gone the moment it is closed. */}
                    <div className="neon-frame m-4 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-flame-500">
                          Full order — {order.order_number}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/print/order/${order.id}?doc=order`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink-700 px-3 text-[12px] font-medium text-ink-200 transition-colors hover:border-flame-500/50 hover:text-flame-500"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print order
                          </a>
                          <a
                            href={`/print/order/${order.id}?doc=challan`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-flame-700 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-flame-800"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            Delivery challan
                          </a>
                        </div>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-xl border border-ink-800">
                        <table className="w-full text-left text-[13px]">
                          <thead>
                            <tr className="bg-[var(--surface)]">
                              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Product</th>
                              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Colour</th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Qty</th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Unit price</th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">Line total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-4 text-center text-ink-500">
                                  No line items recorded for this order.
                                </td>
                              </tr>
                            ) : (
                              items.map((item, i) => (
                                <tr key={i} className="border-t border-ink-800">
                                  <td className="px-4 py-2.5 text-ink-100">
                                    {item.product_name}
                                    {item.sku && <span className="ml-2 font-mono text-[11px] text-ink-500">{item.sku}</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-ink-400">
                                    {item.color_name ? (
                                      <span className="flex items-center gap-1.5">
                                        {item.color_hex && (
                                          <span
                                            aria-hidden
                                            className="h-3 w-3 rounded-full ring-1 ring-black/20"
                                            style={{ backgroundColor: item.color_hex }}
                                          />
                                        )}
                                        {item.color_name}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-300">{item.quantity}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-300">{money(item.unit_price)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink-100">{money(item.total)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {(order.shipping_address || order.gift_wrap || order.notes) && (
                        <dl className="mt-4 grid gap-3 text-[12.5px] sm:grid-cols-2">
                          {order.shipping_address && (
                            <div>
                              <dt className="text-ink-500">Delivery address</dt>
                              <dd className="mt-0.5 text-ink-200">{order.shipping_address}</dd>
                            </div>
                          )}
                          {Boolean(order.gift_wrap) && (
                            <div>
                              <dt className="text-ink-500">Gift wrap</dt>
                              <dd className="mt-0.5 text-flame-500">
                                Yes{order.gift_note ? ` — "${order.gift_note}"` : ''}
                              </dd>
                            </div>
                          )}
                          {order.notes && (
                            <div className="sm:col-span-2">
                              <dt className="text-ink-500">Notes</dt>
                              <dd className="mt-0.5 text-ink-200">{order.notes}</dd>
                            </div>
                          )}
                        </dl>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
