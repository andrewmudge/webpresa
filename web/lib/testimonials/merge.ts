import type { BusinessTestimonial, TestimonialSource } from '@/domain/models/business';

/**
 * Rebuilds `Business.testimonials` after one source (manual entries via the
 * admin form, or Google reviews via import/refresh) changes content, while
 * preserving the overall array order — including any custom interleaving
 * an admin set up via the order editor (`TestimonialsOrderEditor.tsx`).
 *
 * Testimonials belonging to the *other* source are left untouched, in their
 * existing position. Testimonials of the updated `source` are replaced in
 * place (matched by `id`) if still present in `updated.items`, dropped if
 * no longer present (removed via the admin form), and any `updated.items`
 * entry with no matching existing `id` is appended at the end (a brand-new
 * manual testimonial, or a Google review just discovered on a refresh) —
 * the admin can then move it wherever via the order editor.
 */
export function mergeTestimonialsPreservingOrder(
  existing: BusinessTestimonial[],
  updated: { source: TestimonialSource; items: BusinessTestimonial[] },
): BusinessTestimonial[] {
  const updatedById = new Map(updated.items.map((t) => [t.id, t]));
  const usedIds = new Set<string>();
  const merged: BusinessTestimonial[] = [];

  for (const t of existing) {
    if (t.source !== updated.source) {
      merged.push(t);
      continue;
    }
    const replacement = updatedById.get(t.id);
    if (replacement) {
      merged.push(replacement);
      usedIds.add(t.id);
    }
    // else: this entry no longer appears in `updated.items` — removed, drop it.
  }

  for (const t of updated.items) {
    if (!usedIds.has(t.id)) merged.push(t);
  }

  return merged;
}
