'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BUSINESS_SOURCES, BUSINESS_STATUSES } from '@/domain/models/business';
import type { Business } from '@/domain/models/business';
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
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent"
      />
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
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[--color-brand] focus:border-transparent bg-white"
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

// ---------------------------------------------------------------------------
// Submit button
// ---------------------------------------------------------------------------

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[--color-brand] text-white px-5 py-2 text-sm font-medium hover:bg-[--color-brand-dark] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
