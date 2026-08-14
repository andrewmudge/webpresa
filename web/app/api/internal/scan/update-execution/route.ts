import { NextResponse } from 'next/server';
import { verifyInternalRequest } from '@/lib/internal-auth';
import { claimScanExecutionStatus } from '@/lib/db/scan-executions';
import type { ScanExecution } from '@/domain/models/scan-execution';
import { log } from '@/lib/logging/log';

/**
 * Stage 16 — the one generic ScanExecution transition endpoint, called by
 * several distinct Step Functions states (Initialize, recording a
 * crawl/screenshot/score reference mid-run, Finalize, RecordFailure,
 * QueueManualReview) with different request bodies. Each caller supplies the
 * status it expects to find (guarding the same conditional-transition race
 * `claimScanExecutionStatus` exists for) and the fields to set — including,
 * for a terminal transition, a new `status` itself.
 */

interface UpdateExecutionRequestBody {
  scanExecutionId: string;
  expectedCurrentStatus: ScanExecution['status'];
  updates: Partial<Omit<ScanExecution, 'scanExecutionId' | 'businessId' | 'createdAt'>>;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await verifyInternalRequest(request))) {
    log({ level: 'warn', event: 'internal.scan.unauthorized', component: 'internal-api', operation: 'update-execution', requestId });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as UpdateExecutionRequestBody;
  if (!body.scanExecutionId || !body.expectedCurrentStatus) {
    return NextResponse.json({ error: 'scanExecutionId and expectedCurrentStatus are required' }, { status: 400 });
  }

  const claimed = await claimScanExecutionStatus({
    scanExecutionId: body.scanExecutionId,
    expectedCurrentStatus: body.expectedCurrentStatus,
    updates: body.updates ?? {},
  });

  if (!claimed) {
    log({
      level: 'warn',
      event: 'scan.workflow.transition_lost_race',
      component: 'internal-api',
      operation: 'update-execution',
      requestId,
      scanExecutionId: body.scanExecutionId,
      status: body.expectedCurrentStatus,
    });
  }
  return NextResponse.json({ claimed });
}
