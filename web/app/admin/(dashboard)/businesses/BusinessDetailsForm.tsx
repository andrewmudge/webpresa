'use client';
import { useActionState } from 'react';
import { INDUSTRIES } from '@/domain/constants/industries';
import { BRAND_TONES } from '@/domain/constants/brand-tone';
import type { Business } from '@/domain/models/business';
import { Field, TextareaField, SelectField, SubmitButton } from './FormFields';
import type { BusinessFormState } from './actions';

interface BusinessDetailsFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
  /** Shows a dev-only "Autofill test data" button — only passed from the "New business" wizard step. */
  showAutofillButton?: boolean;
}

function randomFrom<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

/** Fills every field with plausible test data, purely to speed up repeated manual testing of this form. */
function buildAutofillData() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return {
    name: `Test Plumbing Co ${n}`,
    industry: randomFrom(INDUSTRIES),
    legalName: `Test Plumbing Co ${n} LLC`,
    phone: '512-555-0100',
    email: `test${n}@example.com`,
    websiteUrl: 'https://example.com',
    googlePlaceId: '',
    addressLine1: '123 Main St',
    addressCity: 'Austin',
    addressState: 'TX',
    addressPostalCode: '78701',
    servicesOffered: 'Drain cleaning\nWater heater repair\nLeak detection and repair',
    serviceAreas: 'Austin\nRound Rock\nCedar Park',
    description:
      'A locally owned company serving the Austin metro area for over a decade with honest pricing and reliable, professional service.',
    differentiators: 'Same-day service\nUpfront flat-rate pricing\nLicensed and insured technicians',
    brandTone: randomFrom(BRAND_TONES),
    notes: 'Autofilled test data — for development testing only.',
  };
}

function setFormValue(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.value = value;
  }
}

function AutofillButton() {
  return (
    <button
      type="button"
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        const data = buildAutofillData();
        for (const [key, value] of Object.entries(data)) {
          setFormValue(form, key, value);
        }
      }}
      className="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
    >
      Autofill test data
    </button>
  );
}

/**
 * All the free-text business fields — identity, contact, address, and the
 * Stage 11 website-generation inputs, stopping at "Additional notes". Theme
 * and admin metadata (source/status) are their own narrow cards/forms — see
 * `ThemeForm` and `AdminFieldsForm` — so saving this card can never clobber
 * those fields. Deliberately excludes logo/photo uploads and photo-slot
 * assignment (see `PhotosForm`) so it can post as a plain, file-free
 * request: used both as wizard step 1 (creating a new business) and as the
 * business detail page's inline "Business Details" card.
 */
export function BusinessDetailsForm({ action, defaults, submitLabel = 'Save', showAutofillButton }: BusinessDetailsFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {showAutofillButton && (
        <div className="flex justify-end">
          <AutofillButton />
        </div>
      )}

      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Identity */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business name" name="name" required defaultValue={defaults?.name} errors={errors.name} />
          <SelectField
            label="Industry"
            name="industry"
            options={INDUSTRIES}
            defaultValue={defaults?.industry}
            required
            errors={errors.industry}
          />
          <Field label="Legal name" name="legalName" defaultValue={defaults?.legalName} errors={errors.legalName} />
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Contact</h2>
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
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Address</h2>
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
          <Field
            label="Postal code"
            name="addressPostalCode"
            defaultValue={defaults?.address?.postalCode}
            errors={errors.addressPostalCode}
          />
        </div>
      </section>

      {/* Website generation — feeds Stage 11 AI generation, not required at creation time */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Website Generation</h2>
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
            <TextareaField label="Additional notes" name="notes" defaultValue={defaults?.notes} errors={errors.notes} />
          </div>
        </div>
      </section>

      {/* Social links — admin-entered, always wins over whatever Firecrawl
          discovers on a scrape (see generatePreviewContent). */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Social Links</h2>
        <TextareaField
          label="Social profile URLs"
          name="socialLinks"
          placeholder={'One URL per line, up to 6\ne.g. https://facebook.com/yourbusiness\nhttps://instagram.com/yourbusiness'}
          defaultValue={defaults?.socialLinks?.join('\n')}
          errors={errors.socialLinks}
        />
      </section>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
