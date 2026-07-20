'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
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

function ThemeSwatches({ colors }: { colors: string[] }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle mr-2">
      {colors.map((color, i) => (
        <span
          key={i}
          className="inline-block w-3.5 h-3.5 rounded-sm border border-black/10"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

/**
 * Brand Theme System override. Left on "Auto" (the default), the theme is
 * derived from the business's logo color or, absent a logo, from an
 * OpenAI personality-based pick — see `lib/theme/select-theme.ts`. Only
 * the 10 curated presets in `lib/themes.ts` are selectable here; there is
 * no free-color input, by design. A native `<select>` can't render color
 * swatches inside its options, so this is a custom dropdown instead,
 * backed by a hidden input for the actual submitted value — closed by
 * default, showing only the current selection, so the admin doesn't have
 * to scroll past all 10 presets just to see today's setting.
 */
export function ThemeField({ label, name, defaultValue, errors }: ThemeFieldProps) {
  const [selected, setSelected] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function choose(value: string) {
    setSelected(value);
    setOpen(false);
  }

  const selectedOption = THEME_OPTIONS.find((t) => t.name === selected);

  return (
    <div className="md:col-span-2 relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="hidden" name={name} value={selected} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center min-w-0">
          {selectedOption ? (
            <>
              <ThemeSwatches colors={[selectedOption.primary, selectedOption.accent, selectedOption.surface]} />
              <span className="font-medium text-gray-800 truncate">{selectedOption.displayName}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-gray-800">Auto</span>
              <span className="ml-2 text-xs text-gray-400 truncate">— chosen from logo color or brand personality</span>
            </>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1.5 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          <button
            type="button"
            onClick={() => choose('')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              selected === '' ? 'bg-(--color-brand)/10' : 'hover:bg-gray-50'
            }`}
          >
            <span className="font-medium text-gray-800">Auto</span>
            <span className="text-xs text-gray-400">— chosen from logo color or brand personality</span>
          </button>
          {THEME_OPTIONS.map((t) => (
            <button
              type="button"
              key={t.name}
              onClick={() => choose(t.name)}
              className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors ${
                selected === t.name ? 'bg-(--color-brand)/10' : 'hover:bg-gray-50'
              }`}
            >
              <ThemeSwatches colors={[t.primary, t.accent, t.surface]} />
              <span className="font-medium text-gray-800">{t.displayName}</span>
              <span className="ml-2 text-xs text-gray-400 truncate">— best for {t.bestFor.join(', ')}</span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400">
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

interface PhotoPickerFieldProps {
  label: string;
  name: string;
  photoUrls: string[];
  defaultValue?: string;
  errors?: string[];
  /** Always-shown static guidance below the picker, distinct from a live/situational warning. */
  hint?: string;
  /** Notified on every selection change — lets a client-side parent (e.g. a live per-photo warning) react before the form is submitted. */
  onChange?: (value: string) => void;
  /**
   * When provided, renders a compact file input for uploading a brand-new
   * photo directly into this slot — no need to go back to the main Photos
   * card first. A file chosen here always wins over whatever this picker's
   * buttons have selected (see `updatePhotosAction`).
   */
  uploadFieldName?: string;
}

/**
 * Per-slot photo assignment override, shown as an actual thumbnail grid
 * (not a text dropdown — "Photo 1"/"Photo 2" forced admins to scroll back up
 * to the uploaded-photos list to know what they were picking). "Auto"
 * (default) keeps generation's automatic upload-order assignment; "No
 * photo" forces that section's non-photo fallback even though photos exist.
 */
export function PhotoPickerField({
  label,
  name,
  photoUrls,
  defaultValue,
  errors,
  hint,
  onChange,
  uploadFieldName,
}: PhotoPickerFieldProps) {
  const [selected, setSelected] = useState(defaultValue ?? '');

  function choose(value: string) {
    setSelected(value);
    onChange?.(value);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="hidden" name={name} value={selected} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose('')}
          className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors ${
            selected === '' ? 'border-(--color-brand) text-(--color-brand)' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Auto
        </button>
        <button
          type="button"
          onClick={() => choose('none')}
          className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-colors ${
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
            aria-label={`Photo ${i + 1}`}
            aria-pressed={selected === url}
            className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
              selected === url ? 'border-(--color-brand)' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="64px" />
          </button>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {uploadFieldName && (
        <div className="mt-2">
          <label htmlFor={uploadFieldName} className="block text-xs text-gray-500 mb-1">
            Or upload a new photo for this section
          </label>
          <input
            id={uploadFieldName}
            name={uploadFieldName}
            type="file"
            accept="image/*"
            className="block w-full text-xs text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-medium hover:file:bg-gray-200"
          />
        </div>
      )}
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
