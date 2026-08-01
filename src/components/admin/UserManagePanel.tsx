'use client';

import { KeyRound, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Field, FormError, FormNotice } from '@/components/ui/Field';
import { ROLE_LABELS, type Role } from '@/lib/auth/roles';

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as Role[];

/**
 * Expanded row: everything an administrator can do to one account besides the
 * status toggle already on the table row itself. Kept as one panel rather
 * than a separate page — these are quick, occasional actions, not a form
 * someone fills in over several minutes.
 */
export function UserManagePanel({
  userId,
  userName,
  currentRole,
  isSelf,
}: {
  userId: number;
  userName: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const router = useRouter();

  const [role, setRole] = useState<Role>(currentRole);
  const [rolePending, setRolePending] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function saveRole() {
    if (role === currentRole) return;
    setRoleError(null);
    setRoleNotice(null);
    setRolePending(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRoleError(data.error ?? 'Could not change the role.');
        setRole(currentRole);
        return;
      }
      setRoleNotice(`Role updated to ${ROLE_LABELS[role]}. Signed out of any open sessions.`);
      router.refresh();
    } catch {
      setRoleError('Network problem. The role was not changed.');
      setRole(currentRole);
    } finally {
      setRolePending(false);
    }
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);
    setPasswordPending(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error ?? 'Could not set that password.');
        return;
      }
      setPassword('');
      setPasswordNotice(`New password set for ${userName}. They are signed out everywhere until they sign in with it.`);
    } catch {
      setPasswordError('Network problem. The password was not changed.');
    } finally {
      setPasswordPending(false);
    }
  }

  async function signOutEverywhere() {
    setLogoutNotice(null);
    setLogoutPending(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/logout`, { method: 'POST' });
      const data = await res.json();
      setLogoutNotice(res.ok ? `${userName} is signed out everywhere.` : data.error ?? 'Could not sign them out.');
    } catch {
      setLogoutNotice('Network problem. Nothing was changed.');
    } finally {
      setLogoutPending(false);
    }
  }

  async function deleteAccount() {
    setDeleteError(null);
    setDeletePending(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error ?? 'Could not delete this account.');
        setDeletePending(false);
        return;
      }
      router.refresh();
    } catch {
      setDeleteError('Network problem. The account was not deleted.');
      setDeletePending(false);
    }
  }

  if (isSelf) {
    return (
      <p className="p-5 text-[13px] text-ink-500">
        You cannot change your own role, reset your own password, or delete your own account from here —
        sign in as another administrator to manage this account.
      </p>
    );
  }

  return (
    <div className="grid gap-6 p-5 sm:grid-cols-2">
      {/* Role */}
      <div className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink-200">
          <ShieldCheck className="h-4 w-4 text-flame-500" />
          Role
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-11 rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveRole}
            disabled={rolePending || role === currentRole}
            className="inline-flex h-11 items-center rounded-xl bg-flame-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-flame-800 disabled:opacity-40"
          >
            {rolePending ? 'Saving…' : 'Save role'}
          </button>
        </div>
        {roleError && <FormError message={roleError} />}
        {roleNotice && <FormNotice message={roleNotice} />}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink-800 pt-4">
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink-200">
            <LogOut className="h-4 w-4 text-flame-500" />
            Active sessions
          </span>
          <button
            type="button"
            onClick={signOutEverywhere}
            disabled={logoutPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-700 px-3 text-[12.5px] font-medium text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-500 disabled:opacity-50"
          >
            {logoutPending ? 'Signing out…' : 'Sign out everywhere'}
          </button>
        </div>
        {logoutNotice && <p className="text-[12px] text-ink-500">{logoutNotice}</p>}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink-800 pt-4">
          <span className="flex items-center gap-2 text-[13px] font-medium text-red-400">
            <Trash2 className="h-4 w-4" />
            Delete account
          </span>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deletePending}
                className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deletePending ? 'Deleting…' : 'Confirm delete'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="inline-flex h-9 items-center rounded-lg px-3 text-[12.5px] text-ink-400 hover:text-ink-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-500/30 px-3 text-[12.5px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete…
            </button>
          )}
        </div>
        {deleteError && <FormError message={deleteError} />}
        <p className="text-[11.5px] text-ink-500">
          Their past orders and quotes stay on record — only the login is removed.
        </p>
      </div>

      {/* Password */}
      <form onSubmit={setNewPassword} className="flex flex-col gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ink-200">
          <KeyRound className="h-4 w-4 text-flame-500" />
          Set a new password
        </span>
        <p className="text-[12px] text-ink-500">
          For a support call where {userName.split(' ')[0]} is locked out. Passwords are stored as
          one-way hashes — there is no way to view the current one, only to set a new one.
        </p>
        <Field
          label="New password"
          type="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <button
          type="submit"
          disabled={passwordPending || password.length < 8}
          className="inline-flex h-11 w-fit items-center rounded-xl bg-flame-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-flame-800 disabled:opacity-40"
        >
          {passwordPending ? 'Saving…' : 'Set password'}
        </button>
        {passwordError && <FormError message={passwordError} />}
        {passwordNotice && <FormNotice message={passwordNotice} />}
      </form>
    </div>
  );
}
