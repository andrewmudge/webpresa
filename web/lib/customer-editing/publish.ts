import 'server-only';
import { getSitePreviewById, publishSitePreview } from '@/lib/db/site-previews';
import { updateBusiness } from '@/lib/db/businesses';

export type CustomerPublishState = { message?: string } | undefined;

/**
 * Explicit customer publish action (implementation.md, Stage 19, "Draft &
 * publish model", step 5). Re-verifies that `previewId` actually belongs to
 * `businessId` — never trusts a browser-supplied pairing — before calling
 * the same `publishSitePreview()` the admin's `publishPreviewAction` already
 * uses (archives any other published sibling, promotes the target). Caller
 * (the customer-scoped Server Action) is responsible for confirming
 * `requireBusinessAccess(...).mode === 'full'` before calling this.
 */
export async function publishCustomerDraft(businessId: string, previewId: string): Promise<CustomerPublishState> {
  const preview = await getSitePreviewById(previewId);
  if (!preview || preview.businessId !== businessId) {
    return { message: 'Preview not found.' };
  }

  const published = await publishSitePreview(previewId);
  if (!published) return { message: 'Preview not found.' };

  await updateBusiness(businessId, { currentPreviewId: published.previewId });
  return undefined;
}
