import 'server-only';
import type { Address } from '@/domain/models/common';
import { lobRequest, LobApiError } from './client';
import { getPostcardById, transitionPostcardToSubmitting, markPostcardSubmitted, markPostcardSubmissionFailed } from '@/lib/db/postcards';
import { getBusinessById, advanceBusinessStatus } from '@/lib/db/businesses';
import { getLobSenderAddress } from '@/lib/env/lob-sender-address';
import { renderPostcardArtifacts } from '@/lib/postcards/render';
import { getSignedAssetUrl } from '@/lib/s3/assets';
import { log } from '@/lib/logging/log';

/**
 * Stage 22 Phase 4 — submits an approved, rendered postcard to Lob.
 *
 * `size`/`mail_type`/`use_type` and the `to`/`from` address field names
 * are confirmed against Lob's live API docs (docs.lob.com), not guessed.
 * `front`/`back` are the signed S3 URLs of the PDFs the Phase 2 render
 * Lambda already produced — Lob fetches artwork by URL, so no local file
 * upload step is needed. The recipient's address is passed structurally
 * (`to`), never drawn as text in our own artwork — confirmed Lob overlays
 * it automatically and discards whatever's in that artwork region (see
 * `PostcardBack.tsx`'s doc comment).
 */

const LOB_POSTCARD_SIZE = '6x9';
const LOB_MAIL_TYPE = 'usps_first_class';
const LOB_USE_TYPE = 'marketing';
/** How long the signed S3 URLs handed to Lob stay valid — comfortably longer than Lob's own fetch should ever take. */
const ARTIFACT_URL_TTL_SECONDS = 3600;
/** Lob's `to.name`/`from.name` fields reject anything longer than this (422 `invalid`). */
const LOB_NAME_MAX_LENGTH = 40;

export type SubmitPostcardOutcome =
  | { status: 'submitted'; providerPostcardId: string }
  | { status: 'not_eligible'; message: string }
  | { status: 'conflict'; message: string }
  | { status: 'failed'; message: string };

interface LobAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
}

/**
 * Lob rejects `to.name`/`from.name` over 40 chars (422 `invalid`), but
 * `Business.name` is validated up to 200 chars — long trading names (e.g.
 * "Radiant Plumbing, Air Conditioning, & Electrical") must be shortened
 * before submission. Cuts at the last word boundary within the limit so a
 * word isn't sliced in half, then trims trailing punctuation left dangling
 * by the cut. Falls back to a hard cut only when a single word exceeds the
 * limit on its own.
 */
function truncateLobName(name: string, maxLength = LOB_NAME_MAX_LENGTH): string {
  if (name.length <= maxLength) return name;
  let cut = name.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  return cut.replace(/[\s,;:&-]+$/, '');
}

function toLobAddress(name: string, address: Address): LobAddress {
  return {
    name: truncateLobName(name),
    address_line1: address.line1,
    ...(address.line2 ? { address_line2: address.line2 } : {}),
    address_city: address.city,
    address_state: address.state,
    address_zip: address.postalCode,
    address_country: address.country,
  };
}

interface LobPostcardResponse {
  id: string;
  /**
   * Unconfirmed against Lob's docs (their published API reference does
   * not document a price field on this response, and there is no
   * separate dry-run/cost-estimate endpoint either — both checked live).
   * Read defensively: if a numeric `price` ever does come back, store it;
   * if not, `costCents` simply stays unset. Verify against a real
   * response the first time a test postcard is actually submitted.
   */
  price?: number;
}

export async function submitPostcardToLob(postcardId: string): Promise<SubmitPostcardOutcome> {
  const postcard = await getPostcardById(postcardId);
  if (!postcard) return { status: 'failed', message: 'Postcard not found.' };

  if (!postcard.reviewedAt) {
    return { status: 'not_eligible', message: 'This postcard has not been approved yet.' };
  }
  if (!postcard.frontArtifactKey || !postcard.backArtifactKey) {
    return { status: 'not_eligible', message: 'This postcard has no rendered artwork yet.' };
  }

  const business = await getBusinessById(postcard.businessId);
  if (!business) return { status: 'failed', message: 'Business not found.' };
  if (!business.address) return { status: 'not_eligible', message: 'This business has no mailing address on file.' };

  let senderAddress;
  try {
    senderAddress = getLobSenderAddress();
  } catch {
    return { status: 'not_eligible', message: 'Sender/return address is not configured (WEBPRESA_LOB_SENDER_* environment variables).' };
  }

  // Re-render fresh artwork immediately before submission — the underlying
  // S3 PDF is otherwise only ever captured once, at postcard-creation time,
  // and never automatically refreshed. A business edited after that would
  // silently mail stale artwork otherwise. Must run before
  // transitionPostcardToSubmitting below: renderPostcardArtifacts only
  // re-renders while status is still 'pending'. A failure here aborts the
  // submission entirely rather than falling back to whatever stale artifact
  // already exists.
  const renderResult = await renderPostcardArtifacts(postcardId);
  if (renderResult.status !== 'rendered') {
    if (renderResult.status === 'not_eligible') {
      return { status: 'conflict', message: renderResult.message ?? 'This postcard is not in a state that can be re-rendered.' };
    }
    return { status: 'failed', message: renderResult.message ?? 'Failed to render up-to-date postcard artwork before submission.' };
  }
  const freshPostcard = await getPostcardById(postcardId);
  if (!freshPostcard?.frontArtifactKey || !freshPostcard?.backArtifactKey) {
    return { status: 'failed', message: 'Rendered artwork keys are missing after re-render.' };
  }

  const claimed = await transitionPostcardToSubmitting(postcardId);
  if (!claimed) {
    return { status: 'conflict', message: `This postcard is not in a submittable state (current status: '${freshPostcard.status}').` };
  }

  try {
    const [frontUrl, backUrl] = await Promise.all([
      getSignedAssetUrl(freshPostcard.frontArtifactKey, ARTIFACT_URL_TTL_SECONDS),
      getSignedAssetUrl(freshPostcard.backArtifactKey, ARTIFACT_URL_TTL_SECONDS),
    ]);

    const recipientName = truncateLobName(business.name);
    if (recipientName !== business.name) {
      log({
        event: 'postcard.submission.name_truncated',
        component: 'lob-submission',
        businessId: postcard.businessId,
        postcardId,
        provider: 'lob',
        message: `Recipient name truncated from ${business.name.length} to ${recipientName.length} chars for Lob's ${LOB_NAME_MAX_LENGTH}-char to.name limit.`,
      });
    }

    const response = await lobRequest<LobPostcardResponse>('/postcards', {
      method: 'POST',
      body: JSON.stringify({
        to: toLobAddress(business.name, business.address),
        from: toLobAddress(senderAddress.name, senderAddress),
        front: frontUrl,
        back: backUrl,
        size: LOB_POSTCARD_SIZE,
        mail_type: LOB_MAIL_TYPE,
        use_type: LOB_USE_TYPE,
        metadata: { postcardId },
      }),
    });

    const costCents = typeof response.price === 'number' ? Math.round(response.price * 100) : undefined;
    await markPostcardSubmitted(postcardId, { providerPostcardId: response.id, costCents });

    // Best-effort — the postcard is already committed to Lob at this point,
    // so a status-advance failure must never surface as a submission failure.
    try {
      await advanceBusinessStatus(postcard.businessId, 'outreach');
    } catch (err) {
      log({
        level: 'error',
        event: 'business.status.advance_failed',
        component: 'lob-submission',
        businessId: postcard.businessId,
        postcardId,
        message: err instanceof Error ? err.message : 'Failed to advance business status to outreach.',
      });
    }

    log({
      event: 'postcard.submission.completed',
      component: 'lob-submission',
      businessId: postcard.businessId,
      postcardId,
      provider: 'lob',
      status: 'submitted',
    });
    return { status: 'submitted', providerPostcardId: response.id };
  } catch (err) {
    const message = err instanceof LobApiError ? err.message : err instanceof Error ? err.message : 'Failed to submit postcard to Lob.';
    await markPostcardSubmissionFailed(postcardId, message);
    // No retry path exists for a failed submission (see SubmitButton.tsx —
    // a new postcard must be generated instead), so this is logged as an
    // error for CloudWatch/Operations visibility but never auto-retried.
    log({
      level: 'error',
      event: 'postcard.submission.failed',
      component: 'lob-submission',
      businessId: postcard.businessId,
      postcardId,
      provider: 'lob',
      status: 'failed',
      errorCategory: err instanceof LobApiError ? (err.status === 401 || err.status === 403 ? 'lob_auth' : `lob_http_${err.status}`) : 'unknown',
      retryable: false,
      message,
    });
    return { status: 'failed', message };
  }
}
