'use client';

import { createContext, useContext } from 'react';

/**
 * Mutable animation state shared by every part of the scene.
 *
 * Deliberately a plain mutable object read inside useFrame rather than React
 * state: the scroll handler updates it 60 times a second, and pushing that
 * through React would re-render the whole tree on every frame.
 */
export type SceneState = {
  /** Raw scroll progress across the pinned section, 0 → 1. */
  scroll: number;

  /** Boot choreography: lights, calibration, heat-up. 0 → 1. */
  boot: number;
  /** Teardown amount. 0 = assembled, 1 = fully exploded. */
  explode: number;
  /** Print progress of the current product, 0 → 1. */
  print: number;
  /** Which product in the queue is being printed. */
  productIndex: number;
  /** Cross-fade while swapping products, 0 → 1 → 0. */
  productFade: number;

  /** Nozzle temperature, drives emissive glow. 0 → 1. */
  heat: number;
  /** Accumulated fan rotation, radians. */
  fanSpin: number;
  /** Toolhead position in printer space. */
  nozzleX: number;
  nozzleZ: number;
  /** Bed height — rises as the part grows. */
  bedY: number;
  /** Bed slides forward when the job finishes. */
  bedForward: number;
  /** Chamber/status LED intensity. */
  lights: number;
  /** True once the user has scrolled past the intro. */
  hasScrolled: boolean;

  /** Set by the renderer when the device can't sustain the full scene. */
  quality: 'high' | 'low';
};

export function createSceneState(): SceneState {
  return {
    scroll: 0,
    boot: 0,
    explode: 0,
    print: 0,
    productIndex: 0,
    productFade: 0,
    heat: 0,
    fanSpin: 0,
    nozzleX: 0,
    nozzleZ: 0,
    bedY: 0,
    bedForward: 0,
    lights: 0,
    hasScrolled: false,
    quality: 'high',
  };
}

export const SceneStateContext = createContext<{ current: SceneState } | null>(null);

export function useSceneState(): { current: SceneState } {
  const ctx = useContext(SceneStateContext);
  if (!ctx) throw new Error('useSceneState must be used inside the hero scene.');
  return ctx;
}

/* ---------------- Easing helpers ---------------- */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Remap `v` from [a,b] onto [0,1], clamped. */
export const range = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
