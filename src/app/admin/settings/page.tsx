import { BrandingUploader } from '@/components/admin/BrandingUploader';
import { EmailTester } from '@/components/admin/EmailTester';
import { PageHeader } from '@/components/admin/Shell';
import { SettingsForm, type SettingGroup } from '@/components/admin/SettingsForm';
import { requirePermission } from '@/lib/auth/session';
import { CURSOR_VARIANTS } from '@/lib/cursor';
import { getSettings } from '@/lib/queries';

export const metadata = { title: 'Settings' };

const GROUPS: SettingGroup[] = [
  {
    title: 'Appearance',
    description:
      'The theme applies to every visitor and every page — it is a property of the site, not a per-visitor preference, so there is no theme switch in the public header.',
    fields: [
      {
        key: 'site_theme',
        label: 'Site theme',
        type: 'select',
        options: [
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ],
        hint: 'Also re-lights the 3D hero to match.',
      },
      {
        key: 'site_cursor',
        label: 'Mouse pointer',
        type: 'select',
        options: CURSOR_VARIANTS.map((v) => ({ value: v.id, label: v.label })),
        hint:
          'Applies to the site and this panel. ' +
          CURSOR_VARIANTS.map((v) => `${v.label}: ${v.description}`).join(' · ') +
          ' Custom pointers are shown on mouse-driven devices only, and never when the reader has asked for reduced motion.',
      },
    ],
  },
  {
    title: '3D hero (homepage)',
    description:
      'The scroll-driven 3D printer at the top of the homepage. Turn it off for a plainer, lighter-weight homepage, or choose how it plays.',
    fields: [
      {
        key: 'hero_3d_enabled',
        label: '3D hero',
        type: 'select',
        options: [
          { value: 'true', label: 'Enabled' },
          { value: 'false', label: 'Disabled (static hero instead)' },
        ],
      },
      {
        key: 'hero_3d_play_mode',
        label: 'Play mode',
        type: 'select',
        options: [
          { value: 'scroll', label: 'Scroll-linked' },
          { value: 'time', label: 'Timed autoplay' },
        ],
        hint:
          'Scroll-linked: progress follows how far the visitor scrolls — set the scroll length below. ' +
          'Timed autoplay: plays on a clock once it comes into view, however the visitor scrolls — set the duration below.',
      },
      {
        key: 'hero_3d_scroll_vh',
        label: 'Scroll length',
        type: 'number',
        suffix: 'vh',
        hint: 'Used only in Scroll-linked mode. Viewport-heights of scrolling to finish the sequence. Default 720 — lower finishes sooner, higher takes more scrolling.',
      },
      {
        key: 'hero_3d_time_seconds',
        label: 'Autoplay duration',
        type: 'number',
        suffix: 'sec',
        hint: 'Used only in Timed autoplay mode. How many seconds the sequence takes to play through once it is in view.',
      },
    ],
  },
  {
    title: 'Email',
    description:
      'Verification codes, order confirmations and password resets are sent from here. Until these are filled in, nothing is sent — sign-up and password reset will not work.',
    fields: [
      {
        key: 'smtp_host',
        label: 'SMTP server',
        hint: 'On alwaysdata this is smtp-dr3dworld.alwaysdata.net. For Gmail it is smtp.gmail.com.',
      },
      { key: 'smtp_port', label: 'Port', type: 'number', hint: '587 for STARTTLS, 465 for TLS.' },
      {
        key: 'smtp_user',
        label: 'Username',
        hint: 'Usually the full mailbox address you are sending from.',
      },
      {
        key: 'smtp_pass',
        label: 'Password',
        type: 'password',
        hint:
          'For Gmail this must be an App Password, not the account password. Stored on the server and never sent back to this page.',
      },
      { key: 'smtp_from_name', label: 'Sender name', hint: 'Shown as the sender in the inbox.' },
      {
        key: 'smtp_from_address',
        label: 'Sender address',
        hint: 'Most providers reject a sender that is not the mailbox above. Leave blank to use the username.',
      },
    ],
  },
  {
    title: 'Identity',
    description: 'Shown in the header, footer and browser tab.',
    fields: [
      { key: 'site_name', label: 'Site name' },
      { key: 'site_tagline', label: 'Tagline' },
      { key: 'site_slogan', label: 'Slogan', type: 'textarea' },
    ],
  },
  {
    title: 'Contact',
    description: 'Used on the contact page, in the footer and in WhatsApp links.',
    fields: [
      { key: 'contact_phone', label: 'Phone number' },
      { key: 'contact_email', label: 'Email address' },
      { key: 'whatsapp_number', label: 'WhatsApp number', hint: 'With country code, no plus sign — e.g. 916371989465.' },
      { key: 'address', label: 'Studio address', type: 'textarea' },
    ],
  },
  {
    title: 'Commerce',
    description: 'Applied to orders and to every quote the calculator produces.',
    fields: [
      { key: 'currency', label: 'Currency code' },
      { key: 'gst_percent', label: 'GST', type: 'number', suffix: '%' },
      { key: 'free_delivery_above', label: 'Free delivery above', type: 'number', suffix: '₹' },
      {
        key: 'company_gstin',
        label: 'Company GSTIN',
        hint: 'Printed on delivery challans and order print-outs. Leave blank and the GSTIN line is left off entirely.',
      },
    ],
  },
  {
    title: 'Quote calculator',
    description:
      'These drive the instant quote page. Changing them re-prices every new quote immediately — existing saved quotes keep the figures they were created with.',
    fields: [
      { key: 'quote_machine_rate_per_hour', label: 'Machine rate', type: 'number', suffix: '₹/h' },
      { key: 'quote_labour_rate_per_hour', label: 'Labour rate', type: 'number', suffix: '₹/h' },
      { key: 'quote_electricity_rate_per_kwh', label: 'Electricity', type: 'number', suffix: '₹/kWh' },
      { key: 'quote_printer_watts', label: 'Printer draw', type: 'number', suffix: 'W' },
      { key: 'quote_profit_margin_percent', label: 'Margin', type: 'number', suffix: '%' },
      { key: 'quote_setup_fee', label: 'Setup fee', type: 'number', suffix: '₹' },
    ],
  },
  {
    title: 'Shipping & gift wrap',
    description: 'Speed tiers offered at checkout, and the flat fee for the gift-wrap add-on.',
    fields: [
      { key: 'shipping_standard_fee', label: 'Standard fee', type: 'number', suffix: '₹' },
      { key: 'shipping_standard_days', label: 'Standard timeframe' },
      { key: 'shipping_express_fee', label: 'Express fee', type: 'number', suffix: '₹' },
      { key: 'shipping_express_days', label: 'Express timeframe' },
      { key: 'shipping_priority_fee', label: 'Priority fee', type: 'number', suffix: '₹' },
      { key: 'shipping_priority_days', label: 'Priority timeframe' },
      { key: 'gift_wrap_fee', label: 'Gift wrap fee', type: 'number', suffix: '₹' },
      {
        key: 'delivery_partner',
        label: 'Delivery partner',
        hint: 'Shown as the courier on printed delivery challans.',
      },
    ],
  },
  {
    title: 'Integrations',
    description:
      'Google sign-in, Razorpay payments and WhatsApp order updates are built and wired up, but stay switched off until real credentials are added here — nothing pretends to work before it does.',
    fields: [
      {
        key: 'oauth_google_client_id',
        label: 'Google OAuth client ID',
        hint: 'From Google Cloud Console → APIs & Services → Credentials. Authorised redirect URI: ' +
          '/api/auth/google/callback on this domain.',
      },
      { key: 'oauth_google_client_secret', label: 'Google OAuth client secret', type: 'password' },
      {
        key: 'razorpay_key_id',
        label: 'Razorpay key ID',
        hint: 'From the Razorpay dashboard, once the merchant account is KYC-verified.',
      },
      { key: 'razorpay_key_secret', label: 'Razorpay key secret', type: 'password' },
      {
        key: 'whatsapp_phone_id',
        label: 'WhatsApp phone number ID',
        hint: 'From Meta for Developers → WhatsApp → API Setup.',
      },
      { key: 'whatsapp_access_token', label: 'WhatsApp access token', type: 'password' },
    ],
  },
  {
    title: 'Security',
    description: 'Session behaviour for everyone signing in.',
    fields: [
      {
        key: 'session_timeout_minutes',
        label: 'Session timeout',
        type: 'number',
        suffix: 'min',
        hint: 'Applies to new sign-ins. Set the SESSION_TIMEOUT_MINUTES environment variable to change token lifetime itself.',
      },
      { key: 'remember_me_days', label: 'Remember me for', type: 'number', suffix: 'days' },
    ],
  },
];

/**
 * The stored SMTP password must not be handed to the browser. A sentinel goes
 * in its place; the form sends it back only if the administrator typed
 * something new, so leaving the field alone keeps the stored value.
 */
const SECRET_KEYS = [
  'smtp_pass', 'oauth_google_client_secret', 'razorpay_key_secret', 'whatsapp_access_token',
] as const;
const SECRET_PLACEHOLDER = '••••••••••••';

export default async function AdminSettingsPage() {
  await requirePermission('settings.edit');
  const stored = await getSettings();

  const settings = { ...stored };
  for (const key of SECRET_KEYS) {
    if (settings[key]) settings[key] = SECRET_PLACEHOLDER;
  }

  const emailConfigured = Boolean(stored.smtp_host && stored.smtp_user && stored.smtp_pass);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Appearance, studio details, pricing rates and session behaviour."
      />

      <div className="mb-5">
        <BrandingUploader
          logoUrl={settings.site_logo_url || null}
          logoLightUrl={settings.site_logo_light_url || null}
          faviconUrl={settings.site_favicon_url || null}
        />
      </div>

      <SettingsForm groups={GROUPS} initial={settings} />

      <div className="mt-5">
        <EmailTester configured={emailConfigured} />
      </div>
    </>
  );
}
