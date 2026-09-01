import type { Industry } from '@/domain/constants/industries';

/**
 * Deliberately small, code-level fallback distinct from the curated Stock
 * Images system (DynamoDB + S3, `lib/db/stock-images.ts`) the hero-image
 * tier uses — a static `public/default-images/` file map is enough for this
 * narrow need. Grows one industry at a time as more default photo sets are
 * supplied; an industry with no entry here simply has no default (existing
 * behavior — the slot stays empty).
 */
const DEFAULT_SECTION_IMAGES: Partial<
  Record<Industry, { about: string; whyChooseUs: string; featuredService: string }>
> = {
  plumbing: {
    about: '/default-images/plumb3.jpg',
    whyChooseUs: '/default-images/plumb2.jpg',
    featuredService: '/default-images/plumb1.jpg',
  },
};

export function getDefaultSectionImage(
  industry: Industry,
  slot: 'about' | 'whyChooseUs' | 'featuredService',
): string | undefined {
  return DEFAULT_SECTION_IMAGES[industry]?.[slot];
}
