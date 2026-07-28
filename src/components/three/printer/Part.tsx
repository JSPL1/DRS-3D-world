'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

import { MAX_ORDER, PART_MAP, type PartId } from './parts';
import { easeInOutCubic, range, useSceneState } from './state';

/**
 * Wraps a component of the printer and drives its separation.
 *
 * Parts don't all leave at once — each has an `order` that delays its start, so
 * the machine peels apart from the outside in. `spin` adds a slow rotation at
 * full extension so a part turns to show its other face, the way a product
 * launch animation would.
 */
export function Part({
  id,
  children,
  position = [0, 0, 0],
}: {
  id: PartId;
  children: React.ReactNode;
  position?: [number, number, number];
}) {
  const spec = PART_MAP[id];
  const ref = useRef<Group>(null);
  const state = useSceneState();

  // Spread the stagger across the first half of the explode range so the last
  // part is fully out exactly as explode reaches 1.
  const start = (spec.order / MAX_ORDER) * 0.45;

  useFrame(() => {
    const group = ref.current;
    if (!group) return;

    const t = easeInOutCubic(range(state.current.explode, start, start + 0.55));

    group.position.set(
      position[0] + spec.dir[0] * spec.dist * t,
      position[1] + spec.dir[1] * spec.dist * t,
      position[2] + spec.dir[2] * spec.dist * t,
    );

    if (spec.spin) {
      group.rotation.set(spec.spin[0] * t, spec.spin[1] * t, spec.spin[2] * t);
    }

    // A hint of scale-down at full extension keeps the exploded view from
    // feeling crowded at the edges of frame.
    const s = 1 - t * 0.06;
    group.scale.setScalar(s);
  });

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}
