import 'server-only';

import nodemailer, { type Transporter } from 'nodemailer';

import { getSettings } from '@/lib/queries';
import { site } from '@/lib/site';

/**
 * Outgoing mail.
 *
 * This used to log messages to the console and return success. Every auth
 * flow therefore reported "a code is on its way" and nothing was ever sent —
 * a customer who tried to register waited for an email that did not exist.
 *
 * Configuration lives in the database rather than in environment variables so
 * the studio can set it from Settings → Email without a redeploy, which on
 * this host means without an SSH session. Environment variables still win if
 * they are set, for anyone who prefers to keep secrets out of the database.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromAddress: string;
};

export async function getMailConfig(): Promise<MailConfig | null> {
  const s = await getSettings();

  const host = (process.env.SMTP_HOST ?? s.smtp_host ?? '').trim();
  const user = (process.env.SMTP_USER ?? s.smtp_user ?? '').trim();
  const pass = process.env.SMTP_PASS ?? s.smtp_pass ?? '';
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? s.smtp_port ?? 587) || 587;

  return {
    host,
    port,
    // Port 465 is implicit TLS; 587 upgrades with STARTTLS after connecting.
    secure: (process.env.SMTP_SECURE ?? s.smtp_secure ?? '') === 'true' || port === 465,
    user,
    pass,
    fromName: (process.env.MAIL_FROM_NAME ?? s.smtp_from_name ?? site.name).trim() || site.name,
    // Most providers reject a From that isn't the authenticated mailbox.
    fromAddress: (process.env.MAIL_FROM ?? s.smtp_from_address ?? user).trim() || user,
  };
}

/** Whether anything can be sent at all. */
export async function isMailConfigured(): Promise<boolean> {
  return (await getMailConfig()) !== null;
}

/**
 * Transports hold a pooled connection, so one is reused rather than dialled
 * per message. Keyed on the configuration, because changing the password in
 * Settings has to take effect without restarting the server.
 */
const globalForMail = globalThis as unknown as {
  __drsMail?: { key: string; transport: Transporter };
};

function getTransport(config: MailConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass}`;
  if (globalForMail.__drsMail?.key === key) return globalForMail.__drsMail.transport;

  globalForMail.__drsMail?.transport.close();

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    pool: true,
    maxConnections: 2,
    // A shared host can be slow to open an outbound connection; the library's
    // defaults are tighter than that and produce spurious failures.
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 25000,
  });

  globalForMail.__drsMail = { key, transport };
  return transport;
}

export type SendResult = { ok: true; messageId: string } | { ok: false; error: string };

/**
 * Sends, and reports what happened.
 *
 * Callers in the auth flows deliberately ignore the result — an SMTP outage
 * must not fail the request or reveal whether an address is registered — but
 * the failure is logged, and Settings → Email uses the result to tell the
 * administrator exactly why a test message did not arrive.
 */
export async function sendMail(mail: Mail): Promise<SendResult> {
  const config = await getMailConfig();

  if (!config) {
    const error =
      'Email is not configured. Add the SMTP details under Settings → Email before using anything that sends a code.';
    console.error(`[drs:mail] ${error} (to ${mail.to}: ${mail.subject})`);
    return { ok: false, error };
  }

  try {
    const info = await getTransport(config).sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[drs:mail] delivery to ${mail.to} failed: ${message}`);
    return { ok: false, error: message };
  }
}

/* ---------------- Messages ---------------- */

const wrap = (heading: string, body: string) => `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f6f6f8;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#bf4a00">
      ${site.name}
    </p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#101015">${heading}</h1>
    ${body}
    <p style="margin:28px 0 0;font-size:12px;color:#64646f">
      ${site.name} · Bhubaneswar, Odisha
    </p>
  </div>
</div>`;

export type OtpEmailPurpose = 'verify' | 'reset';

const OTP_COPY: Record<OtpEmailPurpose, { subject: string; heading: string; lead: string; footer: string }> = {
  verify: {
    subject: 'Confirm your email',
    heading: 'Confirm your email address',
    lead: 'Enter this code on the site to finish setting up your account.',
    footer:
      'Did not sign up? Ignore this email — no account is created until the code is entered.',
  },
  reset: {
    subject: 'Reset your password',
    heading: 'Reset your password',
    lead: 'Enter this code on the site to choose a new password.',
    footer:
      'Did not ask for this? Ignore this email — your password has not changed, and nobody can change it without this code.',
  },
};

/**
 * The verification code email.
 *
 * Written for how it is actually read: on a phone, in a notification, while
 * the person is mid-task on the site. So the code is in the subject line —
 * usually that alone is enough and the email is never opened — and the body
 * leads with what the code is for rather than with a greeting.
 *
 * Both a plain-text and an HTML part are sent. The text part is not a
 * fallback nobody sees: some clients prefer it, and a message with no text
 * alternative scores worse with spam filters.
 */
export async function sendOtpEmail(
  to: string,
  code: string,
  minutes: number,
  options: { purpose?: OtpEmailPurpose; name?: string | null } = {},
) {
  const copy = OTP_COPY[options.purpose ?? 'verify'];
  const firstName = options.name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

  return sendMail({
    to,
    subject: `${code} is your ${site.name} code — ${copy.subject.toLowerCase()}`,
    text: [
      greeting,
      '',
      copy.lead,
      '',
      `    ${code}`,
      '',
      `This code expires in ${minutes} minutes and can only be used once.`,
      'Never share it with anyone. We will never ask you for it by phone or on WhatsApp.',
      '',
      copy.footer,
      '',
      `— ${site.name}`,
      `${site.contact.phone} · ${site.contact.email}`,
    ].join('\n'),
    html: wrap(
      copy.heading,
      `<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#41414b">${greeting}</p>
       <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#41414b">${copy.lead}</p>

       <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:.22em;color:#101015;
                 background:#f7f7f9;border:1px solid #ebebef;border-radius:12px;
                 padding:20px;text-align:center">${code}</p>

       <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#64646f">
         Expires in <strong style="color:#41414b">${minutes} minutes</strong>, and works once.
       </p>

       <p style="margin:20px 0 0;padding:12px 14px;background:#fff4ec;border-radius:10px;
                 font-size:13px;line-height:1.6;color:#8c3d00">
         Never share this code. ${site.name} will never ask you for it by phone, SMS or WhatsApp.
       </p>

       <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64646f">
         ${copy.footer}
       </p>`,
    ),
  });
}
