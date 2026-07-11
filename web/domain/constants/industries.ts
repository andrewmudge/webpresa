/**
 * Canonical industry values used across all Webpresa records.
 * Add new industries here — the TypeScript union and Zod enum both
 * derive from this single source of truth.
 */
export const INDUSTRIES = [
  'plumbing',
  'hvac',
  'electrical',
  'roofing',
  'landscaping',
  'painting',
  'cleaning',
  'restaurant',
  'bakery',
  'salon',
  'law_firm',
  'accounting',
] as const;

export type Industry = (typeof INDUSTRIES)[number];
