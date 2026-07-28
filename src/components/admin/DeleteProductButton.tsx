'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const res = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
    setPending(false);

    if (res.ok) {
      setConfirming(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Could not delete that product.');
    }
  }

  // Two-step rather than a browser confirm(): deleting a product also removes
  // its images, tags and relations, so it deserves a deliberate second click.
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2 py-1.5 text-[12px] text-ink-400 hover:text-white"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={`Delete ${name}`}
      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
