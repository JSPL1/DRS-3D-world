import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/Button';
import { Reveal, SectionHeading } from '@/components/ui/Reveal';
import { getFaqs } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description: 'File formats, lead times, materials, build volume, delivery and NDAs — answered.',
};

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

export default async function FaqPage() {
  const faqs = await getFaqs();

  const grouped = faqs.reduce<Record<string, typeof faqs>>((acc, faq) => {
    const key = faq.category ?? 'General';
    (acc[key] ??= []).push(faq);
    return acc;
  }, {});

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <div className="pb-24 pt-36">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title={
            <>
              Questions we get <span className="text-flame">often</span>.
            </>
          }
        />

        <div className="mt-14 space-y-12">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame-500">
                {category}
              </h2>

              <div className="mt-5 space-y-3">
                {items.map((faq) => (
                  <details
                    key={faq.id}
                    className="group glass overflow-hidden rounded-2xl transition-colors duration-300 hover:border-flame-500/25"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 text-[15px] font-medium text-white [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                        <span className="absolute h-0.5 w-3.5 rounded bg-flame-500" />
                        <span className="absolute h-3.5 w-0.5 rounded bg-flame-500 transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
                      </span>
                    </summary>
                    <p className="px-6 pb-6 text-[14px] leading-relaxed text-ink-300">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <Reveal>
          <div className="glass-strong mt-16 rounded-2xl px-8 py-12 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Still not answered?
            </h2>
            <p className="mt-3 text-[14px] text-ink-300">
              Ask us directly — we would rather answer than have you guess.
            </p>
            <div className="mt-7">
              <ButtonLink href="/contact" size="lg">Ask a question</ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
