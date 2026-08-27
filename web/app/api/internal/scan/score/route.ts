import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { scoreBusinessWebsite } from '@/lib/scoring/score-business';
import { getBusinessById } from '@/lib/db/businesses';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — wraps the existing, already-tested Stage 15 pipeline
 * unchanged. `scoreBusinessWebsite` already self-branches on whether the
 * business has a website and on the prior Firecrawl scan's outcome (its own
 * no-website and website-unavailable shortcuts), applies the qualification
 * overrides, and updates `Business.qualification`/`leadPriority`/
 * `websiteQualityScore` internally — this route only adds a `getBusinessById`
 * read-back so the Step Functions Qualification Choice state can branch on
 * `qualification` directly, since `ScoringOutcome` itself doesn't carry it.
 */

interface ScoreRequestBody {
  businessId: string;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await verifyInternalRequest(request))) {
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'score', requestId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as ScoreRequestBody;
  const outcome = await scoreBusinessWebsite(businessId);

  const business = await getBusinessById(businessId);

  log({ event: 'internal.scan.request_completed', component: 'internal-api', operation: 'score', requestId, businessId, status: outcome.status });
  return NextResponse.json({
    ...outcome,
    qualification: business?.qualification ?? null,
    leadPriority: business?.leadPriority ?? null,
    websiteQualityScore: business?.websiteQualityScore ?? null,
    // `message` is only set on some `ScoringOutcome` variants (e.g.
    // `not_eligible`) — a genuinely `'completed'` score never sets it. The
    // Step Functions state machine reads `manualReviewReason.$` from this
    // field in `FinalizeManualReviewFromScore`/`FinalizeManualReviewNoWebsite`,
    // which throws States.Runtime on a truly-absent key, not just a missing
    // value — confirmed live: a 2026-08-27 self-service run crashed exactly
    // this way. Same fix as the crawl/generate-preview routes' `message`/
    // `previewId` normalization.
    message: outcome.message ?? null,
  });
}
