import 'server-only';
import { getDomainConnectionByNormalizedDomain } from '@/lib/db/domain-connections';

/**
 * Multi-tenant custom-domain host routing (implementation.md, Stage 19.x,
 * Part 2). Kept as a single narrow lookup — never imports the full business
 * or domain-connection repository surface — so a tenant request resolves
 * in one `GetItem` by `normalizedDomain` (the table's partition key)
 * rather than a domain-table query, a business-table read, and a preview
 * lookup in sequence. `slug` is denormalized directly onto `DomainConnection`
 * at connect time for exactly this reason, the same "denormalized display
 * copy" pattern Stage 18 already uses for `Business.stripeCustomerId`.
 */

const RESERVED_ROUTING_HOSTS = new Set(['webpresa.com', 'www.webpresa.com', 'localhost']);

export function isReservedRoutingHost(hostname: string): boolean {
  if (!hostname) return true;
  return RESERVED_ROUTING_HOSTS.has(hostname) || hostname.endsWith('.vercel.app');
}

export interface ActiveDomainRoute {
  businessId: string;
  slug: string;
  primaryHostname: string;
}

/**
 * Returns the active tenant route for a custom-domain hostname, or `null`
 * for anything not `active` — an unknown or not-yet-live host must fail
 * closed, never fall through to another business's site.
 */
export async function resolveActiveDomainRoute(hostname: string): Promise<ActiveDomainRoute | null> {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  if (isReservedRoutingHost(normalized)) return null;

  const record = await getDomainConnectionByNormalizedDomain(normalized);
  if (!record || record.status !== 'active') return null;

  return { businessId: record.businessId, slug: record.slug, primaryHostname: record.primaryHostname };
}
