import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthorizeUrl } from '@/lib/auth/google-oauth';
import { signGoogleOAuthState } from '@/lib/auth/google-oauth-state';
import { safeCustomerRedirectPath } from '@/lib/auth/safe-redirect';

/**
 * "Sign in with Google" entry point — used from both `/claim/continue`
 * (signup/claim flow) and `/account/sign-in` (returning sign-in). A plain
 * GET redirect to Cognito Hosted UI, so the button on either page is a
 * plain `<a href>`, no client JS needed.
 *
 * `?next=` is only meaningful for the plain returning-sign-in entry point —
 * the claim flow instead completes via the `webpresa_claim_intent` cookie
 * already set earlier in that flow (see
 * `app/api/auth/google/callback/route.ts`), so `/claim/continue`'s button
 * doesn't need to pass it at all.
 */
export async function GET(request: NextRequest) {
  const next = safeCustomerRedirectPath(request.nextUrl.searchParams.get('next'));
  const state = await signGoogleOAuthState(next);
  return NextResponse.redirect(buildGoogleAuthorizeUrl(state));
}
