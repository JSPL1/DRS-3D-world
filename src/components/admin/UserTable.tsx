'use client';

import { BadgeCheck, ChevronDown, ShieldQuestion } from 'lucide-react';
import { Fragment, useState } from 'react';

import { StatusSelect } from '@/components/admin/StatusSelect';
import { UserManagePanel } from '@/components/admin/UserManagePanel';
import { relativeTime, shortDate, Table, Td, Th } from '@/components/admin/Shell';
import { ROLE_LABELS, type Role } from '@/lib/auth/roles';

const USER_STATUSES = ['active', 'suspended', 'pending'] as const;

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  order_count: number;
};

export function UserTable({
  users,
  currentUserId,
  editable,
}: {
  users: AdminUserRow[];
  currentUserId: number;
  editable: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Contact</Th>
          <Th>Role</Th>
          <Th>Status</Th>
          <Th className="text-right">Orders</Th>
          <Th className="text-right">Last signed in</Th>
          <Th className="text-right">Joined</Th>
          {editable && <Th className="text-right">Manage</Th>}
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const isOpen = expanded === user.id;
          return (
            <Fragment key={user.id}>
              <tr className="transition-colors hover:bg-white/[0.02]">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flame-500/15 text-[12px] font-bold text-flame-400">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium text-ink-100">
                      {user.name}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-[11px] text-ink-500">(you)</span>
                      )}
                    </span>
                  </div>
                </Td>
                <Td className="text-[13px] text-ink-300">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      {user.email}
                      {user.email_verified_at ? (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Email verified" />
                      ) : (
                        <ShieldQuestion className="h-3.5 w-3.5 shrink-0 text-ink-500" aria-label="Email not verified" />
                      )}
                    </span>
                    {user.phone && <span className="text-[11.5px] text-ink-500">{user.phone}</span>}
                  </div>
                </Td>
                <Td>
                  <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[11.5px] text-ink-200">
                    {ROLE_LABELS[user.role as Role]}
                  </span>
                </Td>
                <Td>
                  {/* An admin can't lock themselves out of their own panel. */}
                  {editable && user.id !== currentUserId ? (
                    <StatusSelect entity="userStatus" id={user.id} value={user.status} options={USER_STATUSES} />
                  ) : (
                    <span className="capitalize text-ink-300">{user.status}</span>
                  )}
                </Td>
                <Td className="text-right text-[12.5px] text-ink-400">{user.order_count}</Td>
                <Td className="text-right text-[12.5px] text-ink-500">
                  {user.last_login_at ? relativeTime(user.last_login_at) : 'Never'}
                </Td>
                <Td className="text-right text-[12.5px] text-ink-500">{shortDate(user.created_at)}</Td>
                {editable && (
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : user.id)}
                      aria-expanded={isOpen}
                      className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-100"
                    >
                      Manage
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </Td>
                )}
              </tr>
              {editable && isOpen && (
                <tr>
                  <td colSpan={8} className="border-b border-white/[0.04] bg-[var(--surface-sunken)] p-0">
                    {/* The running neon ring, same as an expanded order: on
                        only while this account is open, gone the moment it
                        closes. Two people share this panel, and it marks
                        which account the changes below apply to. */}
                    <div className="neon-frame m-4 p-1">
                      <UserManagePanel
                        userId={user.id}
                        userName={user.name}
                        currentRole={user.role as Role}
                        isSelf={user.id === currentUserId}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
