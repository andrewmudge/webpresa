import { NextResponse, type NextRequest } from 'next/server';
import { getCustomerSession } from '@/lib/auth/customer-session';
import { getBusinessById } from '@/lib/db/businesses';
import { listDomainConnectionsForBusiness } from '@/lib/db/domain-connections';
import { reconcileDomainConnection } from '@/lib/domains/reconcile';

/**
 * Reconciliation endpoint backing the Domain step's real-time status panel
 * (implementation.md, Stage 19.x, Part 2 — the `/api/domains/status` route
 * reserved there). A Route Handler, not a Server Action, so it does **not**
 * inherit Next's built-in same-origin protection for Server Action POSTs —
 * every check below is explicit (see `architecture.md`, "Customer
 * Onboarding and Domain Connection").
 *
 * Uses `getCustomerSession()` (non-throwing) rather than
 * `requireCustomerSession()`/`requireBusinessOwnership()` — those redirect/
 * 404 for page rendering, which is wrong for a `fetch()`-consumed JSON
 * endpoint; failures here return a plain JSON error instead.
 *
 * Stage 25 — the Origin check is unconditional: a request with no `Origin`
 * header at all is rejected, not just one with a mismatched value. Every
 * real same-origin `fetch()` call from a browser sends `Origin` on a POST;
 * its absence is itself a signal this didn't come from `DomainStatusPanel.tsx`
 * as expected.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { businessId?: unknown; normalizedDomain?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { businessId, normalizedDomain } = body;
  if (typeof businessId !== 'string' || typeof normalizedDomain !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const business = await getBusinessById(businessId);
  if (!business || business.ownerUserId !== session.sub) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Never trust the client-supplied businessId/normalizedDomain pairing —
  // re-verify the domain actually belongs to this business.
  const connections = await listDomainConnectionsForBusiness(businessId);
  const owned = connections.some((c) => c.normalizedDomain === normalizedDomain);
  if (!owned) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await reconcileDomainConnection(normalizedDomain);
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: updated.status,
    verificationRecords: updated.verificationRecords ?? [],
    failureCategory: updated.failureCategory ?? null,
  });
}
