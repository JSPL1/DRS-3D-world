'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3 } from 'three';

import { BED_REST_Y } from './constants';
import { PRINT_PRODUCTS } from './products';
import { clamp01, damp, easeInOutCubic, easeOutExpo, range, useSceneState } from './state';

/**
 * The timeline.
 *
 * Every value the scene animates is derived here from a single scroll
 * progress, so the whole sequence stays in step and can be re-timed by moving
 * the constants below rather than hunting through components.
 */

/** Where the production run begins. Shared with the overlay copy. */
export const QUEUE_START = 0.7;

/** Fraction of each queue slot spent printing; the rest presents the part. */
export const PRINT_FRACTION = 0.76;

/** Scroll ranges for each act, 0 → 1 across the pinned section. */
const T = {
  bootStart: 0.004, bootEnd: 0.055,
  introPrintStart: 0.035, introPrintEnd: 0.145,
  explodeStart: 0.17, explodeEnd: 0.45,
  holdEnd: 0.555,
  reassembleEnd: 0.665,
  queueStart: QUEUE_START, queueEnd: 1.0,
} as const;

export function Choreography({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const state = useSceneState();
  const { camera } = useThree();

  const lookTarget = useRef(new Vector3(0, 1.55, 0));
  const desired = useMemo(() => new Vector3(), []);
  const desiredLook = useMemo(() => new Vector3(), []);
  const orbit = useRef(0);

  useFrame((_, rawDelta) => {
    // Clamp delta so a backgrounded tab doesn't fast-forward the whole sequence.
    const dt = Math.min(rawDelta, 1 / 30);
    const s = state.current;
    const p = s.scroll;

    /* ---------------- Boot ---------------- */
    s.lights = easeOutExpo(range(p, T.bootStart, T.bootEnd));
    s.heat = easeInOutCubic(range(p, T.bootStart + 0.005, T.bootEnd + 0.03));

    /* ---------------- Teardown ---------------- */
    const exploding = easeInOutCubic(range(p, T.explodeStart, T.explodeEnd));
    const reassembling = easeInOutCubic(range(p, T.holdEnd, T.reassembleEnd));
    s.explode = clamp01(exploding - reassembling);

    /* ---------------- Which part, how far along ---------------- */
    let printProgress: number;
    let productIndex: number;
    let present = 0;

    if (p < T.queueStart) {
      // Opening act: the machine is already mid-job when you arrive.
      productIndex = 0;
      printProgress = easeInOutCubic(range(p, T.introPrintStart, T.introPrintEnd));
      // Hide the part during the teardown so it doesn't clutter the exploded view.
      s.productFade = s.explode;
    } else {
      // Every product gets a slot, the statue included. It also prints during
      // the opening act, but there it is small and sitting behind the
      // headline — the studio's flagship piece needs a slot of its own with
      // the camera pushed in, which is what this run is for.
      const slots = PRINT_PRODUCTS.length;
      const queue = range(p, T.queueStart, T.queueEnd) * slots;
      const slot = Math.min(Math.floor(queue), slots - 1);
      const local = queue - slot;

      productIndex = slot;
      printProgress = easeInOutCubic(clamp01(local / PRINT_FRACTION));
      present = range(local, PRINT_FRACTION + 0.04, 1);

      // Cross-fade only in the last sliver of a slot, as the next job loads.
      s.productFade = range(local, 0.955, 1);
    }

    s.productIndex = productIndex;
    s.print = printProgress;

    const product = PRINT_PRODUCTS[productIndex % PRINT_PRODUCTS.length];

    /* ---------------- Bed ---------------- */
    // The nozzle stays put; the bed drops away as the part grows.
    s.bedY = BED_REST_Y - printProgress * product.height;
    s.bedForward = present * 1.15;

    /* ---------------- Toolhead ---------------- */
    const printing = printProgress > 0.002 && printProgress < 0.995 && s.explode < 0.02;
    const calibrating = p < T.introPrintStart && s.lights > 0.15;

    if (printing) {
      // Trace the part's actual perimeter at the current layer, with a small
      // inward wobble so it reads as infill rather than a perfect circle.
      const radius = Math.max(0.05, product.radiusAt(printProgress));
      orbit.current += dt * 4.2;
      const wobble = 0.82 + Math.sin(orbit.current * 3.1) * 0.18;
      s.nozzleX = Math.cos(orbit.current) * radius * wobble;
      s.nozzleZ = Math.sin(orbit.current) * radius * wobble;
    } else if (calibrating) {
      // Boot calibration: touch each corner of the plate in turn.
      orbit.current += dt * 1.5;
      const leg = Math.floor(orbit.current) % 4;
      const t = easeInOutCubic(orbit.current % 1);
      const corners: Array<[number, number]> = [
        [-0.7, -0.6], [0.7, -0.6], [0.7, 0.6], [-0.7, 0.6],
      ];
      const from = corners[leg];
      const to = corners[(leg + 1) % 4];
      s.nozzleX = damp(s.nozzleX, from[0] + (to[0] - from[0]) * t, 14, dt);
      s.nozzleZ = damp(s.nozzleZ, from[1] + (to[1] - from[1]) * t, 14, dt);
    } else {
      // Park at centre-rear between jobs.
      s.nozzleX = damp(s.nozzleX, 0, 4, dt);
      s.nozzleZ = damp(s.nozzleZ, s.explode > 0.02 ? 0 : -0.35, 4, dt);
    }

    /* ---------------- Fans ---------------- */
    const fanSpeed = printing ? 26 : s.lights > 0.2 ? 9 : 0;
    s.fanSpin += dt * fanSpeed;

    /* ---------------- Camera ---------------- */
    // A slow continuous drift, plus a per-act framing.
    const drift = p * Math.PI * 1.15;

    let radius = 6.4;
    let height = 2.9;
    let lookY = 1.6;

    if (p < T.explodeStart) {
      // Opening: close and slightly low, so the machine feels large.
      const t = range(p, 0, T.explodeStart);
      radius = 6.6 - t * 0.5;
      height = 2.6 + t * 0.35;
      lookY = 1.7;
    } else if (p < T.holdEnd) {
      // Teardown: pull back and rise to fit the exploded assembly.
      const t = easeInOutCubic(range(p, T.explodeStart, T.explodeEnd));
      radius = 6.1 + t * 3.6;
      height = 2.95 + t * 1.5;
      lookY = 1.6 + t * 0.35;
    } else if (p < T.queueStart) {
      // Reassembly: close back in.
      const t = easeInOutCubic(range(p, T.holdEnd, T.queueStart));
      radius = 9.7 - t * 3.9;
      height = 4.45 - t * 1.75;
      lookY = 1.95 - t * 0.3;
    } else {
      // Production run: tighter, lower, focused on the plate.
      const t = range(p, T.queueStart, T.queueEnd);
      radius = 5.8 - Math.sin(t * Math.PI) * 0.85;
      height = 2.7 - Math.sin(t * Math.PI) * 0.35;
      lookY = 1.75;

      // Push in when a finished part is being presented.
      radius -= present * 1.5;
      lookY -= present * 0.15;
    }

    // Subtle pointer parallax — enough to feel alive, not enough to fight the scroll.
    const mx = mouse.current?.x ?? 0;
    const my = mouse.current?.y ?? 0;

    const angle = drift + mx * 0.22;
    desired.set(
      Math.sin(angle) * radius,
      height + my * 0.5,
      Math.cos(angle) * radius,
    );
    desiredLook.set(0, lookY + s.bedForward * 0.1, s.bedForward * 0.35);

    camera.position.lerp(desired, 1 - Math.exp(-3.2 * dt));
    lookTarget.current.lerp(desiredLook, 1 - Math.exp(-3.8 * dt));
    camera.lookAt(lookTarget.current);
  });

  return null;
}
