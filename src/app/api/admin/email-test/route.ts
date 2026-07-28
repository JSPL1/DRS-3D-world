import { NextResponse } from 'next/server';
import { z } from 'zod';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { getMailConfig, sendMail, sendOtpEmail } from '@/lib/mailer';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

const schema = z.object({
  to: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  // 'otp' sends the real verification email with a throwaway code, so the
  // wording and layout can be reviewed in a real inbox rather than guessed at.
  kind: z.enum(['plain', 'otp']).default('plain'),
});

/**
 * Sends one real message and reports exactly what the mail server said.
 *
 * Without this, a wrong password looks identical to a working configuration:
 * the auth flows deliberately never reveal whether an address is registered,
 * so they cannot surface a delivery failure either. This is the one place the
 * error is allowed out, and only to an administrator.
 */
export async function POST(req: Request) {
  const { user, deny } = await guard('settings.edit');
  if (deny) return deny;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const config = getMailConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'Fill in the SMTP server, username and password above, save, then try again.' },
      { status: 400 },
    );
  }

  const result =
    parsed.data.kind === 'otp'
      ? // A real code is never reused for a sample: this one is written here
        // and stored nowhere, so it cannot verify anything.
        await sendOtpEmail(parsed.data.to, '123456', 10, {
          purpose: 'verify',
          name: user.name,
        })
      : await sendMail({
          to: parsed.data.to,
          subject: `${site.name} — email is working`,
          text: [
            'This is a test message from your admin panel.',
            '',
            `Sent via ${config.host}:${config.port} as ${config.user}.`,
            '',
            'If you can read this, verification codes and order emails will reach customers.',
          ].join('\n'),
        });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, host: config.host, port: config.port, user: config.user },
      { status: 502 },
    );
  }

  logActivity(
    user.id, user.name, 'sent test email', 'settings', undefined,
    `${parsed.data.kind} → ${parsed.data.to}`,
  );

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    sentVia: `${config.host}:${config.port}`,
    from: `${config.fromName} <${config.fromAddress}>`,
  });
}
