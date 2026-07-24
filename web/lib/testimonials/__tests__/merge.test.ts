import { describe, it, expect } from 'vitest';
import { mergeTestimonialsPreservingOrder } from '../merge';
import type { BusinessTestimonial } from '@/domain/models/business';

function manual(id: string, author = id): BusinessTestimonial {
  return { id, author, quote: `${author}'s quote`, source: 'manual' };
}
function google(id: string, author = id): BusinessTestimonial {
  return { id, author, quote: `${author}'s quote`, source: 'google', googleReviewId: id };
}

describe('mergeTestimonialsPreservingOrder', () => {
  it('leaves entries of the untouched source exactly where they were', () => {
    const existing = [google('g1'), manual('m1'), google('g2')];
    const merged = mergeTestimonialsPreservingOrder(existing, { source: 'manual', items: [manual('m1')] });
    expect(merged.map((t) => t.id)).toEqual(['g1', 'm1', 'g2']);
  });

  it('replaces an updated-source entry in place, preserving interleaved position', () => {
    const existing = [google('g1'), manual('m1'), google('g2')];
    const editedManual = { ...manual('m1'), quote: 'edited quote' };
    const merged = mergeTestimonialsPreservingOrder(existing, { source: 'manual', items: [editedManual] });
    expect(merged.map((t) => t.id)).toEqual(['g1', 'm1', 'g2']);
    expect(merged[1].quote).toBe('edited quote');
  });

  it('drops an updated-source entry no longer present in the update', () => {
    const existing = [google('g1'), manual('m1'), manual('m2'), google('g2')];
    const merged = mergeTestimonialsPreservingOrder(existing, { source: 'manual', items: [manual('m2')] });
    expect(merged.map((t) => t.id)).toEqual(['g1', 'm2', 'g2']);
  });

  it('appends a brand-new entry of the updated source at the end', () => {
    const existing = [google('g1'), manual('m1')];
    const merged = mergeTestimonialsPreservingOrder(existing, {
      source: 'manual',
      items: [manual('m1'), manual('m2')],
    });
    expect(merged.map((t) => t.id)).toEqual(['g1', 'm1', 'm2']);
  });

  it('never resets a custom interleaved order back to source-grouped', () => {
    // Admin used the order editor to put a manual testimonial between two
    // Google reviews — a subsequent Google refresh (source: 'google') must
    // not disturb that arrangement.
    const existing = [google('g1'), manual('m1'), google('g2')];
    const refreshedGoogle = [google('g1'), google('g2'), google('g3')]; // g3 is newly discovered
    const merged = mergeTestimonialsPreservingOrder(existing, { source: 'google', items: refreshedGoogle });
    expect(merged.map((t) => t.id)).toEqual(['g1', 'm1', 'g2', 'g3']);
  });
});
