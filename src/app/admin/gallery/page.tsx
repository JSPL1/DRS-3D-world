import { GalleryEditor } from '@/components/admin/GalleryEditor';
import { PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Gallery' };

export default async function AdminGalleryPage() {
  await requirePermission('gallery.edit');

  const items = all<{
    id: number;
    title: string | null;
    url: string;
    thumb_url: string | null;
    media_type: string;
    category: string | null;
    is_active: number;
  }>(`SELECT * FROM gallery_items ORDER BY sort_order`);

  return (
    <>
      <PageHeader title="Gallery" subtitle={`${items.length} items on the public gallery`} />
      <GalleryEditor items={items} />
    </>
  );
}
