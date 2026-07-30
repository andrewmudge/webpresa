'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Shared photo-slot picker — select an already-uploaded photo for a
 * specific spot on the website (hero, about, etc.), or upload a brand-new
 * one directly into that slot. Renders as an actual thumbnail grid, same
 * visual language as the admin dashboard's `PhotoPickerField`
 * (`app/admin/(dashboard)/businesses/FormFields.tsx`) — a text dropdown
 * listing "Photo 1"/"Photo 2" gave no way to tell what you were actually
 * picking. A brand-colored border marks whichever thumbnail (or "Auto"/"No
 * photo") is currently selected.
 */
interface PhotoSlotPickerProps {
  label: string;
  fieldName: string;
  /** Omit for a picker with no direct-upload option (e.g. Logo). */
  uploadFieldName?: string;
  currentValue?: string;
  photoUrls: string[];
  disabled: boolean;
  /** Label for the "leave unset" pill — "Auto" for section slots, "Keep current" for Logo. */
  emptyLabel?: string;
}

export function PhotoSlotPicker({
  label,
  fieldName,
  uploadFieldName,
  currentValue,
  photoUrls,
  disabled,
  emptyLabel = 'Auto',
}: PhotoSlotPickerProps) {
  const [selected, setSelected] = useState(currentValue ?? '');

  function choose(value: string) {
    if (disabled) return;
    setSelected(value);
  }

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <input type="hidden" name={fieldName} value={selected} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose('')}
          disabled={disabled}
          className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            selected === '' ? 'border-(--color-brand) text-(--color-brand)' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {emptyLabel}
        </button>
        <button
          type="button"
          onClick={() => choose('none')}
          disabled={disabled}
          className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            selected === 'none' ? 'border-(--color-brand) text-(--color-brand)' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          No photo
        </button>
        {photoUrls.map((url, i) => (
          <button
            type="button"
            key={url}
            onClick={() => choose(url)}
            disabled={disabled}
            aria-label={`Photo ${i + 1}`}
            aria-pressed={selected === url}
            className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              // Two-tone selection ring, not just a colored border: a white
              // border hugging the photo stays visible over dark images, and
              // the brighter accent ring outside it stays visible over light
              // images and the card's own white background — a single dark
              // brand-blue border (the original treatment) disappeared
              // against dark photos.
              selected === url
                ? 'border-white ring-4 ring-(--color-accent)'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="64px" unoptimized />
          </button>
        ))}
      </div>
      {uploadFieldName && (
        <div className="mt-2">
          <label htmlFor={uploadFieldName} className="block text-xs text-gray-500 mb-1">
            Or upload a new photo
          </label>
          <input
            id={uploadFieldName}
            name={uploadFieldName}
            type="file"
            accept="image/*"
            disabled={disabled}
            className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-medium hover:file:bg-gray-200 disabled:opacity-50"
          />
        </div>
      )}
    </div>
  );
}
