'use client';

import { startTransition, useActionState, useState } from 'react';
import type { BusinessTestimonial } from '@/domain/models/business';
import { TestimonialAvatar } from '@/app/components/TestimonialAvatar';
import { moveSection } from './section-order';
import { reorderTestimonialsAction } from './actions';

interface Props {
  businessId: string;
  /** Visible (non-hidden) testimonials only — the caller (`SectionContentEditor.tsx`)
   *  filters out any hidden Google review before passing this in, since
   *  there's nothing to gain from letting an admin position something that
   *  never renders publicly anyway. A hidden entry is never dropped by a
   *  reorder (`reorderTestimonialsAction` defensively appends anything
   *  outside the submitted order rather than deleting it) — it just settles
   *  at the end of the array while hidden; once shown again from
   *  `GoogleReviewsPanel`, the order editor picks it up and an admin can
   *  reposition it like any other entry. */
  testimonials: BusinessTestimonial[];
}

/**
 * Lets an admin freely interleave manual and Google-sourced testimonials —
 * e.g. inserting a manual entry between two Google reviews — by reordering
 * the single combined `Business.testimonials` array. Separate from both the
 * manual-only content editor (RepeatableListEditor, via BusinessListEditor)
 * and the read-only GoogleReviewsPanel: this component only ever moves
 * items, never edits their content, so it can safely show both sources
 * side by side without duplicating either one's own editing rules (manual
 * fully editable, Google read-only/hide-only).
 *
 * Auto-saves on every click (`reorderTestimonialsAction`, no redirect) —
 * same up/down-arrow convention as the Website Sections reorder control
 * (`SectionConfigForm.tsx`'s `handleMove`/`persist`), including computing
 * the next value first and calling `persist` as a top-level statement
 * rather than from inside a `setState` updater (that nested-dispatch
 * pattern previously crashed there with "Cannot update action state while
 * rendering" — see build_log.md).
 */
export function TestimonialsOrderEditor({ businessId, testimonials }: Props) {
  const [items, setItems] = useState(testimonials);
  const [state, formAction, isPending] = useActionState(reorderTestimonialsAction.bind(null, businessId), undefined);

  function persist(next: BusinessTestimonial[]) {
    const formData = new FormData();
    next.forEach((t) => formData.append('order', t.id));
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const next = moveSection(items, index, direction);
    setItems(next);
    persist(next);
  }

  if (items.length < 2) return null;

  return (
    <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Testimonial Order</p>
      <p className="text-xs text-gray-400">Controls how manual and Google testimonials are interleaved on the public page.</p>
      {state?.message && (
        <p role="alert" className="text-xs text-red-700">
          {state.message}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((t, index) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
            <TestimonialAvatar name={t.author} photoUrl={t.authorPhotoUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-800 truncate">{t.author}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
                  {t.source === 'google' ? 'Google' : 'Manual'}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{t.quote}</p>
            </div>
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => handleMove(index, 'up')}
                disabled={isPending || index === 0}
                aria-label={`Move ${t.author}'s testimonial up`}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 'down')}
                disabled={isPending || index === items.length - 1}
                aria-label={`Move ${t.author}'s testimonial down`}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
