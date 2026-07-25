import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { getBusinessById } from '@/lib/db/businesses';

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
  if (!(await verifyInternalRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as LoadBusinessRequestBody;
  const business = await getBusinessById(businessId);

  if (!business) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, hasWebsite: Boolean(business.websiteUrl?.trim()) });
}
