'use client';

import { useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { INDUSTRIES } from '@/domain/constants/industries';
import type { StockImage, StockImageKind } from '@/domain/models/stock-image';
import {
  uploadStockImageAction,
  archiveStockImageAction,
  deleteStockImageAction,
  setDefaultStockImageAction,
  type StockImageFormState,
} from './actions';

const KINDS: { value: StockImageKind; label: string }[] = [
  { value: 'hero', label: 'Hero image (desktop + optional mobile)' },
  { value: 'general', label: 'General stock photo' },
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

function UploadForm() {
  const [state, formAction] = useActionState<StockImageFormState, FormData>(uploadStockImageAction, undefined);
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
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

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
        <label htmlFor="desktopFile" className="block text-sm font-medium text-gray-700 mb-1">
          {kind === 'hero' ? 'Desktop image' : 'Image'}
        </label>
        <input
          id="desktopFile"
          name="desktopFile"
          type="file"
          accept="image/*"
          required
          className="block text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        {kind === 'hero' && (
          <p className="mt-1 text-xs text-gray-400">For a full-width background, use a photo within 100px of 1920×1080 or 1600×900px.</p>
        )}
      </div>

      {kind === 'hero' && (
        <div>
          <label htmlFor="mobileFile" className="block text-sm font-medium text-gray-700 mb-1">
            Mobile image <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="mobileFile"
            name="mobileFile"
            type="file"
            accept="image/*"
            className="block text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
          />
          <p className="mt-1 text-xs text-gray-400">
            A separate, independent image — not derived from the desktop image. Leave blank to show the
            desktop image on mobile too.
          </p>
        </div>
      )}

      <UploadSubmitButton />

      {state?.message && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.message}
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
      <div className="flex gap-2">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
          <Image src={image.desktop.url} alt="" fill className="object-cover" sizes="240px" />
        </div>
        {image.mobile && (
          <div className="relative w-16 shrink-0 aspect-[4/5] rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
            <Image src={image.mobile.url} alt="" fill className="object-cover" sizes="64px" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{(image.industry ?? 'general').replace(/_/g, ' ')}</span>
        <span className="uppercase tracking-wide text-gray-400">{image.kind}</span>
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

export function StockImagesPanel({ images }: { images: StockImage[] }) {
  const [industryFilter, setIndustryFilter] = useState('');

  const filtered = useMemo(
    () => (industryFilter ? images.filter((img) => (img.industry ?? 'general') === industryFilter) : images),
    [images, industryFilter],
  );

  return (
    <div className="space-y-6">
      <UploadForm />

      <div className="flex items-center gap-3">
        <label htmlFor="industryFilter" className="text-sm font-medium text-gray-700">
          Filter by industry
        </label>
        <select
          id="industryFilter"
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand)"
        >
          <option value="">All industries</option>
          <option value="general">General (uncategorized)</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No stock images {industryFilter ? 'for this industry' : 'yet'}.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((image) => (
            <StockImageCard key={image.stockImageId} image={image} />
          ))}
        </div>
      )}
    </div>
  );
}
