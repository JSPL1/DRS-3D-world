'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three';

import { PLATE_TOP_LOCAL } from './constants';
import { M } from './materials';
import { Part } from './Part';
import { useSceneState } from './state';

/* ============================================================
   Reusable sub-assemblies
   ============================================================ */

/** NEMA 17 body with its shaft and four corner bolt bosses. */
function Stepper({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial {...M.stepper} />
      </mesh>
      <mesh position={[0, 0, 0.17]}>
        <cylinderGeometry args={[0.055, 0.055, 0.06, 20]} />
        <meshStandardMaterial {...M.machined} />
      </mesh>
      <mesh position={[0, 0, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.14, 16]} />
        <meshStandardMaterial {...M.steel} />
      </mesh>
      {/* End-bell ribs */}
      {[-0.11, 0.11].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.31, 0.03, 0.31]} />
          <meshStandardMaterial {...M.machined} />
        </mesh>
      ))}
    </group>
  );
}

/** Axial fan: static shroud plus a hub that actually spins. */
function Fan({ radius = 0.15, depth = 0.07 }: { radius?: number; depth?: number }) {
  const blades = useRef<Group>(null);
  const state = useSceneState();

  useFrame(() => {
    if (blades.current) blades.current.rotation.z = state.current.fanSpin;
  });

  const bladeGeometry = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2),
    [],
  );

  return (
    <group>
      {/* Shroud */}
      <mesh castShadow>
        <boxGeometry args={[radius * 2.1, radius * 2.1, depth]} />
        <meshStandardMaterial {...M.plastic} />
      </mesh>
      {/* Bore */}
      <mesh position={[0, 0, depth * 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.94, radius * 0.94, depth * 1.05, 24]} />
        <meshStandardMaterial color="#050506" metalness={0.2} roughness={0.9} />
      </mesh>
      <group ref={blades} position={[0, 0, depth * 0.1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.3, radius * 0.3, depth * 0.8, 16]} />
          <meshStandardMaterial {...M.plastic} />
        </mesh>
        {bladeGeometry.map((angle, i) => (
          <mesh key={i} rotation={[0, 0, angle]} position={[0, 0, 0]}>
            <boxGeometry args={[radius * 0.86, radius * 0.16, depth * 0.5]} />
            <meshStandardMaterial color="#22222a" metalness={0.1} roughness={0.75} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Aluminium extrusion with a suggestion of the T-slot channel. */
function Extrusion({
  length,
  axis = 'y',
  size = 0.14,
}: {
  length: number;
  axis?: 'x' | 'y' | 'z';
  size?: number;
}) {
  const args: [number, number, number] =
    axis === 'y' ? [size, length, size] : axis === 'x' ? [length, size, size] : [size, size, length];

  const slotArgs: [number, number, number] =
    axis === 'y'
      ? [size * 0.42, length * 0.98, size * 1.02]
      : axis === 'x'
        ? [length * 0.98, size * 0.42, size * 1.02]
        : [size * 1.02, size * 0.42, length * 0.98];

  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial {...M.anodised} />
      </mesh>
      <mesh>
        <boxGeometry args={slotArgs} />
        <meshStandardMaterial color="#0a0a0c" metalness={0.6} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Ground linear rail plus its carriage block. */
function LinearRail({ length }: { length: number }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.07, length]} />
        <meshStandardMaterial {...M.steel} />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[0.05, 0.05, length]} />
        <meshStandardMaterial color="#c8ced6" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

/* ============================================================
   Animated assemblies
   ============================================================ */

/** Hotend: heat-break, block, and a nozzle that glows with temperature. */
function Hotend() {
  const state = useSceneState();
  const blockRef = useRef<Mesh>(null);
  const nozzleRef = useRef<Mesh>(null);
  const hot = useMemo(() => new Color('#ff3a00'), []);
  const cold = useMemo(() => new Color('#c08a3e'), []);
  const scratch = useMemo(() => new Color(), []);

  useFrame(() => {
    const heat = state.current.heat;

    const blockMat = blockRef.current?.material as MeshStandardMaterial | undefined;
    if (blockMat) {
      blockMat.emissiveIntensity = heat * 1.5;
      blockMat.emissive.copy(scratch.copy(cold).lerp(hot, heat));
    }

    const nozzleMat = nozzleRef.current?.material as MeshStandardMaterial | undefined;
    if (nozzleMat) {
      nozzleMat.emissiveIntensity = heat * 2.6;
      nozzleMat.color.copy(scratch.copy(cold).lerp(hot, heat * 0.8));
    }
  });

  return (
    <group>
      {/* Heatsink fins */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 0.14 - i * 0.028, 0]}>
          <boxGeometry args={[0.15, 0.012, 0.15]} />
          <meshStandardMaterial {...M.machined} />
        </mesh>
      ))}
      {/* Heat break */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.08, 16]} />
        <meshStandardMaterial {...M.steel} />
      </mesh>
      {/* Heater block */}
      <mesh ref={blockRef} position={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[0.13, 0.09, 0.1]} />
        <meshStandardMaterial color="#5a4a2a" metalness={0.85} roughness={0.5} emissive="#c08a3e" emissiveIntensity={0} />
      </mesh>
      {/* Heater cartridge */}
      <mesh position={[0.08, -0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.021, 0.021, 0.08, 12]} />
        <meshStandardMaterial color="#8a8a92" metalness={0.9} roughness={0.4} />
      </mesh>
      {/* Nozzle */}
      <mesh ref={nozzleRef} position={[0, -0.195, 0]} castShadow>
        <coneGeometry args={[0.045, 0.09, 20]} />
        <meshStandardMaterial {...M.brass} emissive="#ff3a00" emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

/** Dual-drive extruder with gears that turn while filament is feeding. */
function Extruder() {
  const state = useSceneState();
  const gearA = useRef<Mesh>(null);
  const gearB = useRef<Mesh>(null);

  useFrame((_, dt) => {
    // Only turn while a print is actually running.
    const printing = state.current.print > 0 && state.current.print < 1 ? 1 : 0;
    const delta = dt * 5 * printing;
    if (gearA.current) gearA.current.rotation.z -= delta;
    if (gearB.current) gearB.current.rotation.z += delta;
  });

  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.26, 0.16]} />
        <meshStandardMaterial {...M.plastic} />
      </mesh>
      <mesh ref={gearA} position={[-0.055, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.05, 14]} />
        <meshStandardMaterial {...M.machined} />
      </mesh>
      <mesh ref={gearB} position={[0.055, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.05, 14]} />
        <meshStandardMaterial {...M.machined} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.07, 12]} />
        <meshStandardMaterial color="#e8e8ec" metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Status LED strip under the top frame — comes up during boot. */
function ChamberLight() {
  const state = useSceneState();
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    const mat = ref.current?.material as MeshStandardMaterial | undefined;
    if (mat) mat.emissiveIntensity = state.current.lights * 3.2;
  });

  return (
    <mesh ref={ref} position={[0, 2.82, 0.6]}>
      <boxGeometry args={[2.2, 0.03, 0.05]} />
      <meshStandardMaterial color="#ffffff" emissive="#fff4ec" emissiveIntensity={0} toneMapped={false} />
    </mesh>
  );
}

/* ============================================================
   The machine
   ============================================================ */

/**
 * `children` are mounted on the build plate, so anything passed in rides the
 * bed as it rises and falls.
 */
export function Printer({ children }: { children?: React.ReactNode }) {
  const state = useSceneState();

  const gantryRef = useRef<Group>(null);
  const carriageRef = useRef<Group>(null);
  const bedRef = useRef<Group>(null);
  const screwL = useRef<Group>(null);
  const screwR = useRef<Group>(null);
  const spoolRef = useRef<Mesh>(null);

  useFrame((_, dt) => {
    const s = state.current;

    if (gantryRef.current) gantryRef.current.position.z = s.nozzleZ;
    if (carriageRef.current) carriageRef.current.position.x = s.nozzleX;
    if (bedRef.current) {
      bedRef.current.position.y = s.bedY;
      bedRef.current.position.z = s.bedForward;
    }

    // Leadscrews turn in proportion to how fast the bed is descending.
    const turn = dt * 2.2 * (s.print > 0 && s.print < 1 ? 1 : 0);
    if (screwL.current) screwL.current.rotation.y += turn;
    if (screwR.current) screwR.current.rotation.y -= turn;

    if (spoolRef.current && s.print > 0 && s.print < 1) {
      spoolRef.current.rotation.z += dt * 0.35;
    }
  });

  const HALF_W = 1.28;
  const HALF_D = 1.2;
  const COL_H = 2.5;
  const TOP_Y = 2.84;
  const RAIL_Y = 2.6;

  return (
    <group>
      {/* ---------------- Chassis ---------------- */}
      <Part id="base" position={[0, 0.18, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.86, 0.36, 2.66]} />
          <meshStandardMaterial {...M.anodised} />
        </mesh>
        {/* Rubber feet */}
        {[
          [-1.3, -0.22, -1.2], [1.3, -0.22, -1.2],
          [-1.3, -0.22, 1.2], [1.3, -0.22, 1.2],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <cylinderGeometry args={[0.09, 0.11, 0.09, 16]} />
            <meshStandardMaterial {...M.rubber} />
          </mesh>
        ))}
        {/* Front accent strip */}
        <mesh position={[0, 0.02, 1.34]}>
          <boxGeometry args={[2.5, 0.025, 0.01]} />
          <meshStandardMaterial color="#ff6b00" emissive="#ff6b00" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      </Part>

      <Part id="psu" position={[0.78, 0.2, -0.6]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.3, 0.55]} />
          <meshStandardMaterial {...M.machined} />
        </mesh>
        {/* Vent slots */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[0.43, 0.02, -0.18 + i * 0.09]}>
            <boxGeometry args={[0.01, 0.18, 0.03]} />
            <meshStandardMaterial color="#050506" />
          </mesh>
        ))}
      </Part>

      <Part id="mainboard" position={[-0.78, 0.16, -0.6]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.03, 0.6]} />
          <meshStandardMaterial {...M.pcb} />
        </mesh>
        {[
          [-0.22, 0.05, -0.14], [0.02, 0.05, -0.14], [0.26, 0.05, -0.14], [-0.1, 0.05, 0.16],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <boxGeometry args={[0.13, 0.06, 0.13]} />
            <meshStandardMaterial color="#0a0a0c" metalness={0.5} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0.28, 0.045, 0.18]}>
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshStandardMaterial color="#ff6b00" emissive="#ff6b00" emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      </Part>

      {/* ---------------- Frame columns ---------------- */}
      <Part id="uprightFL" position={[-HALF_W, 0.36 + COL_H / 2, HALF_D]}>
        <Extrusion length={COL_H} />
      </Part>
      <Part id="uprightFR" position={[HALF_W, 0.36 + COL_H / 2, HALF_D]}>
        <Extrusion length={COL_H} />
      </Part>
      <Part id="uprightBL" position={[-HALF_W, 0.36 + COL_H / 2, -HALF_D]}>
        <Extrusion length={COL_H} />
      </Part>
      <Part id="uprightBR" position={[HALF_W, 0.36 + COL_H / 2, -HALF_D]}>
        <Extrusion length={COL_H} />
      </Part>

      <Part id="topFrame" position={[0, TOP_Y, 0]}>
        <group position={[0, 0, HALF_D]}>
          <Extrusion length={2.7} axis="x" />
        </group>
        <group position={[0, 0, -HALF_D]}>
          <Extrusion length={2.7} axis="x" />
        </group>
        <group position={[-HALF_W, 0, 0]}>
          <Extrusion length={2.55} axis="z" />
        </group>
        <group position={[HALF_W, 0, 0]}>
          <Extrusion length={2.55} axis="z" />
        </group>
        <ChamberLight />
      </Part>

      {/* ---------------- Y rails ---------------- */}
      <Part id="yRailL" position={[-1.14, RAIL_Y, 0]}>
        <LinearRail length={2.4} />
      </Part>
      <Part id="yRailR" position={[1.14, RAIL_Y, 0]}>
        <LinearRail length={2.4} />
      </Part>

      {/* ---------------- Motors ---------------- */}
      <Part id="stepperX" position={[-1.14, TOP_Y - 0.24, -1.05]}>
        <Stepper />
      </Part>
      <Part id="stepperY" position={[1.14, TOP_Y - 0.24, -1.05]}>
        <Stepper />
      </Part>
      <Part id="stepperZ" position={[0, 0.5, -1.14]}>
        <Stepper scale={0.9} />
      </Part>

      {/* ---------------- Leadscrews ---------------- */}
      <Part id="leadscrewL" position={[-1.05, 1.6, -0.95]}>
        <group ref={screwL}>
          <mesh castShadow>
            <cylinderGeometry args={[0.038, 0.038, 2.2, 16]} />
            <meshStandardMaterial {...M.steel} />
          </mesh>
          {/* Thread suggestion */}
          {Array.from({ length: 22 }, (_, i) => (
            <mesh key={i} position={[0, -1.05 + i * 0.1, 0]}>
              <torusGeometry args={[0.041, 0.008, 6, 18]} />
              <meshStandardMaterial color="#7d838c" metalness={1} roughness={0.25} />
            </mesh>
          ))}
        </group>
      </Part>
      <Part id="leadscrewR" position={[1.05, 1.6, -0.95]}>
        <group ref={screwR}>
          <mesh castShadow>
            <cylinderGeometry args={[0.038, 0.038, 2.2, 16]} />
            <meshStandardMaterial {...M.steel} />
          </mesh>
          {Array.from({ length: 22 }, (_, i) => (
            <mesh key={i} position={[0, -1.05 + i * 0.1, 0]}>
              <torusGeometry args={[0.041, 0.008, 6, 18]} />
              <meshStandardMaterial color="#7d838c" metalness={1} roughness={0.25} />
            </mesh>
          ))}
        </group>
      </Part>

      {/* ---------------- Gantry: travels in Z ---------------- */}
      <group ref={gantryRef}>
        <Part id="xGantry" position={[0, RAIL_Y, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.32, 0.11, 0.11]} />
            <meshStandardMaterial {...M.anodised} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[2.32, 0.035, 0.05]} />
            <meshStandardMaterial color="#c8ced6" metalness={1} roughness={0.12} />
          </mesh>
          {/* End blocks riding the Y rails */}
          {[-1.14, 1.14].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.17, 0.19, 0.28]} />
              <meshStandardMaterial {...M.machined} />
            </mesh>
          ))}
        </Part>

        <Part id="belts" position={[0, RAIL_Y + 0.14, 0]}>
          {[-0.05, 0.05].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <boxGeometry args={[2.3, 0.035, 0.012]} />
              <meshStandardMaterial {...M.rubber} />
            </mesh>
          ))}
        </Part>

        {/* Carriage: travels in X */}
        <group ref={carriageRef}>
          <Part id="toolhead" position={[0, RAIL_Y - 0.1, 0.17]}>
            <mesh castShadow>
              <boxGeometry args={[0.4, 0.36, 0.22]} />
              <meshStandardMaterial {...M.plastic} />
            </mesh>
            <mesh position={[0, 0.1, 0.12]}>
              <boxGeometry args={[0.3, 0.09, 0.02]} />
              <meshStandardMaterial color="#ff6b00" emissive="#ff6b00" emissiveIntensity={1.1} toneMapped={false} />
            </mesh>
          </Part>

          <Part id="extruder" position={[0, RAIL_Y + 0.02, 0.02]}>
            <Extruder />
          </Part>

          <Part id="heatsinkFan" position={[-0.26, RAIL_Y - 0.12, 0.2]}>
            <group rotation={[0, Math.PI / 2, 0]}>
              <Fan radius={0.13} />
            </group>
          </Part>

          <Part id="partFan" position={[0.26, RAIL_Y - 0.12, 0.2]}>
            <group rotation={[0, -Math.PI / 2, 0]}>
              <Fan radius={0.13} />
            </group>
          </Part>

          <Part id="hotend" position={[0, RAIL_Y - 0.36, 0.17]}>
            <Hotend />
          </Part>
        </group>
      </group>

      {/* ---------------- Bed ---------------- */}
      <group ref={bedRef}>
        <Part id="bedCarriage" position={[0, 0.62, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.1, 0.07, 1.98]} />
            <meshStandardMaterial {...M.machined} />
          </mesh>
          {/* Heater underside */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[2.0, 0.03, 1.88]} />
            <meshStandardMaterial color="#3a1a08" metalness={0.3} roughness={0.7} />
          </mesh>
        </Part>

        <Part id="buildPlate" position={[0, 0.685, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[2.02, 0.025, 1.9]} />
            <meshStandardMaterial {...M.pei} />
          </mesh>
          {/* Bed-mesh grid, faintly */}
          <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.9, 1.78]} />
            <meshStandardMaterial color="#343a42" roughness={0.95} metalness={0.1} />
          </mesh>
        </Part>

        {/* Whatever is being printed rides here, on the plate surface. */}
        <group position={[0, PLATE_TOP_LOCAL, 0]}>{children}</group>
      </group>

      {/* ---------------- Display ---------------- */}
      <Part id="display" position={[0.85, 0.34, 1.36]}>
        <group rotation={[-0.32, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.4, 0.04]} />
            <meshStandardMaterial {...M.plastic} />
          </mesh>
          <ScreenGlow />
        </group>
      </Part>

      {/* ---------------- Spool & feed ---------------- */}
      <Part id="spoolHolder" position={[0, 2.05, -1.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.34, 14]} />
          <meshStandardMaterial {...M.machined} />
        </mesh>
        <mesh ref={spoolRef} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 0.26, 40, 1, true]} />
          <meshStandardMaterial color="#1f7fd6" metalness={0.15} roughness={0.55} side={2} />
        </mesh>
        {[-0.15, 0.15].map((x) => (
          <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.56, 0.56, 0.02, 40]} />
            <meshStandardMaterial color="#101014" metalness={0.2} roughness={0.7} transparent opacity={0.85} />
          </mesh>
        ))}
      </Part>

      <Part id="filamentTube" position={[0, 2.5, -0.9]}>
        <mesh rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 1.3, 12]} />
          <meshStandardMaterial color="#dfe3e8" metalness={0.05} roughness={0.5} />
        </mesh>
      </Part>

      {/* ---------------- Fasteners ---------------- */}
      <Part id="fasteners" position={[0, 1.5, 0]}>
        <Fasteners />
      </Part>
    </group>
  );
}

/** The display's backlight, which only comes on once the machine has booted. */
function ScreenGlow() {
  const state = useSceneState();
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    const mat = ref.current?.material as MeshStandardMaterial | undefined;
    if (mat) mat.emissiveIntensity = state.current.lights * 1.8;
  });

  return (
    <mesh ref={ref} position={[0, 0, 0.023]}>
      <planeGeometry args={[0.52, 0.32]} />
      <meshStandardMaterial color="#0d0d12" emissive="#ff6b00" emissiveIntensity={0} toneMapped={false} />
    </mesh>
  );
}

/** A scattered cluster of bolts that only becomes visible once exploded. */
function Fasteners() {
  const state = useSceneState();
  const ref = useRef<Group>(null);

  const positions = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 2;
    for (let i = 0; i < 16; i++) out.push([rnd() * 1.2, rnd() * 1.2, rnd() * 1.1]);
    return out;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    // Hidden while assembled — bolts are inside the machine at that point.
    const visible = state.current.explode > 0.06;
    ref.current.visible = visible;
    ref.current.children.forEach((child, i) => {
      child.rotation.x += 0.004 + i * 0.0003;
      child.rotation.y += 0.006;
    });
  });

  return (
    <group ref={ref}>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <cylinderGeometry args={[0.026, 0.026, 0.1, 8]} />
            <meshStandardMaterial {...M.steel} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.042, 0.042, 0.03, 6]} />
            <meshStandardMaterial {...M.machined} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
