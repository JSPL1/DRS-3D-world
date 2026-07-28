import type { Metadata } from 'next';

import { Sidebar } from '@/components/admin/Sidebar';
import { Cursor } from '@/components/ui/Cursor';
import { requireAdmin } from '@/lib/auth/session';
import { getBranding } from '@/lib/branding';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · DRS Admin' },
  robots: { index: false, follow: false },
};

// Every admin screen reflects live database state.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const branding = getBranding();

  return (
    <div className="min-h-dvh bg-ink-950">
      <Cursor variant={branding.cursor} />
      <Sidebar
        user={user}
        logoUrl={branding.headerLogoUrl}
        logoOnDarkChip={branding.logoNeedsDarkChip}
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-[1600px] px-4 py-8 pt-20 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
