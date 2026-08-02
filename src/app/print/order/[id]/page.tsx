import { notFound } from 'next/navigation';

import {
  DeliveryChallan, type ChallanCompany, type ChallanItem, type ChallanOrder,
} from '@/components/print/DeliveryChallan';
import { OrderPrint, type PrintItem, type PrintOrder } from '@/components/print/OrderPrint';
import { PrintToolbar } from '@/components/print/PrintToolbar';
import { requirePermission } from '@/lib/auth/session';
import { all, one } from '@/lib/db';
import { isChallanSize, type ChallanSize } from '@/lib/print-sizes';
import { getSettings } from '@/lib/queries';
import { site } from '@/lib/site';

export const metadata = { title: 'Print order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Page box per paper choice. The challan fills its label; the order sheet gets margins. */
const PAGE_CSS: Record<ChallanSize, { page: string; width: string }> = {
  '4x6': { page: '@page { size: 4in 6in; margin: 4mm; }', width: '92mm' },
  a5: { page: '@page { size: A5; margin: 8mm; }', width: '132mm' },
  a4: { page: '@page { size: A4; margin: 12mm; }', width: '186mm' },
  a4half: { page: '@page { size: A4; margin: 10mm; }', width: '128mm' },
};

export default async function PrintOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string; size?: string }>;
}) {
  await requirePermission('orders.view');

  const { id } = await params;
  const query = await searchParams;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const doc = query.doc === 'order' ? 'order' : 'challan';
  const size: ChallanSize = isChallanSize(query.size) ? query.size : doc === 'order' ? 'a4' : '4x6';

  const order = await one<PrintOrder & ChallanOrder>(
    `SELECT order_number, customer_name, customer_email, customer_phone, shipping_address,
            delivery_landmark, subtotal, discount, tax, shipping, total, coupon_code,
            status, payment_status, shipping_method, gift_wrap, gift_wrap_fee, gift_note,
            notes, created_at
     FROM orders WHERE id = ?`,
    [orderId],
  );
  if (!order) notFound();

  const items = await all<PrintItem & ChallanItem>(
    `SELECT product_name, sku, quantity, unit_price, total, color_name
     FROM order_items WHERE order_id = ? ORDER BY id`,
    [orderId],
  );

  const settings = await getSettings();
  const company: ChallanCompany = {
    name: settings.site_name?.trim() || site.name,
    address: settings.address?.trim() || site.contact.address.line1,
    phone: settings.contact_phone?.trim() || site.contact.phone,
    gstin: settings.company_gstin?.trim() || '',
    deliveryPartner: settings.delivery_partner?.trim() || 'DRS 3D WORLD Delivery',
  };

  const { page, width } = PAGE_CSS[size];

  return (
    <>
      {/* Paper geometry has to be real CSS — Tailwind cannot express @page. */}
      <style>{`
        ${page}
        .print-sheet { width: ${width}; }
        @media print {
          html, body { background: #fff !important; }
          .print-shell { padding: 0 !important; }
          .print-sheet { width: 100% !important; }
        }
      `}</style>

      <PrintToolbar doc={doc} size={size} />

      <div className="print-shell px-5 pb-16">
        <div className="print-sheet print-doc mx-auto">
          {doc === 'challan' ? (
            <DeliveryChallan order={order} items={items} company={company} />
          ) : (
            <OrderPrint
              order={order}
              items={items}
              company={company}
              gstPercent={Number(settings.gst_percent) || 18}
            />
          )}
        </div>
      </div>
    </>
  );
}
