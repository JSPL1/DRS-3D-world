import Image from 'next/image';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Videos' };

export default async function AdminVideosPage() {
  await requirePermission('videos.edit');

  const videos = all<{
    id: number;
    title: string;
    description: string | null;
    thumb_url: string | null;
    youtube_url: string | null;
    duration_sec: number | null;
    category: string | null;
    is_active: number;
  }>(`SELECT * FROM videos ORDER BY sort_order`);

  return (
    <>
      <PageHeader title="Videos" subtitle={`${videos.length} videos on the site`} />

      {videos.length === 0 ? (
        <Card>
          <EmptyState title="No videos yet" body="Add an MP4 or a YouTube link to show it on the videos page." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article key={video.id} className="glass overflow-hidden rounded-2xl">
              <div className="relative aspect-video bg-ink-900">
                {video.thumb_url && (
                  <Image
                    src={video.thumb_url}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                )}
                {video.duration_sec && (
                  <span className="absolute bottom-2.5 right-2.5 rounded-md bg-ink-950/85 px-2 py-1 font-mono text-[11px] text-white backdrop-blur-sm">
                    {Math.floor(video.duration_sec / 60)}:
                    {String(video.duration_sec % 60).padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {video.category && (
                      <p className="text-[11px] uppercase tracking-[0.16em] text-flame-500">
                        {video.category}
                      </p>
                    )}
                    <h2 className="mt-1 text-[13.5px] font-medium leading-snug text-white">
                      {video.title}
                    </h2>
                  </div>
                  <ToggleSwitch
                    entity="video"
                    id={video.id}
                    value={video.is_active === 1}
                    label={`Show ${video.title}`}
                    onLabel="Visible"
                    offLabel="Hidden"
                  />
                </div>

                {video.description && (
                  <p className="mt-2 line-clamp-2 text-[12.5px] text-ink-400">{video.description}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
