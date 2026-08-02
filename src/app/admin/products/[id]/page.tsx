import { notFound } from 'next/navigation';

import { ApprovalPanel } from '@/components/admin/ApprovalPanel';
import { LiveRefresh } from '@/components/admin/LiveRefresh';
import { ProductColorEditor } from '@/components/admin/ProductColorEditor';
import { ProductForm, type ProductFormValues } from '@/components/admin/ProductForm';
import { ProductGalleryEditor, type GalleryImage } from '@/components/admin/ProductGalleryEditor';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';
import { all, one, parseJson } from '@/lib/db';
import { getColorPalette, getProductColors } from '@/lib/queries';

export const metadata = { title: 'Edit product' };

type Row = {
  id: number;
  name: string;
  sku: string;
  category_id: number | null;
  brand_id: number | null;
  short_description: string | null;
  description: string | null;
  features: string | null;
  specifications: string | null;
  price: number;
  discount_price: number | null;
  stock: number;
  availability: ProductFormValues['availability'];
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  weight_g: number | null;
  material: string | null;
  print_technology: string | null;
  print_time_hours: number | null;
  layer_height_mm: number | null;
  infill_percent: number | null;
  color: string | null;
  is_featured: number;
  is_trending: number;
  is_popular: number;
  is_new_arrival: number;
  is_best_seller: number;
  visibility: ProductFormValues['visibility'];
  status: ProductFormValues['status'];
  youtube_url: string | null;
  brochure_url: string | null;
  stl_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  meta_keywords: string | null;
  approval_status: 'approved' | 'pending' | 'rejected';
  created_by_name: string | null;
  updated_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  review_note: string | null;
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission('products.edit');
  const canApprove = can(user.role, 'products.approve');

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) notFound();

  const row = await one<Row>(`SELECT * FROM products WHERE id = ?`, [productId]);
  if (!row) notFound();

  const categories = await all<{ id: number; name: string }>(
    `SELECT id, name FROM categories WHERE is_active = 1 ORDER BY sort_order`,
  );
  const brands = await all<{ id: number; name: string }>(
    `SELECT id, name FROM brands WHERE is_active = 1 ORDER BY name`,
  );

  const initial: ProductFormValues = {
    id: row.id,
    name: row.name,
    sku: row.sku,
    categoryId: row.category_id,
    brandId: row.brand_id,
    shortDescription: row.short_description ?? '',
    description: row.description ?? '',
    features: parseJson<string[]>(row.features, []),
    specifications: parseJson<Array<{ label: string; value: string }>>(row.specifications, []),
    price: row.price,
    discountPrice: row.discount_price,
    stock: row.stock,
    availability: row.availability,
    lengthMm: row.length_mm,
    widthMm: row.width_mm,
    heightMm: row.height_mm,
    weightG: row.weight_g,
    material: row.material ?? '',
    printTechnology: row.print_technology ?? '',
    printTimeHours: row.print_time_hours,
    layerHeightMm: row.layer_height_mm,
    infillPercent: row.infill_percent,
    color: row.color ?? '',
    isFeatured: row.is_featured === 1,
    isTrending: row.is_trending === 1,
    isPopular: row.is_popular === 1,
    isNewArrival: row.is_new_arrival === 1,
    isBestSeller: row.is_best_seller === 1,
    visibility: row.visibility,
    status: row.status,
    youtubeUrl: row.youtube_url ?? '',
    brochureUrl: row.brochure_url ?? '',
    stlUrl: row.stl_url ?? '',
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    metaKeywords: row.meta_keywords ?? '',
  };

  const gallery = await all<GalleryImage>(
    `SELECT id, url, alt FROM product_images
     WHERE product_id = ? AND kind = 'gallery' ORDER BY sort_order, id`,
    [row.id],
  );

  const palette = (await getColorPalette()).filter((c) => c.is_active === 1);
  const assigned = (await getProductColors(row.id)).map((c) => ({
    colorId: c.id,
    imageUrl: c.imageUrl,
    priceDelta: c.priceDelta,
    isDefault: c.isDefault,
  }));

  return (
    <>
      <LiveRefresh watch="products" />

      <div className="mb-6">
        <ApprovalPanel
          productId={row.id}
          canApprove={canApprove}
          state={{
            status: row.approval_status,
            createdByName: row.created_by_name,
            updatedByName: row.updated_by_name,
            approvedByName: row.approved_by_name,
            approvedAt: row.approved_at,
            reviewNote: row.review_note,
          }}
        />
      </div>

      <ProductForm
        initial={initial}
        categories={categories}
        brands={brands}
        canApprove={canApprove}
      />

      {/* Photos and colours each save on their own, so adding a picture or
          changing a finish doesn't mean re-submitting every product field. */}
      <div className="-mt-16 flex flex-col gap-5 pb-24">
        <ProductGalleryEditor productId={row.id} initial={gallery} />

        <ProductColorEditor
          productId={row.id}
          palette={palette.map((c) => ({ id: c.id, name: c.name, hex: c.hex }))}
          assigned={assigned}
        />
      </div>
    </>
  );
}
