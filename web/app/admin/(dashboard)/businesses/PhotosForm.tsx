'use client';
import { useActionState } from 'react';
import type { Business } from '@/domain/models/business';
import { FileField, PhotoSlotField, PhotoThumbnail, SubmitButton } from './FormFields';
import type { BusinessFormState } from './actions';

interface PhotosFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  defaults?: Partial<Business>;
  submitLabel?: string;
}

/**
 * Logo/photo uploads plus per-section photo-slot assignment. Split out of
 * the old monolithic BusinessForm so it can be its own wizard step (photos
 * need a `businessId` to upload against — see `lib/s3/business-assets.ts` —
 * so this form is never shown before a business record exists) and its own
 * inline card on the business detail page.
 */
export function PhotosForm({ action, defaults, submitLabel = 'Save' }: PhotosFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};
  const photoUrls = defaults?.photoUrls ?? [];

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

      {/* Photo assignment — optional per-section override; only meaningful once photos already exist */}
      {photoUrls.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Photo Assignment</h2>
          <p className="text-xs text-gray-400 mb-3">
            Uploaded photos are assigned to sections automatically, in upload order. Override a
            section below to pin a specific photo there, or choose &quot;No photo&quot; to use
            that section&apos;s themed fallback instead.
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            {photoUrls.map((url, i) => (
              <PhotoThumbnail key={url} url={url} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PhotoSlotField
              label="Hero background"
              name="heroPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.heroPhotoUrl}
              errors={errors.heroPhotoUrl}
            />
            <PhotoSlotField
              label="About Us section"
              name="aboutPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.aboutPhotoUrl}
              errors={errors.aboutPhotoUrl}
            />
            <PhotoSlotField
              label="Why Choose Us section"
              name="whyChooseUsPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.whyChooseUsPhotoUrl}
              errors={errors.whyChooseUsPhotoUrl}
            />
            <PhotoSlotField
              label="Featured service card"
              name="servicesPhotoUrl"
              photoUrls={photoUrls}
              defaultValue={defaults?.servicesPhotoUrl}
              errors={errors.servicesPhotoUrl}
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
