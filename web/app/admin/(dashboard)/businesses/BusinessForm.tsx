'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import type { Business } from '@/domain/models/business';
import { THEME_OPTIONS } from '@/lib/themes';
import type { BusinessFormState } from './actions';

// ---------------------------------------------------------------------------
// Field helpers
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

function Field({
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
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent"
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

function TextareaField({ label, name, defaultValue, errors, placeholder, rows = 3 }: TextareaProps) {
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
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent"
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

function FileField({ label, name, multiple, errors, currentUrl, currentUrls }: FileProps) {
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

function SelectField({ label, name, options, defaultValue, errors, required }: SelectProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent bg-white"
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
function ThemeField({ label, name, defaultValue, errors }: ThemeFieldProps) {
  return (
    <div className="md:col-span-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent bg-white"
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

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------

function SubmitButton({ label }: { label: string }) {
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

// ---------------------------------------------------------------------------
// BusinessForm
// ---------------------------------------------------------------------------

interface BusinessFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
}

export function BusinessForm({ action, defaults, submitLabel = 'Save' }: BusinessFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);

  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {/* Global error */}
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Identity */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Business name"
            name="name"
            required
            defaultValue={defaults?.name}
            errors={errors.name}
          />
          <SelectField
            label="Industry"
            name="industry"
            options={INDUSTRIES}
            defaultValue={defaults?.industry}
            required
            errors={errors.industry}
          />
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Contact
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone" name="phone" type="tel" defaultValue={defaults?.phone} errors={errors.phone} />
          <Field label="Email" name="email" type="email" defaultValue={defaults?.email} errors={errors.email} />
          <div className="md:col-span-2">
            <Field
              label="Existing website URL"
              name="websiteUrl"
              type="url"
              placeholder="https://example.com"
              defaultValue={defaults?.websiteUrl}
              errors={errors.websiteUrl}
            />
          </div>
          <div className="md:col-span-2">
            <Field
              label="Google Place ID"
              name="googlePlaceId"
              placeholder="ChIJ..."
              defaultValue={defaults?.googlePlaceId}
              errors={errors.googlePlaceId}
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Address
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field
              label="Street address"
              name="addressLine1"
              defaultValue={defaults?.address?.line1}
              errors={errors.addressLine1}
            />
          </div>
          <Field label="City" name="addressCity" defaultValue={defaults?.address?.city} errors={errors.addressCity} />
          <Field label="State" name="addressState" defaultValue={defaults?.address?.state} errors={errors.addressState} />
          <Field label="Postal code" name="addressPostalCode" defaultValue={defaults?.address?.postalCode} errors={errors.addressPostalCode} />
        </div>
      </section>

      {/* Website generation — feeds Stage 11 AI generation, not required at creation time */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Website Generation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextareaField
            label="Services offered"
            name="servicesOffered"
            placeholder={'One service per line\ne.g. Drain cleaning\nWater heater repair'}
            defaultValue={defaults?.servicesOffered}
            errors={errors.servicesOffered}
          />
          <TextareaField
            label="Service areas"
            name="serviceAreas"
            placeholder={'One area per line\ne.g. Austin\nRound Rock'}
            defaultValue={defaults?.serviceAreas}
            errors={errors.serviceAreas}
          />
          <div className="md:col-span-2">
            <TextareaField
              label="Business description"
              name="description"
              defaultValue={defaults?.description}
              errors={errors.description}
            />
          </div>
          <div className="md:col-span-2">
            <TextareaField
              label="Differentiators"
              name="differentiators"
              placeholder="One per line"
              defaultValue={defaults?.differentiators}
              errors={errors.differentiators}
            />
          </div>
          <SelectField
            label="Brand tone"
            name="brandTone"
            options={BRAND_TONES}
            defaultValue={defaults?.brandTone}
            errors={errors.brandTone}
          />
          <div className="md:col-span-2">
            <TextareaField
              label="Additional notes"
              name="notes"
              defaultValue={defaults?.notes}
              errors={errors.notes}
            />
          </div>
          <ThemeField
            label="Theme"
            name="theme"
            defaultValue={defaults?.theme}
            errors={errors.theme}
          />
        </div>
      </section>

      {/* Assets — optional logo/photo uploads used as hero material by Stage 11 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Assets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileField label="Logo" name="logo" errors={errors.logo} currentUrl={defaults?.logoUrl} />
          <FileField
            label="Business photos"
            name="photos"
            multiple
            errors={errors.photos}
            currentUrls={defaults?.photoUrls}
          />
        </div>
      </section>

      {/* Admin metadata */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Admin
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="Source"
            name="source"
            options={BUSINESS_SOURCES}
            defaultValue={defaults?.source ?? 'manual'}
            errors={errors.source}
          />
          {defaults?.status && (
            <SelectField
              label="Status"
              name="status"
              options={BUSINESS_STATUSES}
              defaultValue={defaults.status}
              errors={errors.status}
            />
          )}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
