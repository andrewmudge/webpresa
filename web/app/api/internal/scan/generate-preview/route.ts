import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { generateAndSaveWebsite } from '@/lib/ai/generate-and-save-preview';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — no-website branch only. Neither Stage 13's no-website path nor
 * Stage 15's no-website qualification shortcut generates a preview (see
 * implementation.md, Stage 16, "No-website path") — this is the only place
 * that does, for a business with no website to crawl. Wraps
 * `generateAndSaveWebsite`, the exact same pipeline the admin "Generate
 * Website" button uses.
 */

interface GeneratePreviewRequestBody {
  businessId: string;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await verifyInternalRequest(request))) {
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'generate-preview', requestId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as GeneratePreviewRequestBody;
  const outcome = await generateAndSaveWebsite(businessId);
  log({ event: 'internal.scan.request_completed', component: 'internal-api', operation: 'generate-preview', requestId, businessId, status: outcome.status });
  return NextResponse.json(outcome);
}
