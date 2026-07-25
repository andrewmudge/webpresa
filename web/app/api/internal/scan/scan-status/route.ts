import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { getScanEventById } from '@/lib/db/scan-events';

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
