import 'server-only';
import type { ScanWorkflowStatus, ScanWorkflowStep } from '@/domain/models/scan-execution';
import { getScanExecutionById } from '@/lib/db/scan-executions';
import { getBusinessById, updateBusiness } from '@/lib/db/businesses';
import { getSitePreviewById, publishSitePreview } from '@/lib/db/site-previews';

/**
 * Polled by the `/build/[buildId]` progress view (via a build-session
 * authorized status route — see `lib/auth/build-session.ts`) to know when a
 * self-service build is done and, once it is, to make the result publicly
 * reachable at `/b/{slug}`.
 *
 * The load-bearing rule here — the single most important finding from the
 * self-service funnel design analysis — is that a terminal `ScanExecution`
 * carrying a `previewId` is a successful build *regardless of which
 * terminal status string it carries*. `CrawlWebsite` already generates and
 * persists a `SitePreview` as a side effect of any successful scrape,
 * before lead-qualification scoring ever runs — `'reject'`/`'manual_review'`
 * only mean "not worth an admin's time as a sales lead," a judgment
 * self-service has no use for. Only a status with genuinely no `previewId`
 * (a truly unreachable/invalid URL, or an internal failure) is a real
 * failure from a self-service visitor's point of view.
 *
 * Publishing here is deliberately unconditional and admin-review-free —
 * `publishSitePreview` normally requires nothing more than a valid
 * `previewId` (see `lib/customer-editing/publish.ts` for the equivalent
 * ownership-gated customer path); this is the self-service counterpart,
 * gated instead by the caller already having verified the build-session
 * cookie. Publishing does NOT make the site SEO-indexable — that's
 * decided purely by `Business.status === 'customer'`
 * (`app/b/[slug]/indexability.ts`), untouched here.
 */

const FAILURE_MESSAGE = 'We couldn’t finish building your website. Please try again.';

export type SelfServiceBuildStatus =
  | { outcome: 'not_found' }
  | { outcome: 'in_progress'; status: ScanWorkflowStatus; currentStep?: ScanWorkflowStep; hasExistingWebsite: boolean }
  | { outcome: 'ready'; slug: string; previewId: string }
  | { outcome: 'failed'; message: string };

const TERMINAL_WITHOUT_PREVIEW_STATUSES: ScanWorkflowStatus[] = ['failed', 'reject', 'manual_review'];

/**
 * Also sets `Business.currentPreviewId` on a fresh publish — mirrors
 * `publishCustomerDraft` (`lib/customer-editing/publish.ts`) exactly, since
 * `publishSitePreview` itself only ever touches `SitePreview` records. Other
 * code (admin business list/detail views, the claim-issuance action below)
 * treats `currentPreviewId` as the canonical "what's live" pointer.
 */
async function ensurePublished(previewId: string, businessId: string): Promise<boolean> {
  const preview = await getSitePreviewById(previewId);
  if (!preview) return false;
  if (preview.status === 'published') return true;
  const published = await publishSitePreview(previewId);
  if (!published) return false;
  await updateBusiness(businessId, { currentPreviewId: published.previewId });
  return true;
}

export async function getSelfServiceBuildStatus(scanExecutionId: string): Promise<SelfServiceBuildStatus> {
  const execution = await getScanExecutionById(scanExecutionId);
  if (!execution) return { outcome: 'not_found' };

  if (execution.previewId) {
    const published = await ensurePublished(execution.previewId, execution.businessId);
    if (!published) return { outcome: 'failed', message: FAILURE_MESSAGE };

    const business = await getBusinessById(execution.businessId);
    if (!business) return { outcome: 'failed', message: FAILURE_MESSAGE };

    return { outcome: 'ready', slug: business.slug, previewId: execution.previewId };
  }

  if (TERMINAL_WITHOUT_PREVIEW_STATUSES.includes(execution.status)) {
    return { outcome: 'failed', message: FAILURE_MESSAGE };
  }

  const business = await getBusinessById(execution.businessId);
  return {
    outcome: 'in_progress',
    status: execution.status,
    currentStep: execution.currentStep,
    hasExistingWebsite: Boolean(business?.websiteUrl),
  };
}
