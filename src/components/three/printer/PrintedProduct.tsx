'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Plane,
  Vector3,
  type BufferGeometry,
  type Group,
  type MeshStandardMaterial as StdMaterial,
} from 'three';

import { LAYER_FREQUENCY, PRINT_PLANE_Y } from './constants';
import { PRINT_PRODUCTS } from './products';
import { loadSculpt } from './sculpt';
import { clamp01, useSceneState } from './state';

/**
 * The part currently on the plate.
 *
 * Lives inside the bed group, so it descends with the bed as it grows. A
 * world-space clipping plane parked at the nozzle tip hides everything not yet
 * printed, and a shader injection bands the surface into visible layer lines.
 */
export function PrintedPart({ sculptUrl = null }: { sculptUrl?: string | null }) {
  const state = useSceneState();
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const indexRef = useRef(-1);

  // One plane instance, reused. Normal points down, so fragments with
  // y <= PRINT_PLANE_Y survive.
  const clipPlane = useMemo(() => new Plane(new Vector3(0, -1, 0), PRINT_PLANE_Y), []);

  // Build every product's geometry once; swapping is then just a ref update.
  const geometries = useMemo<BufferGeometry[]>(
    () => PRINT_PRODUCTS.map((p) => p.build()),
    [],
  );

  useEffect(() => {
    return () => geometries.forEach((g) => g.dispose());
  }, [geometries]);

  /* ---- The studio's own sculpt, when one has been supplied ----
     Swapped in after it loads rather than awaited, so the hero starts
     immediately on the procedural stand-in and upgrades in place. A failed
     load resolves to null and simply leaves the stand-in running. */
  useEffect(() => {
    if (!sculptUrl) return;

    const slot = PRINT_PRODUCTS.findIndex((p) => p.id === 'statue');
    if (slot < 0) return;

    let cancelled = false;

    void loadSculpt(sculptUrl, PRINT_PRODUCTS[slot].height).then((geometry) => {
      if (!geometry) return;
      if (cancelled) {
        geometry.dispose();
        return;
      }

      const previous = geometries[slot];
      geometries[slot] = geometry;
      previous.dispose();

      // Force the next frame to re-bind: the queue index hasn't changed, so
      // the swap in `useFrame` would otherwise never notice.
      indexRef.current = -1;
    });

    // Whatever ends up in `geometries[slot]` is disposed by the effect that
    // owns that array. Disposing it here as well would free a geometry that
    // is still bound to the mesh.
    return () => {
      cancelled = true;
    };
  }, [sculptUrl, geometries]);

  const material = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: PRINT_PRODUCTS[0].color,
      metalness: 0.16,
      roughness: 0.62,
      side: DoubleSide,
      clippingPlanes: [clipPlane],
      clipShadows: true,
    });

    // Procedural layer lines. Driven off local Y so the bands stay welded to
    // the part as the bed moves, and survive any UV layout the merged
    // geometries happen to have.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLayerFreq = { value: LAYER_FREQUENCY };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vLocalY;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n  vLocalY = position.y;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying float vLocalY;\nuniform float uLayerFreq;',
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  {
    float band = abs(fract(vLocalY * uLayerFreq) - 0.5) * 2.0;
    diffuseColor.rgb *= 0.84 + 0.16 * band;
  }`,
        );
    };

    return mat;
  }, [clipPlane]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const s = state.current;
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    const product = PRINT_PRODUCTS[s.productIndex % PRINT_PRODUCTS.length];

    // Swap geometry and filament colour when the queue advances.
    if (indexRef.current !== s.productIndex) {
      indexRef.current = s.productIndex;
      mesh.geometry = geometries[s.productIndex % geometries.length];
      (mesh.material as StdMaterial).color.set(product.color);
    }

    // Once the job finishes, lift the plane out of the way so the whole part
    // is visible while the bed presents it.
    const finished = s.print >= 0.995;
    clipPlane.constant = finished ? 999 : PRINT_PLANE_Y;

    // Fade in/out across the changeover between products.
    const mat = mesh.material as StdMaterial;
    const alpha = clamp01(1 - s.productFade);
    mat.opacity = alpha;
    mat.transparent = alpha < 0.999;

    group.visible = s.print > 0.001 || finished;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={material} castShadow receiveShadow geometry={geometries[0]} />
    </group>
  );
}

/**
 * The bright ring of freshly extruded filament at the nozzle, plus the molten
 * bead leaving the tip. Sits in world space at the print plane rather than in
 * the bed group, because that's where it physically is.
 */
export function PrintLayerEffects() {
  const state = useSceneState();
  const ringRef = useRef<Mesh>(null);
  const beadRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const s = state.current;
    const printing = s.print > 0.002 && s.print < 0.995;

    const ring = ringRef.current;
    if (ring) {
      ring.visible = printing;
      if (printing) {
        const product = PRINT_PRODUCTS[s.productIndex % PRINT_PRODUCTS.length];
        const r = Math.max(0.04, product.radiusAt(s.print));
        ring.scale.setScalar(r);
        const mat = ring.material as StdMaterial;
        // Gentle flicker — molten plastic catching the light.
        mat.emissiveIntensity = 2.4 + Math.sin(clock.elapsedTime * 9) * 0.35;
      }
    }

    const bead = beadRef.current;
    if (bead) {
      bead.visible = printing;
      bead.position.set(s.nozzleX, PRINT_PLANE_Y + 0.02, s.nozzleZ);
    }
  });

  return (
    <group>
      {/* The layer currently being laid down */}
      <mesh ref={ringRef} position={[0, PRINT_PLANE_Y - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.022, 8, 64]} />
        <meshStandardMaterial
          color="#ff8433"
          emissive="#ff6b00"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>

      {/* Molten bead at the tip */}
      <mesh ref={beadRef}>
        <sphereGeometry args={[0.03, 12, 10]} />
        <meshStandardMaterial
          color="#ffb27a"
          emissive="#ff6b00"
          emissiveIntensity={3.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
