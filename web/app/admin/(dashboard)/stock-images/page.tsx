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
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Stock images</h1>
        <p className="text-sm text-gray-400 mt-1">
          Webpresa&apos;s curated hero-image library. A business with no admin-chosen hero photo and no
          hero-dimensioned image found on its own site automatically falls back to the default set for its
          industry. Uploading a new default replaces the automatic pick for future generations only —
          existing previews keep whatever they already resolved.
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
