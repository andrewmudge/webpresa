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
 * for hero, a curated stock photo). This card shows what's actually
 * rendering per slot right now, read-only, labeled by whether it's one of
 * the customer's own uploads or was pulled in automatically — customers
 * otherwise had no visibility into non-uploaded images the site was using.
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

  const siteImageSlots = (Object.entries(SITE_IMAGE_SLOT_LABELS) as [keyof typeof SITE_IMAGE_SLOT_LABELS, string][])
    .map(([field, label]) => ({ label, url: theme?.[field] }))
    .filter((slot): slot is { label: string; url: string } => !!slot.url);

  return (
    <div className="space-y-6">
      {siteImageSlots.length > 0 && (
        <Card title="Photos on your site" description="What's currently showing in each section — read-only.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {siteImageSlots.map(({ label, url }) => (
              <div key={label} className="space-y-1">
                <div className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square">
                  <Image src={url} alt={label} fill className="object-cover" unoptimized />
                </div>
                <p className="text-xs font-medium text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400">{photoUrls.includes(url) ? 'Uploaded by you' : 'Pulled from your website'}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Your photos" description={`Up to 6 photos. ${photoUrls.length}/6 used.`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photoUrls.map((url) => (
            <div key={url} className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square">
              <Image src={url} alt="" fill className="object-cover" unoptimized />
              {!isReadOnly && (
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
          ))}
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
