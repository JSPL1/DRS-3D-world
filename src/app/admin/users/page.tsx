import Link from 'next/link';

import { CreateUserForm } from '@/components/admin/CreateUserForm';
import { Card, PageHeader } from '@/components/admin/Shell';
import { UserTable } from '@/components/admin/UserTable';
import { listAdminUsers } from '@/lib/admin-queries';
import { can, ROLE_LABELS, type Role } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Users' };

const ROLE_NOTES: Record<Role, string> = {
  admin: 'Full access, including settings, users and backups.',
  manager: 'Everything except user management, settings and backups.',
  sales: 'Orders, quotes, leads and read-only products.',
  customer: 'No admin access — account area only.',
  viewer: 'Read-only across the dashboard.',
};

const STATUS_OPTIONS = ['active', 'suspended', 'pending'] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function buildHref(current: Record<string, string | string[] | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'string' && value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : '/admin/users';
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined);

  const currentUser = await requirePermission('users.view');
  const editable = can(currentUser.role, 'users.edit');

  const q = str('q');
  const roleFilter = str('role');
  const statusFilter = str('status');

  const allUsers = listAdminUsers();
  const users = listAdminUsers({ search: q, role: roleFilter, status: statusFilter });

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${allUsers.length} accounts across five roles`}
        action={editable ? <CreateUserForm /> : undefined}
      />

      <Card className="mb-5">
        <div className="grid gap-px bg-ink-800 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(ROLE_NOTES) as Role[]).map((role) => (
            <Link
              key={role}
              href={buildHref(params, { role: roleFilter === role ? undefined : role })}
              className={cn(
                'bg-[var(--surface)] p-5 transition-colors hover:bg-white/[0.03]',
                roleFilter === role && 'ring-2 ring-inset ring-flame-500/40',
              )}
            >
              <p className="text-[13px] font-semibold text-ink-100">{ROLE_LABELS[role]}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{ROLE_NOTES[role]}</p>
              <p className="mt-3 font-mono text-[11px] text-flame-500">
                {allUsers.filter((u) => u.role === role).length} account
                {allUsers.filter((u) => u.role === role).length === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action="/admin/users" className="flex gap-2">
          {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name, email or phone…"
            className="h-10 w-64 rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[13.5px] text-ink-100 placeholder:text-ink-500 focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
          />
          <button
            type="submit"
            className="h-10 rounded-xl border border-ink-700 px-4 text-[13px] text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <Link
              key={status}
              href={buildHref(params, { status: statusFilter === status ? undefined : status })}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors',
                statusFilter === status
                  ? 'border-flame-500 bg-flame-500/10 text-flame-400'
                  : 'border-ink-700 text-ink-400 hover:border-flame-500/40 hover:text-flame-400',
              )}
            >
              {status}
            </Link>
          ))}
        </div>

        {(q || roleFilter || statusFilter) && (
          <Link href="/admin/users" className="text-[12.5px] text-ink-500 underline-offset-2 hover:text-ink-100 hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      <Card>
        {users.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink-200">No accounts match those filters</p>
            <p className="mt-2 max-w-sm text-[13.5px] text-ink-500">Try a different search term or clear the filters above.</p>
          </div>
        ) : (
          <UserTable users={users} currentUserId={currentUser.id} editable={editable} />
        )}
      </Card>
    </>
  );
}
