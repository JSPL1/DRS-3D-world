// Aliased: this module also exports a route segment config named `dynamic`.
import nextDynamic from 'next/dynamic';

import { Marquee } from '@/components/sections/Marquee';
import {
  CtaSection,
  FeaturedSection,
  IndustriesSection,
  ProcessSection,
  ServicesSection,
  StatsSection,
  TestimonialsSection,
} from '@/components/sections/HomeSections';
import { getBranding } from '@/lib/branding';
import { getHeroSculptUrl } from '@/lib/hero-model';
import { getFeaturedProducts, getTestimonials } from '@/lib/queries';

// The hero pulls in three.js — keep it out of the initial JS payload.
const HeroExperience = nextDynamic(
  () => import('@/components/three/HeroExperience').then((m) => m.HeroExperience),
  {
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-flame-500/30 border-t-flame-500" />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink-500">
            Warming the nozzle
          </p>
        </div>
      </div>
    ),
  },
);

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

const CAPABILITIES = [
  'FDM Printing', 'SLA Resin', 'Rapid Prototyping', 'CAD Design', '3D Scanning',
  'STL Repair', 'Reverse Engineering', 'Architectural Models', 'Medical Models',
  'Corporate Gifts', 'Custom Figurines', 'Industrial Parts',
];

export default function HomePage() {
  const featured = getFeaturedProducts(6);
  const testimonials = getTestimonials(6);
  const branding = getBranding();
  const sculptUrl = getHeroSculptUrl();

  return (
    <>
      <HeroExperience theme={branding.theme} sculptUrl={sculptUrl} />

      <div className="relative z-10 bg-ink-950">
        <Marquee items={CAPABILITIES} />
        <ServicesSection />
        <FeaturedSection products={featured} />
        <ProcessSection />
        <StatsSection />
        <IndustriesSection />
        <TestimonialsSection testimonials={testimonials} />
        <CtaSection />
      </div>
    </>
  );
}
