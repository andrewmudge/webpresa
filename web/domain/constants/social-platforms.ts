/**
 * Canonical social/review-platform identifiers a discovered profile link can
 * be classified as (`lib/social-links.ts`) — single source of truth, mirrors
 * the `industries.ts`/`themes.ts` pattern: the enum lives in `domain/`, the
 * classification logic that operates on it lives in `lib/`.
 */
export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin', 'youtube', 'tiktok', 'yelp', 'other'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  yelp: 'Yelp',
  other: 'Website',
};
