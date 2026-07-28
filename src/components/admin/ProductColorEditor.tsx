'use client';

import { Check, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ImageDrop } from '@/components/admin/ImageDrop';
import { FormError, FormNotice } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type PaletteColor = { id: number; name: string; hex: string };
export type AssignedColor = {
  colorId: number;
  imageUrl: string | null;
  priceDelta: number;
  isDefault: boolean;
};

/**
 * Which finishes a product can be ordered in, and what each one looks like.
 *
 * A colour without a photograph still sells — the product's normal gallery is
 * used — so the image field is optional rather than a blocker.
 */
export function ProductColorEditor({
  productId,
  palette,
  assigned,
}: {
  productId: number;
  palette: PaletteColor[];
  assigned: AssignedColor[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<AssignedColor[]>(assigned);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isOn = (colorId: number) => rows.some((r) => r.colorId === colorId);

  function toggle(colorId: number) {
    setRows((current) =>
      isOn(colorId)
        ? current.filter((r) => r.colorId !== colorId)
        : [...current, { colorId, imageUrl: null, priceDelta: 0, isDefault: current.length === 0 }],
    );
  }

  function patch(colorId: number, changes: Partial<AssignedColor>) {
    setRows((current) =>
      current.map((r) => (r.colorId === colorId ? { ...r, ...changes } : r)),
    );
  }

  function makeDefault(colorId: number) {
    setRows((current) => current.map((r) => ({ ...r, isDefault: r.colorId === colorId })));
  }

  async function save() {
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/admin/product-colors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, colors: rows }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not save colours.');
        return;
      }
      setNotice(`Saved ${data.count} colour${data.count === 1 ? '' : 's'}. The product page is updated.`);
      router.refresh();
    } catch {
      setError('Network problem. Colours were not saved.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Colours</h2>
          <p className="mt-1 text-[12.5px] text-ink-500">
            Pick which finishes a customer can order. Add a photo per colour and the product page
            swaps to it when they choose that finish.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-flame-700 px-4 text-[13px] font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? 'Saving…' : 'Save colours'}
        </button>
      </div>

      {error && <div className="mt-4"><FormError message={error} /></div>}
      {notice && <div className="mt-4"><FormNotice message={notice} /></div>}

      {/* Palette toggles */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        {palette.map((color) => {
          const on = isOn(color.id);
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => toggle(color.id)}
              aria-pressed={on}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-[12.5px] transition-all',
                on ? 'border-flame-600 bg-flame-700/10' : 'border-white/12 hover:border-white/25',
              )}
            >
              <span
                aria-hidden
                className="h-5 w-5 rounded-md ring-1 ring-black/20"
                style={{ backgroundColor: color.hex }}
              />
              {color.name}
              {on && <Check className="h-3.5 w-3.5 text-flame-500" />}
            </button>
          );
        })}
      </div>

      {/* Per-colour detail */}
      {rows.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((row) => {
            const color = palette.find((c) => c.id === row.colorId);
            if (!color) return null;

            return (
              <li key={row.colorId} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden
                    className="h-8 w-8 shrink-0 rounded-lg ring-1 ring-black/20"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="min-w-[120px] text-[13.5px] font-medium">{color.name}</span>

                  <label className="flex items-center gap-2 text-[12px] text-ink-400">
                    Price change
                    <span className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-500">₹</span>
                      <input
                        type="number"
                        step="1"
                        value={row.priceDelta}
                        onChange={(e) => patch(row.colorId, { priceDelta: Number(e.target.value) || 0 })}
                        className="h-9 w-28 rounded-lg border border-white/10 bg-white/[0.03] pl-6 pr-2 text-[13px]"
                      />
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => makeDefault(row.colorId)}
                    className={cn(
                      'ml-auto rounded-lg px-3 py-1.5 text-[12px] transition-colors',
                      row.isDefault
                        ? 'bg-flame-700/15 text-flame-500'
                        : 'text-ink-400 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    {row.isDefault ? 'Default colour' : 'Make default'}
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[96px_1fr]">
                  <span className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-ink-900">
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="px-2 text-center text-[10.5px] leading-tight text-ink-500">
                        Gallery photo
                      </span>
                    )}
                  </span>

                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] text-ink-400">
                      Photo for this colour <span className="text-ink-500">(optional)</span> — the
                      product page swaps to it when a customer picks {color.name}.
                    </span>

                    <ImageDrop
                      purpose="product-colour"
                      compact
                      label={row.imageUrl ? 'Replace photo' : 'Upload a photo for this colour'}
                      onUploaded={(files) =>
                        patch(row.colorId, { imageUrl: files[0]?.url ?? row.imageUrl })
                      }
                    />

                    <div className="flex gap-2">
                      <input
                        value={row.imageUrl ?? ''}
                        onChange={(e) => patch(row.colorId, { imageUrl: e.target.value || null })}
                        placeholder="…or paste a path: /uploads/… or /sample/…"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-[12px]"
                      />
                      {row.imageUrl && (
                        <button
                          type="button"
                          onClick={() => patch(row.colorId, { imageUrl: null })}
                          className="shrink-0 rounded-lg px-3 text-[12px] text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {rows.length === 0 && (
        <p className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[12.5px] text-ink-400">
          No colours selected — the product page will show no colour picker. That is the right
          choice for services and bespoke work.
        </p>
      )}
    </section>
  );
}
