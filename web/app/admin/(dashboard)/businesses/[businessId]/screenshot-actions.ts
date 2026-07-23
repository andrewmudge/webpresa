'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import {
  captureExistingSiteScreenshot,
  captureGeneratedPreviewScreenshot,
  markStaleScanFailed,
} from '@/lib/screenshots/capture';

/**
 * Stage 14 (Playwright Screenshots) admin actions — kept in their own
 * module, following this directory's established one-concern-per-file split
 * (see `enrichment-actions.ts`). Every action here only ever starts an
 * asynchronous capture and redirects immediately — none of them wait on the
 * Lambda (see `lib/screenshots/capture.ts` and `implementation.md`, Stage
 * 14, "Workflow").
 *
 * Signed-URL viewing of a completed screenshot reuses the existing
 * `viewRawArtifactAction` (`app/admin/(dashboard)/scans/[scanId]/actions.ts`)
 * unchanged — it already redirects to a short-lived signed URL for any key
 * under the `scans/` prefix, which covers
 * `scans/{businessId}/{scanId}/existing|preview/{viewport}.png` with no
 * new action needed.
 */

function outcomeQueryParam(status: string): string {
  return `?screenshotResult=${encodeURIComponent(status)}`;
}

export async function captureExistingSiteAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await captureExistingSiteScreenshot(businessId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

export async function captureGeneratedPreviewAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await captureGeneratedPreviewScreenshot(businessId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

export async function markStaleScanFailedAction(businessId: string, scanId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await markStaleScanFailed(businessId, scanId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}
