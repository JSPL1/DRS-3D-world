import { Play } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';

import { RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { getVideos } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Videos',
  description: 'Timelapses, process films and studio tours from DRS 3D WORLD.',
};

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

const duration = (seconds: number | null) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function VideosPage() {
  const videos = getVideos(30);

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Videos"
          title={
            <>
              Fourteen hours,
              <br />
              <span className="text-flame">sixty seconds</span>.
            </>
          }
          lead="Timelapses, light tests and a walk through the floor at full capacity."
        />

        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <RevealItem key={video.id}>
              <article className="group glass overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-1.5 hover:border-flame-500/30">
                <div className="relative aspect-video overflow-hidden bg-ink-900">
                  {video.thumb_url && (
                    <Image
                      src={video.thumb_url}
                      alt={video.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                    />
                  )}

                  <span className="absolute inset-0 media-scrim transition-colors duration-500 group-hover:opacity-40" />

                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-flame-700 text-white shadow-glow transition-transform duration-500 group-hover:scale-110">
                    <Play className="ml-1 h-5 w-5 fill-current" />
                  </span>

                  {duration(video.duration_sec) && (
                    <span className="absolute bottom-3 right-3 on-media rounded-md px-2 py-1 font-mono text-[11px] backdrop-blur-sm">
                      {duration(video.duration_sec)}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {video.category && (
                    <span className="text-[11px] uppercase tracking-[0.16em] text-flame-500">
                      {video.category}
                    </span>
                  )}
                  <h2 className="mt-2 font-display text-[17px] font-semibold leading-snug tracking-tight">
                    {video.title}
                  </h2>
                  {video.description && (
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
                      {video.description}
                    </p>
                  )}
                </div>
              </article>
            </RevealItem>
          ))}
        </RevealGroup>

        <p className="mt-12 text-center text-[13px] text-ink-500">
          Video files are managed from the admin panel — upload an MP4 or paste a YouTube link and it
          appears here.
        </p>
      </div>
    </div>
  );
}
