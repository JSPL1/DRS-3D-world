import { StatusSelect } from '@/components/admin/StatusSelect';
import {
  Card, PageHeader, relativeTime, shortDate, Table, Td, Th,
} from '@/components/admin/Shell';
import { listAdminUsers } from '@/lib/admin-queries';
import { can, ROLE_LABELS, type Role } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Users' };

const USER_STATUSES = ['active', 'suspended', 'pending'] as const;

const ROLE_NOTES: Record<Role, string> = {
  admin: 'Full access, including settings, users and backups.',
  manager: 'Everything except user management, settings and backups.',
  sales: 'Orders, quotes, leads and read-only products.',
  customer: 'No admin access — account area only.',
  viewer: 'Read-only across the dashboard.',
};

export default async function AdminUsersPage() {
  const currentUser = await requirePermission('users.view');
  const users = listAdminUsers();
  const editable = can(currentUser.role, 'users.edit');

  return (
    <>
      <PageHeader title="Users" subtitle={`${users.length} accounts across five roles`} />

      <Card className="mb-5">
        <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(ROLE_NOTES) as Role[]).map((role) => (
            <div key={role} className="bg-ink-950 p-5">
              <p className="text-[13px] font-semibold text-white">{ROLE_LABELS[role]}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{ROLE_NOTES[role]}</p>
              <p className="mt-3 font-mono text-[11px] text-flame-500">
                {users.filter((u) => u.role === role).length} account
                {users.filter((u) => u.role === role).length === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="text-right">Last signed in</Th>
              <Th className="text-right">Joined</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-white/[0.02]">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame-500/15 text-[12px] font-bold text-flame-400">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium text-white">
                      {user.name}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-[11px] text-ink-500">(you)</span>
                      )}
                    </span>
                  </div>
                </Td>
                <Td className="text-[13px] text-ink-300">{user.email}</Td>
                <Td>
                  <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11.5px] text-ink-200">
                    {ROLE_LABELS[user.role as Role]}
                  </span>
                </Td>
                <Td>
                  {/* An admin can't lock themselves out of their own panel. */}
                  {editable && user.id !== currentUser.id ? (
                    <StatusSelect
                      entity="userStatus"
                      id={user.id}
                      value={user.status}
                      options={USER_STATUSES}
                    />
                  ) : (
                    <span className="capitalize text-ink-300">{user.status}</span>
                  )}
                </Td>
                <Td className="text-right text-[12.5px] text-ink-500">
                  {user.last_login_at ? relativeTime(user.last_login_at) : 'Never'}
                </Td>
                <Td className="text-right text-[12.5px] text-ink-500">{shortDate(user.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
