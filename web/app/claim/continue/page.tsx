import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CLAIM_ATTEMPT_COOKIE_NAME, verifyClaimAttempt } from '@/lib/auth/claim-attempt';
import { getClaimById, isClaimUsable } from '@/lib/db/claims';
import { getBusinessById } from '@/lib/db/businesses';
import { ClaimContinueForm } from './ClaimContinueForm';

export const dynamic = 'force-dynamic';

/**
 * Sign-up-or-sign-in, scoped to a specific claim attempt (Stage 17). Gated
 * by the short-lived, signed `claim_attempt` cookie only — never a full
 * customer session, and never the raw token. Every load re-validates the
 * claim's current state server-side; the cookie's signature only proves it
 * wasn't tampered with in the browser.
 */
export default async function ClaimContinuePage() {
  const cookieStore = await cookies();
  const attempt = await verifyClaimAttempt(cookieStore.get(CLAIM_ATTEMPT_COOKIE_NAME)?.value);
  if (!attempt) redirect('/claim?error=1');

  const claim = await getClaimById(attempt.claimId);
  if (!claim || !isClaimUsable(claim)) {
    redirect('/claim?error=1');
  }

  const business = await getBusinessById(claim.businessId);
  if (!business) redirect('/claim?error=1');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-6 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
          </div>
          <ClaimContinueForm businessName={business.name} />
        </div>
      </div>
    </div>
  );
}
