'use server';

import { getSession } from '@/lib/auth/session';
import { getBusinessById } from '@/lib/db/businesses';
import { getCampaignRecipientById, linkPostcardToCampaignRecipient } from '@/lib/db/campaign-recipients';
import { getPostcardByCampaignRecipientId, putPostcard, approvePostcard } from '@/lib/db/postcards';
import { createPostcard } from '@/domain/factories/postcard.factory';
import { renderPostcardArtifacts } from '@/lib/postcards/render';
import { submitPostcardToLob, type SubmitPostcardOutcome } from '@/lib/lob/submit-postcard';

/**
 * Admin postcard management (Stage 22). Manual-only, one postcard at a
 * time — generation is reachable per-recipient from the existing Stage 21
 * campaign admin UI, not a separate bulk-selection flow (bulk campaign
 * execution stays deferred). No automatic approval or submission exists.
 */

export interface CreatePostcardResult {
  error?: string;
  postcardId?: string;
  /**
   * Set when the `Postcard` record itself was created successfully but the
   * Phase 2 render (front/back PDF) failed — the record still exists (and
   * the caller still navigates to it), but its artifacts are missing. Not
   * an `error`: creation genuinely succeeded, only rendering didn't. There
   * is no retry action yet — re-running this whole flow isn't possible
   * (the recipient already has a postcard), so a failure here currently
   * needs manual follow-up.
   */
  renderWarning?: string;
}

/**
 * Generates a new Postcard for one CampaignRecipient — the recipient *is*
 * "one mailed piece" (Stage 21); this Postcard becomes the record of its
 * physical rendering and fulfillment. A recipient can have at most one
 * Postcard.
 */
export async function createPostcardAction(campaignRecipientId: string): Promise<CreatePostcardResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const recipient = await getCampaignRecipientById(campaignRecipientId);
  if (!recipient) return { error: 'Campaign recipient not found.' };

  if (recipient.postcardId) {
    return { error: 'This recipient already has a postcard.', postcardId: recipient.postcardId };
  }

  const existing = await getPostcardByCampaignRecipientId(campaignRecipientId);
  if (existing) return { error: 'This recipient already has a postcard.', postcardId: existing.postcardId };

  const business = await getBusinessById(recipient.businessId);
  if (!business) return { error: 'Business not found.' };
  if (!business.currentPreviewId) return { error: 'This business has no generated website preview yet.' };

  const postcard = createPostcard({
    businessId: business.businessId,
    previewId: business.currentPreviewId,
    provider: 'lob',
    campaignRecipientId,
  });
  await putPostcard(postcard);
  await linkPostcardToCampaignRecipient(campaignRecipientId, postcard.postcardId);

  const renderResult = await renderPostcardArtifacts(postcard.postcardId);
  if (renderResult.status !== 'rendered') {
    return { postcardId: postcard.postcardId, renderWarning: renderResult.message ?? 'Rendering the postcard artwork failed.' };
  }

  return { postcardId: postcard.postcardId };
}

/**
 * Retries rendering for a postcard whose initial render failed (still
 * `pending`, never got its artifact keys — see `CreatePostcardResult`'s
 * `renderWarning` above). `renderPostcardArtifacts` already guards on
 * `status === 'pending'` and is safe to call again — it only ever creates
 * new S3 artifacts and records their keys, no new `Postcard` record.
 */
export async function retryRenderPostcardAction(postcardId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const result = await renderPostcardArtifacts(postcardId);
  if (result.status !== 'rendered') {
    return { error: result.message ?? 'Rendering the postcard artwork failed.' };
  }
  return {};
}

/**
 * Records explicit admin approval. Approval only unlocks submission (Phase
 * 4, not yet built) — it never triggers mailing by itself. No automatic
 * approval path exists.
 */
export async function approvePostcardAction(postcardId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  await approvePostcard(postcardId, session.sub);
  return {};
}

/**
 * Submits an approved, rendered postcard to Lob (Phase 4). Admin-only,
 * same session gate as every other action here — `submitPostcardToLob`
 * itself independently re-checks `reviewedAt` and the rendered-artifact
 * keys rather than trusting this route, so it's still safe even if called
 * directly. No automatic submission path exists anywhere in this stage.
 */
export async function submitPostcardToLobAction(postcardId: string): Promise<SubmitPostcardOutcome | { status: 'failed'; message: string }> {
  const session = await getSession();
  if (!session) return { status: 'failed', message: 'Unauthorized' };

  return submitPostcardToLob(postcardId);
}

/**
 * Stage 25 (Security Hardening) — the volume/cost guard `CampaignDetail.tsx`'s
 * "Submit all" bulk action goes through, instead of firing one
 * `submitPostcardToLobAction` call per recipient via `Promise.all`. Each
 * individual submission still costs real money at Lob and is already
 * idempotency-guarded per postcard (`submitPostcardToLob`'s atomic
 * `pending`→`submitting` transition) — this adds the piece that guard
 * doesn't cover: nothing previously bounded how many *distinct* postcards
 * one bulk click (or a direct call to this action) could submit at once.
 */
const MAX_BULK_POSTCARD_SUBMIT = 25;

export interface BulkSubmitPostcardsResult {
  error?: string;
  submitted?: number;
  failed?: number;
}

export async function submitPostcardsToLobBulkAction(postcardIds: string[]): Promise<BulkSubmitPostcardsResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  if (postcardIds.length === 0) return { submitted: 0, failed: 0 };
  if (postcardIds.length > MAX_BULK_POSTCARD_SUBMIT) {
    return { error: `Cannot submit more than ${MAX_BULK_POSTCARD_SUBMIT} postcards at once — narrow the filter and try again in batches.` };
  }

  // Sequential, not Promise.all — deliberate: each call is a real Lob spend,
  // and there is no reason to fan these out concurrently for an admin-only,
  // already-capped, low-volume manual action.
  let submitted = 0;
  let failed = 0;
  for (const postcardId of postcardIds) {
    const result = await submitPostcardToLob(postcardId);
    if (result.status === 'submitted') submitted += 1;
    else failed += 1;
  }

  return { submitted, failed };
}
