import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { getCurrentUser } from '@/lib/auth/session';
import { all, getPool, one } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const schema = z.object({
  customerName: z.string().trim().min(2, 'Please give us your name.').max(120),
  customerEmail: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  customerPhone: z.string().trim().min(6, 'A phone number helps us confirm your order.').max(30),
  address: z.string().trim().min(10, 'Please give a full delivery address.').max(600),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
  giftWrap: z.boolean().optional(),
  giftNote: z.string().trim().max(240).optional().or(z.literal('')),
  shippingMethod: z.enum(['standard', 'express', 'priority']).optional(),
  deliveryLat: z.number().min(-90).max(90).nullable().optional(),
  deliveryLng: z.number().min(-180).max(180).nullable().optional(),
  deliveryLandmark: z.string().trim().max(200).optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        colorId: z.number().int().positive().nullable(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Your cart is empty.')
    .max(50),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`order:${ip}`, 12, 60 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many orders from this connection. Please call us instead.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const input = parsed.data;
  const user = await getCurrentUser();

  /* ---------- An account is required, from the first order ----------
     Guest checkout was allowed once, then an account from the second order.
     The studio's rule is simpler: no order without an account. That is what
     makes payment attributable to somebody, and what gives the customer an
     order history to look at rather than a reference number in an email.

     Checked here as well as in the UI, because "the button was hidden" is
     not access control. */
  if (!user) {
    return NextResponse.json(
      {
        error: 'Please sign in to place your order. Creating an account takes a minute.',
        requiresSignIn: true,
      },
      { status: 401 },
    );
  }

  const settingRows = await all<{ key: string; value: string }>(`SELECT \`key\`, value FROM settings`);
  const settings = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
  const gstPercent = Number(settings.gst_percent) || 18;
  const freeDeliveryAbove = Number(settings.free_delivery_above) || 10000;
  const deliveryFee = Number(settings.shipping_standard_fee) || 250;
  const expressFee = Number(settings.shipping_express_fee) || 600;
  const priorityFee = Number(settings.shipping_priority_fee) || 1200;
  const giftWrapFee = Number(settings.gift_wrap_fee) || 149;

  const shippingMethod = input.shippingMethod ?? 'standard';
  const giftWrap = Boolean(input.giftWrap);

  /* ---------- Price every line from the database ----------
     The browser sends product ids, colours and quantities only. Prices,
     discounts and colour surcharges are all resolved here, so a tampered
     cart in localStorage cannot change what is actually charged. */
  type Priced = {
    productId: number;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
    colorName: string | null;
    colorHex: string | null;
  };

  const priced: Priced[] = [];

  for (const item of input.items) {
    const product = await one<{
      id: number;
      name: string;
      sku: string;
      price: number;
      discount_price: number | null;
      status: string;
      visibility: string;
    }>(
      `SELECT id, name, sku, price, discount_price, status, visibility
       FROM products WHERE id = ?`,
      [item.productId],
    );

    if (!product || product.status !== 'published' || product.visibility !== 'public') {
      return NextResponse.json(
        { error: 'One of the items is no longer available. Please review your cart.' },
        { status: 409 },
      );
    }

    let unitPrice = product.discount_price ?? product.price;
    let colorName: string | null = null;
    let colorHex: string | null = null;

    if (item.colorId !== null) {
      const color = await one<{ name: string; hex: string; price_delta: number }>(
        `SELECT c.name, c.hex, pc.price_delta
         FROM product_colors pc JOIN colors c ON c.id = pc.color_id
         WHERE pc.product_id = ? AND pc.color_id = ? AND c.is_active = 1`,
        [item.productId, item.colorId],
      );

      if (!color) {
        return NextResponse.json(
          { error: `That colour is not available for ${product.name}.` },
          { status: 409 },
        );
      }
      unitPrice += color.price_delta;
      colorName = color.name;
      colorHex = color.hex;
    }

    priced.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
      colorName,
      colorHex,
    });
  }

  const subtotal = Math.round(priced.reduce((sum, l) => sum + l.total, 0) * 100) / 100;

  /* ---------- Coupon ---------- */
  let discount = 0;
  let appliedCoupon: string | null = null;

  if (input.couponCode) {
    const coupon = await one<{
      id: number; code: string; type: string; value: number;
      min_order: number; max_discount: number | null;
      usage_limit: number | null; used_count: number;
    }>(
      `SELECT id, code, type, value, min_order, max_discount, usage_limit, used_count
       FROM coupons
       WHERE code = ? AND is_active = 1
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [input.couponCode.toUpperCase()],
    );

    if (!coupon) {
      return NextResponse.json({ error: 'That coupon code is not valid.' }, { status: 400 });
    }
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return NextResponse.json({ error: 'That coupon has been fully redeemed.' }, { status: 400 });
    }
    if (subtotal < coupon.min_order) {
      return NextResponse.json(
        { error: `This coupon needs a subtotal of at least ₹${coupon.min_order}.` },
        { status: 400 },
      );
    }

    discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
    if (coupon.max_discount !== null) discount = Math.min(discount, coupon.max_discount);
    discount = Math.min(discount, subtotal);
    appliedCoupon = coupon.code;
  }

  // Money is rounded to paise at every step. Without this the stored total
  // carries floating-point tails (…7682.938), which then disagree with what
  // the customer was shown and with anything the accountant reconciles later.
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  discount = round2(discount);
  const wrapFee = giftWrap ? giftWrapFee : 0;
  const taxable = round2(subtotal - discount + wrapFee);
  const tax = round2((taxable * gstPercent) / 100);
  const baseShipping = shippingMethod === 'express' ? expressFee
    : shippingMethod === 'priority' ? priorityFee
    : (subtotal - discount) >= freeDeliveryAbove ? 0 : deliveryFee;
  const shipping = baseShipping;
  const total = round2(taxable + tax + shipping);

  /* ---------- Persist ---------- */
  const orderNumber = `DRS-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

  const conn = await getPool().getConnection();
  let orderId: number;
  try {
    await conn.beginTransaction();

    const [result] = await conn.query<import('mysql2').ResultSetHeader>(
      `INSERT INTO orders (order_number, user_id, customer_name, customer_email, customer_phone,
                          shipping_address, subtotal, discount, tax, shipping, total, coupon_code,
                          status, payment_status, payment_method, notes, placed_via,
                          gift_wrap, gift_wrap_fee, gift_note,
                          delivery_lat, delivery_lng, delivery_landmark, shipping_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', NULL, ?, 'website',
              ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber, user.id,
        input.customerName, input.customerEmail, input.customerPhone,
        input.address, subtotal, discount, tax, shipping, total,
        appliedCoupon, input.notes || null,
        giftWrap ? 1 : 0, wrapFee, giftWrap ? (input.giftNote || null) : null,
        input.deliveryLat ?? null, input.deliveryLng ?? null,
        input.deliveryLandmark || null, shippingMethod,
      ],
    );
    orderId = result.insertId;

    for (const line of priced) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, total,
                                 color_name, color_hex)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.name, line.sku, line.quantity, line.unitPrice, line.total, line.colorName, line.colorHex],
      );
    }
    if (appliedCoupon) {
      await conn.query(`UPDATE coupons SET used_count = used_count + 1 WHERE code = ?`, [appliedCoupon]);
    }

    // 1 loyalty point per ₹100 of the order total — awarded on placement,
    // same as every "earn on purchase" scheme; nothing to redeem against yet.
    await conn.query(`UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?`, [Math.floor(total / 100), user.id]);

    await conn.query(
      `INSERT INTO notifications (title, body, type, href) VALUES (?, ?, 'order', '/admin/orders')`,
      [`New order ${orderNumber}`, `${input.customerName} — ${priced.length} item(s), ₹${total.toFixed(0)}`],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  await sendMail({
    to: site.contact.email,
    subject: `New order ${orderNumber} — ${input.customerName}`,
    text: [
      `Order: ${orderNumber}`,
      `Customer: ${input.customerName} · ${input.customerEmail} · ${input.customerPhone}`,
      `Address: ${input.address}`,
      '',
      ...priced.map(
        (l) =>
          `  ${l.quantity} × ${l.name}${l.colorName ? ` (${l.colorName})` : ''} — ₹${l.total.toFixed(0)}`,
      ),
      '',
      `Subtotal ₹${subtotal.toFixed(0)}`,
      appliedCoupon ? `Discount (${appliedCoupon}) −₹${discount.toFixed(0)}` : '',
      giftWrap ? `Gift wrap ₹${wrapFee.toFixed(0)}${input.giftNote ? ` — note: "${input.giftNote}"` : ''}` : '',
      `GST ₹${tax.toFixed(0)}`,
      `Delivery (${shippingMethod}) ₹${shipping.toFixed(0)}`,
      input.deliveryLat != null ? `Pinned location: ${input.deliveryLat}, ${input.deliveryLng}` : '',
      `TOTAL ₹${total.toFixed(0)}`,
      '',
      'Payment is not yet collected online — contact the customer to arrange it.',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return NextResponse.json({
    ok: true,
    orderNumber,
    orderId,
    totals: { subtotal, discount, giftWrapFee: wrapFee, tax, shipping, total },
  });
}
