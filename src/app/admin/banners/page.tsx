import { BannerEditor } from '@/components/admin/BannerEditor';
import { PageHeader } from '@/components/admin/Shell';
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
      <BannerEditor banners={banners} />
    </>
  );
}
