'use client';
import type { ChangeEvent } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { THEME_OPTIONS } from '@/lib/themes';

// ---------------------------------------------------------------------------
// Shared field helpers — used by BusinessDetailsForm, PhotosForm, and any
// future admin form. Extracted from the original monolithic BusinessForm so
// the wizard steps and the business detail page's inline edit cards can
// reuse the exact same inputs without duplicating markup.
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  errors?: string[];
  placeholder?: string;
}

export function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  errors,
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
      />
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

interface TextareaProps {
  label: string;
  name: string;
  defaultValue?: string;
  errors?: string[];
  placeholder?: string;
  rows?: number;
}

export function TextareaField({ label, name, defaultValue, errors, placeholder, rows = 3 }: TextareaProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
      />
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

interface FileProps {
  label: string;
  name: string;
  multiple?: boolean;
  errors?: string[];
  currentUrl?: string;
  currentUrls?: string[];
}

export function FileField({ label, name, multiple, errors, currentUrl, currentUrls }: FileProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
      />
      {currentUrl && (
        <p className="mt-1 text-xs text-gray-400">
          Current: <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="underline">view</a> — choose a file to replace it.
        </p>
      )}
      {currentUrls && currentUrls.length > 0 && (
        <p className="mt-1 text-xs text-gray-400">
          {currentUrls.length} photo{currentUrls.length === 1 ? '' : 's'} uploaded — choosing new files replaces all of them.
        </p>
      )}
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

interface SelectProps {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string;
  errors?: string[];
  required?: boolean;
}

export function SelectField({ label, name, options, defaultValue, errors, required }: SelectProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent bg-white"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

interface ThemeFieldProps {
  label: string;
  name: string;
  defaultValue?: string;
  errors?: string[];
}

/**
 * Brand Theme System override. Left on "Auto" (the default), the theme is
 * derived from the business's logo color or, absent a logo, from an
 * OpenAI personality-based pick — see `lib/theme/select-theme.ts`. Only
 * the 10 curated presets in `lib/themes.ts` are selectable here; there is
 * no free-color input, by design.
 */
export function ThemeField({ label, name, defaultValue, errors }: ThemeFieldProps) {
  return (
    <div className="md:col-span-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent bg-white"
      >
        <option value="">Auto — chosen from logo color or brand personality</option>
        {THEME_OPTIONS.map((t) => (
          <option key={t.name} value={t.name}>
            {t.displayName} — best for {t.bestFor.join(', ')}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-400">
        Regenerating a website always reuses the stored theme unless you change it here.
      </p>
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

interface PhotoSlotFieldProps {
  label: string;
  name: string;
  photoUrls: string[];
  defaultValue?: string;
  errors?: string[];
  /** Always-shown static guidance below the select, distinct from a live/situational warning. */
  hint?: string;
  /** Notified on every selection change — lets a client-side parent (e.g. a live per-photo warning) react before the form is submitted. Field stays uncontrolled (`defaultValue`) otherwise. */
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * Per-slot photo assignment override. "Auto" (default) keeps generation's
 * automatic upload-order assignment; "No photo" forces that section's
 * non-photo fallback (e.g. the hero's gradient/pattern background) even
 * though photos exist — useful when an uploaded photo doesn't suit that
 * section. Only rendered once at least one photo is uploaded.
 */
export function PhotoSlotField({ label, name, photoUrls, defaultValue, errors, hint, onChange }: PhotoSlotFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent bg-white"
      >
        <option value="">Auto (recommended)</option>
        <option value="none">No photo — use themed fallback</option>
        {photoUrls.map((url, i) => (
          <option key={url} value={url}>
            Photo {i + 1}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  );
}

export function PhotoThumbnail({ url, index }: { url: string; index: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
        <Image src={url} alt={`Photo ${index + 1}`} fill className="object-cover" sizes="64px" />
      </div>
      <span className="text-[11px] text-gray-400">Photo {index + 1}</span>
    </div>
  );
}

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-5 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}
