import { NextResponse, type NextRequest } from 'next/server';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { validateClaimToken, hashIp } from '@/lib/claim/validate-token';
import { signClaimIntent, CLAIM_INTENT_COOKIE_NAME, CLAIM_INTENT_MAX_AGE_SECONDS } from '@/lib/auth/claim-intent';

/**
 * Public claim deep-link (Stage 17) — the QR-code/email entry point. The raw
 * token appears in this one URL only — every subsequent step uses the
 * signed `claim_intent` cookie, never the token, in a URL. `Referrer-Policy:
 * no-referrer` avoids leaking it via any third-party resource this response
 * might otherwise cause to load.
 *
 * Redirects to the business's public preview (`/b/[slug]`), never straight
 * to `/claim/continue` — the customer sees the site before being asked to
 * create an account. The preview's claim banner detects the claim-intent
 * cookie and offers a direct "Claim my website" link straight into
 * `/claim/continue` with no code re-entry.
 *
 * A Route Handler (not a page component) because setting a cookie and
 * redirecting from a Server Component render isn't supported — only Server
 * Actions and Route Handlers can mutate cookies.
 */

function resolveIpHash(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return hashIp(ip);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ claimToken: string }> },
) {
  const { claimToken } = await params;
  const session = await getCustomerSession();

  const result = await validateClaimToken({
    rawToken: claimToken,
    ipHash: resolveIpHash(request),
    currentSessionUserId: session?.sub,
  });

  if (result.outcome === 'invalid') {
    const response = NextResponse.redirect(new URL('/claim?error=1', request.url));
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }

  if (result.outcome === 'resume') {
    const response = NextResponse.redirect(new URL('/account/claim-status', request.url));
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }

  const token = await signClaimIntent({
    claimId: result.claimId,
    businessId: result.businessId,
    previewId: result.previewId,
  });
  const response = NextResponse.redirect(new URL(`/b/${result.slug}`, request.url));
  response.cookies.set(CLAIM_INTENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLAIM_INTENT_MAX_AGE_SECONDS,
    path: '/',
  });
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
