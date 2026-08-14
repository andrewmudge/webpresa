import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { getBusinessById } from '@/lib/db/businesses';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — the workflow's first real state after Initialize. Confirms the
 * business exists (fails the execution fast otherwise) and reports whether
 * it has a website, which the state machine uses to route around Firecrawl
 * entirely for a no-website business — see implementation.md, Stage 16,
 * "No-website path".
 */

interface LoadBusinessRequestBody {
  businessId: string;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await verifyInternalRequest(request))) {
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'load-business', requestId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as LoadBusinessRequestBody;
  const business = await getBusinessById(businessId);

  if (!business) {
    log({ level: 'warn', event: 'internal.scan.request_completed', component: 'internal-api', operation: 'load-business', requestId, businessId, status: 'not_found' });
    return NextResponse.json({ found: false });
  }

  log({ event: 'internal.scan.request_completed', component: 'internal-api', operation: 'load-business', requestId, businessId, status: 'found' });
  return NextResponse.json({ found: true, hasWebsite: Boolean(business.websiteUrl?.trim()) });
}
