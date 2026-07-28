import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';

import { SectionHeading } from '@/components/ui/Reveal';
import { site, whatsappLink } from '@/lib/site';

import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Talk to DRS 3D WORLD — ${site.contact.address.city}, ${site.contact.address.state}. Call ${site.contact.phone} or send us your file.`,
};

const CHANNELS = [
  {
    icon: Phone,
    label: 'Phone',
    value: site.contact.phone,
    href: `tel:${site.contact.phoneIntl}`,
    note: 'Mon–Sat, 9am to 8pm',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: site.contact.phone,
    href: whatsappLink('Hello DRS 3D WORLD, I have a project I would like to discuss.'),
    note: 'Fastest way to reach us',
  },
  {
    icon: Mail,
    label: 'Email',
    value: site.contact.email,
    href: `mailto:${site.contact.email}`,
    note: 'We reply within one working day',
  },
];

export default function ContactPage() {
  const { address } = site.contact;
  const mapQuery = encodeURIComponent(
    `${address.line1}, ${address.line2}, ${address.city}, ${address.state} ${address.postalCode}, India`,
  );

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Contact"
          title={
            <>
              Tell us what you
              <br />
              want to <span className="text-flame">make</span>.
            </>
          }
          lead="Send a file, a sketch, or just a description. We will tell you honestly whether we are the right people for it."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_420px]">
          <div className="glass rounded-2xl p-7 sm:p-9">
            <ContactForm />
          </div>

          <div className="flex flex-col gap-5">
            {/* Channels */}
            <div className="glass rounded-2xl p-7">
              <h2 className="font-display text-lg font-semibold tracking-tight">Reach us directly</h2>

              <ul className="mt-6 space-y-5">
                {CHANNELS.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      target={channel.href.startsWith('http') ? '_blank' : undefined}
                      rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="group flex items-start gap-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-flame-500/25 bg-flame-500/10 text-flame-500">
                        <channel.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] uppercase tracking-[0.16em] text-ink-500">
                          {channel.label}
                        </span>
                        <span className="block truncate text-[14.5px] font-medium text-white transition-colors group-hover:text-flame-400">
                          {channel.value}
                        </span>
                        <span className="block text-[12px] text-ink-500">{channel.note}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Studio */}
            <div className="glass rounded-2xl p-7">
              <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
                <MapPin className="h-4 w-4 text-flame-500" />
                The studio
              </h2>

              <address className="mt-4 not-italic text-[14px] leading-relaxed text-ink-200">
                {address.line1}
                <br />
                {address.line2}
                <br />
                {address.city}, {address.postalCode}
                <br />
                {address.state}, {address.country}
              </address>

              <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-400">
                <Clock className="h-3.5 w-3.5 text-flame-500" />
                Monday to Saturday, 9:00 – 20:00
              </p>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-white/10 py-2.5 text-[13px] font-medium text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400"
              >
                Open in Google Maps
              </a>
            </div>

            {/* Map */}
            <div className="glass overflow-hidden rounded-2xl">
              <iframe
                title={`Map showing ${site.name} in ${address.city}`}
                src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[280px] w-full border-0 grayscale-[0.6] contrast-[1.1]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
