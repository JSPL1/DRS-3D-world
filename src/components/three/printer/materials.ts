/**
 * Shared material presets.
 *
 * Plain objects spread onto <meshStandardMaterial>, so React Three Fiber
 * reuses one material definition per look instead of us hand-tuning
 * metalness/roughness at thirty call sites.
 */

export const M = {
  /** Anodised black aluminium — frame, extrusions, carriages. */
  anodised: { color: '#1a1a1f', metalness: 0.82, roughness: 0.42 },

  /** Brighter machined aluminium — plates, brackets. */
  machined: { color: '#3a3a44', metalness: 0.9, roughness: 0.3 },

  /** Polished steel — rails and leadscrews. */
  steel: { color: '#9aa0aa', metalness: 1, roughness: 0.16 },

  /** Injection-moulded matte plastic — shrouds, fan bodies. */
  plastic: { color: '#141418', metalness: 0.1, roughness: 0.72 },

  /** Rubber belts. */
  rubber: { color: '#0c0c0e', metalness: 0, roughness: 0.95 },

  /** PCB green-black. */
  pcb: { color: '#10231b', metalness: 0.35, roughness: 0.55 },

  /** Brass nozzle. */
  brass: { color: '#c08a3e', metalness: 1, roughness: 0.28 },

  /** Textured PEI build surface. */
  pei: { color: '#2b2f36', metalness: 0.28, roughness: 0.86 },

  /** Stepper motor body. */
  stepper: { color: '#232329', metalness: 0.7, roughness: 0.48 },

  /** Signature orange accents. */
  flame: { color: '#ff6b00', metalness: 0.4, roughness: 0.35 },

  /** Glass panel. */
  glass: {
    color: '#0e0e12',
    metalness: 0.2,
    roughness: 0.08,
    transparent: true,
    opacity: 0.22,
  },
} as const;

export const FLAME = '#ff6b00';
export const FLAME_HOT = '#ff9d63';
