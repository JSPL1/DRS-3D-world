import { GripVertical } from 'lucide-react';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Homepage' };

export default async function AdminHomepagePage() {
  await requirePermission('homepage.edit');

  const sections = await all<{
    id: number;
    key: string;
    title: string;
    subtitle: string | null;
    sort_order: number;
    is_enabled: number;
  }>(`SELECT * FROM homepage_sections ORDER BY sort_order`);

  return (
    <>
      <PageHeader
        title="Homepage builder"
        subtitle="Switch a section off to remove it from the homepage. The 3D hero is always first."
      />

      <Card>
        <ul className="divide-y divide-white/[0.04]">
          {sections.map((section, i) => (
            <li key={section.id} className="flex items-center gap-4 px-6 py-4">
              <span className="flex items-center gap-3 text-ink-500">
                <GripVertical className="h-4 w-4" />
                <span className="w-6 font-mono text-[12px] text-ink-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{section.title}</p>
                {section.subtitle && (
                  <p className="text-[12.5px] text-ink-500">{section.subtitle}</p>
                )}
              </div>

              <span className="hidden rounded bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-ink-400 sm:inline">
                {section.key}
              </span>

              {/* The hero carries the whole first impression — not switchable. */}
              {section.key === 'hero' ? (
                <span className="text-[11.5px] text-ink-500">Always on</span>
              ) : (
                <ToggleSwitch
                  entity="homepageSection"
                  id={section.id}
                  value={section.is_enabled === 1}
                  label={`Show ${section.title}`}
                  onLabel="On"
                  offLabel="Off"
                />
              )}
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-5 text-[12.5px] text-ink-500">
        Section order is stored in the database. Drag-to-reorder is not wired up yet — change{' '}
        <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px]">sort_order</code>{' '}
        to change the sequence.
      </p>
    </>
  );
}
