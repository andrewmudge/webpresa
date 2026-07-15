import { V } from './tokens';
import type { BusinessTestimonial } from '@/domain/models/business';

interface Props {
  testimonials: BusinessTestimonial[];
}

// Only rendered when at least one verified testimonial exists on the
// business record. No testimonial is ever generated — every entry here was
// manually entered and verified.
export function TestimonialsSection({ testimonials }: Props) {
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-20 bg-(--site-background)">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: V.accent }}>
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-(--site-text)">What our customers say</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <blockquote
              key={i}
              className="rounded-2xl p-6 bg-(--site-surface) border border-(--site-border)"
            >
              <p className="text-(--site-text) leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <cite className="text-sm font-bold not-italic" style={{ color: V.primary }}>
                — {t.author}
              </cite>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
