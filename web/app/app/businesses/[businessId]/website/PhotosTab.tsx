import Image from 'next/image';
import type { Business } from '@/domain/models/business';
import type { PreviewContent } from '@/domain/models/site-preview';
import { Card, SaveButton } from '../FormBits';
import { addPhotosActionCustomer, deletePhotoActionCustomer, updateSectionContentActionCustomer } from '../actions';

interface Props {
  businessId: string;
  business: Business;
  content?: PreviewContent;
  isReadOnly: boolean;
}

export function PhotosTab({ businessId, business, content, isReadOnly }: Props) {
  const photoUrls = business.photoUrls ?? [];
  const galleryImages = content?.gallerySection?.images ?? [];
  const captionFor = (url: string) => galleryImages.find((g) => g.url === url)?.caption ?? '';

  return (
    <div className="space-y-6">
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
          <form action={addPhotosActionCustomer.bind(null, businessId)} className="mt-4 flex items-center gap-3">
            <input
              type="file"
              name="photos"
              accept="image/*"
              multiple
              className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-(--color-brand-muted) file:text-(--color-brand) file:px-3 file:py-1.5 file:text-sm file:font-medium"
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
