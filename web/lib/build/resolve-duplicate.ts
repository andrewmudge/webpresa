import 'server-only';
import { getBusinessById, listAllBusinesses } from '@/lib/db/businesses';
import { checkDuplicatesAgainstList, type DuplicateCandidate } from '@/lib/google-places/duplicates';

/**
 * Resolves a self-service intake submission against Webpresa's existing
 * business list before any write happens — see `implementation.md`
 * (self-service funnel design doc, "Duplicate / Existing Business Handling").
 *
 * Only a `'blocking'`-confidence signal (domain, phone, or name+full-address
 * match) is acted on; a `name_city`-only `'warning'` signal isn't
 * treated as a match — there's no human reviewer in this flow to weigh a
 * low-confidence signal, so anonymous-triggered attach/block behavior only
 * fires on the higher-confidence checks.
 */
export type ResolveDuplicateOutcome =
  | { outcome: 'create' }
  | { outcome: 'attach'; businessId: string }
  | { outcome: 'blocked' };

export async function resolveDuplicateForSelfService(
  candidate: DuplicateCandidate,
): Promise<ResolveDuplicateOutcome> {
  const businesses = await listAllBusinesses();
  const blocking = checkDuplicatesAgainstList(candidate, businesses).find((s) => s.confidence === 'blocking');
  if (!blocking) return { outcome: 'create' };

  const match = await getBusinessById(blocking.matchedBusinessId);
  // A blocking signal always names a business drawn from `businesses` above
  // — `match` is null only in the vanishingly rare case of a concurrent
  // delete between that scan and this read; treat that the same as "no
  // duplicate found" rather than blocking on a business that's already gone.
  if (!match) return { outcome: 'create' };

  // Any already-owned business — claimed-and-unpaid or an active paying
  // customer alike — fails closed identically: a self-service visitor never
  // silently attaches to or overwrites data belonging to someone else's
  // account, regardless of billing state.
  if (match.ownerUserId) return { outcome: 'blocked' };

  return { outcome: 'attach', businessId: match.businessId };
}
