'use client';

import { useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { INDUSTRIES } from '@/domain/constants/industries';
import type { StockImage, StockImageKind, StockHeroVariant } from '@/domain/models/stock-image';
import {
  uploadStockImagesAction,
  archiveStockImageAction,
  deleteStockImageAction,
  setDefaultStockImageAction,
  type StockImageFormState,
} from './actions';

const KIND_OPTIONS: { value: StockImageKind; label: string }[] = [
  { value: 'hero', label: 'Hero image' },
  { value: 'general', label: 'General stock photo' },
];

const VARIANT_OPTIONS: { value: StockHeroVariant; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
];

function UploadSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Uploading…' : 'Upload'}
    </button>
  );
}

/**
 * Upload form for a batch of photos — every file selected is uploaded as
 * its own independent StockImage, all tagged with the same kind/variant/
 * industry chosen once here. Desktop and mobile are separate uploads:
 * pick "Desktop" and upload desktop photos, then come back and pick
 * "Mobile" for mobile photos — nothing here ever pairs or derives one from
 * the other.
 */
function UploadForm() {
  const [state, formAction] = useActionState<StockImageFormState, FormData>(uploadStockImagesAction, undefined);
  const [kind, setKind] = useState<StockImageKind>('hero');

  return (
    <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-wrap gap-4 items-end">
      <div>
        <label htmlFor="kind" className="block text-sm font-medium text-gray-700 mb-1">
          Image type
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as StockImageKind)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      {kind === 'hero' && (
        <div>
          <label htmlFor="variant" className="block text-sm font-medium text-gray-700 mb-1">
            Desktop or mobile
          </label>
          <select
            id="variant"
            name="variant"
            defaultValue="desktop"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
          >
            {VARIANT_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
          Industry {kind === 'general' && <span className="text-gray-400 font-normal">(optional)</span>}
        </label>
        <select
          id="industry"
          name="industry"
          required={kind === 'hero'}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        >
          {kind === 'general' && <option value="">Uncategorized</option>}
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-1">
          Photos
        </label>
        <input
          id="files"
          name="files"
          type="file"
          accept="image/*"
          multiple
          required
          className="block text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
      </div>

      <UploadSubmitButton />

      {state?.message && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.message}
        </p>
      )}

      {kind === 'hero' && (
        <p className="w-full text-xs text-gray-400">
          Uploaded as-is, no cropping. For a full-width desktop background, use photos within 100px of
          1920×1080 or 1600×900px.
        </p>
      )}
    </form>
  );
}

function RowActionButton({
  label,
  pendingLabel,
  onRun,
  danger,
}: {
  label: string;
  pendingLabel: string;
  onRun: () => Promise<{ error: string } | undefined>;
  danger?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await onRun();
            if (result?.error) setError(result.error);
          });
        }}
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
          danger
            ? 'border-red-200 bg-white text-red-600 hover:bg-red-50'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        {isPending ? pendingLabel : label}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function StockImageCard({ image }: { image: StockImage }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div
        className={`relative w-full rounded-lg overflow-hidden border border-gray-100 bg-gray-50 ${
          image.variant === 'mobile' ? 'aspect-[4/5]' : 'aspect-video'
        }`}
      >
        <Image src={image.image.url} alt="" fill className="object-cover" sizes="240px" />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{(image.industry ?? 'general').replace(/_/g, ' ')}</span>
        <span className="uppercase tracking-wide text-gray-400">
          {image.kind === 'hero' ? `Hero · ${image.variant}` : 'General'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {image.status === 'archived' && (
          <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[11px] font-medium">Archived</span>
        )}
        {image.isDefault && image.status === 'active' && (
          <span className="rounded-full bg-(--color-brand)/10 text-(--color-brand) px-2 py-0.5 text-[11px] font-medium">
            Default
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-1">
        {image.status === 'active' && !image.isDefault && image.kind === 'hero' && (
          <RowActionButton
            label="Set as default"
            pendingLabel="Setting…"
            onRun={() => setDefaultStockImageAction(image.stockImageId)}
          />
        )}
        {image.status === 'active' && (
          <RowActionButton
            label="Archive"
            pendingLabel="Archiving…"
            onRun={() => archiveStockImageAction(image.stockImageId)}
          />
        )}
        <RowActionButton
          label="Delete"
          pendingLabel="Deleting…"
          danger
          onRun={() => {
            if (!confirm('Permanently delete this image? This cannot be undone.')) {
              return Promise.resolve(undefined);
            }
            return deleteStockImageAction(image.stockImageId);
          }}
        />
      </div>
    </div>
  );
}

/**
 * The gallery filter hierarchy is deliberately industry → kind → variant,
 * matching how the auto hero-pick actually looks images up: an industry's
 * default desktop hero and default mobile hero are independent settings,
 * so the variant filter only appears once "Hero images" is selected.
 */
export function StockImagesPanel({ images }: { images: StockImage[] }) {
  const [industryFilter, setIndustryFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<'' | StockImageKind>('');
  const [variantFilter, setVariantFilter] = useState<'' | StockHeroVariant>('');

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
    <div className="space-y-6">
      <UploadForm />

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="industryFilter" className="block text-xs font-medium text-gray-500 mb-1">
            Industry
          </label>
          <select
            id="industryFilter"
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
          <label htmlFor="kindFilter" className="block text-xs font-medium text-gray-500 mb-1">
            Type
          </label>
          <select
            id="kindFilter"
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
            <label htmlFor="variantFilter" className="block text-xs font-medium text-gray-500 mb-1">
              Desktop or mobile
            </label>
            <select
              id="variantFilter"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((image) => (
            <StockImageCard key={image.stockImageId} image={image} />
          ))}
        </div>
      )}
    </div>
  );
}
