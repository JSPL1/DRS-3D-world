'use client';

import Lenis from 'lenis';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

type LenisContextValue = { lenis: Lenis | null };
const LenisContext = createContext<LenisContextValue>({ lenis: null });

export const useLenis = () => useContext(LenisContext).lenis;

/**
 * Lenis smooth scrolling.
 *
 * Disabled outright when the reader prefers reduced motion — inertial
 * scrolling is exactly the kind of thing that setting exists to switch off.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const instance = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      infinite: false,
    });

    setLenis(instance);

    const raf = (time: number) => {
      instance.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafRef.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={{ lenis }}>{children}</LenisContext.Provider>;
}
