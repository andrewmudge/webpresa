'use client';
import { useRef } from 'react';
import type { ScanImageAsset } from '@/domain/models/scan-image';

/**
 * Checkbox grid + select-all/none toggle for batch-promoting scan-discovered
 * images into the canonical Business photo library. Shared by the scan
 * detail page and the business detail page's Photos card — both bind the
 * same `approveScanImagesAction` and only differ in which images they pass
 * in and where they redirect back to.
 *
 * The "select all/none" buttons are plain DOM toggles scoped to this
 * component's own checkboxes (via a ref), not React-controlled state —
 * simpler than lifting per-checkbox state, and the checkboxes still submit
 * normally as uncontrolled form inputs.
 */
export function ScanImageApprovalGrid({
  images,
  action,
}: {
  images: { image: ScanImageAsset; scanId: string }[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function setAll(checked: boolean) {
    const boxes = formRef.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="images"]');
    boxes?.forEach((box) => {
      box.checked = checked;
    });
  }

  return (
    <form ref={formRef} action={action}>
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="text-xs font-medium text-(--color-brand) hover:underline"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="text-xs font-medium text-gray-500 hover:underline"
        >
          Select none
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {images.map(({ image, scanId }) => (
          <label
            key={image.imageId}
            className={`relative rounded-lg border overflow-hidden cursor-pointer ${
              image.promotedPhotoUrl ? 'border-green-200 opacity-60' : 'border-gray-200 hover:border-(--color-brand)'
            }`}
          >
            <input
              type="checkbox"
              name="images"
              value={`${scanId}::${image.imageId}`}
              disabled={!!image.promotedPhotoUrl}
              defaultChecked={false}
              className="absolute top-2 left-2 z-10 h-4 w-4 rounded border-gray-300 accent-(--color-brand)"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.originalUrl} className="w-full h-24 object-cover bg-white" />
            <div className="p-2 text-xs space-y-0.5">
              <div className="font-medium capitalize">
                {image.role} <span className="opacity-60">· {image.status.replace(/_/g, ' ')}</span>
              </div>
              {image.width && image.height && (
                <div className="opacity-60">
                  {image.width}×{image.height}px
                </div>
              )}
              {image.promotedPhotoUrl && <div className="text-green-700 font-medium">✓ Added to Photos</div>}
            </div>
          </label>
        ))}
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors"
      >
        Add Selected to Photos
      </button>
    </form>
  );
}
