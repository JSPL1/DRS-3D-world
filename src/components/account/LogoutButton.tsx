'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-[13px] text-ink-200 transition-colors hover:border-flame-500/40 hover:text-flame-400 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
