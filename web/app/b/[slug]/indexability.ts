import type { Business } from '@/domain/models/business';

/**
 * `'customer'` — an active paying subscription — is the only funnel status
 * whose public site should be indexed by search engines. Extracted as a
 * pure function so it's unit-testable without mocking `generateMetadata`'s
 * whole data-fetching chain.
 */
export function resolveIsIndexable(business: Pick<Business, 'status'> | null | undefined): boolean {
  return business?.status === 'customer';
}
