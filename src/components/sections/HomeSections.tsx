import {
  ArrowRight, Award, Boxes, Building2, Car, Cpu, Factory, GraduationCap,
  HardHat, Heart, Gem, Layers, Mountain, PenTool, Rocket, ScanLine,
  Settings2, Shield, ShoppingBag, Sparkles, Truck, Upload, Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { ProductCard } from '@/components/sections/ProductCard';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { site } from '@/lib/site';
import type { Product } from '@/lib/queries';

/* ============================================================
   Services
   ============================================================ */

/** Lucide icons all accept `className`; typing them this way keeps JSX happy. */
type IconComponent = React.ComponentType<{ className?: string }>;

const SERVICE_ICONS: Record<string, IconComponent> = {
  '3d-printing': Layers,
  '3d-design': PenTool,
  prototyping: Rocket,
  'model-making': Boxes,
  'product-development': Settings2,
  'custom-solutions': Sparkles,
  'reverse-engineering': ScanLine,
  'cad-design': PenTool,
  'stl-repair': Wrench,
  'architectural-models': Building2,
  'medical-models': Heart,
  'industrial-parts': Factory,
  'corporate-gifts': Award,
  miniatures: Boxes,
  'custom-figurines': Sparkles,
  '3d-scanning': ScanLine,
};

const SERVICE_COPY: Record<string, string> = {
  '3d-printing': 'FDM, SLA and resin production on machines that run seven days a week.',
  '3d-design': 'Concept to production-ready CAD, built by people who print what they draw.',
  prototyping: 'Files in before noon, a finished part in your hands the next working day.',
  'model-making': 'Presentation models where the finish matters as much as the geometry.',
  'product-development': 'From sketch to a manufacturable product, with the tooling questions answered.',
  'custom-solutions': 'The jobs that do not fit a category. Bring us the awkward one.',
};

export function ServicesSection() {
  const primary = site.services.filter((s) => s.primary);
  const secondary = site.services.filter((s) => !s.primary);

  return (
    <section className="relative py-24 lg:py-32" id="services">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="What we do"
          title={
            <>
              Six things we do, <span className="text-flame">properly</span>.
            </>
          }
          lead="Everything on this list runs through the same studio in Bhubaneswar — no outsourcing, no middlemen quoting on our behalf."
        />

        <RevealGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {primary.map((service) => {
            const Icon = SERVICE_ICONS[service.slug] ?? Layers;
            return (
              <RevealItem key={service.slug}>
                <Link
                  href={`/services#${service.slug}`}
                  id={service.slug}
                  className="group glass relative flex h-full flex-col overflow-hidden rounded-2xl p-7 transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-flame-500/30 hover:shadow-glow-sm"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-flame-500/10 blur-3xl transition-opacity duration-500 group-hover:bg-flame-500/20"
                  />

                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-flame-500/25 bg-flame-500/10 text-flame-500 transition-transform duration-500 group-hover:scale-110">
                    <Icon className="h-[22px] w-[22px]" />
                  </span>

                  <h3 className="relative mt-6 font-display text-xl font-semibold tracking-tight">
                    {service.title}
                  </h3>
                  <p className="relative mt-3 flex-1 text-[14px] leading-relaxed text-ink-300">
                    {SERVICE_COPY[service.slug]}
                  </p>

                  <span className="relative mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-flame-500">
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {secondary.map((service) => (
              <Link
                key={service.slug}
                href={`/services#${service.slug}`}
                className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[13px] text-ink-300 transition-all duration-300 hover:border-flame-500/40 hover:bg-flame-500/10 hover:text-flame-400"
              >
                {service.title}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   Featured products
   ============================================================ */

export function FeaturedSection({ products }: { products: Product[] }) {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            align="left"
            eyebrow="Featured work"
            title={
              <>
                Things we have made
                <br />
                for people <span className="text-flame">like you</span>.
              </>
            }
          />
          <Reveal delay={0.15}>
            <ButtonLink href="/products" variant="secondary" size="md">
              View all products
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </Reveal>
        </div>

        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <RevealItem key={product.id}>
              <ProductCard product={product} priority={i < 3} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================
   Process
   ============================================================ */

const STEPS = [
  {
    n: '01',
    icon: Upload,
    title: 'Send us the file',
    body: 'STL, OBJ, 3MF, STEP or a sketch on paper. We will tell you within a day whether it will print, and what we would change.',
  },
  {
    n: '02',
    icon: Sparkles,
    title: 'Approve the quote',
    body: 'An exact price and an exact date — not a range. Upload to our calculator and you have the number in seconds.',
  },
  {
    n: '03',
    icon: Layers,
    title: 'We print it',
    body: 'On the right machine in the right material, monitored layer by layer. You get progress photos if you want them.',
  },
  {
    n: '04',
    icon: Truck,
    title: 'Finished and delivered',
    body: 'Supports removed, surfaces finished, packed properly. Free delivery in Bhubaneswar above ₹10,000.',
  },
];

export function ProcessSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-flame-500/20 to-transparent"
      />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Four steps. <span className="text-flame">No surprises.</span>
            </>
          }
        />

        <RevealGroup className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
          {STEPS.map((step) => (
            <RevealItem key={step.n}>
              <div className="group relative h-full">
                <div className="glass h-full rounded-2xl p-7 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5 group-hover:border-flame-500/30">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-5xl font-bold leading-none text-white/[0.07] transition-colors duration-500 group-hover:text-flame-500/25">
                      {step.n}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-flame-500/25 bg-flame-500/10 text-flame-500">
                      <step.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-300">{step.body}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================
   Industries
   ============================================================ */

const INDUSTRY_ICONS: Record<string, IconComponent> = {
  Medical: Heart,
  Education: GraduationCap,
  Automotive: Car,
  Mining: Mountain,
  Steel: Factory,
  Manufacturing: Settings2,
  Architecture: Building2,
  Construction: HardHat,
  Robotics: Cpu,
  Defence: Shield,
  'Consumer Products': ShoppingBag,
  Jewellery: Gem,
  Electronics: Cpu,
  Research: ScanLine,
};

export function IndustriesSection() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Industries"
          title={
            <>
              Fourteen sectors, <span className="text-flame">one studio</span>.
            </>
          }
          lead="A surgical planning model and a mining component need very different things. We have learned what each one needs the hard way."
        />

        <RevealGroup
          className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7"
          stagger={0.045}
        >
          {site.industries.map((industry) => {
            const Icon = INDUSTRY_ICONS[industry] ?? Boxes;
            return (
              <RevealItem key={industry}>
                <Link
                  href={`/industries#${industry.toLowerCase().replace(/\s+/g, '-')}`}
                  className="group flex h-full flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center transition-all duration-400 hover:-translate-y-1 hover:border-flame-500/30 hover:bg-flame-500/[0.06]"
                >
                  <Icon className="h-6 w-6 text-ink-400 transition-colors duration-300 group-hover:text-flame-500" />
                  <span className="text-[12.5px] font-medium leading-tight text-ink-200 transition-colors group-hover:text-white">
                    {industry}
                  </span>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================
   Stats
   ============================================================ */

const STATS = [
  { value: '12,000+', label: 'Parts printed', detail: 'Since the first machine switched on' },
  { value: '48 hrs', label: 'Typical turnaround', detail: 'On standard prototype work' },
  { value: '0.025 mm', label: 'Finest layer height', detail: 'On our resin systems' },
  { value: '14', label: 'Industries served', detail: 'From jewellery to steel' },
];

export function StatsSection() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <RevealGroup className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <RevealItem key={stat.label}>
              <div className="group h-full bg-ink-950 p-8 transition-colors duration-500 hover:bg-ink-900">
                <p className="font-display text-4xl font-bold tracking-tight text-flame-500 lg:text-5xl">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm font-semibold text-white">{stat.label}</p>
                <p className="mt-1 text-[12.5px] text-ink-400">{stat.detail}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================
   Testimonials
   ============================================================ */

export function TestimonialsSection({
  testimonials,
}: {
  testimonials: Array<{
    id: number;
    author_name: string;
    author_role: string | null;
    company: string | null;
    avatar_url: string | null;
    quote: string;
    rating: number;
  }>;
}) {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Client words"
          title={
            <>
              What people say <span className="text-flame">afterwards</span>.
            </>
          }
        />

        <RevealGroup className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <RevealItem key={t.id}>
              <figure className="glass flex h-full flex-col rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-flame-500/25">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }, (_, i) => (
                    <span key={i} className="text-flame-500">★</span>
                  ))}
                </div>

                <blockquote className="mt-5 flex-1 text-[14.5px] leading-relaxed text-ink-100">
                  “{t.quote}”
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-white/5 pt-5">
                  {t.avatar_url && (
                    <Image
                      src={t.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{t.author_name}</p>
                    <p className="text-[12px] text-ink-400">
                      {[t.author_role, t.company].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ============================================================
   Closing call to action
   ============================================================ */

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-14 lg:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-1/2 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-flame-500/15 blur-[120px]"
            />

            <div className="relative">
              <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-[1.06] tracking-tight text-balance-pretty sm:text-5xl lg:text-6xl">
                Upload a file. Get a price
                <br />
                <span className="text-flame">before you finish your tea.</span>
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-300">
                Our calculator reads your STL, works out volume, material, machine time and
                finishing, and gives you an exact figure. No form to fill in first.
              </p>

              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/quote" size="lg">
                  Get an instant quote
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
                <ButtonLink href="/contact" variant="secondary" size="lg">
                  Talk to a human
                </ButtonLink>
              </div>

              <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500">
                {site.contact.phone} · {site.contact.email}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
