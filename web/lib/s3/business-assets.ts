import 'server-only';
import { putAsset } from './assets';

/**
 * Business logo/photo upload helpers, shared by the business detail page's
 * Photo Manager actions (`addBusinessPhotosAction`, `deleteBusinessPhotoAction`,
 * `updateBusinessLogoAction`, `updatePhotosAction` — see `actions.ts`). Not a
 * Server Action module itself — every export of a `'use server'` file must
 * be an async action, so this plain helper lives in `lib/` instead of
 * being a private function duplicated in each `actions.ts` that needs it.
 */

export function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split('/').pop() || 'bin';
}

/**
 * Uploads one file under a business's asset prefix and returns its public
 * proxy URL. Exported (not just used internally by `appendBusinessPhotos`)
 * so callers that need to upload a single file directly — a logo, or a
 * photo straight into a specific section slot — can reuse the same key
 * structure and upload path.
 */
export async function uploadBusinessAsset(businessId: string, file: File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `businesses/${businessId}/assets/${filename}`;
  await putAsset(key, buffer, file.type || 'application/octet-stream');
  return `/api/assets/${key}`;
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
    files.map((file) => uploadBusinessAsset(businessId, file, `photos/${crypto.randomUUID()}.${fileExtension(file)}`)),
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
