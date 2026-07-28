import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

/**
 * The claim-attempt cookie (Stage 17) — a short-lived, signed,
 * purpose-scoped JWT carrying a `claimId`, never a raw identifier. Signing
 * prevents tampering (e.g. a client swapping in a different `claimId`); it
 * does not replace server-side validation — every caller must still
 * re-check the claim's current state (issued, unexpired, unrevoked)
 * against the database on every use, exactly as if the cookie carried no
 * signature at all (see implementation.md, Stage 17, "Detailed workflow").
 *
 * Signed with its own dedicated secret (`CLAIM_ATTEMPT_SECRET`), separate
 * from both the admin and customer session secrets, so a claim-attempt
 * token can never be replayed as a session of either kind.
 *
 * Deliberately pure sign/verify, like `lib/capture-token.ts` — cookie
 * get/set is left to each call site (a Route Handler's `NextResponse`, or a
 * Server Action's `next/headers` `cookies()`), since the two entry points
 * that need this (`GET /claim/[claimToken]` and the `/claim` manual-entry
 * Server Action) use different cookie-setting APIs.
 */

export const CLAIM_ATTEMPT_COOKIE_NAME = 'webpresa_claim_attempt';
const CLAIM_ATTEMPT_DURATION_MINUTES = 15;
export const CLAIM_ATTEMPT_MAX_AGE_SECONDS = CLAIM_ATTEMPT_DURATION_MINUTES * 60;

interface ClaimAttemptPayload {
  purpose: 'claim_attempt';
  claimId: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.CLAIM_ATTEMPT_SECRET;
  if (!secret) {
    throw new Error('CLAIM_ATTEMPT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signClaimAttempt(claimId: string): Promise<string> {
  return new SignJWT({ purpose: 'claim_attempt', claimId } satisfies ClaimAttemptPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${CLAIM_ATTEMPT_DURATION_MINUTES}m`)
    .sign(getSecretKey());
}

export async function verifyClaimAttempt(token: string | undefined): Promise<{ claimId: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const claims = payload as unknown as Partial<ClaimAttemptPayload>;
    if (claims.purpose !== 'claim_attempt' || !claims.claimId) return null;
    return { claimId: claims.claimId };
  } catch {
    return null;
  }
}
