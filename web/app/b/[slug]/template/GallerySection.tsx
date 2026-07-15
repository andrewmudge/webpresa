import Image from 'next/image';
import { V } from './tokens';

interface Props {
  businessName: string;
  images: string[];
}

// Only rendered when the business has at least one uploaded photo — see
// availability check in lib/website-sections/availability.ts.
export function GallerySection({ businessName, images }: Props) {
  if (!images || images.length === 0) return null;

  return (
    <section className="py-20 bg-(--site-background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Gallery
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text)">Our Work</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-xl overflow-hidden bg-(--site-surface)">
              <Image
                src={src}
                alt={`${businessName} — photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
