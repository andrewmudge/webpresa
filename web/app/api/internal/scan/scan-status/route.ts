import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { getScanEventById } from '@/lib/db/scan-events';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — polled by the Wait/Choice loop in `scan-workflow-stack.ts`
 * while a screenshot capture is in flight. Capture is fire-and-forget (the
 * Stage 14 Lambda owns every subsequent status transition — see
 * `lib/screenshots/capture.ts`), so this is the only way the state machine
 * ever learns a capture finished, without touching or modifying that
 * already-deployed Lambda.
 */

export async function GET(request: Request) {
  if (!(await verifyInternalRequest(request))) {
    // Deliberately not logged at the same verbosity as the other internal
    // routes' success path — this endpoint is polled up to 40 times per
    // in-flight capture (see scan-workflow-stack.ts's Wait/Choice loop), so
    // logging every successful poll would be noise; scanId already
    // correlates this back to the relevant ScanEvent in scan.screenshot.*
    // logs without a separate requestId here.
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'scan-status' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scanId = new URL(request.url).searchParams.get('scanId');
  if (!scanId) {
    return NextResponse.json({ error: 'scanId query parameter is required' }, { status: 400 });
  }

  const scan = await getScanEventById(scanId);
  if (!scan) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    status: scan.status,
    failureCategory: scan.failureCategory ?? null,
  });
}
