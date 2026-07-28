'use client';

import { AlertTriangle, CheckCircle2, FileUp, Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, FormError, FormNotice } from '@/components/ui/Field';
import { inr } from '@/components/sections/ProductCard';
import {
  calculateQuote, exceedsBuildVolume, MATERIALS, parseSTL,
  type MeshStats, type QuoteRates,
} from '@/lib/stl';

const MAX_FILE_MB = 60;

export function QuoteCalculator({ rates }: { rates: QuoteRates }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [stats, setStats] = useState<MeshStats | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [materialId, setMaterialId] = useState(MATERIALS[0].id);
  const [layerHeight, setLayerHeight] = useState(0.2);
  const [infill, setInfill] = useState(20);
  const [quantity, setQuantity] = useState(1);
  const [needsSupport, setNeedsSupport] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const selectedMaterial = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];
  const isResin = selectedMaterial.technology === 'SLA';

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setSubmitted(null);

    if (!/\.stl$/i.test(file.name)) {
      setError('Please upload an .stl file. For STEP, OBJ or 3MF, send it through the contact form and we will quote by hand.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Our limit here is ${MAX_FILE_MB} MB — email it to us instead.`);
      return;
    }

    setParsing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      // Yield once so the spinner paints before a large parse blocks the thread.
      await new Promise((r) => setTimeout(r, 30));
      setStats(parseSTL(buffer));
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setParsing(false);
    }
  }, []);

  const quote = useMemo(() => {
    if (!stats) return null;
    return calculateQuote({
      stats,
      materialId,
      layerHeightMm: layerHeight,
      infillPercent: infill,
      quantity,
      needsSupport,
      rates,
    });
  }, [stats, materialId, layerHeight, infill, quantity, needsSupport, rates]);

  const oversized = stats ? exceedsBuildVolume(stats.bbox) : false;

  async function submitQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!stats || !quote) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          fileName,
          stats,
          materialId,
          layerHeightMm: layerHeight,
          infillPercent: infill,
          quantity,
          needsSupport,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not send your quote request.');
        return;
      }
      setSubmitted(data.reference);
    } catch {
      setError('Network problem. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setFileName(null);
    setStats(null);
    setError(null);
    setSubmitted(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {/* ---------------- Left: upload + parameters ---------------- */}
      <div className="flex flex-col gap-6">
        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={`glass relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            dragging ? 'border-flame-500 bg-flame-500/[0.07]' : 'border-white/10'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".stl"
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Upload an STL file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-flame-500/25 bg-flame-500/10 text-flame-500">
            {parsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
          </span>

          <p className="mt-5 font-display text-lg font-semibold">
            {parsing ? 'Reading your geometry…' : fileName ?? 'Drop an STL file here'}
          </p>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-400">
            {fileName && !parsing
              ? 'Drop another file to replace it.'
              : `Up to ${MAX_FILE_MB} MB. Your file is read in your browser and never uploaded — only the measurements are sent with an enquiry.`}
          </p>
        </div>

        {error && <FormError message={error} />}

        {/* Geometry readout */}
        {stats && (
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold tracking-tight">Your geometry</h3>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {[
                { label: 'Volume', value: `${(stats.volumeMm3 / 1000).toFixed(1)} cm³` },
                { label: 'Triangles', value: stats.triangleCount.toLocaleString('en-IN') },
                { label: 'Surface area', value: `${(stats.surfaceAreaMm2 / 100).toFixed(0)} cm²` },
                {
                  label: 'Bounding box',
                  value: `${stats.bbox.x.toFixed(0)} × ${stats.bbox.y.toFixed(0)} × ${stats.bbox.z.toFixed(0)} mm`,
                },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{item.label}</dt>
                  <dd className="mt-1 font-mono text-[15px] font-medium text-white">{item.value}</dd>
                </div>
              ))}
            </dl>

            {stats.suspect && (
              <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This mesh looks like it may not be watertight, or its normals may be flipped. The
                volume figure — and therefore the price — could be wrong. We will check it by hand
                before confirming.
              </p>
            )}

            {oversized && (
              <p className="mt-3 flex items-start gap-2.5 rounded-xl border border-flame-500/25 bg-flame-500/10 px-4 py-3 text-[12.5px] text-flame-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                This is larger than our 256 mm build volume. We will split it along a hidden seam and
                bond it — that is routine, but it adds finishing time to the quote.
              </p>
            )}
          </div>
        )}

        {/* Parameters */}
        {stats && (
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold tracking-tight">Print settings</h3>

            <div className="mt-5 flex flex-col gap-6">
              <div>
                <label htmlFor="material" className="text-[13px] font-medium text-ink-200">
                  Material
                </label>
                <select
                  id="material"
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-ink-900 px-4 text-[14.5px] text-white transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
                >
                  {MATERIALS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.technology}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[12.5px] text-ink-500">{selectedMaterial.note}</p>
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="layer" className="text-[13px] font-medium text-ink-200">
                    Layer height
                  </label>
                  <span className="font-mono text-[13px] text-flame-400">{layerHeight.toFixed(3)} mm</span>
                </div>
                <input
                  id="layer"
                  type="range"
                  min={isResin ? 0.025 : 0.08}
                  max={isResin ? 0.1 : 0.32}
                  step={isResin ? 0.005 : 0.02}
                  value={layerHeight}
                  onChange={(e) => setLayerHeight(Number(e.target.value))}
                  className="mt-3 w-full accent-flame-500"
                />
                <p className="mt-1.5 text-[12px] text-ink-500">
                  Finer layers look better and take proportionally longer.
                </p>
              </div>

              {!isResin && (
                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="infill" className="text-[13px] font-medium text-ink-200">
                      Infill
                    </label>
                    <span className="font-mono text-[13px] text-flame-400">{infill}%</span>
                  </div>
                  <input
                    id="infill"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={infill}
                    onChange={(e) => setInfill(Number(e.target.value))}
                    className="mt-3 w-full accent-flame-500"
                  />
                  <p className="mt-1.5 text-[12px] text-ink-500">
                    20% is right for most parts. Go above 50% only if it carries load.
                  </p>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Quantity"
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />

                <label className="flex cursor-pointer items-center gap-3 self-end pb-3 text-[13px] text-ink-200">
                  <input
                    type="checkbox"
                    checked={needsSupport}
                    onChange={(e) => setNeedsSupport(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-flame-500"
                  />
                  Needs support material
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Right: the price ---------------- */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="glass-strong rounded-2xl p-7">
          {!quote ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 text-ink-500">
                ₹
              </span>
              <p className="mt-5 font-display text-lg font-semibold text-ink-300">
                Your price appears here
              </p>
              <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-500">
                Upload an STL and we will work out volume, material, machine time and finishing —
                itemised, so you can see exactly what you are paying for.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-flame-500">
                    Instant estimate
                  </p>
                  <p className="mt-2 font-display text-4xl font-bold tracking-tight">
                    {inr(quote.total)}
                  </p>
                  {quantity > 1 && (
                    <p className="mt-1 text-[13px] text-ink-400">
                      {inr(quote.perUnit)} each · {quantity} pieces
                    </p>
                  )}
                </div>
                <button
                  onClick={reset}
                  aria-label="Start over"
                  className="rounded-lg p-2 text-ink-500 transition-colors hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <dl className="mt-7 space-y-2.5 border-t border-white/8 pt-6 text-[13.5px]">
                {[
                  ['Material', `${quote.weightG.toFixed(0)} g ${quote.material.name}`, quote.materialCost],
                  ['Machine time', `${quote.printHours.toFixed(1)} hours`, quote.machineCost],
                  ['Labour & finishing', null, quote.labourCost],
                  ['Electricity', null, quote.electricityCost],
                  ['Setup', null, quote.setupFee],
                ].map(([label, detail, value]) => (
                  <div key={label as string} className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-400">
                      {label as string}
                      {detail && <span className="ml-1.5 text-ink-500">· {detail as string}</span>}
                    </dt>
                    <dd className="font-mono text-white">{inr(value as number)}</dd>
                  </div>
                ))}

                <div className="flex items-baseline justify-between gap-4 border-t border-white/8 pt-3">
                  <dt className="text-ink-400">Margin</dt>
                  <dd className="font-mono text-white">{inr(quote.profit)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-400">GST (18%)</dt>
                  <dd className="font-mono text-white">{inr(quote.gst)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-400">Delivery</dt>
                  <dd className="font-mono text-white">
                    {quote.delivery === 0 ? 'Free' : inr(quote.delivery)}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-4">
                  <dt className="font-display text-base font-semibold text-white">Total</dt>
                  <dd className="font-display text-xl font-bold text-flame-500">{inr(quote.total)}</dd>
                </div>
              </dl>

              <p className="mt-5 text-[12px] leading-relaxed text-ink-500">
                An estimate from your geometry, not a contract. We confirm it by hand — and tell you
                if we think it should be lower.
              </p>

              {/* Send it to us */}
              {submitted ? (
                <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-flame-500/25 bg-flame-500/10 px-4 py-4 text-[13px] text-flame-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Sent — your reference is <strong className="font-mono">{submitted}</strong>. We
                    will come back to you within one working day.
                  </span>
                </div>
              ) : (
                <form onSubmit={submitQuote} className="mt-6 flex flex-col gap-4 border-t border-white/8 pt-6">
                  <p className="text-[13px] font-medium text-ink-200">
                    Want us to confirm it? Send it over.
                  </p>

                  <Field
                    label="Your name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                  <Field
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                  <Field
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Optional"
                  />

                  <Button type="submit" size="lg" disabled={submitting} className="w-full">
                    {submitting ? 'Sending…' : 'Send this quote to DRS'}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
