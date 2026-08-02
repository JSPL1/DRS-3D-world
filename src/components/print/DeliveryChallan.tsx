import { code128 } from '@/lib/barcode';

export type ChallanOrder = {
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  shipping_address: string | null;
  delivery_landmark: string | null;
  total: number;
  payment_status: string;
  shipping_method: string | null;
  gift_wrap: number;
  gift_note: string | null;
  created_at: string;
};

export type ChallanItem = {
  product_name: string;
  sku: string | null;
  quantity: number;
  color_name: string | null;
};

export type ChallanCompany = {
  name: string;
  address: string;
  phone: string;
  gstin: string;
  deliveryPartner: string;
};

function Barcode({ value, height = 44 }: { value: string; height?: number }) {
  const { bars, modules } = code128(value);
  return (
    <svg
      viewBox={`0 0 ${modules} ${height}`}
      preserveAspectRatio="none"
      className="h-[44px] w-full"
      role="img"
      aria-label={`Barcode ${value}`}
    >
      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={0} width={bar.width} height={height} fill="#000" />
      ))}
    </svg>
  );
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Delivery challan, modelled on the marketplace shipping label the studio
 * already works with, so whoever packs a box reads the same shape they are
 * used to.
 *
 * Deliberately black on white with hard borders and no theme tokens: this is
 * printed, often on a thermal label printer, where the site's cream/ink
 * palette would either wash out or waste toner.
 */
export function DeliveryChallan({
  order,
  items,
  company,
}: {
  order: ChallanOrder;
  items: ChallanItem[];
  company: ChallanCompany;
}) {
  const collectOnDelivery = order.payment_status !== 'paid';
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);

  const placed = new Date(order.created_at.replace(' ', 'T') + 'Z');
  const dispatchBy = new Date(placed.getTime() + 2 * 24 * 60 * 60 * 1000);
  const dd = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')} - ${String(d.getMonth() + 1).padStart(2, '0')}`;

  return (
    <article className="challan mx-auto border border-black bg-white text-black">
      {/* Amount to collect, or PREPAID — the first thing the courier checks */}
      <div className="border-b border-black bg-[#e8e8e8] px-3 py-1.5 text-[13px] font-bold">
        {collectOnDelivery
          ? `COD Collect amount : Rs. ${inr(order.total)}`
          : 'PREPAID — do not collect any amount'}
      </div>

      {/* Address + routing barcode */}
      <div className="flex border-b border-black">
        <div className="w-1/2 border-r border-black px-3 py-2">
          <p className="text-[12px] leading-[1.45]">
            <span className="font-bold">DELIVERY ADDRESS:</span> {order.customer_name}
            {order.shipping_address && (
              <>
                ,<br />
                {order.shipping_address}
              </>
            )}
            {order.delivery_landmark && (
              <>
                ,<br />
                {order.delivery_landmark}
              </>
            )}
          </p>
          {order.customer_phone && (
            <p className="mt-1 text-[12px] font-bold">Ph: {order.customer_phone}</p>
          )}

          <p className="mt-2 inline-block text-[15px] font-bold tracking-wide">SURFACE</p>
          <div
            aria-hidden
            className="mt-0.5 h-2.5 w-[86px]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(115deg, #000 0 3px, transparent 3px 6px)',
            }}
          />
        </div>

        <div className="flex w-1/2 items-center justify-center p-2">
          <div className="w-full">
            <Barcode value={order.order_number} height={70} />
            <p className="mt-1 text-center font-mono text-[10px]">{order.order_number}</p>
          </div>
        </div>
      </div>

      {/* Courier band */}
      <div className="flex border-b border-black text-[11.5px]">
        <div className="w-1/2 border-r border-black px-3 py-1.5">
          <p>
            <span className="font-bold">Courier Name:</span> {company.deliveryPartner}
          </p>
          <p>
            <span className="font-bold">Reference No:</span> {order.order_number}
          </p>
        </div>
        <div className="w-1/2 px-3 py-1.5">
          <p>
            <span className="font-bold">HBD:</span> {dd(placed)}
          </p>
          <p>
            <span className="font-bold">CPD:</span> {dd(dispatchBy)}
          </p>
        </div>
      </div>

      {/* Seller */}
      <div className="border-b border-black px-3 py-1.5 text-[11px] leading-snug">
        <span className="font-bold">Sold By:</span> {company.name}, {company.address}
        {company.phone ? ` · ${company.phone}` : ''}
      </div>

      {company.gstin && (
        <div className="border-b border-black px-3 py-1.5 text-[11.5px]">
          <span className="font-bold">GSTIN No:</span> {company.gstin}
        </div>
      )}

      {/* What is in the box */}
      <table className="w-full border-b border-black text-[11.5px]">
        <thead>
          <tr>
            <th className="border-b border-r border-black px-3 py-1 text-left font-bold">Product</th>
            <th className="w-14 border-b border-black px-2 py-1 text-center font-bold">Qty</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="border-b border-r border-black px-3 py-1.5 leading-snug">
                {item.sku ? `${item.sku} | ` : ''}
                {item.product_name}
                {item.color_name ? ` — ${item.color_name}` : ''}
              </td>
              <td className="border-b border-black px-2 py-1.5 text-center">{item.quantity}</td>
            </tr>
          ))}
          <tr>
            <td className="border-r border-black px-3 py-1 font-bold">Total</td>
            <td className="px-2 py-1 text-center font-bold">{totalQty}</td>
          </tr>
        </tbody>
      </table>

      {Boolean(order.gift_wrap) && (
        <div className="border-b border-black px-3 py-1.5 text-[11.5px]">
          <span className="font-bold">GIFT WRAP</span>
          {order.gift_note ? ` — card reads: “${order.gift_note}”` : ''}
        </div>
      )}

      {/* Handover strip */}
      <div className="px-3 py-2">
        <div className="flex items-start justify-between">
          <p className="inline-block bg-black px-1.5 py-0.5 text-[12px] font-bold text-white">
            Handover to {company.deliveryPartner}
          </p>
          <p className="text-[13px] font-bold">
            {(order.shipping_method ?? 'standard').toUpperCase()}
          </p>
        </div>

        <p className="mt-2 text-[11.5px]">
          <span className="font-bold">Tracking ID:</span> {order.order_number}
        </p>

        <div className="mt-1">
          <Barcode value={order.order_number} height={44} />
        </div>

        <p className="mt-1 text-[11.5px]">
          <span className="font-bold">Order ID:</span> {order.order_number}
        </p>
      </div>

      <div className="border-t border-black px-3 py-1.5 text-right text-[10.5px]">
        Ordered through <span className="font-bold">{company.name}</span>
      </div>
    </article>
  );
}
