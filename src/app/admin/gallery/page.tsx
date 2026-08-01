import Image from 'next/image';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader } from '@/components/admin/Shell';
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
      <PageHeader
        title="Gallery"
        subtitle={`${items.length} items · toggle one off to hide it from the public gallery`}
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState title="Gallery is empty" body="Upload images to show them on the gallery page." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className="glass overflow-hidden rounded-2xl">
              <div className="relative aspect-[4/3] bg-ink-900">
                <Image
                  src={item.thumb_url ?? item.url}
                  alt={item.title ?? ''}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
                <span className="on-media absolute left-2.5 top-2.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide">
                  {item.media_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white">
                    {item.title ?? 'Untitled'}
                  </p>
                  {item.category && (
                    <p className="text-[11.5px] text-ink-500">{item.category}</p>
                  )}
                </div>
                <ToggleSwitch
                  entity="gallery"
                  id={item.id}
                  value={item.is_active === 1}
                  label={`Show ${item.title ?? 'item'}`}
                  onLabel="Visible"
                  offLabel="Hidden"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
