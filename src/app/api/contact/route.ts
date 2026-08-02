import { NextResponse } from 'next/server';
import { z } from 'zod';

import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { run } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Please tell us your name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  subject: z.string().trim().max(160),
  message: z.string().trim().min(10, 'Please give us a little more detail.').max(5000),
});

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'You have already sent us a few messages. Please call instead — it is faster.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const lead = parsed.data;

  await run(
    `INSERT INTO leads (name, email, phone, company, subject, message, source, status)
     VALUES (?, ?, ?, ?, ?, ?, 'contact_form', 'new')`,
    [lead.name, lead.email, lead.phone || null, lead.company || null, lead.subject, lead.message],
  );

  await run(
    `INSERT INTO notifications (title, body, type, href) VALUES (?, ?, 'lead', '/admin/leads')`,
    [`New enquiry from ${lead.name}`, lead.subject],
  );

  await sendMail({
    to: site.contact.email,
    subject: `Website enquiry — ${lead.subject}`,
    text: [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      lead.phone ? `Phone: ${lead.phone}` : '',
      lead.company ? `Company: ${lead.company}` : '',
      '',
      lead.message,
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return NextResponse.json({ ok: true });
}
