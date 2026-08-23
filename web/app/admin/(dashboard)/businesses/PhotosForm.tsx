'use client';
import { useActionState, useState } from 'react';
import type { Business } from '@/domain/models/business';
import type { StockImage } from '@/domain/models/stock-image';
import { PhotoPickerField, SubmitButton } from './FormFields';
import { PhotoManager } from './PhotoManager';
import type { BusinessFormState } from './actions';
import type { PhotoManagerState } from './[businessId]/actions';

type PhotoManagerAction = (prevState: PhotoManagerState, formData: FormData) => Promise<PhotoManagerState>;

interface PhotosFormProps {
  action: (prevState: BusinessFormState, formData: FormData) => Promise<BusinessFormState>;
  addPhotosAction: PhotoManagerAction;
  deletePhotoAction: PhotoManagerAction;
  updateLogoAction: PhotoManagerAction;
  updateFaviconAction: PhotoManagerAction;
  resetFaviconAction: PhotoManagerAction;
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
  /** Every active stock image — pre-filtered to `status: 'active'` by the caller. Powers the "Explore our stock photos" picker on every slot except the logo. */
  stockImages: StockImage[];
}

/**
 * Logo/photo uploads (via PhotoManager — instant, no separate save step)
 * plus per-section photo-slot assignment (the form below, saved via the
 * bound `action`). Split out of the old monolithic BusinessForm so it can
 * be its own wizard step (photos need a `businessId` to upload against —
 * see `lib/s3/business-assets.ts` — so this form is never shown before a
 * business record exists) and its own inline card on the business detail
 * page.
 */
export function PhotosForm({
  action,
  addPhotosAction,
  deletePhotoAction,
  updateLogoAction,
  updateFaviconAction,
  resetFaviconAction,
  defaults,
  submitLabel = 'Save',
  heroPhotoWarnings,
  stockImages,
}: PhotosFormProps) {
  const [state, formAction] = useActionState<BusinessFormState, FormData>(action, undefined);
  const errors = state?.errors ?? {};

  // The single source of truth for what PhotoManager and the Photo
  // Assignment pickers below both see — seeded once from `defaults`, then
  // written only by PhotoManager's own callbacks (never re-synced from
  // props after mount), so a `router.refresh()` following an upload/delete
  // can never clobber a just-applied optimistic update.
  const [photoUrls, setPhotoUrls] = useState<string[]>(defaults?.photoUrls ?? []);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(defaults?.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState<string | undefined>(defaults?.faviconUrl);
  const [faviconSource, setFaviconSource] = useState<'auto' | 'manual' | undefined>(defaults?.faviconSource);

  // Tracks the Desktop hero image picker's current value client-side so the
  // warning below can update the instant the admin picks a different photo,
  // rather than only after the form is saved and the page reloads.
  const [selectedHeroPhotoUrl, setSelectedHeroPhotoUrl] = useState(defaults?.heroPhotoUrl ?? '');
  const resolvedHeroPhotoUrlForWarning =
    selectedHeroPhotoUrl === 'none'
      ? null
      : selectedHeroPhotoUrl && photoUrls.includes(selectedHeroPhotoUrl)
        ? selectedHeroPhotoUrl
        : photoUrls[0];
  const heroPhotoWarning = resolvedHeroPhotoUrlForWarning
    ? heroPhotoWarnings?.[resolvedHeroPhotoUrlForWarning] ?? null
    : null;

  return (
    <div className="space-y-6">
      <PhotoManager
        logoUrl={logoUrl}
        photoUrls={photoUrls}
        faviconUrl={faviconUrl}
        faviconSource={faviconSource}
        addPhotosAction={addPhotosAction}
        deletePhotoAction={deletePhotoAction}
        updateLogoAction={updateLogoAction}
        updateFaviconAction={updateFaviconAction}
        resetFaviconAction={resetFaviconAction}
        onPhotosChange={setPhotoUrls}
        onLogoChange={setLogoUrl}
        onFaviconChange={(url, source) => {
          setFaviconUrl(url);
          setFaviconSource(source);
        }}
      />

      <form action={formAction} className="space-y-6">
        {state?.message && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {/* Photo assignment — per-section override, plus a direct per-section
            upload so a forgotten photo (e.g. no hero image) can be added right
            here without going back to the Photo Manager above. Only shown once
            at least one photo exists — on the wizard step this keeps it hidden
            until a photo has actually been uploaded once, rather than
            appearing before there's anything to assign. */}
        {photoUrls.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Photo Assignment</h2>
            <p className="text-xs text-gray-400 mb-3">
              Uploaded photos are assigned to sections automatically, in upload order. Override a
              section below to pin a specific photo there, upload a new one just for that section, or
              choose &quot;No photo&quot; to use that section&apos;s themed fallback instead.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhotoPickerField
                key={`logo-${defaults?.logoUrl ?? 'auto'}`}
                label="Business logo"
                name="logoPhotoUrl"
                photoUrls={photoUrls}
                defaultValue=""
                errors={errors.logoPhotoUrl}
                hint={'Auto keeps the current logo (above) unchanged. Pick a photo — e.g. one imported from the business’s website — to use it as the logo instead, or "No photo" to remove the logo entirely.'}
              />
              <div>
                <PhotoPickerField
                  key={`hero-${defaults?.heroPhotoUrl ?? 'auto'}`}
                  label="Desktop hero image"
                  name="heroPhotoUrl"
                  photoUrls={photoUrls}
                  defaultValue={defaults?.heroPhotoUrl}
                  errors={errors.heroPhotoUrl}
                  hint="For a full-width background, use a photo within 100px of 1920×1080 or 1600×900px. Other sizes will display alongside your text instead."
                  onChange={setSelectedHeroPhotoUrl}
                  uploadFieldName="heroPhotoFile"
                  stockPhotos={{ images: stockImages, initialKind: 'hero', initialVariant: 'desktop', defaultIndustry: defaults?.industry }}
                />
                {heroPhotoWarning && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {heroPhotoWarning}
                  </p>
                )}
              </div>
              <PhotoPickerField
                key={`heroMobile-${defaults?.heroPhotoUrlMobile ?? 'auto'}`}
                label="Mobile hero image"
                name="heroPhotoUrlMobile"
                photoUrls={photoUrls}
                defaultValue={defaults?.heroPhotoUrlMobile}
                errors={errors.heroPhotoUrlMobile}
                hint='Optional — a separate photo shown only on mobile, blended left-to-right so your headline stays legible. "Auto" reuses the desktop hero photo on mobile when no dedicated mobile photo is chosen; "No photo" always falls back to the theme illustration on mobile.'
                uploadFieldName="heroPhotoFileMobile"
                stockPhotos={{ images: stockImages, initialKind: 'hero', initialVariant: 'mobile', defaultIndustry: defaults?.industry }}
              />
              <PhotoPickerField
                key={`about-${defaults?.aboutPhotoUrl ?? 'auto'}`}
                label="About Us section"
                name="aboutPhotoUrl"
                photoUrls={photoUrls}
                defaultValue={defaults?.aboutPhotoUrl}
                errors={errors.aboutPhotoUrl}
                uploadFieldName="aboutPhotoFile"
                stockPhotos={{ images: stockImages, initialKind: 'general', defaultIndustry: defaults?.industry }}
              />
              <PhotoPickerField
                key={`whyChooseUs-${defaults?.whyChooseUsPhotoUrl ?? 'auto'}`}
                label="Why Choose Us section"
                name="whyChooseUsPhotoUrl"
                photoUrls={photoUrls}
                defaultValue={defaults?.whyChooseUsPhotoUrl}
                errors={errors.whyChooseUsPhotoUrl}
                uploadFieldName="whyChooseUsPhotoFile"
                stockPhotos={{ images: stockImages, initialKind: 'general', defaultIndustry: defaults?.industry }}
              />
              <PhotoPickerField
                key={`services-${defaults?.servicesPhotoUrl ?? 'auto'}`}
                label="Featured service card"
                name="servicesPhotoUrl"
                photoUrls={photoUrls}
                defaultValue={defaults?.servicesPhotoUrl}
                errors={errors.servicesPhotoUrl}
                uploadFieldName="servicesPhotoFile"
                stockPhotos={{ images: stockImages, initialKind: 'general', defaultIndustry: defaults?.industry }}
              />
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 pt-2">
          <SubmitButton label={submitLabel} />
        </div>
      </form>
    </div>
  );
}
