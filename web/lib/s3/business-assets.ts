import 'server-only';
import { putAsset } from './assets';

/**
 * Business logo/photo upload helpers, shared by `createBusinessAction`
 * (wizard step 1 no longer touches assets, but kept here for any future
 * caller) and the business detail page's `updatePhotosAction`. Not a
 * Server Action module itself — every export of a `'use server'` file must
 * be an async action, so this plain helper lives in `lib/` instead of
 * being a private function duplicated in each `actions.ts` that needs it.
 */

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split('/').pop() || 'bin';
}

async function uploadBusinessAsset(businessId: string, file: File, filename: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `businesses/${businessId}/assets/${filename}`;
  await putAsset(key, buffer, file.type || 'application/octet-stream');
  return `/api/assets/${key}`;
}

/**
 * Uploads any logo/photo files present in the form to S3 and returns the
 * resulting public proxy URLs. Returns an empty object for a field when no
 * new file was chosen, so callers can spread the result over existing
 * values without clobbering them.
 */
export async function uploadBusinessAssets(
  businessId: string,
  formData: FormData,
): Promise<{ logoUrl?: string; photoUrls?: string[] }> {
  const result: { logoUrl?: string; photoUrls?: string[] } = {};

  const logo = formData.get('logo');
  if (logo instanceof File && logo.size > 0) {
    result.logoUrl = await uploadBusinessAsset(businessId, logo, `logo.${fileExtension(logo)}`);
  }

  const photos = formData
    .getAll('photos')
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > 0) {
    result.photoUrls = await Promise.all(
      photos.map((file, i) => uploadBusinessAsset(businessId, file, `photos/${i}.${fileExtension(file)}`)),
    );
  }

  return result;
}
