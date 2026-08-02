import { ImageIcon, Palette } from 'lucide-react';

import { emptyProduct, ProductForm } from '@/components/admin/ProductForm';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  const user = await requirePermission('products.edit');

  const categories = await all<{ id: number; name: string }>(
    `SELECT id, name FROM categories WHERE is_active = 1 ORDER BY sort_order`,
  );
  const brands = await all<{ id: number; name: string }>(
    `SELECT id, name FROM brands WHERE is_active = 1 ORDER BY name`,
  );

  return (
    <>
      {/* Photos and colours both belong to a product that exists — an upload
          needs a row to attach to. Saying so here beats a reader hunting the
          form for controls that only appear on the next screen. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4 text-[13px] text-ink-300">
        <span className="font-medium text-ink-200">After you save:</span>
        <span className="inline-flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-flame-500" />
          Upload photos
        </span>
        <span className="inline-flex items-center gap-2">
          <Palette className="h-4 w-4 text-flame-500" />
          Choose the colours it can be printed in
        </span>
      </div>

      <ProductForm
        initial={emptyProduct}
        categories={categories}
        brands={brands}
        canApprove={can(user.role, 'products.approve')}
      />
    </>
  );
}
