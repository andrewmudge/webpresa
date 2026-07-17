import Image from 'next/image';
import { V } from './tokens';
import type { GalleryImage } from '@/domain/models/site-preview';

interface Props {
  businessName: string;
  images: GalleryImage[];
  /** Admin-editable heading override (`content.gallerySection`). Falls back to the built-in copy below when absent. */
  sectionHeadline?: string;
  sectionSubheadline?: string;
}

// Only rendered when the business has at least one uploaded photo — see
// availability check in lib/website-sections/availability.ts.
export function GallerySection({ businessName, images, sectionHeadline, sectionSubheadline }: Props) {
  if (!images || images.length === 0) return null;

  return (
    <section className="py-20 bg-(--site-background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Gallery
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text)">{sectionHeadline || 'Our Work'}</h2>
          {sectionSubheadline && <p className="mt-3 text-(--site-muted)">{sectionSubheadline}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, i) => (
            <div key={image.url} className="relative aspect-square rounded-xl overflow-hidden bg-(--site-surface) group">
              <Image
                src={image.url}
                alt={image.caption || `${businessName} — photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
              {image.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs px-3 py-2">
                  {image.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
