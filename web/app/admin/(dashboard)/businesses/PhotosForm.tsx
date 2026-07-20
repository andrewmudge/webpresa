'use client';
import { useActionState, useState } from 'react';
import type { Business } from '@/domain/models/business';
import { FileField, PhotoPickerField, PhotoThumbnail, SubmitButton } from './FormFields';
import type { BusinessFormState } from './actions';

interface PhotosFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
  /**
   * Dimension-warning result for every uploaded photo (see
   * lib/image/hero-dimensions.ts), keyed by photo URL; `null` means that
   * photo is full-bleed eligible (no warning). Precomputed server-side for
   * *all* photos — not just the currently-saved hero pick — so the field
   * below can show the right warning immediately when the admin changes the
   * selection, without waiting for a save/reload.
   */
  heroPhotoWarnings?: Record<string, string | null>;
}

/**
 * Logo/photo uploads plus per-section photo-slot assignment. Split out of
 * the old monolithic BusinessForm so it can be its own wizard step (photos
 * need a `businessId` to upload against — see `lib/s3/business-assets.ts` —
 * so this form is never shown before a business record exists) and its own
 * inline card on the business detail page.
 */
export function PhotosForm({ action, defaults, submitLabel = 'Save', heroPhotoWarnings }: PhotosFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};
  const photoUrls = defaults?.photoUrls ?? [];

  // Tracks the Desktop hero image picker's current value client-side so the
  // warning below can update the instant the admin picks a different photo,
  // rather than only after the form is saved and the page reloads.
  const [selectedHeroPhotoUrl, setSelectedHeroPhotoUrl] = useState(defaults?.heroPhotoUrl ?? '');
  const resolvedHeroPhotoUrlForWarning =
    selectedHeroPhotoUrl === 'none' ? null : selectedHeroPhotoUrl || photoUrls[0];
  const heroPhotoWarning = resolvedHeroPhotoUrlForWarning
    ? heroPhotoWarnings?.[resolvedHeroPhotoUrlForWarning] ?? null
    : null;

  return (
    <form action={formAction} className="space-y-6">
      {state?.message && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileField label="Logo" name="logo" errors={errors.logo} currentUrl={defaults?.logoUrl} />
          <FileField
            label="Business photos"
            name="photos"
            multiple
            errors={errors.photos}
            currentUrls={photoUrls}
          />
        </div>
      </section>

      {/* Photo assignment — per-section override, plus a direct per-section
          upload so a forgotten photo (e.g. no hero image) can be added right
          here without going back to the "Business photos" field above. Only
          shown once at least one photo exists — on the wizard step this
          keeps it hidden until "Upload Photos" has actually been clicked
          once, rather than appearing before there's anything to assign. */}
      {photoUrls.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Photo Assignment</h2>
          <p className="text-xs text-gray-400 mb-3">
            Uploaded photos are assigned to sections automatically, in upload order. Override a
            section below to pin a specific photo there, upload a new one just for that section, or
            choose &quot;No photo&quot; to use that section&apos;s themed fallback instead.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            {photoUrls.map((url, i) => (
              <PhotoThumbnail key={url} url={url} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhotoPickerField
              label="Business logo"
              name="logoPhotoUrl"
              photoUrls={photoUrls}
              defaultValue=""
              errors={errors.logoPhotoUrl}
              hint={'Auto keeps the current logo (above) unchanged. Pick a photo — e.g. one imported from the business’s website — to use it as the logo instead, or "No photo" to remove the logo entirely.'}
            />
            <div>
              <PhotoPickerField
                label="Desktop hero image"
                name="heroPhotoUrl"
                photoUrls={photoUrls}
                defaultValue={defaults?.heroPhotoUrl}
                errors={errors.heroPhotoUrl}
                hint="For a full-width background, use a photo within 100px of 1920×1080 or 1600×900px. Other sizes will display alongside your text instead."
                onChange={setSelectedHeroPhotoUrl}
                uploadFieldName="heroPhotoFile"
              />
              {heroPhotoWarning && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {heroPhotoWarning}
                </p>
              )}
            </div>
            <PhotoPickerField
              label="Mobile hero image"
              name="heroPhotoUrlMobile"
              photoUrls={photoUrls}
              defaultValue={defaults?.heroPhotoUrlMobile}
              errors={errors.heroPhotoUrlMobile}
              hint='Optional — shown only on mobile, blended left-to-right so your headline stays legible. "Auto" and "No photo" both fall back to the theme illustration.'
              uploadFieldName="heroPhotoFileMobile"
            />
            <PhotoPickerField
              label="About Us section"
              name="aboutPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.aboutPhotoUrl}
              errors={errors.aboutPhotoUrl}
              uploadFieldName="aboutPhotoFile"
            />
            <PhotoPickerField
              label="Why Choose Us section"
              name="whyChooseUsPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.whyChooseUsPhotoUrl}
              errors={errors.whyChooseUsPhotoUrl}
              uploadFieldName="whyChooseUsPhotoFile"
            />
            <PhotoPickerField
              label="Featured service card"
              name="servicesPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.servicesPhotoUrl}
              errors={errors.servicesPhotoUrl}
              uploadFieldName="servicesPhotoFile"
            />
          </div>
        </section>
      )}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
