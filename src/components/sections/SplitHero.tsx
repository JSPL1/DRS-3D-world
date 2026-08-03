'use client';

import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { ButtonLink } from '@/components/ui/Button';

const STATS = [
  { value: '18', label: 'Machines running' },
  { value: '±0.1mm', label: 'Working tolerance' },
  { value: '48hr', label: 'Typical dispatch' },
  { value: '4.9★', label: '2,140 ratings' },
];

/**
 * The redesign's second hero — sits directly beneath the animated 3D printer,
 * not instead of it. Where the 3D hero sells the studio, this sells the two
 * concrete things a visitor does next: browse the catalogue, or get an
 * instant price on their own file.
 */
export function SplitHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // The quote page owns the real upload + STL parsing; a file chosen here is
  // just carried over via sessionStorage so the wizard opens straight onto
  // "analysing" instead of an empty drop zone the visitor has to repeat.
  function handOff(file: File | undefined) {
    if (!file) return;
    try {
      sessionStorage.setItem('drs-quote-handoff', file.name);
    } catch {
      // Not essential — the quote page works fine without it.
    }
    router.push('/quote');
  }

  return (
    <section className="relative z-10 bg-[var(--bg)] pt-10">
      {/* 1400px, matching the navbar and every other section. At 1320 this
          block sat 80px narrower than the rest of the page and read as
          misaligned against the header above it. */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.28fr_.72fr]">
          {/* Headline + stats card */}
          <div className="relative overflow-hidden rounded-[28px] border border-ink-800 bg-[var(--surface)] p-9 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full bg-flame-500/15 blur-[110px]"
            />
            <span className="relative inline-flex items-center gap-2 rounded-full border border-flame-500/25 bg-flame-500/10 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-flame-700">
              <span className="h-1.5 w-1.5 rounded-full bg-flame-500" />
              Printed in Bhubaneswar
            </span>

            <h2 className="relative mt-6 max-w-[16ch] text-balance font-display text-[clamp(34px,5vw,58px)] font-extrabold leading-[0.96] tracking-tight text-ink-100">
              Objects made one layer at a time.
            </h2>

            <p className="relative mt-5 max-w-[46ch] text-[16px] leading-relaxed text-ink-400">
              A catalogue of sculpture, lighting and gifting — designed in-house, printed to order,
              finished by hand. Nothing sits in a warehouse.
            </p>

            <div className="relative mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products" variant="primary" size="lg">
                Shop the catalogue
              </ButtonLink>
              <ButtonLink href="/quote" variant="secondary" size="lg">
                Upload your own file
              </ButtonLink>
            </div>

            <div className="relative mt-10 flex flex-wrap gap-9 border-t border-ink-800 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-2xl font-extrabold tracking-tight text-ink-100">
                    {s.value}
                  </div>
                  <div className="mt-0.5 text-[11.5px] font-semibold text-ink-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quote drop panel */}
          <div className="relative flex flex-col overflow-hidden rounded-[28px] bg-ink-100 p-8 sm:p-9">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-36 -left-20 h-[340px] w-[340px] rounded-full bg-flame-500/35 blur-[100px]"
            />
            <p className="relative text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-flame-500">
              Custom manufacturing
            </p>
            <h3 className="relative mt-4 font-display text-[32px] font-extrabold leading-[1.05] tracking-tight text-ink-950">
              Your file.
              <br />
              Priced instantly.
            </h3>
            <p className="relative mt-3.5 text-[13.5px] leading-relaxed text-ink-500">
              STL, OBJ, STEP or a drawing. Choose material and finish, see the price before you
              talk to anyone.
            </p>

            <div className="relative mt-auto pt-6">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handOff(e.dataTransfer.files?.[0]);
                }}
                className={`block cursor-pointer rounded-[18px] border-1.5 border-dashed p-6 text-center transition-colors ${
                  dragging ? 'border-flame-500 bg-ink-950/[0.06]' : 'border-ink-950/15 bg-ink-950/[0.02]'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".stl,.obj,.step,.stp,.zip,.pdf"
                  className="sr-only"
                  onChange={(e) => handOff(e.target.files?.[0])}
                />
                <Upload className="mx-auto h-6 w-6 text-ink-400" />
                <p className="mt-2 text-[13.5px] font-bold text-ink-950">Drop a file to begin</p>
                <p className="mt-1 text-[11.5px] text-ink-500">
                  STL · OBJ · STEP · ZIP · PDF — up to 200 MB
                </p>
              </label>

              <div className="mt-3.5 flex flex-wrap gap-2">
                <span className="rounded-full border border-ink-950/10 px-2.5 py-1.5 text-[11px] font-semibold text-ink-400">
                  No minimum order
                </span>
                <span className="rounded-full border border-ink-950/10 px-2.5 py-1.5 text-[11px] font-semibold text-ink-400">
                  NDA on request
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
