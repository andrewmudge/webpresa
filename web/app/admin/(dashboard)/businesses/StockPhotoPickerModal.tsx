'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { INDUSTRIES } from '@/domain/constants/industries';
import type { Industry } from '@/domain/constants/industries';
import type { StockImage, StockImageKind, StockHeroVariant } from '@/domain/models/stock-image';

const VARIANT_OPTIONS: { value: StockHeroVariant; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
];

interface StockPhotoPickerModalProps {
  /** Every image this picker may show — callers pre-filter to `status === 'active'`. */
  images: StockImage[];
  triggerLabel?: string;
  initialKind: StockImageKind;
  initialVariant?: StockHeroVariant;
  defaultIndustry?: Industry;
  onSelect: (url: string) => void;
}

function SelectableStockImageCard({ image, onPick }: { image: StockImage; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="text-left bg-white rounded-xl border border-gray-200 hover:border-(--color-brand) transition-colors overflow-hidden group"
    >
      <div
        className={`relative w-full bg-gray-50 ${image.variant === 'mobile' ? 'aspect-[4/5]' : 'aspect-video'}`}
      >
        <Image src={image.image.url} alt="" fill className="object-cover" sizes="200px" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-gray-500">
        <span className="capitalize truncate">{(image.industry ?? 'general').replace(/_/g, ' ')}</span>
        <span className="uppercase tracking-wide text-gray-400 shrink-0 ml-1">
          {image.kind === 'hero' ? image.variant : 'General'}
        </span>
      </div>
    </button>
  );
}

/**
 * "Explore our stock photos" — a button that opens a filterable gallery
 * modal so an admin can hand-pick a specific stock photo for one photo
 * slot, alongside the existing "upload your own" file input. Purely a
 * client-side picker: `onSelect` receives the chosen image's CloudFront URL
 * and is expected to feed straight into the same `choose()` function a
 * PhotoPickerField already uses for its own-photo thumbnails — no Server
 * Action, no persistence here at all.
 *
 * Opens pre-filtered to `initialKind`/`initialVariant`/`defaultIndustry`
 * (matching whichever slot it was opened from), but every filter stays
 * fully changeable so any slot can browse the entire gallery.
 */
export function StockPhotoPickerModal({
  images,
  triggerLabel = 'Explore our stock photos',
  initialKind,
  initialVariant,
  defaultIndustry,
  onSelect,
}: StockPhotoPickerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [industryFilter, setIndustryFilter] = useState<string>(defaultIndustry ?? '');
  const [kindFilter, setKindFilter] = useState<'' | StockImageKind>(initialKind);
  const [variantFilter, setVariantFilter] = useState<'' | StockHeroVariant>(initialVariant ?? '');

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function open() {
    // Re-seed every time — a previous open may have changed filters
    // without picking anything, but the next open should still start
    // scoped to this field's own slot.
    setIndustryFilter(defaultIndustry ?? '');
    setKindFilter(initialKind);
    setVariantFilter(initialVariant ?? '');
    setIsOpen(true);
  }

  const filtered = useMemo(
    () =>
      images.filter((img) => {
        if (industryFilter && (img.industry ?? 'general') !== industryFilter) return false;
        if (kindFilter && img.kind !== kindFilter) return false;
        if (kindFilter === 'hero' && variantFilter && img.variant !== variantFilter) return false;
        return true;
      }),
    [images, industryFilter, kindFilter, variantFilter],
  );

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-xs font-medium text-(--color-brand) hover:underline"
      >
        {triggerLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Explore stock photos"
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-semibold text-gray-900">Explore our stock photos</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {images.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No stock photos have been uploaded yet — add some at{' '}
                  <Link href="/admin/stock-images" className="text-(--color-brand) hover:underline">
                    /admin/stock-images
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div>
                      <label htmlFor="stockPickerIndustry" className="block text-xs font-medium text-gray-500 mb-1">
                        Industry
                      </label>
                      <select
                        id="stockPickerIndustry"
                        value={industryFilter}
                        onChange={(e) => setIndustryFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                      >
                        <option value="">All industries</option>
                        <option value="general">Uncategorized</option>
                        {INDUSTRIES.map((industry) => (
                          <option key={industry} value={industry}>
                            {industry.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="stockPickerKind" className="block text-xs font-medium text-gray-500 mb-1">
                        Type
                      </label>
                      <select
                        id="stockPickerKind"
                        value={kindFilter}
                        onChange={(e) => {
                          setKindFilter(e.target.value as '' | StockImageKind);
                          setVariantFilter('');
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                      >
                        <option value="">All types</option>
                        <option value="hero">Hero images</option>
                        <option value="general">General photos</option>
                      </select>
                    </div>

                    {kindFilter === 'hero' && (
                      <div>
                        <label htmlFor="stockPickerVariant" className="block text-xs font-medium text-gray-500 mb-1">
                          Desktop or mobile
                        </label>
                        <select
                          id="stockPickerVariant"
                          value={variantFilter}
                          onChange={(e) => setVariantFilter(e.target.value as '' | StockHeroVariant)}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
                        >
                          <option value="">Both</option>
                          {VARIANT_OPTIONS.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <p className="text-sm text-gray-400">No stock images match these filters.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filtered.map((image) => (
                        <SelectableStockImageCard
                          key={image.stockImageId}
                          image={image}
                          onPick={() => {
                            onSelect(image.image.url);
                            setIsOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
