import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { scoreBusinessWebsite } from '@/lib/scoring/score-business';
import { getBusinessById } from '@/lib/db/businesses';

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
  if (!(await verifyInternalRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as ScoreRequestBody;
  const outcome = await scoreBusinessWebsite(businessId);

  const business = await getBusinessById(businessId);

  return NextResponse.json({
    ...outcome,
    qualification: business?.qualification ?? null,
    leadPriority: business?.leadPriority ?? null,
    websiteQualityScore: business?.websiteQualityScore ?? null,
  });
}
