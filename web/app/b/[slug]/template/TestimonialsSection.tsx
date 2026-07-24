import { V } from './tokens';
import type { BusinessTestimonial } from '@/domain/models/business';
import { TestimonialCard } from './TestimonialCard';
import { TestimonialsMobileCarousel } from './TestimonialsMobileCarousel';

interface Props {
  testimonials: BusinessTestimonial[];
}

// Tailwind's compiler only generates classes it can find as literal strings
// in source — a template-interpolated `lg:grid-cols-${n}` would silently
// produce no CSS. Listing all 5 possible values here (matching Google's own
// 5-review cap) keeps the dynamic column count safe to generate.
const DESKTOP_GRID_COLUMNS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

// Only rendered when at least one visible testimonial exists on the
// business record — either manually entered/verified (source: 'manual'),
// or imported from the business's own Google reviews (source: 'google',
// capped at 5 by Google, never edited — only hideable, see
// lib/google-places/reviews.ts). Admin-hidden Google reviews are filtered
// out here as a defensive second check, alongside the same filter in
// lib/website-sections/availability.ts.
export function TestimonialsSection({ testimonials }: Props) {
  const visible = testimonials.filter((t) => !t.hidden);
  if (visible.length === 0) return null;

  // All visible testimonials in one row on desktop, up to 5 (Google's own
  // per-place cap) — wraps to an additional row of the same width if a
  // business ever has more than 5 (Google reviews plus manual additions).
  const desktopColumnsClass = DESKTOP_GRID_COLUMNS[Math.min(visible.length, 5)] ?? DESKTOP_GRID_COLUMNS[5];

  return (
    <section className="py-20 bg-(--site-background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text)">What our customers say</h2>
        </div>

        {/* Desktop: every visible testimonial in one row (up to 5) */}
        <div className={`hidden md:grid grid-cols-1 sm:grid-cols-2 ${desktopColumnsClass} gap-6`}>
          {visible.map((t, i) => (
            <TestimonialCard key={t.googleReviewId ?? `${t.author}-${i}`} testimonial={t} />
          ))}
        </div>

        {/* Mobile: one at a time, auto-rotating */}
        <div className="md:hidden">
          <TestimonialsMobileCarousel testimonials={visible} />
        </div>
      </div>
    </section>
  );
}
