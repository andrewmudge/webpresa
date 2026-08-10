import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CLAIM_INTENT_COOKIE_NAME, verifyClaimIntent } from '@/lib/auth/claim-intent';
import { getClaimById, isClaimUsable } from '@/lib/db/claims';
import { getBusinessById } from '@/lib/db/businesses';
import { AccessPageShell } from '@/components/access/AccessPageShell';
import { ACCESS_BLUE } from '@/components/access/theme';
import { ClaimContinueForm } from './ClaimContinueForm';

export const dynamic = 'force-dynamic';

/**
 * Sign-up-or-sign-in, scoped to a specific claim intent (Stage 17). Gated by
 * the short-lived, signed `claim_intent` cookie only — never a full customer
 * session, and never the raw token. Every load re-validates the claim's
 * current state server-side; the cookie's signature only proves it wasn't
 * tampered with in the browser (see `completeClaimIntent` in
 * `app/claim/actions.ts` for the same re-validation at submission time).
 *
 * Redesigned 2026-08-10 to match `/r`'s two-tone theme — this is the very
 * next page a postcard recipient reaches after entering their access code
 * and clicking "Claim this website" on `/b/[slug]`, so it reuses
 * `AccessPageShell` (see `components/access/AccessPageShell.tsx`) rather
 * than a second, hand-copied version of the same shell.
 */
export default async function ClaimContinuePage() {
  const cookieStore = await cookies();
  const intent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  if (!intent) redirect('/claim?error=1');

  const claim = await getClaimById(intent.claimId);
  if (!claim || claim.businessId !== intent.businessId || !isClaimUsable(claim)) {
    redirect('/claim?error=1');
  }

  const business = await getBusinessById(claim.businessId);
  if (!business) redirect('/claim?error=1');

  return (
    <AccessPageShell
      eyebrow="You&rsquo;re almost there"
      headline="Create your account."
      subtext={
        <>
          Set up your login for <span className="font-semibold text-gray-700">{business.name}</span> — you&rsquo;ll use
          it to manage and grow your new website.
        </>
      }
      cardMaxWidth="max-w-lg"
    >
      <ClaimContinueForm businessName={business.name} accentColor={ACCESS_BLUE} />
    </AccessPageShell>
  );
}
