import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSession, ADMIN_SESSION_COOKIE } from '@/lib/auth/session';
import { decryptCustomerSession, CUSTOMER_SESSION_COOKIE } from '@/lib/auth/customer-session';
import { isReservedRoutingHost, resolveActiveDomainRoute } from '@/lib/domains/routing';

/**
 * Proxy (formerly middleware) for route-level authentication and (Stage
 * 19.x, Part 2) multi-tenant custom-domain routing.
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
 * All /app/* routes (Stage 19 — customer dashboard) use the same customer
 * session cookie as /account/*, but this is a session check only — whether
 * a signed-in customer actually owns the business, and what access mode
 * (full/billing_recovery/none) they get, is decided page-by-page via
 * `requireBusinessOwnership()`/`requireBusinessAccess()`, not here. A
 * `billing_recovery` customer is a perfectly valid session that still needs
 * to reach `/app` (read-only), so this layer must not turn them away.
 *
 * Note: Only the session cookie is read here — no DynamoDB calls for the
 * admin/account/app branches. Full session validation happens server-side
 * inside protected route handlers and actions.
 *
 * A request arriving on a hostname other than `webpresa.com`/
 * `www.webpresa.com`/`localhost`/a Vercel preview host is treated as a
 * candidate customer custom domain — see `handleCustomDomainRoute` below.
 * This is the one branch that does read DynamoDB (a single `GetItem` by
 * `normalizedDomain` — see `lib/domains/routing.ts`), and only for traffic
 * that isn't on a Webpresa-owned host to begin with.
 */

const ADMIN_SIGN_IN_PATH = '/admin/sign-in';
const DEFAULT_ADMIN_PATH = '/admin/businesses';

const CUSTOMER_SIGN_IN_PATH = '/account/sign-in';
const DEFAULT_CUSTOMER_PATH = '/app';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host')?.split(':')[0] ?? '';

  if (hostname && !isReservedRoutingHost(hostname)) {
    return handleCustomDomainRoute(request, hostname, pathname);
  }

  if (pathname.startsWith('/admin')) {
    return handleAdminRoute(request, pathname);
  }

  if (pathname.startsWith('/account')) {
    return handleCustomerRoute(request, pathname);
  }

  if (pathname.startsWith('/app')) {
    return handleAppRoute(request, pathname);
  }

  return NextResponse.next();
}

/**
 * On a foreign host, the admin/account/app/claim namespaces must never be
 * reachable by path guess — that would mean Webpresa's own management
 * surfaces are exposed under a customer's domain name. Everything except
 * the public tenant root falls through to the app's existing shared
 * static/API assets unchanged (no per-business robots.txt/sitemap.xml yet —
 * that's new Stage 8 surface, out of scope for domain *connection* itself).
 */
async function handleCustomDomainRoute(request: NextRequest, hostname: string, pathname: string) {
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/claim')
  ) {
    return new NextResponse(null, { status: 404 });
  }

  if (pathname !== '/') {
    return NextResponse.next();
  }

  const route = await resolveActiveDomainRoute(hostname);
  if (!route) {
    return new NextResponse(null, { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/b/${route.slug}`;
  return NextResponse.rewrite(url);
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

/** Session check only — see the module-level comment above for why /app has no "mode" logic here. */
async function handleAppRoute(request: NextRequest, pathname: string) {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  const session = await decryptCustomerSession(token);

  if (!session) {
    const signInUrl = new URL(CUSTOMER_SIGN_IN_PATH, request.url);
    signInUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Stage 19.x, Part 2 widened this from three explicit path prefixes to
    // effectively everything except static assets/Next internals — host-
    // based tenant routing needs to see the request hostname on every path,
    // including `/`, which none of the three original prefixes covered.
    // `isReservedRoutingHost` short-circuits before any DynamoDB call for
    // the overwhelming majority of requests (anything on
    // webpresa.com/www.webpresa.com/localhost/a Vercel preview host), so
    // this does not add a database round trip to normal traffic — it only
    // adds one for requests already arriving on an unrecognized hostname.
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
