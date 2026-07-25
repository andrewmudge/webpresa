import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { generateAndSaveWebsite } from '@/lib/ai/generate-and-save-preview';

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
  if (!(await verifyInternalRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = (await request.json()) as GeneratePreviewRequestBody;
  const outcome = await generateAndSaveWebsite(businessId);
  return NextResponse.json(outcome);
}
