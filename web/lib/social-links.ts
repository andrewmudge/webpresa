import type { SocialPlatform } from '@/domain/constants/social-platforms';

/**
 * Deterministic social-platform classification by hostname — used both by
 * `lib/firecrawl/normalize.ts` (deciding which discovered page links count
 * as social links at all) and the generated-preview Social Links section
 * (picking which icon to render for a found link). No AI — a URL's
 * platform is fully determined by its hostname. See
 * `domain/constants/social-platforms.ts` for the enum this classifies into.
 */

const PLATFORM_DOMAINS: [SocialPlatform, string[]][] = [
  ['facebook', ['facebook.com', 'fb.com']],
  ['instagram', ['instagram.com']],
  ['x', ['twitter.com', 'x.com']],
  ['linkedin', ['linkedin.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['tiktok', ['tiktok.com']],
  ['yelp', ['yelp.com']],
];

/** Every hostname suffix this module recognizes as a social/review platform (used to detect social links among generic page links). */
export const SOCIAL_DOMAINS: string[] = PLATFORM_DOMAINS.flatMap(([, domains]) => domains);

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function isSocialLink(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  return SOCIAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Classifies a URL by hostname. Unrecognized hosts (including a malformed URL) return `'other'` rather than throwing. */
export function classifySocialPlatform(url: string): SocialPlatform {
  const host = hostnameOf(url);
  if (!host) return 'other';
  for (const [platform, domains] of PLATFORM_DOMAINS) {
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return platform;
  }
  return 'other';
}
