import { V } from './tokens';
import type { BusinessTestimonial } from '@/domain/models/business';
import { TestimonialCard } from './TestimonialCard';
import { TestimonialsMobileCarousel } from './TestimonialsMobileCarousel';

interface Props {
  businessName: string;
  rating?: number;
  reviewCount?: number;
  testimonials?: BusinessTestimonial[];
}

// Tailwind's compiler only generates classes it can find as literal strings
// in source — a template-interpolated `lg:grid-cols-${n}` would silently
// produce no CSS. Listing all 5 possible values here (matching Google's own
// 5-review cap) keeps the dynamic column count safe to generate. Mirrors
// TestimonialsSection.tsx's own copy of this map, pending that section's
// removal once the merge below is confirmed.
const DESKTOP_GRID_COLUMNS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 20 20"
      fill={filled ? V.accent : 'none'}
      stroke={V.accent}
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}

// Renders the verified Google rating/review-count summary (unchanged from
// before — see Business.googleRating/googleReviewCount, populated by Stage
// 12; never fabricates a rating or review count) plus, directly underneath,
// the business's actual testimonials — manually entered or imported from
// Google reviews (Business.testimonials, same source TestimonialsSection
// previously rendered on its own). Visible if either the rating or at least
// one testimonial is present, so a business with testimonials but no Google
// rating on file still shows them.
export function ReviewsSection({ businessName, rating, reviewCount, testimonials = [] }: Props) {
  const visibleTestimonials = testimonials.filter((t) => !t.hidden);
  const hasRating = !!rating && !!reviewCount && reviewCount >= 1;
  if (!hasRating && visibleTestimonials.length === 0) return null;

  const roundedStars = rating ? Math.round(rating) : 0;
  const desktopColumnsClass =
    DESKTOP_GRID_COLUMNS[Math.min(visibleTestimonials.length, 5)] ?? DESKTOP_GRID_COLUMNS[5];

  return (
    <section className="py-20 bg-(--site-surface)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Reviews
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text) mb-6">
            Trusted by our customers
          </h2>
          {hasRating && (
            <>
              <div className="flex items-center justify-center gap-1 mb-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} filled={i < roundedStars} />
                ))}
              </div>
              <p className="text-(--site-muted)">
                <span className="font-bold text-(--site-text)">{rating!.toFixed(1)}</span> average rating from{' '}
                <span className="font-bold text-(--site-text)">{reviewCount}</span>{' '}
                {reviewCount === 1 ? 'review' : 'reviews'} on Google — {businessName}
              </p>
            </>
          )}
        </div>

        {visibleTestimonials.length > 0 && (
          <div className={hasRating ? 'mt-12' : 'mt-2'}>
            {/* Desktop: every visible testimonial in one row (up to 5) */}
            <div className={`hidden md:grid grid-cols-1 sm:grid-cols-2 ${desktopColumnsClass} gap-6`}>
              {visibleTestimonials.map((t, i) => (
                <TestimonialCard key={t.googleReviewId ?? `${t.author}-${i}`} testimonial={t} />
              ))}
            </div>

            {/* Mobile: one at a time, auto-rotating */}
            <div className="md:hidden">
              <TestimonialsMobileCarousel testimonials={visibleTestimonials} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
