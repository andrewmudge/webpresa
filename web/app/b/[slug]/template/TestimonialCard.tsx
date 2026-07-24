'use client';

import { useEffect, useRef, useState } from 'react';
import { V } from './tokens';
import { TestimonialAvatar } from '@/app/components/TestimonialAvatar';
import type { BusinessTestimonial } from '@/domain/models/business';

interface Props {
  testimonial: BusinessTestimonial;
}

/**
 * One testimonial card — a real Google reviewer photo/rating/attribution
 * when `source === 'google'`, or an initial-letter avatar for anything
 * without a real photo (every manually-added testimonial). Quotes clamp to
 * 5 lines with a "Read more"/"Read less" toggle that only appears when the
 * text is actually truncated (measured via `scrollHeight` vs `clientHeight`,
 * not assumed from character count).
 */
export function TestimonialCard({ testimonial }: Props) {
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = quoteRef.current;
    if (!el) return;

    const measure = () => setTruncated(el.scrollHeight > el.clientHeight + 1);
    measure();

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [testimonial.quote]);

  const isGoogle = testimonial.source === 'google';
  const roundedRating = testimonial.rating !== undefined ? Math.round(testimonial.rating) : undefined;

  return (
    <blockquote className="rounded-2xl p-6 bg-(--site-surface) border border-(--site-border) flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <TestimonialAvatar
          name={testimonial.author}
          photoUrl={testimonial.authorPhotoUrl}
          className="font-bold"
          style={{ color: V.primary, backgroundColor: 'color-mix(in srgb, var(--site-primary) 12%, transparent)' }}
        />
        <div className="min-w-0">
          <cite className="text-sm font-bold not-italic block truncate text-(--site-text)">
            {isGoogle && testimonial.authorProfileUrl ? (
              <a
                href={testimonial.authorProfileUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:underline"
              >
                {testimonial.author}
              </a>
            ) : (
              testimonial.author
            )}
          </cite>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-(--site-muted)">
            {roundedRating !== undefined && (
              <span aria-label={`${testimonial.rating} out of 5 stars`} className="text-amber-400 tracking-tight">
                {'★'.repeat(roundedRating)}
                <span className="opacity-30">{'★'.repeat(5 - roundedRating)}</span>
              </span>
            )}
            {isGoogle && <span>Posted on Google</span>}
            {testimonial.publishTimeDescription && <span>· {testimonial.publishTimeDescription}</span>}
          </div>
        </div>
      </div>

      <p ref={quoteRef} className={`text-(--site-text) leading-relaxed flex-1 ${expanded ? '' : 'line-clamp-5'}`}>
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {truncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-bold self-start"
          style={{ color: V.primary }}
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </blockquote>
  );
}
