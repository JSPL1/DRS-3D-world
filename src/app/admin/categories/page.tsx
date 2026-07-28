import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, PageHeader, Table, Td, Th } from '@/components/admin/Shell';
import { listAdminCategories } from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  await requirePermission('categories.edit');
  const categories = listAdminCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Turn a category off to hide it from the products page without deleting anything."
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Slug</Th>
              <Th className="text-right">Products</Th>
              <Th className="text-right">Order</Th>
              <Th className="text-right">Visible</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="transition-colors hover:bg-white/[0.02]">
                <Td>
                  <span className="block font-medium text-white">{category.name}</span>
                  {category.description && (
                    <span className="block max-w-md truncate text-[12px] text-ink-500">
                      {category.description}
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-[12px] text-ink-400">{category.slug}</Td>
                <Td className="text-right tabular-nums text-ink-200">{category.product_count}</Td>
                <Td className="text-right tabular-nums text-ink-400">{category.sort_order}</Td>
                <Td>
                  <div className="flex justify-end">
                    <ToggleSwitch
                      entity="category"
                      id={category.id}
                      value={category.is_active === 1}
                      label={`Show ${category.name}`}
                      onLabel="Visible"
                      offLabel="Hidden"
                    />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
