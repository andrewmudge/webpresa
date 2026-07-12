import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSession, ADMIN_SESSION_COOKIE } from '@/lib/auth/session';

/**
 * Proxy (formerly middleware) for route-level authentication.
 *
 * All /admin/* routes are protected.  Unauthenticated requests are redirected
 * to /admin/sign-in.  Authenticated requests to the sign-in page are redirected
 * to /admin/businesses.
 *
 * Note: Only the session cookie is read here — no DynamoDB calls.  Full session
 * validation happens server-side inside protected route handlers and actions.
 */

const SIGN_IN_PATH = '/admin/sign-in';
const DEFAULT_ADMIN_PATH = '/admin/businesses';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only act on admin routes.
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await decryptSession(token);
  const isAuthenticated = !!session;

  // Already authenticated — redirect away from sign-in.
  if (isAuthenticated && pathname === SIGN_IN_PATH) {
    return NextResponse.redirect(new URL(DEFAULT_ADMIN_PATH, request.url));
  }

  // Not authenticated — redirect to sign-in (except sign-in itself).
  if (!isAuthenticated && pathname !== SIGN_IN_PATH) {
    const signInUrl = new URL(SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all /admin/* paths; exclude static files and Next.js internals.
    '/admin/:path*',
  ],
};
