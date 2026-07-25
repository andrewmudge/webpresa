import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { enrichBusinessWebsite } from '@/lib/firecrawl/enrich-business';

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
  if (!(await verifyInternalRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as CrawlRequestBody;
  const outcome = await enrichBusinessWebsite(businessId);
  return NextResponse.json(outcome);
}
