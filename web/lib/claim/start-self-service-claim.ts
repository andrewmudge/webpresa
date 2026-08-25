import 'server-only';
import { getBusinessById } from '@/lib/db/businesses';
import { createClaim } from '@/domain/factories/claim.factory';
import { putClaim } from '@/lib/db/claims';
import { generateAndHashClaimToken } from './token';

/**
 * Issues a real `Claim` record for a self-service-built, still-unclaimed
 * business — the "Make It Mine" banner's server-side counterpart to the
 * admin's `generateClaimLinkAction` (`app/admin/(dashboard)/businesses/[businessId]/actions.ts`),
 * minus the raw-token/postcard step: the visitor doesn't need to type a
 * code back to themselves, so a real token is still generated and hashed
 * (matching every other Claim's shape) but only its hash is ever stored,
 * exactly as with every other claim — nothing here weakens that.
 *
 * `business.source === 'self_service'` is the load-bearing check, not a
 * nice-to-have: without it, this function would let anyone mint a valid
 * claim-intent cookie for ANY unclaimed business just by passing its
 * businessId — including postcard-targeted leads nobody has responded to
 * yet — bypassing the postcard/campaign-code exclusivity the rest of the
 * claim system depends on. Never remove this check.
 */

export type StartSelfServiceClaimOutcome =
  | { status: 'issued'; claimId: string; previewId?: string }
  | { status: 'not_eligible' };

export async function startSelfServiceClaim(businessId: string): Promise<StartSelfServiceClaimOutcome> {
  const business = await getBusinessById(businessId);
  if (!business) return { status: 'not_eligible' };
  if (business.source !== 'self_service') return { status: 'not_eligible' };
  if (business.ownerUserId) return { status: 'not_eligible' };
  if (!business.currentPreviewId) return { status: 'not_eligible' };

  const { tokenHash } = await generateAndHashClaimToken();
  const claim = createClaim({ businessId, tokenHash, previewId: business.currentPreviewId });
  await putClaim(claim);

  return { status: 'issued', claimId: claim.claimId, previewId: business.currentPreviewId };
}
