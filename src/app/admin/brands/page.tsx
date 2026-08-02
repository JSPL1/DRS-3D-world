import { ExternalLink } from 'lucide-react';

import { Card, PageHeader, Table, Td, Th } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Brands' };

export default async function AdminBrandsPage() {
  await requirePermission('brands.edit');

  const brands = await all<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    website: string | null;
    product_count: number;
  }>(
    `SELECT b.*, (SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id) AS product_count
     FROM brands b ORDER BY b.name`,
  );

  return (
    <>
      <PageHeader
        title="Brands"
        subtitle="Machine platforms and material partners a product can be attributed to."
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Brand</Th>
              <Th>Slug</Th>
              <Th className="text-right">Products</Th>
              <Th className="text-right">Website</Th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="transition-colors hover:bg-white/[0.02]">
                <Td>
                  <span className="block font-medium text-white">{brand.name}</span>
                  {brand.description && (
                    <span className="block max-w-md truncate text-[12px] text-ink-500">
                      {brand.description}
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-[12px] text-ink-400">{brand.slug}</Td>
                <Td className="text-right tabular-nums text-ink-200">{brand.product_count}</Td>
                <Td>
                  <div className="flex justify-end">
                    {brand.website ? (
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[12.5px] text-flame-500 transition-colors hover:text-flame-400"
                      >
                        Visit
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-[12.5px] text-ink-500">—</span>
                    )}
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
