import { CouponEditor } from '@/components/admin/CouponEditor';
import { PageHeader } from '@/components/admin/Shell';
import { listAdminCoupons } from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Coupons' };

export default async function AdminCouponsPage() {
  await requirePermission('coupons.edit');
  const coupons = listAdminCoupons();

  return (
    <>
      <PageHeader title="Coupons" subtitle={`${coupons.length} discount codes`} />
      <CouponEditor coupons={coupons} />
    </>
  );
}
