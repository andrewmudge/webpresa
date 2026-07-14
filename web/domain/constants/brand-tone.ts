/**
 * Suggested brand tones for AI website generation (Stage 11).
 * Add new tones here — the TypeScript union and Zod enum both derive
 * from this single source of truth.
 */
export const BRAND_TONES = [
  'professional',
  'friendly',
  'luxury',
  'modern',
  'traditional',
  'bold',
  'warm',
] as const;

export type BrandTone = (typeof BRAND_TONES)[number];
