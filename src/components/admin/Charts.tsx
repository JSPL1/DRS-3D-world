'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/**
 * Admin charts.
 *
 * Palette note: the admin renders on a fixed dark surface (#101013). The two
 * categorical slots below were validated all-pairs against that surface —
 * lightness band, chroma floor, CVD separation, normal-vision floor and
 * contrast all pass. Do not substitute hues here without re-running the
 * validator; brand orange at its lighter steps (#ff6b00, #ff8433) falls outside
 * the dark lightness band.
 *
 * Single-series charts use SERIES_1 alone as a magnitude hue, so most of these
 * need no legend at all.
 */

const SERIES_1 = '#e85d00'; // brand orange, dark-surface step
const SERIES_2 = '#3987e5'; // blue

const INK_MUTED = '#898781';
const GRID = '#2c2c2a';
const SURFACE = '#101013';

const axisProps = {
  stroke: INK_MUTED,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

/* ---------------- Tooltip ---------------- */

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string };

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  format?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-ink-700 bg-[var(--surface)] px-3.5 py-2.5 shadow-lift">
      <p className="text-[11px] font-medium text-ink-400">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-[12.5px]">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-ink-300">{entry.name}</span>
            <span className="ml-auto font-mono tabular-nums text-ink-100">
              {typeof entry.value === 'number' && format
                ? format(entry.value)
                : String(entry.value ?? '')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const inrCompact = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: value >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 100000 ? 1 : 0,
  }).format(value);

/* ---------------- Legend (shared, for ≥2 series) ---------------- */

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-[12px] text-ink-300">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Data table fallback ---------------- */

function TableView({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer list-none text-[12px] text-ink-500 transition-colors hover:text-ink-300 [&::-webkit-details-marker]:hidden">
        View as table ›
      </summary>
      <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-ink-800">
        <table className="w-full text-left text-[12px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-[var(--surface)]">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-medium text-ink-400">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-white/5">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5 tabular-nums text-ink-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/* ============================================================
   Revenue — single series, no legend needed
   ============================================================ */

export function RevenueChart({
  data,
}: {
  data: Array<{ label: string; revenue: number; orders: number }>;
}) {
  return (
    <div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_1} stopOpacity={0.34} />
                <stop offset="100%" stopColor={SERIES_1} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
            <YAxis {...axisProps} width={64} tickFormatter={(v: number) => inrCompact(v)} />
            <Tooltip
              cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
              content={<ChartTooltip format={inrCompact} />}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={SERIES_1}
              strokeWidth={2}
              fill="url(#revenue-fill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <TableView
        caption="Daily revenue over the last 30 days"
        columns={['Day', 'Revenue', 'Orders']}
        rows={data.map((d) => [d.label, inrCompact(d.revenue), d.orders])}
      />
    </div>
  );
}

/* ============================================================
   Traffic — two series, same unit, one axis
   ============================================================ */

export function TrafficChart({
  data,
}: {
  data: Array<{ label: string; views: number; visitors: number }>;
}) {
  return (
    <div>
      <Legend
        items={[
          { label: 'Page views', color: SERIES_1 },
          { label: 'Unique visitors', color: SERIES_2 },
        ]}
      />

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
            <YAxis {...axisProps} width={44} />
            <Tooltip
              cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
              content={<ChartTooltip format={(v) => v.toLocaleString('en-IN')} />}
            />

            <Line
              type="monotone"
              dataKey="views"
              name="Page views"
              stroke={SERIES_1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE }}
            />
            <Line
              type="monotone"
              dataKey="visitors"
              name="Unique visitors"
              stroke={SERIES_2}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: SURFACE }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <TableView
        caption="Daily page views and unique visitors over the last 30 days"
        columns={['Day', 'Page views', 'Unique visitors']}
        rows={data.map((d) => [d.label, d.views, d.visitors])}
      />
    </div>
  );
}

/* ============================================================
   Horizontal magnitude bars — single hue, direct labels
   ============================================================ */

export function RankedBarChart({
  data,
  valueLabel,
  format = 'number',
  height = 260,
}: {
  data: Array<{ name: string; value: number }>;
  valueLabel: string;
  /**
   * A name, not a function: this component is rendered from Server Components,
   * and React Server Components cannot serialise a function across that
   * boundary. Formatting happens here instead.
   */
  format?: 'number' | 'money';
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-[13px] text-ink-500">No data yet.</p>;
  }

  const formatValue = (value: number) =>
    format === 'money' ? inrCompact(value) : value.toLocaleString('en-IN');

  const max = Math.max(...data.map((d) => d.value), 1);

  // A plain list reads better than a bar chart at this size, and gives us
  // direct labels for free — no legend, no axis, no tooltip needed.
  return (
    <ul className="space-y-3" style={{ minHeight: height }}>
      {data.map((item) => (
        <li key={item.name}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate text-[13px] text-ink-200">{item.name}</span>
            <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-white">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, background: SERIES_1 }}
              role="img"
              aria-label={`${item.name}: ${formatValue(item.value)} ${valueLabel}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   Orders per day — single series bars
   ============================================================ */

export function OrdersBarChart({
  data,
}: {
  data: Array<{ label: string; orders: number }>;
}) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
          <YAxis {...axisProps} width={32} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={<ChartTooltip format={(v) => String(v)} />}
          />
          <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={SERIES_1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
