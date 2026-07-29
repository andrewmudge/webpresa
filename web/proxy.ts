import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSession, ADMIN_SESSION_COOKIE } from '@/lib/auth/session';
import { decryptCustomerSession, CUSTOMER_SESSION_COOKIE } from '@/lib/auth/customer-session';

/**
 * Proxy (formerly middleware) for route-level authentication.
 *
 * All /admin/* routes are protected.  Unauthenticated requests are redirected
 * to /admin/sign-in.  Authenticated requests to the sign-in page are redirected
 * to /admin/businesses.
 *
 * All /account/* routes are protected the same way, using a completely
 * separate cookie/session (Stage 17) — `/claim/*` is deliberately NOT listed
 * here: it's the public claim entry point, gated by its own short-lived
 * signed claim-intent cookie at the page/route-handler level, not a full
 * customer session.
 *
 * Note: Only the session cookie is read here — no DynamoDB calls.  Full session
 * validation happens server-side inside protected route handlers and actions.
 */

const ADMIN_SIGN_IN_PATH = '/admin/sign-in';
const DEFAULT_ADMIN_PATH = '/admin/businesses';

const CUSTOMER_SIGN_IN_PATH = '/account/sign-in';
const DEFAULT_CUSTOMER_PATH = '/account/claim-status';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    return handleAdminRoute(request, pathname);
  }

  if (pathname.startsWith('/account')) {
    return handleCustomerRoute(request, pathname);
  }

  return NextResponse.next();
}

async function handleAdminRoute(request: NextRequest, pathname: string) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await decryptSession(token);
  const isAuthenticated = !!session;

  // Already authenticated — redirect away from sign-in.
  if (isAuthenticated && pathname === ADMIN_SIGN_IN_PATH) {
    return NextResponse.redirect(new URL(DEFAULT_ADMIN_PATH, request.url));
  }

  // Not authenticated — redirect to sign-in (except sign-in itself).
  if (!isAuthenticated && pathname !== ADMIN_SIGN_IN_PATH) {
    const signInUrl = new URL(ADMIN_SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

async function handleCustomerRoute(request: NextRequest, pathname: string) {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  const session = await decryptCustomerSession(token);
  const isAuthenticated = !!session;

  if (isAuthenticated && pathname === CUSTOMER_SIGN_IN_PATH) {
    return NextResponse.redirect(new URL(DEFAULT_CUSTOMER_PATH, request.url));
  }

  if (!isAuthenticated && pathname !== CUSTOMER_SIGN_IN_PATH) {
    const signInUrl = new URL(CUSTOMER_SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all /admin/* and /account/* paths; exclude static files and
    // Next.js internals.
    '/admin/:path*',
    '/account/:path*',
  ],
};
