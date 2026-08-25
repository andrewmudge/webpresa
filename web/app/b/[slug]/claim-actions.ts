'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { startSelfServiceClaim } from '@/lib/claim/start-self-service-claim';
import { signClaimIntent, CLAIM_INTENT_COOKIE_NAME, CLAIM_INTENT_MAX_AGE_SECONDS } from '@/lib/auth/claim-intent';

/**
 * The "Make It Mine" banner CTA's Server Action — issues a real Claim (see
 * `startSelfServiceClaim`'s doc comment for the security reasoning) and
 * sets the exact same `claim_intent` cookie `/claim/[claimToken]` sets,
 * so everything downstream of this point (`/claim/continue`,
 * `completeClaimIntent`, `consumeClaim`, sign-up/sign-in, Google
 * federation) is 100% the same code the postcard flow already uses — no
 * second, weaker ownership path.
 */
export async function startSelfServiceClaimAction(businessId: string): Promise<void> {
  const result = await startSelfServiceClaim(businessId);
  if (result.status !== 'issued') {
    redirect('/build');
  }

  const token = await signClaimIntent({
    claimId: result.claimId,
    businessId,
    ...(result.previewId !== undefined && { previewId: result.previewId }),
  });

  const cookieStore = await cookies();
  cookieStore.set(CLAIM_INTENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLAIM_INTENT_MAX_AGE_SECONDS,
    path: '/',
  });

  redirect('/claim/continue');
}
