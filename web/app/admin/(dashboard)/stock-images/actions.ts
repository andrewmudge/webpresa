'use server';
import { revalidatePath } from 'next/cache';
import { INDUSTRIES, type Industry } from '@/domain/constants/industries';
import type { StockImageKind } from '@/domain/models/stock-image';
import { createStockHeroSet, createGeneralStockImage } from '@/domain/factories/stock-image.factory';
import {
  putStockImage,
  getStockImageById,
  deleteStockImageById,
  listStockImagesByIndustry,
} from '@/lib/db/stock-images';
import { uploadStockHeroSet, uploadGeneralStockImage, deleteStockImageObject } from '@/lib/s3/stock-images';
import { getSession } from '@/lib/auth/session';

const STOCK_IMAGES_PATH = '/admin/stock-images';

function isIndustry(value: string): value is Industry {
  return (INDUSTRIES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Upload — branches by kind: 'hero' takes a required desktop image and an
// optional, entirely independent mobile image (two separate file inputs —
// never one image cropped to produce the other, see build_log.md); 'general'
// stores a single image as-is for the Phase 2 browsable library (unused by
// any auto-pick tier today).
// ---------------------------------------------------------------------------

export type StockImageFormState = { message?: string } | undefined;

export async function uploadStockImageAction(
  _prevState: StockImageFormState,
  formData: FormData,
): Promise<StockImageFormState> {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized' };

  const kind = formData.get('kind') as StockImageKind | null;
  if (kind !== 'hero' && kind !== 'general') {
    return { message: 'Choose an image type.' };
  }

  const industryRaw = ((formData.get('industry') as string | null) ?? '').trim();
  const industry = industryRaw && isIndustry(industryRaw) ? industryRaw : undefined;
  if (kind === 'hero' && !industry) {
    return { message: 'Choose an industry for a hero image set.' };
  }

  const desktopFile = formData.get('desktopFile');
  if (!(desktopFile instanceof File) || desktopFile.size === 0) {
    return { message: 'Choose a desktop image to upload.' };
  }
  const mobileFileEntry = formData.get('mobileFile');
  const mobileFile = mobileFileEntry instanceof File && mobileFileEntry.size > 0 ? mobileFileEntry : null;

  try {
    if (kind === 'hero' && industry) {
      const { desktop, mobile } = await uploadStockHeroSet(desktopFile, mobileFile, industry);
      const record = createStockHeroSet({ industry, desktop, mobile, uploadedBy: session.sub });
      await putStockImage(record);
    } else {
      const desktop = await uploadGeneralStockImage(desktopFile, industry);
      const record = createGeneralStockImage({ industry, desktop, uploadedBy: session.sub });
      await putStockImage(record);
    }
  } catch (err) {
    console.error('Failed to upload stock image:', err instanceof Error ? err.message : err);
    return { message: 'Failed to upload image. Please try again.' };
  }

  revalidatePath(STOCK_IMAGES_PATH);
  return undefined;
}

// ---------------------------------------------------------------------------
// Archive / delete / set-default — simple button-triggered actions, not
// full forms. Archive is the primary (reversible) removal action; Delete
// also removes the underlying S3 objects and is gated behind a confirm
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

  await deleteStockImageObject(existing.desktop.s3Key);
  if (existing.mobile) await deleteStockImageObject(existing.mobile.s3Key);
  await deleteStockImageById(stockImageId);

  revalidatePath(STOCK_IMAGES_PATH);
  return undefined;
}

/**
 * Flags one stock image as the default auto-pick for its (industry, kind)
 * group, unsetting `isDefault` on every other active sibling first — an
 * action-layer invariant, not schema-enforced, the same pattern
 * `MAX_BUSINESS_PHOTOS` already uses elsewhere.
 */
export async function setDefaultStockImageAction(stockImageId: string): Promise<StockImageActionResult> {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const target = await getStockImageById(stockImageId);
  if (!target) return { error: 'Image not found' };

  const siblings = await listStockImagesByIndustry(target.industry ?? 'general', target.kind);
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
