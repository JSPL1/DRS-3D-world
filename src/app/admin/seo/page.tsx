import { AlertTriangle, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { Card, PageHeader, Table, Td, Th } from '@/components/admin/Shell';
import { SettingsForm, type SettingGroup } from '@/components/admin/SettingsForm';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';
import { getSettings } from '@/lib/queries';

export const metadata = { title: 'SEO' };

const GROUPS: SettingGroup[] = [
  {
    title: 'Default search listing',
    description: 'Used wherever a page has no title or description of its own.',
    fields: [
      { key: 'seo_title', label: 'Default title', hint: 'Aim for under 60 characters.' },
      { key: 'seo_description', label: 'Default description', type: 'textarea', hint: 'Aim for under 160 characters.' },
    ],
  },
];

export default async function AdminSeoPage() {
  await requirePermission('seo.edit');
  const settings = getSettings();

  // Anything published without its own metadata falls back to the site default,
  // which is worth surfacing rather than leaving to chance.
  const products = all<{
    id: number;
    name: string;
    slug: string;
    seo_title: string | null;
    seo_description: string | null;
  }>(
    `SELECT id, name, slug, seo_title, seo_description FROM products
     WHERE status = 'published' ORDER BY name`,
  );

  const missing = products.filter((p) => !p.seo_title || !p.seo_description);

  return (
    <>
      <PageHeader
        title="SEO"
        subtitle="Defaults, plus anything published without its own search listing."
      />

      <SettingsForm groups={GROUPS} initial={settings} />

      <Card
        title={`Product metadata — ${missing.length} need attention`}
        className="mt-2"
      >
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Title</Th>
              <Th>Description</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-white/[0.02]">
                <Td className="font-medium text-white">{product.name}</Td>
                <Td>
                  {product.seo_title ? (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      {product.seo_title.length} chars
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Using default
                    </span>
                  )}
                </Td>
                <Td>
                  {product.seo_description ? (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                      {product.seo_description.length} chars
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Using default
                    </span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="rounded-lg px-3 py-1.5 text-[12.5px] text-flame-500 transition-colors hover:bg-flame-500/10"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/products/${product.slug}`}
                      target="_blank"
                      aria-label={`View ${product.name}`}
                      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/sitemap.xml"
          target="_blank"
          className="rounded-xl border border-ink-700 px-4 py-2.5 text-[13px] text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400"
        >
          View sitemap.xml
        </Link>
        <Link
          href="/robots.txt"
          target="_blank"
          className="rounded-xl border border-ink-700 px-4 py-2.5 text-[13px] text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400"
        >
          View robots.txt
        </Link>
      </div>
    </>
  );
}
