'use server';
import { revalidatePath } from 'next/cache';
import { INDUSTRIES, type Industry } from '@/domain/constants/industries';
import type { StockImageKind, StockHeroVariant } from '@/domain/models/stock-image';
import { createStockImage } from '@/domain/factories/stock-image.factory';
import {
  putStockImage,
  getStockImageById,
  deleteStockImageById,
  listStockImages,
} from '@/lib/db/stock-images';
import { uploadStockImage, deleteStockImageObject } from '@/lib/s3/stock-images';
import { getSession } from '@/lib/auth/session';

const STOCK_IMAGES_PATH = '/admin/stock-images';

function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Upload — a flat photo gallery. Every file selected is uploaded as its own
// independent StockImage, tagged with the same kind/variant/industry chosen
// once for the whole batch — never paired with, or derived from, any other
// upload. A per-file failure doesn't block the rest of the batch.
// ---------------------------------------------------------------------------

export type StockImageFormState = { message?: string } | undefined;

export async function uploadStockImagesAction(
  _prevState: StockImageFormState,
  formData: FormData,
): Promise<StockImageFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const kind = formData.get('kind') as StockImageKind | null;
  if (kind !== 'hero' && kind !== 'general') {
    return { message: 'Choose an image type.' };
  }

  const variantRaw = (formData.get('variant') as string | null) ?? '';
  if (kind === 'hero' && variantRaw !== 'desktop' && variantRaw !== 'mobile') {
    return { message: 'Choose desktop or mobile for a hero image.' };
  }
  const variant: StockHeroVariant | undefined = kind === 'hero' ? (variantRaw as StockHeroVariant) : undefined;

  const industryRaw = ((formData.get('industry') as string | null) ?? '').trim();
  const industry = industryRaw && isIndustry(industryRaw) ? industryRaw : undefined;
  if (kind === 'hero' && !industry) {
    return { message: 'Choose an industry for a hero image.' };
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { message: 'Choose at least one image to upload.' };
  }

  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const id = crypto.randomUUID();
      const keyPrefix =
        kind === 'hero' ? `hero/${variant}/${industry}/${id}` : `general/${industry ?? 'uncategorized'}/${id}`;
      const image = await uploadStockImage(file, keyPrefix);
      const record = createStockImage({ kind, variant, industry, image, uploadedBy: session.sub });
      await putStockImage(record);
      uploaded += 1;
    } catch (err) {
      failed += 1;
      console.error('Failed to upload a stock image:', err instanceof Error ? err.message : err);
    }
  }

  revalidatePath(STOCK_IMAGES_PATH);
  if (failed > 0) {
    return { message: `Uploaded ${uploaded} image${uploaded === 1 ? '' : 's'}, ${failed} failed. Try re-uploading the failed one(s).` };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Archive / delete / set-default — simple button-triggered actions, not
// full forms. Archive is the primary (reversible) removal action; Delete
// also removes the underlying S3 object and is gated behind a confirm
// dialog client-side.
// ---------------------------------------------------------------------------

export type StockImageActionResult = { error: string } | undefined;

export async function archiveStockImageAction(stockImageId: string): Promise<StockImageActionResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const existing = await getStockImageById(stockImageId);
  if (!existing) return { error: 'Image not found' };

  await putStockImage({ ...existing, status: 'archived', isDefault: false, updatedAt: new Date().toISOString() });
  revalidatePath(STOCK_IMAGES_PATH);
  return undefined;
}

export async function deleteStockImageAction(stockImageId: string): Promise<StockImageActionResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const existing = await getStockImageById(stockImageId);
  if (!existing) return { error: 'Image not found' };

  await deleteStockImageObject(existing.image.s3Key);
  await deleteStockImageById(stockImageId);

  revalidatePath(STOCK_IMAGES_PATH);
  return undefined;
}

/**
 * Flags one stock image as the default auto-pick for its exact (industry,
 * kind, variant) group, unsetting `isDefault` on every other active sibling
 * first — an action-layer invariant, not schema-enforced, the same pattern
 * `MAX_BUSINESS_PHOTOS` already uses elsewhere. Setting a default desktop
 * image never touches the mobile group for the same industry, and vice
 * versa — the two are entirely independent groups.
 */
export async function setDefaultStockImageAction(stockImageId: string): Promise<StockImageActionResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const target = await getStockImageById(stockImageId);
  if (!target) return { error: 'Image not found' };

  const siblings = await listStockImages(target.industry ?? 'general', target.kind, target.variant);
  const now = new Date().toISOString();

  await Promise.all(
    siblings
      .filter((sibling) => sibling.isDefault && sibling.stockImageId !== target.stockImageId)
      .map((sibling) => putStockImage({ ...sibling, isDefault: false, updatedAt: now })),
  );
  await putStockImage({ ...target, isDefault: true, updatedAt: now });

  revalidatePath(STOCK_IMAGES_PATH);
  return undefined;
}
