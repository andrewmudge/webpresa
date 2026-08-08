import 'server-only';
import type { Address } from '@/domain/models/common';
import { lobRequest, LobApiError } from './client';
import { getPostcardById, transitionPostcardToSubmitting, markPostcardSubmitted, markPostcardSubmissionFailed } from '@/lib/db/postcards';
import { getBusinessById } from '@/lib/db/businesses';
import { getLobSenderAddress } from '@/lib/env/lob-sender-address';
import { getSignedAssetUrl } from '@/lib/s3/assets';

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

function toLobAddress(name: string, address: Address): LobAddress {
  return {
    name,
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

  const claimed = await transitionPostcardToSubmitting(postcardId);
  if (!claimed) {
    return { status: 'conflict', message: `This postcard is not in a submittable state (current status: '${postcard.status}').` };
  }

  try {
    const [frontUrl, backUrl] = await Promise.all([
      getSignedAssetUrl(postcard.frontArtifactKey, ARTIFACT_URL_TTL_SECONDS),
      getSignedAssetUrl(postcard.backArtifactKey, ARTIFACT_URL_TTL_SECONDS),
    ]);

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

    return { status: 'submitted', providerPostcardId: response.id };
  } catch (err) {
    const message = err instanceof LobApiError ? err.message : err instanceof Error ? err.message : 'Failed to submit postcard to Lob.';
    await markPostcardSubmissionFailed(postcardId, message);
    return { status: 'failed', message };
  }
}
