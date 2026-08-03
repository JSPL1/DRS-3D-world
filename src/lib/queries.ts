import 'server-only';

import { cache } from 'react';

import { all, one, parseJson } from '@/lib/db';

/* ============================================================
   Row shapes
   ============================================================ */

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  brand_name: string | null;
  short_description: string | null;
  description: string | null;
  features: string | null;
  specifications: string | null;
  price: number;
  discount_price: number | null;
  stock: number;
  availability: string;
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
  brochure_url: string | null;
  stl_url: string | null;
  youtube_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  rating_avg: number;
  rating_count: number;
  view_count: number;
  thumb: string | null;
};

export type Product = Omit<ProductRow, 'features' | 'specifications'> & {
  features: string[];
  specifications: Array<{ label: string; value: string }>;
  effectivePrice: number;
  discountPercent: number | null;
};

function hydrate(row: ProductRow): Product {
  const effectivePrice = row.discount_price ?? row.price;
  const discountPercent =
    row.discount_price && row.price > 0
      ? Math.round(((row.price - row.discount_price) / row.price) * 100)
      : null;

  return {
    ...row,
    features: parseJson<string[]>(row.features, []),
    specifications: parseJson<Array<{ label: string; value: string }>>(row.specifications, []),
    effectivePrice,
    discountPercent,
  };
}

/**
 * What "on the site" means for a product, in one place.
 *
 * Three separate conditions, all of which have to hold: the studio has
 * published it, it is not marked private, and an administrator has approved
 * it. Every public query goes through this — a product that a manager entered
 * and nobody has signed off must not appear anywhere, including in a category
 * count or a sitemap.
 */
const PUBLIC_PRODUCT = `p.status = 'published' AND p.visibility = 'public'
  AND p.approval_status = 'approved'`;

/** Same rule, for queries that select from `products` without the `p` alias. */
const PUBLIC_PRODUCT_BARE = PUBLIC_PRODUCT.replace(/\bp\./g, '');

/**
 * A product's picture, falling back to its default colour's photograph.
 *
 * A product entered through the panel can easily end up with colour photos
 * and no gallery image — the colour editor is where the studio uploads, and
 * it is the more useful photo anyway. Without the fallback those products
 * showed an empty card, which reads as a broken site rather than a missing
 * optional field.
 */
const THUMB = `
  COALESCE(
    (SELECT i.url FROM product_images i
      WHERE i.product_id = p.id AND i.kind = 'gallery'
      ORDER BY i.sort_order LIMIT 1),
    (SELECT pc.image_url FROM product_colors pc
      WHERE pc.product_id = p.id AND pc.image_url IS NOT NULL AND pc.image_url <> ''
      ORDER BY pc.is_default DESC, pc.sort_order LIMIT 1)
  )`;

const PRODUCT_SELECT = `
  SELECT p.*,
         c.name AS category_name,
         c.slug AS category_slug,
         b.name AS brand_name,
         ${THUMB} AS thumb
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands b ON b.id = p.brand_id
`;

/* ============================================================
   Products
   ============================================================ */

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const rows = await all<ProductRow>(
    `${PRODUCT_SELECT}
     WHERE ${PUBLIC_PRODUCT} AND p.is_featured = 1
     ORDER BY p.sort_order LIMIT ?`,
    [limit],
  );
  return rows.map(hydrate);
}

export type ProductFilters = {
  category?: string;
  material?: string;
  technology?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tag?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  limit?: number;
  offset?: number;
};

export async function getProducts(
  filters: ProductFilters = {},
): Promise<{ items: Product[]; total: number }> {
  const where: string[] = [PUBLIC_PRODUCT];
  const params: unknown[] = [];

  if (filters.category) {
    where.push('c.slug = ?');
    params.push(filters.category);
  }
  if (filters.material) {
    where.push('p.material LIKE ?');
    params.push(`%${filters.material}%`);
  }
  if (filters.technology) {
    where.push('p.print_technology LIKE ?');
    params.push(`%${filters.technology}%`);
  }
  if (typeof filters.minPrice === 'number') {
    where.push('COALESCE(p.discount_price, p.price) >= ?');
    params.push(filters.minPrice);
  }
  if (typeof filters.maxPrice === 'number') {
    where.push('COALESCE(p.discount_price, p.price) <= ?');
    params.push(filters.maxPrice);
  }
  if (filters.tag) {
    where.push('EXISTS (SELECT 1 FROM product_tags t WHERE t.product_id = p.id AND t.tag = ?)');
    params.push(filters.tag);
  }
  if (filters.search) {
    where.push(
      `(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ?
        OR p.material LIKE ? OR p.sku LIKE ? OR p.meta_keywords LIKE ?)`,
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q, q);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const orderSql =
    filters.sort === 'price_asc'
      ? 'ORDER BY COALESCE(p.discount_price, p.price) ASC'
      : filters.sort === 'price_desc'
        ? 'ORDER BY COALESCE(p.discount_price, p.price) DESC'
        : filters.sort === 'popular'
          ? 'ORDER BY p.view_count DESC'
          : filters.sort === 'rating'
            ? 'ORDER BY p.rating_avg DESC, p.rating_count DESC'
            : 'ORDER BY p.created_at DESC, p.sort_order';

  const totalRow = await one<{ c: number }>(
    `SELECT COUNT(*) AS c FROM products p
     LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
    params,
  );
  const total = totalRow?.c ?? 0;

  const limit = filters.limit ?? 12;
  const offset = filters.offset ?? 0;

  const rows = await all<ProductRow>(
    `${PRODUCT_SELECT} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { items: rows.map(hydrate), total };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  // Filtered, not just fetched: without this a draft or an unapproved product
  // was reachable by anyone who knew or guessed its URL.
  const row = await one<ProductRow>(`${PRODUCT_SELECT} WHERE p.slug = ? AND ${PUBLIC_PRODUCT}`, [slug]);
  return row ? hydrate(row) : null;
}

export type ProductColor = {
  id: number;
  name: string;
  hex: string;
  imageUrl: string | null;
  priceDelta: number;
  isDefault: boolean;
};

/**
 * Colours this product can be printed in, in display order. An empty result
 * means the product has no colour choice — services and made-to-order work
 * often don't.
 */
export async function getProductColors(productId: number): Promise<ProductColor[]> {
  const rows = await all<{
    id: number;
    name: string;
    hex: string;
    image_url: string | null;
    price_delta: number;
    is_default: number;
  }>(
    `SELECT c.id, c.name, c.hex, pc.image_url, pc.price_delta, pc.is_default
     FROM product_colors pc
     JOIN colors c ON c.id = pc.color_id
     WHERE pc.product_id = ? AND c.is_active = 1
     ORDER BY pc.sort_order, c.sort_order`,
    [productId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    hex: r.hex,
    imageUrl: r.image_url,
    priceDelta: r.price_delta,
    isDefault: r.is_default === 1,
  }));
}

/** The studio's full palette, for the admin colour picker. */
export async function getColorPalette() {
  return all<{ id: number; name: string; hex: string; is_active: number; sort_order: number }>(
    `SELECT id, name, hex, is_active, sort_order FROM colors ORDER BY sort_order, name`,
  );
}

/** Colour counts for the product list, so cards can show "6 colours". */
export async function getColorCounts(): Promise<Record<number, number>> {
  const rows = await all<{ product_id: number; c: number }>(
    `SELECT product_id, COUNT(*) AS c FROM product_colors GROUP BY product_id`,
  );
  return Object.fromEntries(rows.map((r) => [r.product_id, r.c]));
}

export async function getProductImages(productId: number, kind: 'gallery' | '360' = 'gallery') {
  return all<{ id: number; url: string; alt: string | null }>(
    `SELECT id, url, alt FROM product_images
     WHERE product_id = ? AND kind = ? ORDER BY sort_order`,
    [productId, kind],
  );
}

export async function getRelatedProducts(productId: number, limit = 4): Promise<Product[]> {
  const rows = await all<ProductRow>(
    `${PRODUCT_SELECT}
     WHERE p.id IN (SELECT related_id FROM product_relations WHERE product_id = ?)
       AND ${PUBLIC_PRODUCT}
     LIMIT ?`,
    [productId, limit],
  );
  return rows.map(hydrate);
}

export async function getProductReviews(productId: number) {
  return all<{
    id: number;
    author_name: string;
    rating: number;
    title: string | null;
    body: string | null;
    created_at: string;
  }>(
    `SELECT id, author_name, rating, title, body, created_at
     FROM reviews WHERE product_id = ? AND is_approved = 1
     ORDER BY created_at DESC`,
    [productId],
  );
}

export async function getAllProductSlugs() {
  return all<{ slug: string; updated_at: string }>(
    `SELECT slug, updated_at FROM products WHERE ${PUBLIC_PRODUCT_BARE}`,
  );
}

/* ============================================================
   Taxonomy
   ============================================================ */

// Memoized per request: the site layout reads this for the mega-menu on
// every page, and the products page reads it again for its own category
// rail — same request, same answer, one query instead of two.
export const getCategories = cache(async () => {
  return all<{
    id: number;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    image_url: string | null;
    product_count: number;
  }>(
    `SELECT c.id, c.name, c.slug, c.description, c.icon, c.image_url,
            (SELECT COUNT(*) FROM products p
              WHERE p.category_id = c.id AND ${PUBLIC_PRODUCT}) AS product_count
     FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order`,
  );
});

export async function getMaterials() {
  return all<{ material: string; c: number }>(
    `SELECT material, COUNT(*) AS c FROM products
     WHERE material IS NOT NULL AND ${PUBLIC_PRODUCT_BARE}
     GROUP BY material ORDER BY c DESC`,
  );
}

export async function getTechnologies() {
  return all<{ print_technology: string; c: number }>(
    `SELECT print_technology, COUNT(*) AS c FROM products
     WHERE print_technology IS NOT NULL AND ${PUBLIC_PRODUCT_BARE}
     GROUP BY print_technology ORDER BY c DESC`,
  );
}

/* ============================================================
   Content
   ============================================================ */

export async function getTestimonials(limit = 6) {
  return all<{
    id: number;
    author_name: string;
    author_role: string | null;
    company: string | null;
    avatar_url: string | null;
    quote: string;
    rating: number;
  }>(
    `SELECT id, author_name, author_role, company, avatar_url, quote, rating
     FROM testimonials WHERE is_active = 1 ORDER BY is_featured DESC, sort_order LIMIT ?`,
    [limit],
  );
}

export async function getGalleryItems(limit = 24, category?: string) {
  return all<{
    id: number;
    title: string | null;
    caption: string | null;
    url: string;
    thumb_url: string | null;
    media_type: string;
    category: string | null;
    width: number | null;
    height: number | null;
  }>(
    `SELECT id, title, caption, url, thumb_url, media_type, category, width, height
     FROM gallery_items
     WHERE is_active = 1 ${category ? 'AND category = ?' : ''}
     ORDER BY sort_order LIMIT ?`,
    category ? [category, limit] : [limit],
  );
}

export async function getGalleryCategories() {
  return all<{ category: string }>(
    `SELECT DISTINCT category FROM gallery_items
     WHERE category IS NOT NULL AND is_active = 1 ORDER BY category`,
  );
}

export async function getVideos(limit = 24) {
  return all<{
    id: number;
    title: string;
    description: string | null;
    youtube_url: string | null;
    thumb_url: string | null;
    duration_sec: number | null;
    category: string | null;
  }>(
    `SELECT id, title, description, youtube_url, thumb_url, duration_sec, category
     FROM videos WHERE is_active = 1 ORDER BY sort_order LIMIT ?`,
    [limit],
  );
}

export async function getBlogPosts(limit = 12, offset = 0) {
  return all<{
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    cover_url: string | null;
    category: string | null;
    reading_minutes: number;
    view_count: number;
    published_at: string | null;
  }>(
    `SELECT id, title, slug, excerpt, cover_url, category, reading_minutes, view_count, published_at
     FROM blogs WHERE status = 'published'
     ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

export async function getBlogPostBySlug(slug: string) {
  return one<{
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    cover_url: string | null;
    category: string | null;
    tags: string | null;
    reading_minutes: number;
    view_count: number;
    seo_title: string | null;
    seo_description: string | null;
    published_at: string | null;
    author_name: string | null;
  }>(
    `SELECT b.*, u.name AS author_name FROM blogs b
     LEFT JOIN users u ON u.id = b.author_id
     WHERE b.slug = ? AND b.status = 'published'`,
    [slug],
  );
}

export async function getFaqs() {
  return all<{ id: number; question: string; answer: string; category: string | null }>(
    `SELECT id, question, answer, category FROM faqs WHERE is_active = 1 ORDER BY sort_order`,
  );
}

// Memoized per request: getBranding() already calls this once, and pages
// that also need a setting directly (quote rates, hero playback, admin
// settings) were each triggering a second identical table scan on the same
// request. `cache()` collapses all of them into one.
export const getSettings = cache(async (): Promise<Record<string, string>> => {
  const rows = await all<{ key: string; value: string | null }>(`SELECT \`key\`, value FROM settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
});
