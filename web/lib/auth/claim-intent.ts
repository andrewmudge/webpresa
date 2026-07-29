import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

/**
 * The claim-intent cookie (Stage 17) — a short-lived, signed, purpose-scoped
 * JWT proving "this browser recently presented a valid claim token for this
 * business." It does NOT mean ownership has been granted, the customer is
 * authenticated, or payment has occurred — see `implementation.md`, Stage 17.
 *
 * Signing prevents tampering (e.g. a client swapping in a different
 * `businessId`); it does not replace server-side validation — every caller
 * must still re-check the claim's current state (issued, unexpired,
 * unrevoked) against the database on every use, exactly as if the cookie
 * carried no signature at all.
 *
 * Signed with its own dedicated secret (`CLAIM_ATTEMPT_SECRET` — kept as-is;
 * this is a rename of the concept, not the underlying Vercel env var),
 * separate from both the admin and customer session secrets, so a
 * claim-intent token can never be replayed as a session of either kind.
 *
 * Deliberately pure sign/verify, like `lib/capture-token.ts` — cookie
 * get/set is left to each call site (a Route Handler's `NextResponse`, or a
 * Server Action's `next/headers` `cookies()`), since the entry points that
 * need this (`GET /claim/[claimToken]`, the `/claim` manual-entry Server
 * Action, and `/b/[slug]` reading it back) use different cookie APIs.
 */

export const CLAIM_INTENT_COOKIE_NAME = 'webpresa_claim_intent';
const CLAIM_INTENT_DURATION_MINUTES = 30;
export const CLAIM_INTENT_MAX_AGE_SECONDS = CLAIM_INTENT_DURATION_MINUTES * 60;

export interface ClaimIntentPayload {
  purpose: 'claim_intent';
  claimId: string;
  businessId: string;
  /** The preview shown at claim-issuance time, for audit only. */
  previewId?: string;
}

export interface ClaimIntent {
  claimId: string;
  businessId: string;
  previewId?: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.CLAIM_ATTEMPT_SECRET;
  if (!secret) {
    throw new Error('CLAIM_ATTEMPT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signClaimIntent(intent: ClaimIntent): Promise<string> {
  return new SignJWT({
    purpose: 'claim_intent',
    claimId: intent.claimId,
    businessId: intent.businessId,
    ...(intent.previewId !== undefined && { previewId: intent.previewId }),
  } satisfies ClaimIntentPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${CLAIM_INTENT_DURATION_MINUTES}m`)
    .sign(getSecretKey());
}

export async function verifyClaimIntent(token: string | undefined): Promise<ClaimIntent | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const claims = payload as unknown as Partial<ClaimIntentPayload>;
    if (claims.purpose !== 'claim_intent' || !claims.claimId || !claims.businessId) return null;
    return { claimId: claims.claimId, businessId: claims.businessId, previewId: claims.previewId };
  } catch {
    return null;
  }
}
