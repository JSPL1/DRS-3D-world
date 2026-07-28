/**
 * Pointer styles the administrator can choose between.
 *
 * Kept in a plain module rather than beside the component: the component is a
 * client component, and the server-side branding resolver needs to validate
 * the stored setting without dragging a client boundary into it.
 *
 * `system` is a real option, not a fallback. The original cursor hid the
 * native pointer and drew a `mix-blend-difference` dot over the page, forcing
 * the compositor to re-blend on every pointer move — that is what made the
 * mouse feel like it was dragging.
 */
export const CURSOR_VARIANTS = [
  {
    id: 'system',
    label: 'System default',
    description: 'The operating system pointer. Fastest, and what most people expect.',
  },
  {
    id: 'dot',
    label: 'Dot and ring',
    description: 'A precise orange dot with a ring that trails behind it.',
  },
  {
    id: 'ring',
    label: 'Ring only',
    description: 'A single outlined ring that swells over links and buttons.',
  },
  {
    id: 'glow',
    label: 'Flame glow',
    description: 'A soft orange halo that follows the pointer.',
  },
  {
    id: 'crosshair',
    label: 'Crosshair',
    description: 'Technical crosshair — reads like a CAD viewport.',
  },
  {
    id: 'native-accent',
    label: 'Pointer with accent',
    description: 'Keeps the native pointer and adds a ring around it.',
  },
] as const;

export type CursorVariant = (typeof CURSOR_VARIANTS)[number]['id'];

export const DEFAULT_CURSOR: CursorVariant = 'system';

export function isCursorVariant(value: unknown): value is CursorVariant {
  return CURSOR_VARIANTS.some((v) => v.id === value);
}

/** Variants that need the native pointer hidden underneath them. */
export const CURSOR_HIDES_NATIVE: ReadonlySet<string> = new Set([
  'dot',
  'ring',
  'glow',
  'crosshair',
]);
