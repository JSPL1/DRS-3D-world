'use client';

import { useEffect, useRef, useState } from 'react';

import {
  CURSOR_HIDES_NATIVE,
  DEFAULT_CURSOR,
  type CursorVariant,
} from '@/lib/cursor';

const INTERACTIVE =
  'a, button, input, textarea, select, label, [role="button"], [data-cursor="hover"]';

export function Cursor({ variant = DEFAULT_CURSOR }: { variant?: CursorVariant }) {
  const leadRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (variant === 'system') return;

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduced) return;

    setEnabled(true);
    const root = document.documentElement;
    if (CURSOR_HIDES_NATIVE.has(variant)) root.classList.add('custom-cursor-active');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let trailX = mouseX;
    let trailY = mouseY;
    let scale = 1;
    let targetScale = 1;
    let pressed = false;
    let frame = 0;
    let idle = true;

    const draw = () => {
      trailX += (mouseX - trailX) * 0.2;
      trailY += (mouseY - trailY) * 0.2;
      scale += (targetScale * (pressed ? 0.78 : 1) - scale) * 0.2;

      if (leadRef.current) {
        leadRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trailX}px, ${trailY}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      }
    };

    // The loop parks itself once the trail has caught up. A cursor sitting
    // still has no reason to hold a requestAnimationFrame slot open against
    // the rest of the page.
    const tick = () => {
      draw();
      const settled =
        Math.abs(mouseX - trailX) < 0.4 &&
        Math.abs(mouseY - trailY) < 0.4 &&
        Math.abs(targetScale * (pressed ? 0.78 : 1) - scale) < 0.004;

      if (settled) {
        idle = true;
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!idle) return;
      idle = false;
      frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetScale = (e.target as HTMLElement | null)?.closest(INTERACTIVE) ? 1.9 : 1;
      wake();
    };
    const onDown = () => {
      pressed = true;
      wake();
    };
    const onUp = () => {
      pressed = false;
      wake();
    };
    // The pointer leaving the window would otherwise strand the mark on screen.
    const setOpacity = (value: string) => {
      if (leadRef.current) leadRef.current.style.opacity = value;
      if (trailRef.current) trailRef.current.style.opacity = value;
    };
    const onLeave = () => setOpacity('0');
    const onEnter = () => setOpacity('1');

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);
    draw();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      root.classList.remove('custom-cursor-active');
      setEnabled(false);
    };
  }, [variant]);

  if (!enabled || variant === 'system') return null;

  // `will-change-transform` promotes each mark to its own compositor layer, so
  // moving the pointer never repaints the page underneath it.
  const layer = 'pointer-events-none fixed left-0 top-0 will-change-transform';

  return (
    <>
      {variant === 'dot' && (
        <>
          <div ref={leadRef} aria-hidden className={`${layer} z-[9999] h-1.5 w-1.5 rounded-full bg-flame-500`} />
          <div ref={trailRef} aria-hidden className={`${layer} z-[9998] h-9 w-9 rounded-full border border-flame-500/70`} />
        </>
      )}

      {variant === 'ring' && (
        <div ref={trailRef} aria-hidden className={`${layer} z-[9999] h-7 w-7 rounded-full border-2 border-flame-500`} />
      )}

      {variant === 'glow' && (
        <>
          <div ref={leadRef} aria-hidden className={`${layer} z-[9999] h-2 w-2 rounded-full bg-flame-400`} />
          <div
            ref={trailRef}
            aria-hidden
            className={`${layer} z-[9998] h-16 w-16 rounded-full`}
            style={{
              background:
                'radial-gradient(circle, rgba(255,107,0,0.34) 0%, rgba(255,107,0,0.10) 45%, transparent 70%)',
            }}
          />
        </>
      )}

      {variant === 'crosshair' && (
        <>
          <div ref={leadRef} aria-hidden className={`${layer} z-[9999]`}>
            <span className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-flame-500/80" />
            <span className="absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-flame-500/80" />
          </div>
          <div ref={trailRef} aria-hidden className={`${layer} z-[9998] h-5 w-5 rounded-sm border border-flame-500/45`} />
        </>
      )}

      {variant === 'native-accent' && (
        <div ref={trailRef} aria-hidden className={`${layer} z-[9998] h-8 w-8 rounded-full border border-flame-500/45`} />
      )}
    </>
  );
}
