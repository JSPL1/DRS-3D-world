import { ArrowRight, MapPin } from 'lucide-react';
import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: `${site.name} is a 3D printing and innovation studio in ${site.contact.address.city}, ${site.contact.address.state}.`,
};

const VALUES = [
  {
    title: 'We tell you when it will not work',
    body: 'Thin walls, trapped volumes, a material that will not survive where you are putting it — you hear about it before you pay, not after. We have talked people out of jobs we could have billed for.',
  },
  {
    title: 'A date, not a range',
    body: 'Every quote carries a specific date. If we are going to miss it, you hear that early enough to do something about it. That is rarer in this trade than it should be.',
  },
  {
    title: 'We print what we design',
    body: 'The people drawing the CAD are the people removing the supports. It shows up in the parts — designers who have never finished a print keep designing parts that are miserable to finish.',
  },
  {
    title: 'One studio, no middlemen',
    body: 'Everything runs through our floor in IRC Village. Nobody quotes on our behalf and nobody else sets your date.',
  },
];

export default function AboutPage() {
  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="About"
          title={
            <>
              Bringing your ideas to life,
              <br />
              <span className="text-flame">one layer at a time</span>.
            </>
          }
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6 text-[16px] leading-[1.8] text-ink-200">
            <p>
              DRS 3D WORLD is a 3D printing and innovation studio in Bhubaneswar. We print, design
              and develop — statues and figurines for people, functional parts and prototypes for
              companies, and models for architects, surgeons and teachers.
            </p>
            <p>
              The work splits roughly in half. One side is deeply personal: a couple statue for a
              wedding, a Hanuman murti for a puja room, a miniature of someone’s dog. The other is
              relentlessly practical: a housing that has to fit, a fixture that has to hold, a
              manifold that has to flow. Both halves need the same thing — someone who understands
              the process well enough to tell you the truth about what it can do.
            </p>
            <p>
              We run FDM and SLA side by side because neither is universally right. We keep over
              thirty filament colours and four resin families on the shelf so material rarely
              becomes the reason a date slips. And we check every incoming file for printability
              before quoting, because finding a problem after printing helps nobody.
            </p>
            <p>
              If you have something in mind — a file, a sketch, or just a description — we would
              like to hear about it.
            </p>
          </div>

          <div className="glass h-fit rounded-2xl p-7">
            <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
              <MapPin className="h-4 w-4 text-flame-500" />
              Find us
            </h2>

            <address className="mt-4 not-italic text-[14px] leading-relaxed text-ink-200">
              {site.contact.address.line1}
              <br />
              {site.contact.address.line2}
              <br />
              {site.contact.address.city}, {site.contact.address.postalCode}
              <br />
              {site.contact.address.state}, {site.contact.address.country}
            </address>

            <dl className="mt-6 space-y-3 border-t border-white/5 pt-6 text-[13.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">Phone</dt>
                <dd>
                  <a href={`tel:${site.contact.phoneIntl}`} className="text-white hover:text-flame-400">
                    {site.contact.phone}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">Email</dt>
                <dd className="min-w-0 truncate">
                  <a href={`mailto:${site.contact.email}`} className="text-white hover:text-flame-400">
                    {site.contact.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">Hours</dt>
                <dd className="text-white">Mon–Sat, 9–20</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="font-display text-3xl font-bold tracking-tight">How we work</h2>

          <RevealGroup className="mt-10 grid gap-5 md:grid-cols-2">
            {VALUES.map((value) => (
              <RevealItem key={value.title}>
                <div className="glass h-full rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-flame-500/30">
                  <h3 className="font-display text-lg font-semibold tracking-tight">{value.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-300">{value.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        <Reveal>
          <div className="glass-strong mt-16 rounded-3xl px-8 py-14 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Come and see the machines
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-300">
              We are in IRC Village, Nayapalli. Call ahead and we will have something on the plate
              when you arrive.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/contact" size="lg">
                Get in touch
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/gallery" variant="secondary" size="lg">
                See our work
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
