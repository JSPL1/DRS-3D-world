'use client';

import { ArrowLeft, Plus, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FormError, FormNotice } from '@/components/ui/Field';

export type ProductFormValues = {
  id?: number;
  name: string;
  /** Issued by the system; shown, never edited. Blank until the first save. */
  sku: string;
  categoryId: number | null;
  brandId: number | null;
  shortDescription: string;
  description: string;
  features: string[];
  specifications: Array<{ label: string; value: string }>;
  price: number;
  discountPrice: number | null;
  stock: number;
  availability: 'in_stock' | 'made_to_order' | 'out_of_stock' | 'preorder';
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  weightG: number | null;
  material: string;
  printTechnology: string;
  printTimeHours: number | null;
  layerHeightMm: number | null;
  infillPercent: number | null;
  color: string;
  isFeatured: boolean;
  isTrending: boolean;
  isPopular: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  visibility: 'public' | 'private' | 'hidden';
  status: 'draft' | 'published' | 'archived';
  youtubeUrl: string;
  brochureUrl: string;
  stlUrl: string;
  seoTitle: string;
  seoDescription: string;
  metaKeywords: string;
};

export const emptyProduct: ProductFormValues = {
  name: '', sku: '', categoryId: null, brandId: null,
  shortDescription: '', description: '', features: [], specifications: [],
  price: 0, discountPrice: null, stock: 0, availability: 'made_to_order',
  lengthMm: null, widthMm: null, heightMm: null, weightG: null,
  material: '', printTechnology: '', printTimeHours: null, layerHeightMm: null,
  infillPercent: null, color: '',
  isFeatured: false, isTrending: false, isPopular: false,
  isNewArrival: false, isBestSeller: false,
  visibility: 'public', status: 'draft',
  youtubeUrl: '', brochureUrl: '', stlUrl: '',
  seoTitle: '', seoDescription: '', metaKeywords: '',
};

const inputClass =
  'h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[14px] text-white ' +
  'placeholder:text-ink-500 transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

const selectClass =
  'h-11 w-full rounded-xl border border-white/10 bg-ink-900 px-3.5 text-[14px] text-white ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-ink-300">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-ink-500">{hint}</span>}
    </label>
  );
}

export function ProductForm({
  initial,
  categories,
  brands,
  canApprove = false,
}: {
  initial: ProductFormValues;
  categories: Array<{ id: number; name: string }>;
  brands: Array<{ id: number; name: string }>;
  /** Administrators publish as they save; everyone else's work is reviewed. */
  canApprove?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEdit = Boolean(initial.id);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const numberOrNull = (raw: string) => (raw === '' ? null : Number(raw));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    // The code is the server's to issue; sending it back would let the browser
    // propose one.
    const { sku: _sku, ...payload } = values;

    try {
      const res = await fetch('/api/admin/products', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          // Blank text fields go as empty strings; the API normalises them to NULL.
          features: values.features.filter((f) => f.trim()),
          specifications: values.specifications.filter((s) => s.label.trim() && s.value.trim()),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not save this product.');
        return;
      }

      if (data.sku) set('sku', data.sku);

      setNotice(
        data.approvalStatus === 'pending'
          ? canApprove
            ? 'Saved.'
            : 'Saved and sent to an administrator. It goes on the website once they approve it.'
          : 'Saved. The website has been updated.',
      );

      if (!isEdit) {
        // Photos and colours attach to a product that exists, so creating one
        // lands on its own page where both are available.
        router.push(`/admin/products/${data.id}`);
      }
      router.refresh();
    } catch {
      setError('Network problem. Your changes were not saved.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-[13px] text-ink-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All products
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {isEdit ? values.name || 'Edit product' : 'New product'}
          </h1>
        </div>

        <Button type="submit" size="md" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </div>

      {error && <div className="mb-5"><FormError message={error} /></div>}
      {notice && <div className="mb-5"><FormNotice message={notice} /></div>}

      {!canApprove && (
        <p className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-amber-300">
          Saving sends this to an administrator for approval. It will not appear on the website
          until they have signed it off — including any change you make to a product that is
          already live.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Labelled label="Product name">
                <input
                  required
                  value={values.name}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputClass}
                  placeholder="Hanuman Statue — Heritage Edition"
                />
              </Labelled>

              <Labelled
                label="Product code (SKU)"
                hint="Issued automatically and never reused, so an old invoice and the catalogue always agree."
              >
                <input
                  readOnly
                  value={values.sku || 'Assigned when you save'}
                  aria-readonly
                  tabIndex={-1}
                  className={`${inputClass} cursor-default font-mono text-ink-300 opacity-80`}
                />
              </Labelled>

              <Labelled label="Category">
                <select
                  value={values.categoryId ?? ''}
                  onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}
                  className={selectClass}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Labelled>

              <Labelled label="Brand">
                <select
                  value={values.brandId ?? ''}
                  onChange={(e) => set('brandId', e.target.value ? Number(e.target.value) : null)}
                  className={selectClass}
                >
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Labelled>
            </div>

            <div className="mt-4 grid gap-4">
              <Labelled label="Short description" hint="One or two lines. Shown on cards and in search results.">
                <textarea
                  rows={2}
                  value={values.shortDescription}
                  onChange={(e) => set('shortDescription', e.target.value)}
                  className={`${inputClass} h-auto py-3 leading-relaxed`}
                />
              </Labelled>

              <Labelled label="Full description">
                <textarea
                  rows={8}
                  value={values.description}
                  onChange={(e) => set('description', e.target.value)}
                  className={`${inputClass} h-auto py-3 leading-relaxed`}
                />
              </Labelled>
            </div>
          </Section>

          <Section title="Features">
            <div className="flex flex-col gap-2.5">
              {values.features.map((feature, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={feature}
                    onChange={(e) => {
                      const next = [...values.features];
                      next[i] = e.target.value;
                      set('features', next);
                    }}
                    className={inputClass}
                    placeholder="25 micron layer height — no visible layer lines"
                  />
                  <button
                    type="button"
                    onClick={() => set('features', values.features.filter((_, k) => k !== i))}
                    aria-label="Remove feature"
                    className="shrink-0 rounded-xl px-3 text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => set('features', [...values.features, ''])}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[12.5px] text-ink-300 transition-colors hover:border-flame-500/40 hover:text-flame-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add feature
              </button>
            </div>
          </Section>

          <Section title="Specifications">
            <div className="flex flex-col gap-2.5">
              {values.specifications.map((spec, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={spec.label}
                    onChange={(e) => {
                      const next = [...values.specifications];
                      next[i] = { ...next[i], label: e.target.value };
                      set('specifications', next);
                    }}
                    className={`${inputClass} sm:max-w-[200px]`}
                    placeholder="Finish"
                  />
                  <input
                    value={spec.value}
                    onChange={(e) => {
                      const next = [...values.specifications];
                      next[i] = { ...next[i], value: e.target.value };
                      set('specifications', next);
                    }}
                    className={inputClass}
                    placeholder="Antique bronze patina"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      set('specifications', values.specifications.filter((_, k) => k !== i))
                    }
                    aria-label="Remove specification"
                    className="shrink-0 rounded-xl px-3 text-ink-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  set('specifications', [...values.specifications, { label: '', value: '' }])
                }
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-[12.5px] text-ink-300 transition-colors hover:border-flame-500/40 hover:text-flame-400"
              >
                <Plus className="h-3.5 w-3.5" />
                Add specification
              </button>
            </div>
          </Section>

          <Section title="Manufacturing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Labelled label="Length (mm)">
                <input type="number" step="0.1" value={values.lengthMm ?? ''} onChange={(e) => set('lengthMm', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Width (mm)">
                <input type="number" step="0.1" value={values.widthMm ?? ''} onChange={(e) => set('widthMm', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Height (mm)">
                <input type="number" step="0.1" value={values.heightMm ?? ''} onChange={(e) => set('heightMm', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Weight (g)">
                <input type="number" step="0.1" value={values.weightG ?? ''} onChange={(e) => set('weightG', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Material">
                <input value={values.material} onChange={(e) => set('material', e.target.value)} className={inputClass} placeholder="Tough Resin" />
              </Labelled>
              <Labelled label="Technology">
                <input value={values.printTechnology} onChange={(e) => set('printTechnology', e.target.value)} className={inputClass} placeholder="SLA" />
              </Labelled>
              <Labelled label="Print time (hours)">
                <input type="number" step="0.1" value={values.printTimeHours ?? ''} onChange={(e) => set('printTimeHours', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Layer height (mm)">
                <input type="number" step="0.001" value={values.layerHeightMm ?? ''} onChange={(e) => set('layerHeightMm', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Infill (%)">
                <input type="number" min="0" max="100" value={values.infillPercent ?? ''} onChange={(e) => set('infillPercent', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Colour / finish">
                <input value={values.color} onChange={(e) => set('color', e.target.value)} className={inputClass} placeholder="Antique Bronze" />
              </Labelled>
            </div>
          </Section>

          <Section title="Downloads & media">
            <div className="grid gap-4 sm:grid-cols-2">
              <Labelled label="YouTube URL">
                <input value={values.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} className={inputClass} placeholder="https://youtube.com/watch?v=…" />
              </Labelled>
              <Labelled label="Brochure (PDF) URL">
                <input value={values.brochureUrl} onChange={(e) => set('brochureUrl', e.target.value)} className={inputClass} />
              </Labelled>
              <Labelled label="STL file URL">
                <input value={values.stlUrl} onChange={(e) => set('stlUrl', e.target.value)} className={inputClass} />
              </Labelled>
            </div>
          </Section>

          <Section title="Search engine listing">
            <div className="grid gap-4">
              <Labelled label="SEO title" hint={`${values.seoTitle.length}/60 characters`}>
                <input value={values.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className={inputClass} />
              </Labelled>
              <Labelled label="Meta description" hint={`${values.seoDescription.length}/160 characters`}>
                <textarea rows={3} value={values.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} className={`${inputClass} h-auto py-3`} />
              </Labelled>
              <Labelled label="Keywords" hint="Comma separated.">
                <input value={values.metaKeywords} onChange={(e) => set('metaKeywords', e.target.value)} className={inputClass} />
              </Labelled>
            </div>
          </Section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5 xl:sticky xl:top-8 xl:self-start">
          <Section title="Publishing">
            <div className="grid gap-4">
              <Labelled label="Status">
                <select value={values.status} onChange={(e) => set('status', e.target.value as ProductFormValues['status'])} className={selectClass}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </Labelled>
              <Labelled label="Visibility">
                <select value={values.visibility} onChange={(e) => set('visibility', e.target.value as ProductFormValues['visibility'])} className={selectClass}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="hidden">Hidden</option>
                </select>
              </Labelled>
            </div>
          </Section>

          <Section title="Pricing & stock">
            <div className="grid gap-4">
              <Labelled label="Price (₹)">
                <input type="number" min="0" step="1" required value={values.price} onChange={(e) => set('price', Number(e.target.value) || 0)} className={inputClass} />
              </Labelled>
              <Labelled label="Discounted price (₹)" hint="Leave blank for no discount.">
                <input type="number" min="0" step="1" value={values.discountPrice ?? ''} onChange={(e) => set('discountPrice', numberOrNull(e.target.value))} className={inputClass} />
              </Labelled>
              <Labelled label="Stock">
                <input type="number" min="0" step="1" value={values.stock} onChange={(e) => set('stock', Number(e.target.value) || 0)} className={inputClass} />
              </Labelled>
              <Labelled label="Availability">
                <select value={values.availability} onChange={(e) => set('availability', e.target.value as ProductFormValues['availability'])} className={selectClass}>
                  <option value="in_stock">In stock</option>
                  <option value="made_to_order">Made to order</option>
                  <option value="preorder">Pre-order</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </Labelled>
            </div>
          </Section>

          <Section title="Merchandising">
            <div className="flex flex-col gap-3">
              {([
                ['isFeatured', 'Featured'],
                ['isTrending', 'Trending'],
                ['isPopular', 'Popular'],
                ['isNewArrival', 'New arrival'],
                ['isBestSeller', 'Best seller'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 text-[13.5px] text-ink-200">
                  <input
                    type="checkbox"
                    checked={values[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-flame-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </form>
  );
}
