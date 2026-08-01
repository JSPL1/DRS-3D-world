'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

/**
 * Cart state.
 *
 * Held in localStorage so a visitor can build a basket without signing in —
 * the pattern every large storefront uses, because forcing a login before the
 * basket is the single biggest drop-off point in checkout.
 *
 * Prices are stored here only to render the basket. The server recalculates
 * every line from the database at checkout, so editing localStorage changes
 * what you see and nothing that you pay.
 */

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  colorId: number | null;
  colorName: string | null;
  colorHex: string | null;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  giftWrap: boolean;
  giftNote: string;
  giftWrapFee: number;
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: number, colorId: number | null, quantity: number) => void;
  remove: (productId: number, colorId: number | null) => void;
  clear: () => void;
  setGiftWrap: (value: boolean) => void;
  setGiftNote: (value: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'drs-cart-v1';
const GIFT_KEY = 'drs-cart-gift-v1';
export const GIFT_WRAP_FEE = 149;

const sameLine = (a: CartLine, productId: number, colorId: number | null) =>
  a.productId === productId && (a.colorId ?? null) === (colorId ?? null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  // Rendering the basket before localStorage is read would flash an empty
  // cart on every navigation, so consumers wait on this.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setLines(parsed.filter(isValidLine));
      }
      const rawGift = localStorage.getItem(GIFT_KEY);
      if (rawGift) {
        const parsed = JSON.parse(rawGift);
        if (typeof parsed?.giftWrap === 'boolean') setGiftWrap(parsed.giftWrap);
        if (typeof parsed?.giftNote === 'string') setGiftNote(parsed.giftNote);
      }
    } catch {
      // Corrupt storage shouldn't break the site — start with an empty cart.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Quota or private mode — the cart still works for this page view.
    }
  }, [lines, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(GIFT_KEY, JSON.stringify({ giftWrap, giftNote }));
    } catch {
      // Quota or private mode — gift wrap choice just won't persist across reloads.
    }
  }, [giftWrap, giftNote, ready]);

  // Keep multiple open tabs consistent.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setLines(parsed.filter(isValidLine));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((line: Omit<CartLine, 'quantity'>, quantity = 1) => {
    setLines((current) => {
      const index = current.findIndex((l) => sameLine(l, line.productId, line.colorId));
      if (index >= 0) {
        const next = [...current];
        next[index] = {
          ...next[index],
          quantity: Math.min(99, next[index].quantity + quantity),
        };
        return next;
      }
      return [...current, { ...line, quantity: Math.min(99, Math.max(1, quantity)) }];
    });
  }, []);

  const setQuantity = useCallback((productId: number, colorId: number | null, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => !sameLine(l, productId, colorId))
        : current.map((l) =>
            sameLine(l, productId, colorId)
              ? { ...l, quantity: Math.min(99, quantity) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((productId: number, colorId: number | null) => {
    setLines((current) => current.filter((l) => !sameLine(l, productId, colorId)));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setGiftWrap(false);
    setGiftNote('');
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.quantity, 0);
    const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
    return {
      lines, count, subtotal, ready, add, setQuantity, remove, clear,
      giftWrap, giftNote, giftWrapFee: GIFT_WRAP_FEE, setGiftWrap, setGiftNote,
    };
  }, [lines, ready, add, setQuantity, remove, clear, giftWrap, giftNote]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function isValidLine(l: unknown): l is CartLine {
  if (typeof l !== 'object' || l === null) return false;
  const line = l as Record<string, unknown>;
  return (
    typeof line.productId === 'number' &&
    typeof line.slug === 'string' &&
    typeof line.name === 'string' &&
    typeof line.unitPrice === 'number' &&
    typeof line.quantity === 'number' &&
    line.quantity > 0
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider.');
  return ctx;
}
