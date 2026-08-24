import 'server-only';
import { SignJWT, jwtVerify } from 'jose';

/**
 * The OAuth `state` param for "Sign in with Google" — CSRF protection for
 * the Hosted UI redirect round-trip. Deliberately the signed JWT itself
 * (not a random nonce compared against a separate cookie): Cognito bounces
 * `state` back verbatim in the callback, so a short-lived, tamper-proof
 * token an attacker can't forge without `GOOGLE_OAUTH_STATE_SECRET` gives
 * the same protection with one fewer moving part (no cookie to set/compare/
 * clean up). Also carries `next` — the post-sign-in destination for the
 * plain returning-sign-in entry point (`/account/sign-in`); irrelevant for
 * the claim/signup entry point, which completes via the `webpresa_claim_intent`
 * cookie instead (see `lib/claim/complete-claim-intent.ts`).
 *
 * Its own dedicated secret, separate from `CLAIM_ATTEMPT_SECRET`/
 * `CUSTOMER_SESSION_SECRET` — same "one secret per purpose" convention this
 * repo already follows for every other signed cookie/token.
 */

const STATE_DURATION_MINUTES = 10;

export interface GoogleOAuthState {
  next: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error('GOOGLE_OAUTH_STATE_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signGoogleOAuthState(next: string): Promise<string> {
  return new SignJWT({ next } satisfies GoogleOAuthState)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${STATE_DURATION_MINUTES}m`)
    .sign(getSecretKey());
}

export async function verifyGoogleOAuthState(token: string | null | undefined): Promise<GoogleOAuthState | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const claims = payload as unknown as Partial<GoogleOAuthState>;
    if (typeof claims.next !== 'string') return null;
    return { next: claims.next };
  } catch {
    return null;
  }
}
