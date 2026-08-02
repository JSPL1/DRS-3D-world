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
import { SplitHero } from '@/components/sections/SplitHero';
import { getBranding } from '@/lib/branding';
import { getHeroSculptUrl } from '@/lib/hero-model';
import { getFeaturedProducts, getSettings, getTestimonials } from '@/lib/queries';

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

export default async function HomePage() {
  const featured = await getFeaturedProducts(6);
  const testimonials = await getTestimonials(6);
  const branding = await getBranding();
  const sculptUrl = getHeroSculptUrl();
  const settings = await getSettings();

  const hero3d = {
    enabled: settings.hero_3d_enabled !== 'false',
    playMode: settings.hero_3d_play_mode === 'time' ? ('time' as const) : ('scroll' as const),
    scrollVh: Math.min(1200, Math.max(200, Number(settings.hero_3d_scroll_vh) || 720)),
    timeSeconds: Math.min(60, Math.max(3, Number(settings.hero_3d_time_seconds) || 14)),
  };

  return (
    <>
      <HeroExperience theme={branding.theme} sculptUrl={sculptUrl} {...hero3d} />

      {/* The redesign's hero sits directly beneath the 3D printer, not in
          place of it — the studio's flagship animated scene stays, this
          section is what the visitor actually acts on next. */}
      <SplitHero />

      <div className="relative z-10 bg-[var(--bg)]">
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
