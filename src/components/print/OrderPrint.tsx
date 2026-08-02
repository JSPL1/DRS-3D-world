import type { ChallanCompany } from '@/components/print/DeliveryChallan';

export type PrintOrder = {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string | null;
  delivery_landmark: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  coupon_code: string | null;
  status: string;
  payment_status: string;
  shipping_method: string | null;
  gift_wrap: number;
  gift_wrap_fee: number;
  gift_note: string | null;
  notes: string | null;
  created_at: string;
};

export type PrintItem = {
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  color_name: string | null;
};

const inr = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * The order sheet that goes with the job — what to make, for whom, and what
 * was charged. Black on white for the same reason as the challan: it is
 * printed, not read on screen.
 */
export function OrderPrint({
  order,
  items,
  company,
  gstPercent,
}: {
  order: PrintOrder;
  items: PrintItem[];
  company: ChallanCompany;
  gstPercent: number;
}) {
  const placed = new Date(order.created_at.replace(' ', 'T') + 'Z');

  return (
    <article className="order-sheet mx-auto bg-white text-black">
      <header className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{company.name}</h1>
          <p className="mt-1 max-w-[300px] text-[11px] leading-snug">{company.address}</p>
          {company.phone && <p className="text-[11px]">{company.phone}</p>}
          {company.gstin && (
            <p className="mt-1 text-[11px]">
              <span className="font-bold">GSTIN:</span> {company.gstin}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-[15px] font-bold uppercase tracking-[0.2em]">Order</p>
          <p className="mt-1 font-mono text-[15px] font-bold">{order.order_number}</p>
          <p className="mt-1 text-[11px]">
            Placed {placed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="mt-2 text-[11px]">
            <span className="font-bold uppercase">{order.status.replace(/_/g, ' ')}</span>
            {' · '}
            <span className="font-bold uppercase">{order.payment_status}</span>
          </p>
        </div>
      </header>

      <section className="mt-5 flex gap-8">
        <div className="w-1/2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em]">Deliver to</h2>
          <p className="mt-1.5 text-[12.5px] font-bold">{order.customer_name}</p>
          {order.shipping_address && (
            <p className="text-[12px] leading-snug">{order.shipping_address}</p>
          )}
          {order.delivery_landmark && (
            <p className="text-[12px] leading-snug">Landmark: {order.delivery_landmark}</p>
          )}
          <p className="mt-1 text-[12px]">{order.customer_email}</p>
          {order.customer_phone && <p className="text-[12px]">{order.customer_phone}</p>}
        </div>

        <div className="w-1/2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em]">Shipping</h2>
          <p className="mt-1.5 text-[12.5px] capitalize">
            {(order.shipping_method ?? 'standard').replace(/_/g, ' ')} · {company.deliveryPartner}
          </p>
          {Boolean(order.gift_wrap) && (
            <p className="mt-1.5 text-[12px]">
              <span className="font-bold">Gift wrapped.</span>
              {order.gift_note ? ` Card reads: “${order.gift_note}”` : ''}
            </p>
          )}
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-y-2 border-black">
            <th className="py-2 text-left font-bold">Product</th>
            <th className="py-2 text-left font-bold">Finish</th>
            <th className="w-14 py-2 text-right font-bold">Qty</th>
            <th className="w-24 py-2 text-right font-bold">Unit</th>
            <th className="w-24 py-2 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-black/25">
              <td className="py-2 pr-3">
                {item.product_name}
                {item.sku && <span className="ml-2 font-mono text-[10px]">{item.sku}</span>}
              </td>
              <td className="py-2 pr-3">{item.color_name ?? '—'}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{inr(item.unit_price)}</td>
              <td className="py-2 text-right tabular-nums">{inr(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-4 flex justify-end">
        <dl className="w-[280px] text-[12px]">
          <div className="flex justify-between py-1">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{inr(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between py-1">
              <dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt>
              <dd className="tabular-nums">−{inr(order.discount)}</dd>
            </div>
          )}
          {Boolean(order.gift_wrap) && order.gift_wrap_fee > 0 && (
            <div className="flex justify-between py-1">
              <dt>Gift wrap</dt>
              <dd className="tabular-nums">{inr(order.gift_wrap_fee)}</dd>
            </div>
          )}
          <div className="flex justify-between py-1">
            <dt>GST ({gstPercent}%)</dt>
            <dd className="tabular-nums">{inr(order.tax)}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{order.shipping === 0 ? 'Free' : inr(order.shipping)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-black py-2 text-[15px] font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{inr(order.total)}</dd>
          </div>
          <p className="mt-1 text-right text-[10.5px]">
            {order.payment_status === 'paid' ? 'Paid in full.' : `To collect: ${inr(order.total)}`}
          </p>
        </dl>
      </section>

      {order.notes && (
        <section className="mt-5 border-t border-black/30 pt-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em]">Customer notes</h2>
          <p className="mt-1 text-[12px] leading-relaxed">{order.notes}</p>
        </section>
      )}

      <footer className="mt-8 border-t border-black/30 pt-3 text-[10px]">
        Made to order in Bhubaneswar. Questions about this order? {company.phone}
      </footer>
    </article>
  );
}
