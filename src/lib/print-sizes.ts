/**
 * Paper choices for printed documents.
 *
 * Kept out of the toolbar component on purpose: the toolbar is a client
 * component, and a server component cannot call a function exported from one.
 * Both sides import these from here instead.
 */
export const CHALLAN_SIZES = [
  { id: '4x6', label: 'Label 4 × 6 in (thermal)' },
  { id: 'a5', label: 'A5' },
  { id: 'a4', label: 'A4' },
  { id: 'a4half', label: 'A4 — two per sheet' },
] as const;

export type ChallanSize = (typeof CHALLAN_SIZES)[number]['id'];

export function isChallanSize(value: string | undefined): value is ChallanSize {
  return CHALLAN_SIZES.some((s) => s.id === value);
}
