import { NextResponse, type NextRequest } from 'next/server';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { validateClaimToken, hashIp } from '@/lib/claim/validate-token';
import { signClaimAttempt, CLAIM_ATTEMPT_COOKIE_NAME, CLAIM_ATTEMPT_MAX_AGE_SECONDS } from '@/lib/auth/claim-attempt';

/**
 * Public claim deep-link (Stage 17). The raw token appears in this one URL
 * only — every subsequent step uses the signed `claim_attempt` cookie, never
 * the token, in a URL. `Referrer-Policy: no-referrer` avoids leaking it via
 * any third-party resource this response might otherwise cause to load.
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

  const token = await signClaimAttempt(result.claimId);
  const response = NextResponse.redirect(new URL('/claim/continue', request.url));
  response.cookies.set(CLAIM_ATTEMPT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CLAIM_ATTEMPT_MAX_AGE_SECONDS,
    path: '/',
  });
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
