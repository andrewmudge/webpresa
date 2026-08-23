import type { Metadata } from 'next';
import type { Business } from '@/domain/models/business';

/**
 * Resolves the `icons` field for `generateMetadata()`. `faviconUrl` (a
 * properly generated, square, 256px PNG — see `lib/image/favicon.ts`) wins
 * when set; falls back to the raw `logoUrl` for a business that has a logo
 * but hasn't triggered favicon generation yet (no backfill script — this
 * self-upgrades the next time the logo is touched, see
 * `lib/s3/business-assets.ts`'s `regenerateBusinessFavicon`). Returning
 * `undefined` when neither exists preserves today's behavior exactly — Next
 * falls through to the root `app/favicon.ico` convention file. Extracted as
 * a pure function so it's unit-testable without mocking `generateMetadata`'s
 * whole data-fetching chain (mirrors `indexability.ts`'s `resolveIsIndexable`).
 */
export function resolveFaviconIcons(business: Pick<Business, 'faviconUrl' | 'logoUrl'> | null | undefined): Metadata['icons'] {
  if (business?.faviconUrl) return { icon: [{ url: business.faviconUrl, type: 'image/png', sizes: '256x256' }] };
  if (business?.logoUrl) return { icon: [{ url: business.logoUrl }] };
  return undefined;
}
