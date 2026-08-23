import 'server-only';
import { putAsset, getAsset } from './assets';
import { validateImageUpload } from './upload-validation';
import { generateFaviconBuffer } from '@/lib/image/favicon';

/**
 * Business logo/photo upload helpers, shared by the business detail page's
 * Photo Manager actions (`addBusinessPhotosAction`, `deleteBusinessPhotoAction`,
 * `updateBusinessLogoAction`, `updatePhotosAction` — see `actions.ts`). Not a
 * Server Action module itself — every export of a `'use server'` file must
 * be an async action, so this plain helper lives in `lib/` instead of
 * being a private function duplicated in each `actions.ts` that needs it.
 */

/**
 * Client-filename-derived extension — kept only for `lib/s3/stock-images.ts`'s
 * own admin-only upload path (a separate, non-public-proxy bucket, out of
 * scope for the Stage 25 fix below). `uploadBusinessAsset` no longer uses
 * this — see `upload-validation.ts` for why trusting the client's filename/
 * `file.type` for a publicly-served asset is unsafe.
 */
export function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split('/').pop() || 'bin';
}

/**
 * Validates, then uploads, one image file under a business's asset prefix
 * and returns its public proxy URL. Exported (not just used internally by
 * `appendBusinessPhotos`) so callers that need to upload a single file
 * directly — a logo, or a photo straight into a specific section slot —
 * can reuse the same key structure and upload path.
 *
 * `keyPrefix` is the key *without* an extension — the extension is always
 * derived from the validated, actually-decoded image format, never from
 * the client-supplied filename or `file.type` (Stage 25 — Security
 * Hardening; see `upload-validation.ts`). Throws `UploadValidationError`
 * (import from `./upload-validation` to catch it specifically) if the file
 * is too large or isn't a decodable JPEG/PNG/WebP image.
 */
export async function uploadBusinessAsset(businessId: string, file: File, keyPrefix: string): Promise<string> {
  return (await uploadBusinessAssetWithBuffer(businessId, file, keyPrefix)).url;
}

/**
 * Same as `uploadBusinessAsset`, but also returns the decoded bytes —
 * for a call site that needs both the stored URL and the raw image data
 * without a second S3 round-trip (e.g. deriving a favicon from a freshly
 * uploaded logo, see `regenerateBusinessFavicon` below).
 */
export async function uploadBusinessAssetWithBuffer(
  businessId: string,
  file: File,
  keyPrefix: string,
): Promise<{ url: string; buffer: Buffer }> {
  const { buffer, contentType, extension } = await validateImageUpload(file);
  const key = `businesses/${businessId}/assets/${keyPrefix}.${extension}`;
  await putAsset(key, buffer, contentType);
  return { url: `/api/assets/${key}`, buffer };
}

/** Uploads already-decoded image bytes (not a form `File`) under a business's asset prefix. */
export async function putBusinessAssetBuffer(
  businessId: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
  keyPrefix: string,
): Promise<string> {
  const key = `businesses/${businessId}/assets/${keyPrefix}.${extension}`;
  await putAsset(key, buffer, contentType);
  return `/api/assets/${key}`;
}

/**
 * Derives a square browser-tab icon from a logo's decoded bytes and stores
 * it at a fixed key (`favicon.png`, always overwritten in place — same
 * convention as `logoUrl`'s fixed `logo` key) — one active favicon per
 * business. Callers are responsible for checking `Business.faviconSource`
 * isn't `'manual'` before calling this (see `actions.ts`/`photos.ts`).
 */
export async function regenerateBusinessFavicon(businessId: string, logoBuffer: Buffer): Promise<string> {
  const favicon = await generateFaviconBuffer(logoBuffer);
  return putBusinessAssetBuffer(businessId, favicon, 'image/png', 'png', 'favicon');
}

/**
 * Same as `regenerateBusinessFavicon`, but starting from an existing
 * `logoUrl` instead of bytes already in hand — used when "picking" an
 * existing photo as the logo (no fresh upload buffer exists) and by
 * "Reset to Auto". Returns `undefined` if the URL isn't one of our own
 * assets or the object is missing.
 */
export async function regenerateFaviconFromLogoUrl(businessId: string, logoUrl: string): Promise<string | undefined> {
  const key = assetKeyFromUrl(logoUrl);
  if (!key) return undefined;
  const buffer = await getAsset(key);
  if (!buffer) return undefined;
  return regenerateBusinessFavicon(businessId, buffer);
}

/**
 * Uploads a batch of new photo files under a business's canonical photos
 * prefix and appends them to `existingPhotoUrls`. Each new file gets a
 * random (collision-proof) filename — never a positional index — so a
 * later photo deletion can never free up a slot whose S3 key a subsequent
 * upload would silently reuse and overwrite. Callers are responsible for
 * enforcing `MAX_BUSINESS_PHOTOS` before calling this.
 */
export async function appendBusinessPhotos(
  businessId: string,
  existingPhotoUrls: string[],
  files: File[],
): Promise<string[]> {
  if (files.length === 0) return existingPhotoUrls;
  const uploaded = await Promise.all(
    files.map((file) => uploadBusinessAsset(businessId, file, `photos/${crypto.randomUUID()}`)),
  );
  return [...existingPhotoUrls, ...uploaded];
}

const ASSET_PROXY_PREFIX = '/api/assets/';

/**
 * Extracts the S3 key from a business asset's `/api/assets/{key}` proxy
 * URL, or `null` if the URL isn't one of ours. Used to recover the S3 key
 * of a photo the admin is deleting from `Business.photoUrls`.
 */
export function assetKeyFromUrl(url: string): string | null {
  return url.startsWith(ASSET_PROXY_PREFIX) ? url.slice(ASSET_PROXY_PREFIX.length) : null;
}
