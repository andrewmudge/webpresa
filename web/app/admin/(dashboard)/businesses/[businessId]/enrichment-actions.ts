'use server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { enrichBusinessWebsite, retryEnrichmentScan } from '@/lib/firecrawl/enrich-business';
import { getBusinessById, putBusiness, updateBusiness } from '@/lib/db/businesses';
import { getScanEventById, putScanEvent } from '@/lib/db/scan-events';
import { getAsset, putAsset } from '@/lib/s3/assets';

/**
 * Stage 13 (Firecrawl Website Enrichment) admin actions — kept in their own
 * module rather than added to the already 1200+ line `actions.ts`, following
 * this directory's established one-concern-per-file split (see
 * `cta-defaults.ts`, `form-list.ts`, `section-order.ts`).
 *
 * Most actions here redirect back to the business (or scan) detail page
 * with a query param the page reads to show a result banner —
 * `generateWebsiteAction` uses a `useActionState` message instead, but
 * enrichment can take a while and involves several distinct terminal
 * outcomes, so a redirect + query param keeps every button here a plain
 * form submit with no client component required, matching
 * `applyRecommendedSectionsAction`'s pattern.
 */

function outcomeQueryParam(status: string): string {
  return `?enrichmentResult=${encodeURIComponent(status)}`;
}

export async function enrichWebsiteAction(businessId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await enrichBusinessWebsite(businessId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

export async function retryEnrichmentAction(businessId: string, scanId: string): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const outcome = await retryEnrichmentScan(businessId, scanId);
  redirect(`/admin/businesses/${businessId}${outcomeQueryParam(outcome.status)}`);
}

// ---------------------------------------------------------------------------
// Scan-image promotion
//
// Firecrawl-discovered images are never *automatically* written onto
// `Business.photoUrls` (see domain/models/scan-image.ts) — these are the
// explicit admin actions that do it deliberately, one image or a batch at a
// time. Each promotion copies the object from its scan-artifact location
// (`scans/{businessId}/{scanId}/images/...`) into the canonical
// `businesses/{businessId}/assets/photos/...` prefix, exactly like an
// admin-uploaded photo, rather than pointing `photoUrls` at the scan
// folder — keeps every `photoUrls` entry's provenance and lifecycle
// identical regardless of where it originally came from.
// ---------------------------------------------------------------------------

/** Mirrors BusinessSchema's `photoUrls` cap (`domain/schemas/business.schema.ts`) — kept in sync by comment. */
const MAX_BUSINESS_PHOTOS = 6;

function photoApprovalQueryParam(redirectTo: string, params: Record<string, string>): string {
  const separator = redirectTo.includes('?') ? '&' : '?';
  const query = new URLSearchParams(params).toString();
  return `${redirectTo}${separator}${query}`;
}

type PromoteResult = 'added' | 'already_added' | 'limit_reached' | 'not_found';

/**
 * Promotes one scan-discovered image (`accepted` or `review_required` —
 * `rejected` images were never stored, so there's nothing to promote) into
 * the canonical Business photo library. Idempotent. Pure result, no
 * redirect — shared by the single-image and batch actions below, each of
 * which decides what to do with the result (single-image redirects
 * immediately; batch accumulates results across every selected image
 * before redirecting once).
 *
 * Always re-fetches the Business fresh, so calling this repeatedly in a
 * sequential loop (never in parallel) correctly grows `photoUrls` across
 * calls rather than racing on a stale array length.
 */
async function promoteScanImage(businessId: string, scanId: string, imageId: string): Promise<PromoteResult> {
  const [business, scan] = await Promise.all([getBusinessById(businessId), getScanEventById(scanId)]);
  if (!business || !scan || scan.businessId !== businessId) return 'not_found';

  const image = scan.images?.find((i) => i.imageId === imageId);
  if (!image || !image.s3Key || image.status === 'rejected') return 'not_found';
  if (image.promotedPhotoUrl) return 'already_added';

  const existingPhotoUrls = business.photoUrls ?? [];
  if (existingPhotoUrls.length >= MAX_BUSINESS_PHOTOS) return 'limit_reached';

  const buffer = await getAsset(image.s3Key);
  if (!buffer) return 'not_found';

  const extension = image.s3Key.split('.').pop() || 'jpg';
  const canonicalKey = `businesses/${businessId}/assets/photos/${existingPhotoUrls.length}.${extension}`;
  await putAsset(canonicalKey, buffer, image.contentType || 'application/octet-stream');
  const promotedPhotoUrl = `/api/assets/${canonicalKey}`;

  await putBusiness({
    ...business,
    photoUrls: [...existingPhotoUrls, promotedPhotoUrl],
    updatedAt: new Date().toISOString(),
  });

  const updatedImages = (scan.images ?? []).map((i) => (i.imageId === imageId ? { ...i, promotedPhotoUrl } : i));
  await putScanEvent({ ...scan, images: updatedImages, updatedAt: new Date().toISOString() });

  return 'added';
}

export async function approveScanImageAction(
  businessId: string,
  scanId: string,
  imageId: string,
  redirectTo: string,
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const result = await promoteScanImage(businessId, scanId, imageId);
  redirect(photoApprovalQueryParam(redirectTo, { photoApproval: result }));
}

/**
 * Batch version — reads every checked `images` field (`"{scanId}::{imageId}"`
 * pairs) from the submitted form and promotes each in turn, sequentially
 * (never in parallel, so `photoUrls` numbering stays correct across calls).
 * Stops adding once the 6-photo cap is hit but keeps counting the rest as
 * skipped rather than erroring out — a partial batch is still useful.
 */
export async function approveScanImagesAction(businessId: string, redirectTo: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const refs = formData
    .getAll('images')
    .map((v) => String(v).split('::'))
    .filter((parts): parts is [string, string] => parts.length === 2 && !!parts[0] && !!parts[1]);

  if (refs.length === 0) {
    redirect(photoApprovalQueryParam(redirectTo, { photoApproval: 'none_selected' }));
  }

  let added = 0;
  let skipped = 0;
  for (const [scanId, imageId] of refs) {
    const result = await promoteScanImage(businessId, scanId, imageId);
    if (result === 'added') added += 1;
    else skipped += 1;
  }

  redirect(
    photoApprovalQueryParam(redirectTo, {
      photoApproval: added > 0 ? 'batch_added' : 'limit_reached',
      added: String(added),
      skipped: String(skipped),
    }),
  );
}

// ---------------------------------------------------------------------------
// Found-contact-info promotion
//
// Firecrawl-discovered contact details (phone/email/address) already fill
// gaps in the *generated preview* when the Business record itself is blank
// (see lib/firecrawl/generation-context.ts) — but they never touch the
// Business record itself automatically. This is the explicit admin action
// that applies one found value onto the canonical Business field, mirroring
// the scan-image promotion pattern above.
//
// Only `phone`/`email` are actually promotable this way — `Business.address`
// is a structured `Address` object (`line1`/`city`/`state`/`postalCode`),
// while a Firecrawl-found address is a single unstructured string with no
// reliable way to split it into those fields. `FoundContactInfo.tsx` shows
// a found address as read-only, for the admin to copy into the Business
// Details form's address fields by hand, rather than risking a bad parse.
// ---------------------------------------------------------------------------

const CONTACT_FIELDS = ['phone', 'email'] as const;
type ContactField = (typeof CONTACT_FIELDS)[number];

export async function applyFoundContactFieldAction(
  businessId: string,
  field: ContactField,
  value: string,
  redirectTo: string,
): Promise<void> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  if (!CONTACT_FIELDS.includes(field) || !value.trim()) {
    redirect(photoApprovalQueryParam(redirectTo, { contactApproval: 'not_found' }));
  }

  await updateBusiness(businessId, { [field]: value.trim() });

  redirect(photoApprovalQueryParam(redirectTo, { contactApproval: field }));
}

