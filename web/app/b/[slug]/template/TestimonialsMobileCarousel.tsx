'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BusinessTestimonial } from '@/domain/models/business';
import { TestimonialCard } from './TestimonialCard';
import { V } from './tokens';

interface Props {
  testimonials: BusinessTestimonial[];
}

const AUTOPLAY_INTERVAL_MS = 6000;

/**
 * Mobile-only, one-at-a-time rotating testimonial carousel — autoplay plus
 * tappable dot indicators. Desktop renders the full grid instead (see
 * `TestimonialsSection.tsx`); this component is only ever mounted at `md:`
 * and below.
 */
export function TestimonialsMobileCarousel({ testimonials }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % testimonials.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;

  const current = testimonials[index % testimonials.length];

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current.googleReviewId ?? `${current.author}-${index}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <TestimonialCard testimonial={current} />
        </motion.div>
      </AnimatePresence>

      {testimonials.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5" role="tablist" aria-label="Testimonials">
          {testimonials.map((t, i) => (
            <button
              key={t.googleReviewId ?? `${t.author}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show testimonial ${i + 1} of ${testimonials.length}`}
              onClick={() => setIndex(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === index ? '1.25rem' : '0.5rem',
                backgroundColor: i === index ? V.primary : V.border,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
