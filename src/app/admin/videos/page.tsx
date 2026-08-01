import { PageHeader } from '@/components/admin/Shell';
import { VideoEditor } from '@/components/admin/VideoEditor';
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
      <VideoEditor videos={videos} />
    </>
  );
}
