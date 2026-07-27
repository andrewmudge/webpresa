import { listAllStockImages } from '@/lib/db/stock-images';
import { StockImagesPanel } from './StockImagesPanel';

export const dynamic = 'force-dynamic';

export default async function StockImagesPage() {
  let images: Awaited<ReturnType<typeof listAllStockImages>> = [];
  let loadError: string | undefined;

  try {
    images = await listAllStockImages();
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load stock images';
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Stock images</h1>
        <p className="text-sm text-gray-400 mt-1">
          Webpresa&apos;s curated photo gallery — filter by industry, then by hero images or general
          photos, then (for hero images) by desktop or mobile. Desktop and mobile are always independent
          photos, never cropped from one another. A business with no admin-chosen hero photo and no
          hero-dimensioned image found on its own site automatically falls back to the default desktop
          hero (and, separately, the default mobile hero) for its industry. Marking a new default replaces
          the automatic pick for future generations only — existing previews keep whatever they already
          resolved.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <StockImagesPanel images={images} />
    </div>
  );
}
