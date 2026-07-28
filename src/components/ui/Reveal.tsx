'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';

import { cn } from '@/lib/cn';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 36, y: 0 },
  right: { x: -36, y: 0 },
  none: { x: 0, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  className,
  once = true,
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  className?: string;
  once?: boolean;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const reduced = useReducedMotion();
  const { x, y } = reduced ? OFFSET.none : OFFSET[direction];
  const Component = motion[as];

  return (
    <Component
      initial={{ opacity: 0, x, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
      viewport={{ once, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: reduced ? 0.01 : 0.85, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Component>
  );
}

/** Staggers direct children — used for card grids and lists. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduced = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : stagger } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 26, filter: 'blur(5px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: reduced ? 0.01 : 0.75, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Section eyebrow + heading + optional lead paragraph, used across the site. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-flame-500/30 bg-flame-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-flame-400">
            <span className="h-1.5 w-1.5 rounded-full bg-flame-500" />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={0.06}>
        <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance-pretty sm:text-5xl lg:text-6xl">
          {title}
        </h2>
      </Reveal>
      {lead && (
        <Reveal delay={0.12}>
          <p
            className={cn(
              'max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg',
              align === 'center' && 'mx-auto',
            )}
          >
            {lead}
          </p>
        </Reveal>
      )}
    </div>
  );
}
