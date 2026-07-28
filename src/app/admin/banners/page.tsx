import Image from 'next/image';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Banners' };

export default async function AdminBannersPage() {
  await requirePermission('banners.edit');

  const banners = all<{
    id: number;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    cta_label: string | null;
    cta_href: string | null;
    placement: string;
    is_active: number;
  }>(`SELECT * FROM banners ORDER BY placement, sort_order`);

  return (
    <>
      <PageHeader title="Banners" subtitle="Promotional strips placed around the site." />

      {banners.length === 0 ? (
        <Card>
          <EmptyState title="No banners yet" body="Create a banner to promote an offer or a service." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {banners.map((banner) => (
            <article key={banner.id} className="glass overflow-hidden rounded-2xl">
              {banner.image_url && (
                <div className="relative aspect-[21/9] bg-ink-900">
                  <Image
                    src={banner.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] text-ink-400">
                      {banner.placement}
                    </span>
                    <h2 className="mt-2 font-display text-[15px] font-semibold text-white">
                      {banner.title}
                    </h2>
                    {banner.subtitle && (
                      <p className="mt-1 text-[12.5px] text-ink-400">{banner.subtitle}</p>
                    )}
                  </div>

                  <ToggleSwitch
                    entity="banner"
                    id={banner.id}
                    value={banner.is_active === 1}
                    label={`Show ${banner.title}`}
                    onLabel="Visible"
                    offLabel="Hidden"
                  />
                </div>

                {banner.cta_label && (
                  <p className="mt-3 border-t border-white/5 pt-3 text-[12px] text-ink-500">
                    Button: <span className="text-flame-400">{banner.cta_label}</span> →{' '}
                    <span className="font-mono">{banner.cta_href}</span>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
