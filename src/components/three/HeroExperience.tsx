'use client';

import {
  AdaptiveDpr,
  ContactShadows,
  Environment,
  Lightformer,
  PerformanceMonitor,
} from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ButtonLink } from '@/components/ui/Button';
import { clamp01 } from '@/components/three/printer/state';
import {
  Choreography,
  PRINT_FRACTION,
  QUEUE_START,
} from '@/components/three/printer/Choreography';
import { PrintedPart, PrintLayerEffects } from '@/components/three/printer/PrintedProduct';
import { Printer } from '@/components/three/printer/Printer';
import { PART_GROUPS, PARTS } from '@/components/three/printer/parts';
import { PRINT_PRODUCTS } from '@/components/three/printer/products';
import { createSceneState, SceneStateContext } from '@/components/three/printer/state';
import { site } from '@/lib/site';

/* ============================================================
   Lighting rig
   ============================================================ */

/**
 * Studio lighting.
 *
 * The realism comes mostly from the `Environment` block rather than the lamps:
 * its Lightformers are rendered into a cube map, so every metal surface gets
 * true reflections of soft-box shapes instead of flat specular dots. It's
 * built in-scene from geometry — no HDR file is fetched — and `frames={1}`
 * bakes it once rather than re-rendering the probe every frame.
 */
function Lighting({ light }: { light: boolean }) {
  return (
    <>
      <ambientLight intensity={light ? 0.85 : 0.3} />

      {/* Key — casts the machine's shadow */}
      <directionalLight
        position={[5.5, 8, 6]}
        intensity={light ? 2.4 : 1.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      {/* Fill — keeps the shadow side readable */}
      <directionalLight
        position={[-6, 3.5, 2]}
        intensity={light ? 1.1 : 0.5}
        color={light ? '#ffffff' : '#9fc4ff'}
      />

      {/* Brand rim, from behind — separates the frame from the backdrop */}
      <spotLight
        position={[-4, 5.5, -6]}
        angle={0.7}
        penumbra={0.9}
        intensity={light ? 22 : 38}
        color="#ff6b00"
        distance={22}
      />

      {/* Warm bounce off the heated bed */}
      <pointLight
        position={[0, 1.2, 1.6]}
        intensity={light ? 4 : 7}
        color="#ff8433"
        distance={7}
        decay={2}
      />

      <Environment resolution={192} frames={1}>
        {/* Overhead soft box — the long highlight that runs down the rails */}
        <Lightformer
          form="rect"
          intensity={light ? 3.2 : 2.2}
          position={[0, 6, 1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 6, 1]}
          color="#ffffff"
        />
        {/* Side cards — give the extrusions their edge definition */}
        <Lightformer
          form="rect"
          intensity={light ? 2 : 1.4}
          position={[-6, 2, 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[8, 5, 1]}
          color={light ? '#ffffff' : '#cfe0ff'}
        />
        <Lightformer
          form="rect"
          intensity={light ? 1.6 : 1.1}
          position={[6, 2, 1]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={[8, 5, 1]}
          color="#ffffff"
        />
        {/* Warm kicker, low and behind — brand colour in the metal */}
        <Lightformer
          form="circle"
          intensity={light ? 1.4 : 2.6}
          position={[-3, 1, -5]}
          scale={4}
          color="#ff7a1a"
        />
      </Environment>
    </>
  );
}

/* ============================================================
   Scene
   ============================================================ */

function Scene({
  mouse,
  light,
  sculptUrl,
}: {
  mouse: React.RefObject<{ x: number; y: number }>;
  light: boolean;
  sculptUrl: string | null;
}) {
  return (
    <>
      <Lighting light={light} />
      <Choreography mouse={mouse} />

      <group position={[0, -0.4, 0]}>
        <Printer>
          <PrintedPart sculptUrl={sculptUrl} />
        </Printer>
        <PrintLayerEffects />

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={light ? 0.4 : 0.62}
          scale={13}
          blur={2.6}
          far={5}
          // 256 rather than 512: this buffer is re-rendered as the bed moves,
          // and at hero scale the extra resolution isn't visible under a 2.6
          // blur — it was pure cost.
          resolution={256}
          color="#000000"
        />
      </group>
    </>
  );
}

/* ============================================================
   Overlay copy, driven by the same scroll progress
   ============================================================ */

type Phase =
  | { kind: 'intro' }
  | { kind: 'teardown'; groupIndex: number }
  | { kind: 'reassemble' }
  | { kind: 'printing'; productIndex: number };

function phaseFor(p: number): Phase {
  if (p < 0.16) return { kind: 'intro' };
  if (p < 0.555) {
    const t = clamp01((p - 0.17) / (0.45 - 0.17));
    return { kind: 'teardown', groupIndex: Math.min(PART_GROUPS.length - 1, Math.floor(t * PART_GROUPS.length)) };
  }
  if (p < QUEUE_START) return { kind: 'reassemble' };

  // Mirrors the slot arithmetic in Choreography — every product, statue first.
  const slots = PRINT_PRODUCTS.length;
  const queue = clamp01((p - QUEUE_START) / (1 - QUEUE_START)) * slots;
  return { kind: 'printing', productIndex: Math.min(slots - 1, Math.floor(queue)) };
}

function phaseKey(phase: Phase): string {
  switch (phase.kind) {
    case 'teardown':
      return `teardown-${phase.groupIndex}`;
    case 'printing':
      return `printing-${phase.productIndex}`;
    default:
      return phase.kind;
  }
}

const FADE = {
  initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -14, filter: 'blur(8px)' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

/* ============================================================
   Static fallback — the 3D sequence switched off in Settings
   ============================================================ */

/**
 * Same opening copy as the "intro" phase of the 3D experience, without the
 * canvas, scroll pinning or WebGL cost. Used when an administrator disables
 * the 3D hero — for low-powered devices, or simply because a plainer
 * homepage is what they want.
 */
function StaticHero({ light }: { light: boolean }) {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center sm:py-20">
      <div
        aria-hidden
        className={
          light
            ? 'absolute inset-0 bg-gradient-to-b from-[#fbfbfd] via-[#f1f1f5] to-[#e9e9ef]'
            : 'absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950'
        }
      />
      <div
        aria-hidden
        className={`absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${
          light ? 'bg-flame-500/[0.10]' : 'bg-flame-500/[0.07]'
        }`}
      />

      <span className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-flame-500/30 bg-flame-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-flame-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-500" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-flame-500" />
        </span>
        Bhubaneswar · Odisha
      </span>

      {/* Compact by design. With the 3D printer switched off this is a plain
          banner, not a full screen of type — the studio turns the animation
          off to get a shorter homepage, so filling the viewport with a
          headline instead defeats the point. */}
      <h1 className="relative font-display text-[clamp(38px,7vw,68px)] font-bold leading-[0.9] tracking-[-0.04em]">
        <span className="block text-white">DRS 3D</span>
        <span className="block text-flame">WORLD</span>
      </h1>

      <p className="relative mt-5 max-w-xl text-balance-pretty text-[15px] leading-relaxed text-ink-200">
        {site.slogan}.
      </p>

      <div className="relative pointer-events-auto mt-7 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/quote" size="lg">
          Get an instant quote
          <ArrowRight className="h-4 w-4" />
        </ButtonLink>
        <ButtonLink href="/products" variant="secondary" size="lg">
          See what we make
        </ButtonLink>
      </div>
    </section>
  );
}

/* ============================================================
   The section
   ============================================================ */

export function HeroExperience({
  theme = 'dark',
  sculptUrl = null,
  enabled = true,
  playMode = 'scroll',
  scrollVh = 720,
  timeSeconds = 14,
}: {
  theme?: 'dark' | 'light';
  /** Path to the studio's sculpted mesh, when one has been supplied. */
  sculptUrl?: string | null;
  /** Admin-controlled: the whole 3D sequence can be switched off. */
  enabled?: boolean;
  /** "scroll" ties progress to scroll position; "time" autoplays on a clock. */
  playMode?: 'scroll' | 'time';
  /** Scroll-mode only: how many viewport-heights the sequence runs over. */
  scrollVh?: number;
  /** Time-mode only: how many seconds the autoplay takes to finish. */
  timeSeconds?: number;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneState = useRef(createSceneState());
  const mouse = useRef({ x: 0, y: 0 });

  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [webglFailed, setWebglFailed] = useState(false);
  const [dpr, setDpr] = useState(1.4);

  // The hero is 720vh tall, so once the reader is into the page below it the
  // canvas is nowhere near the viewport — but R3F's default frameloop keeps
  // rendering the printer at 60fps regardless, competing with the rest of the
  // page for every frame. Parking it is the single biggest scroll win here.
  const [inView, setInView] = useState(true);

  const light = theme === 'light';

  const phaseRef = useRef<string>('intro');

  // Progress-driven chrome is written straight to the DOM rather than held in
  // React state. Rounding it into state re-rendered this whole section — with
  // its AnimatePresence subtree — up to 200 times per scroll pass, which was
  // the dominant cause of scroll stutter.
  const railRef = useRef<HTMLDivElement>(null);
  const layerNowRef = useRef<HTMLSpanElement>(null);
  const layerBarRef = useRef<HTMLDivElement>(null);

  /* ---- Progress (0→1, from either scroll or a clock) → scene state ----
     Shared by both play modes so the choreography itself never has to know
     which one is driving it. */
  const applyProgress = useCallback((p: number) => {
    sceneState.current.scroll = p;
    if (p > 0.01) sceneState.current.hasScrolled = true;

    // Only push into React when the visible copy actually needs to change.
    const next = phaseFor(p);
    const key = phaseKey(next);
    if (key !== phaseRef.current) {
      phaseRef.current = key;
      setPhase(next);
    }

    if (railRef.current) {
      railRef.current.style.height = `${(p * 100).toFixed(2)}%`;
    }

    // Layer counter, using the same slot arithmetic as the choreography.
    if (layerNowRef.current && p >= QUEUE_START) {
      const slots = PRINT_PRODUCTS.length;
      const queue = clamp01((p - QUEUE_START) / (1 - QUEUE_START)) * slots;
      const slot = Math.min(Math.floor(queue), slots - 1);
      const local = queue - slot;
      const product = PRINT_PRODUCTS[slot % PRINT_PRODUCTS.length];
      const total = Math.round(product.height * 480);
      const now = Math.round(total * clamp01(local / PRINT_FRACTION));

      layerNowRef.current.textContent = String(Math.max(1, now)).padStart(3, '0');
      if (layerBarRef.current) {
        layerBarRef.current.style.width = `${Math.min(100, (now / Math.max(1, total)) * 100).toFixed(1)}%`;
      }
    }
  }, []);

  const readScroll = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;
    applyProgress(p);
  }, [applyProgress]);

  useEffect(() => {
    let frame = 0;
    const onPointerMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let onScroll: (() => void) | null = null;
    if (playMode === 'scroll') {
      onScroll = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(readScroll);
      };
      readScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }

    // The sticky viewport (scroll mode) or the section itself (time mode,
    // which is exactly one viewport tall) is what's actually on screen —
    // observing the 720vh scroll-mode section itself would report "visible"
    // for the whole page.
    const stage =
      playMode === 'scroll' ? sectionRef.current?.firstElementChild : sectionRef.current;
    const observer = stage
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
          threshold: 0,
        })
      : null;
    if (stage && observer) observer.observe(stage);

    // Rendering to a canvas nobody can see wastes battery on the whole tab.
    const onVisibility = () => {
      if (document.hidden) setInView(false);
      else if (stage) {
        const r = stage.getBoundingClientRect();
        setInView(r.bottom > 0 && r.top < window.innerHeight);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      if (onScroll) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, [readScroll, playMode]);

  /* ---- Time mode: autoplay the same sequence on a clock ----
     Starts the first time the section is on screen and runs to completion
     even if the visitor scrolls past mid-way, like a video would. */
  const timeStartedRef = useRef(false);
  useEffect(() => {
    if (playMode !== 'time' || !inView || timeStartedRef.current) return;
    timeStartedRef.current = true;

    let raf = 0;
    const durationMs = timeSeconds * 1000;
    const start = performance.now();

    const tick = (now: number) => {
      const p = clamp01((now - start) / durationMs);
      applyProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [playMode, inView, timeSeconds, applyProgress]);

  const partsForGroup = useMemo(
    () =>
      PART_GROUPS.map((group) => PARTS.filter((part) => part.group === group)),
    [],
  );

  const activeProduct =
    phase.kind === 'printing' ? PRINT_PRODUCTS[phase.productIndex % PRINT_PRODUCTS.length] : null;
  const layerTotal = activeProduct ? Math.round(activeProduct.height * 480) : 0;

  if (!enabled) return <StaticHero light={light} />;

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: playMode === 'scroll' ? `${scrollVh}vh` : '100dvh' }}
      aria-label="The DRS printing process"
    >
      <div className={playMode === 'scroll' ? 'sticky top-0 h-dvh overflow-hidden' : 'h-dvh overflow-hidden'}>
        {/* Backdrop */}
        <div
          aria-hidden
          className={
            light
              ? 'absolute inset-0 bg-gradient-to-b from-[#fbfbfd] via-[#f1f1f5] to-[#e9e9ef]'
              : 'absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950'
          }
        />
        <div
          aria-hidden
          className={`absolute left-1/2 top-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] ${
            light ? 'bg-flame-500/[0.10]' : 'bg-flame-500/[0.07]'
          }`}
        />

        {/* 3D */}
        <div className="absolute inset-0">
          {!webglFailed && (
            <Canvas
              shadows
              frameloop={inView ? 'always' : 'never'}
              dpr={dpr}
              camera={{ position: [0, 3, 7], fov: 38, near: 0.1, far: 60 }}
              gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
              onCreated={({ gl }) => {
                // Required for the print-plane reveal.
                gl.localClippingEnabled = true;
                // Filmic response — without it the bright orange emissives
                // clip to flat blocks and the metals look like plastic.
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = light ? 1.05 : 1.15;
              }}
              onError={() => setWebglFailed(true)}
            >
              {/* Drop resolution on machines that can't hold frame rate,
                  rather than letting the whole page stutter. */}
              <PerformanceMonitor
                onIncline={() => setDpr(Math.min(1.75, window.devicePixelRatio))}
                onDecline={() => setDpr(1)}
              />
              <AdaptiveDpr pixelated />

              <SceneStateContext.Provider value={sceneState}>
                <Scene mouse={mouse} light={light} sculptUrl={sculptUrl} />
              </SceneStateContext.Provider>
            </Canvas>
          )}
        </div>

        {/* Vignette so overlay text always has something to sit on */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${
            light
              ? 'bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(246,246,248,0.85)_100%)]'
              : 'bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,5,6,0.72)_100%)]'
          }`}
        />

        {/* Light-theme scrim behind the headline.
            In the dark theme the printer is dark and the copy is white, so it
            reads. Invert the theme and the copy becomes near-black while the
            machine behind it stays black — which is the "text colour not
            matching" in the light-mode screenshot. This wash lifts the area
            under the headline back to page white so the dark type has
            something to sit on, and it only exists during the intro, so the
            machine is unobstructed for the rest of the sequence. */}
        <AnimatePresence>
          {light && phase.kind === 'intro' && (
            <motion.div
              key="intro-scrim"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_62%_54%_at_50%_46%,rgba(248,248,250,0.95)_0%,rgba(248,248,250,0.82)_46%,rgba(248,248,250,0)_78%)]"
            />
          )}
        </AnimatePresence>

        {/* ---------------- Overlay ---------------- */}
        <div className="pointer-events-none absolute inset-0">
          <AnimatePresence mode="wait">
            {/* Intro */}
            {phase.kind === 'intro' && (
              <motion.div
                key="intro"
                {...FADE}
                className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
              >
                <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-flame-500/30 bg-flame-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-flame-400 backdrop-blur-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-500" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-flame-500" />
                  </span>
                  Bhubaneswar · Odisha
                </span>

                {/* Capped at 88px rather than 7.5rem/13vw. The badge, headline,
                    slogan, buttons and the scroll cue below all share one
                    viewport height, and at the old size that stack ran past
                    the bottom of the screen on a laptop or at browser zoom. */}
                <h1 className="font-display text-[clamp(40px,8vw,88px)] font-bold leading-[0.9] tracking-[-0.04em]">
                  <span className="block text-white">DRS 3D</span>
                  <span className="block text-flame">WORLD</span>
                </h1>

                <p className="mt-5 max-w-xl text-balance-pretty text-[15px] leading-relaxed text-ink-200 sm:text-base">
                  {site.slogan}.
                </p>

                <div className="pointer-events-auto mt-7 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/quote" size="lg">
                    Get an instant quote
                    <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                  <ButtonLink href="/products" variant="secondary" size="lg">
                    See what we make
                  </ButtonLink>
                </div>

                <motion.div
                  animate={{ y: [0, 9, 0] }}
                  transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute bottom-10 flex flex-col items-center gap-2 text-ink-400"
                >
                  <span className="text-[10px] font-medium uppercase tracking-[0.3em]">
                    Scroll to take it apart
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.div>
            )}

            {/* Teardown */}
            {phase.kind === 'teardown' && (
              <motion.div
                key={`teardown-${phase.groupIndex}`}
                {...FADE}
                className="absolute inset-x-0 bottom-0 px-6 pb-12 sm:px-10 lg:bottom-auto lg:top-1/2 lg:max-w-md lg:-translate-y-1/2 lg:pb-0 lg:pl-12"
              >
                <div className="glass-strong rounded-2xl p-6 shadow-lift sm:p-7">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-flame-500">
                      {String(phase.groupIndex + 1).padStart(2, '0')}
                    </span>
                    <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                      {PART_GROUPS[phase.groupIndex]}
                    </h2>
                  </div>

                  <ul className="mt-5 space-y-3.5">
                    {partsForGroup[phase.groupIndex].slice(0, 5).map((part, i) => (
                      <motion.li
                        key={part.id}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="border-l-2 border-flame-500/40 pl-4"
                      >
                        <p className="text-sm font-semibold text-white">{part.label}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{part.detail}</p>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Reassembly */}
            {phase.kind === 'reassemble' && (
              <motion.div
                key="reassemble"
                {...FADE}
                className="absolute inset-0 flex items-center justify-center px-6 text-center"
              >
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-flame-500">
                    Reassembling
                  </p>
                  <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                    Twenty-eight components.
                    <br />
                    <span className="text-flame">One finished part.</span>
                  </h2>
                </div>
              </motion.div>
            )}

            {/* Production run */}
            {phase.kind === 'printing' && activeProduct && (
              <motion.div
                key={`printing-${phase.productIndex}`}
                {...FADE}
                className="absolute inset-x-0 bottom-0 px-6 pb-12 sm:px-10 lg:bottom-16 lg:left-12 lg:right-auto lg:max-w-sm"
              >
                <div className="glass-strong rounded-2xl p-6 shadow-lift">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-flame-500">
                    {activeProduct.category}
                  </p>
                  <h2 className="mt-2.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {activeProduct.name}
                  </h2>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-300">
                    {activeProduct.note}
                  </p>

                  <div className="mt-5 flex items-center justify-between font-mono text-[11px] text-ink-400">
                    <span>
                      Layer <span ref={layerNowRef}>001</span> / {layerTotal}
                    </span>
                    <span className="text-flame-500">Printing</span>
                  </div>
                  <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
                    <div ref={layerBarRef} className="h-full w-0 bg-flame-500" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress rail */}
        <div className="pointer-events-none absolute right-5 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-white/10 lg:block">
          <div ref={railRef} className="h-0 w-full bg-flame-500" />
        </div>
      </div>
    </section>
  );
}
