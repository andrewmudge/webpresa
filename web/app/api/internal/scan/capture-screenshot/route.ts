import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { captureExistingSiteScreenshot, captureGeneratedPreviewScreenshot } from '@/lib/screenshots/capture';
import type { ScanTargetType } from '@/domain/models/scan-event';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — one route serving both Step Functions states
 * ("Capture Source-Site Screenshots" and "Capture Preview Screenshots"),
 * mirroring how the existing Stage 14 pipeline already models them as two
 * thin, target-specific functions rather than duplicating capture logic.
 * Both wrapped functions only ever start an async Playwright Lambda
 * invocation and return once the ScanEvent is `queued` — the state machine
 * polls `/api/internal/scan/scan-status` for the eventual result (see the
 * Wait/Choice loop in `scan-workflow-stack.ts`).
 */

interface CaptureScreenshotRequestBody {
  businessId: string;
  target: ScanTargetType;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await verifyInternalRequest(request))) {
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'capture-screenshot', requestId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId, target } = (await request.json()) as CaptureScreenshotRequestBody;

  const outcome =
    target === 'existing_site'
      ? await captureExistingSiteScreenshot(businessId)
      : await captureGeneratedPreviewScreenshot(businessId);

  log({ event: 'internal.scan.request_completed', component: 'internal-api', operation: 'capture-screenshot', requestId, businessId, status: outcome.status });
  return NextResponse.json(outcome);
}
