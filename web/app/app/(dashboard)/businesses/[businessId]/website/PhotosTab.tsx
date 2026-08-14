import Image from 'next/image';
import type { Business } from '@/domain/models/business';
import { Card, SaveButton } from '../FormBits';
import { addPhotosActionCustomer, deletePhotoActionCustomer, updateSectionContentActionCustomer } from '../actions';
import { getCachedPreviews } from './data';

interface Props {
  businessId: string;
  business: Business;
  isReadOnly: boolean;
}

/**
 * The theme fields below are resolved once at generation time
 * (`lib/ai/generate-preview.ts`'s `resolvePhotoSlot`/`resolveHeroImages`)
 * from a priority chain that isn't limited to `business.photoUrls` — a slot
 * with no matching upload falls back to a Firecrawl-scan-accepted image (or,
 * for hero, a curated stock photo). The "Your photos" grid below folds these
 * in alongside the customer's own uploads (deduped by URL) so it always
 * reflects what's actually showing on the site, not just what they've
 * uploaded — a non-uploaded slot image is labeled and not removable.
 */
const SITE_IMAGE_SLOT_LABELS = {
  heroImageUrl: 'Hero',
  heroImageUrlMobile: 'Hero (mobile)',
  aboutImageUrl: 'Why Choose Us',
  aboutSectionImageUrl: 'About Us',
  servicesImageUrl: 'Services',
} as const;

export async function PhotosTab({ businessId, business, isReadOnly }: Props) {
  const previews = await getCachedPreviews(businessId);
  const content = previews[0]?.content;
  const theme = previews[0]?.theme;
  const photoUrls = business.photoUrls ?? [];
  const galleryImages = content?.gallerySection?.images ?? [];
  const captionFor = (url: string) => galleryImages.find((g) => g.url === url)?.caption ?? '';

  const slotLabelsByUrl = new Map<string, string[]>();
  for (const [field, label] of Object.entries(SITE_IMAGE_SLOT_LABELS) as [keyof typeof SITE_IMAGE_SLOT_LABELS, string][]) {
    const url = theme?.[field];
    if (!url) continue;
    slotLabelsByUrl.set(url, [...(slotLabelsByUrl.get(url) ?? []), label]);
  }

  // Uploaded photos first (in upload order), then any site-slot images not
  // already among them (e.g. a Firecrawl-sourced hero photo) — one unified
  // grid rather than a separate "what's live" card, deduped by URL.
  const allPhotoUrls = [...photoUrls, ...[...slotLabelsByUrl.keys()].filter((url) => !photoUrls.includes(url))];

  return (
    <div className="space-y-6">
      <Card title="Your photos" description={`${photoUrls.length}/6 uploaded — plus any photos pulled from your website.`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allPhotoUrls.map((url) => {
            const isUploaded = photoUrls.includes(url);
            const slotLabels = slotLabelsByUrl.get(url);
            return (
              <div key={url} className="space-y-1">
                <div className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square">
                  <Image src={url} alt={slotLabels?.join(', ') ?? ''} fill className="object-cover" unoptimized />
                  {isUploaded && !isReadOnly && (
                    <form action={deletePhotoActionCustomer.bind(null, businessId)} className="absolute top-1 right-1">
                      <input type="hidden" name="photoUrl" value={url} />
                      <button
                        type="submit"
                        className="bg-black/60 text-white text-xs px-2 py-1 rounded-md hover:bg-black/80 transition-colors"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </div>
                {slotLabels && (
                  <>
                    <p className="text-xs font-medium text-gray-700">{slotLabels.join(', ')}</p>
                    <p className="text-[11px] text-gray-400">{isUploaded ? 'Uploaded by you' : 'Pulled from your website'}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {!isReadOnly && photoUrls.length < 6 && (
          <form action={addPhotosActionCustomer.bind(null, businessId)} className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              name="photos"
              accept="image/*"
              multiple
              className="min-w-0 max-w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-(--color-brand-muted) file:text-(--color-brand) file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <SaveButton label="Upload" />
          </form>
        )}
      </Card>

      {content && photoUrls.length > 0 && (
        <Card title="Gallery captions" description="Every uploaded photo appears in your Gallery section — add an optional caption for each.">
          <form action={updateSectionContentActionCustomer.bind(null, businessId, 'gallery')} className="space-y-3">
            {photoUrls.map((url, i) => (
              <div key={url} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden border border-gray-200">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </div>
                <input type="hidden" name={`galleryImages.${i}.url`} value={url} />
                <input
                  type="text"
                  name={`galleryImages.${i}.caption`}
                  defaultValue={captionFor(url)}
                  placeholder="Caption (optional)"
                  disabled={isReadOnly}
                  maxLength={200}
                  className="flex-1 rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            ))}
            <SaveButton disabled={isReadOnly} label="Save captions" />
          </form>
        </Card>
      )}
    </div>
  );
}
