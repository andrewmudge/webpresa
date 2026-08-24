import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleOAuthCode } from '@/lib/auth/google-oauth';
import { verifyGoogleOAuthState } from '@/lib/auth/google-oauth-state';
import { decodeIdTokenClaims } from '@/lib/auth/decode-id-token';
import { CLAIM_INTENT_COOKIE_NAME, verifyClaimIntent } from '@/lib/auth/claim-intent';
import { completeClaimIntent } from '@/lib/claim/complete-claim-intent';
import { createCustomerSession } from '@/lib/auth/customer-session';
import { safeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import { log } from '@/lib/logging/log';

/**
 * Cognito Hosted UI's OAuth callback for "Sign in with Google" — the one
 * completion path for both entry points (`/claim/continue`,
 * `/account/sign-in`; see `app/api/auth/google/start/route.ts`). Which one
 * this sign-in completes is decided by whether a valid `webpresa_claim_intent`
 * cookie is present, not by anything carried through the OAuth round-trip —
 * that cookie is already how the password-based claim flow distinguishes
 * itself (see `app/claim/actions.ts`), so Google sign-in reuses the exact
 * same signal and the exact same completion function
 * (`lib/claim/complete-claim-intent.ts`), keeping ownership/session logic
 * identical between password and Google sign-in.
 *
 * Account linking (so this never creates a duplicate account for an email
 * that already signed up with a password) happens entirely on the Cognito
 * side, before this route ever runs — see the Pre Sign-up Lambda trigger in
 * `infra/lib/constructs/webpresa-user-pool.ts`. By the time an ID token
 * reaches this route, `claims.sub` is already the correct, possibly-linked
 * identity.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const state = await verifyGoogleOAuthState(stateParam);

  if (!code || !state) {
    return NextResponse.redirect(new URL('/claim?error=1', request.url));
  }

  const tokens = await exchangeGoogleOAuthCode(code);
  if (!tokens) {
    log({ level: 'warn', event: 'customer.google_signin.token_exchange_failed', component: 'customer-auth' });
    return NextResponse.redirect(new URL('/claim?error=1', request.url));
  }

  const claims = decodeIdTokenClaims(tokens.idToken);
  if (!claims) {
    log({ level: 'warn', event: 'customer.google_signin.invalid_id_token', component: 'customer-auth' });
    return NextResponse.redirect(new URL('/claim?error=1', request.url));
  }

  const cookieStore = await cookies();
  const intent = await verifyClaimIntent(cookieStore.get(CLAIM_INTENT_COOKIE_NAME)?.value);
  if (intent) {
    const result = await completeClaimIntent(claims.sub, claims.email);
    return NextResponse.redirect(new URL(result.redirectTo, request.url));
  }

  log({ event: 'customer.signin.succeeded', component: 'customer-auth', actorId: claims.sub });
  await createCustomerSession({ sub: claims.sub, email: claims.email });
  return NextResponse.redirect(new URL(safeCustomerRedirectPath(state.next), request.url));
}
