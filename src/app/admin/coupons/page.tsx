import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, money, PageHeader, shortDate, Table, Td, Th } from '@/components/admin/Shell';
import { listAdminCoupons } from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Coupons' };

export default async function AdminCouponsPage() {
  await requirePermission('coupons.edit');
  const coupons = listAdminCoupons();

  return (
    <>
      <PageHeader title="Coupons" subtitle={`${coupons.length} discount codes`} />

      <Card>
        {coupons.length === 0 ? (
          <EmptyState title="No coupons yet" body="Discount codes you create will appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th className="text-right">Minimum order</Th>
                <Th className="text-right">Used</Th>
                <Th className="text-right">Expires</Th>
                <Th className="text-right">Active</Th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const expired = coupon.expires_at
                  ? new Date(coupon.expires_at.replace(' ', 'T') + 'Z') < new Date()
                  : false;

                return (
                  <tr key={coupon.id} className="transition-colors hover:bg-white/[0.02]">
                    <Td>
                      <span className="block font-mono font-medium text-white">{coupon.code}</span>
                      {coupon.description && (
                        <span className="block text-[12px] text-ink-500">{coupon.description}</span>
                      )}
                    </Td>
                    <Td className="text-flame-400">
                      {coupon.type === 'percent' ? `${coupon.value}% off` : `${money(coupon.value)} off`}
                    </Td>
                    <Td className="text-right font-mono tabular-nums text-ink-300">
                      {coupon.min_order > 0 ? money(coupon.min_order) : '—'}
                    </Td>
                    <Td className="text-right tabular-nums text-ink-300">
                      {coupon.used_count}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}
                    </Td>
                    <Td className="text-right text-[12.5px]">
                      <span className={expired ? 'text-red-400' : 'text-ink-500'}>
                        {coupon.expires_at ? shortDate(coupon.expires_at) : 'No expiry'}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <ToggleSwitch
                          entity="coupon"
                          id={coupon.id}
                          value={coupon.is_active === 1}
                          label={`Enable ${coupon.code}`}
                          onLabel="Active"
                          offLabel="Inactive"
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
