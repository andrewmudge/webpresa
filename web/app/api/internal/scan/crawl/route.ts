import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { enrichBusinessWebsite } from '@/lib/firecrawl/enrich-business';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — wraps the existing, already-tested Stage 13 pipeline
 * unchanged. `enrichBusinessWebsite` already crawls, normalizes, ingests
 * images, and generates + persists a `SitePreview` in one operation
 * (`web/lib/firecrawl/enrich-business.ts`) — nothing here re-implements any
 * of that. Its own no-website branch (`handleMissingWebsite`) already
 * returns a `manual_approval_required` outcome without calling Firecrawl, so
 * this route is safe to call even when `load-business` reported no website.
 */

interface CrawlRequestBody {
  businessId: string;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await verifyInternalRequest(request))) {
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'crawl', requestId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as CrawlRequestBody;
  const outcome = await enrichBusinessWebsite(businessId);
  log({ event: 'internal.scan.request_completed', component: 'internal-api', operation: 'crawl', requestId, businessId, status: outcome.status });
  return NextResponse.json(outcome);
}
