'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { BusinessTestimonial } from '@/domain/models/business';
import { TestimonialAvatar } from '@/app/components/TestimonialAvatar';
import { importGoogleReviewsAction, toggleGoogleReviewVisibilityAction } from './actions';

interface Props {
  businessId: string;
  googlePlaceId?: string;
  googleTestimonials: BusinessTestimonial[];
}

function ImportButton({ hasExisting }: { hasExisting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-4 py-2 text-xs font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Importing…' : hasExisting ? 'Refresh Google Reviews' : 'Import Google Reviews'}
    </button>
  );
}

function ToggleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-gray-500 hover:text-gray-800 underline underline-offset-2 disabled:opacity-60"
    >
      {pending ? '…' : 'Toggle'}
    </button>
  );
}

/**
 * Read-only Google reviews, alongside the fully-editable manual testimonials
 * form (`BusinessListEditor`, same expanded panel, testimonials section
 * only). Google-sourced reviews are never editable here — only hideable —
 * per Google's API terms on not altering review content; the only mutation
 * is `toggleGoogleReviewVisibilityAction`.
 */
export function GoogleReviewsPanel({ businessId, googlePlaceId, googleTestimonials }: Props) {
  const [testimonials, setTestimonials] = useState(googleTestimonials);
  const [importState, importAction] = useActionState(importGoogleReviewsAction.bind(null, businessId), undefined);
  const [toggleState, toggleAction] = useActionState(toggleGoogleReviewVisibilityAction.bind(null, businessId), undefined);

  // Adjust state during render (React's documented alternative to an
  // effect here — https://react.dev/learn/you-might-not-need-an-effect)
  // rather than syncing via useEffect, which would cost an extra render.
  const [appliedImportState, setAppliedImportState] = useState(importState);
  const [appliedToggleState, setAppliedToggleState] = useState(toggleState);
  if (importState !== appliedImportState) {
    setAppliedImportState(importState);
    if (importState?.testimonials) setTestimonials(importState.testimonials.filter((t) => t.source === 'google'));
  }
  if (toggleState !== appliedToggleState) {
    setAppliedToggleState(toggleState);
    if (toggleState?.testimonials) setTestimonials(toggleState.testimonials.filter((t) => t.source === 'google'));
  }

  if (!googlePlaceId) {
    return (
      <p className="text-xs text-gray-400 italic">
        This business has no Google Place ID yet — import it via Discover to enable Google Reviews.
      </p>
    );
  }

  return (
    <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Google Reviews</p>
        <form action={importAction}>
          <ImportButton hasExisting={testimonials.length > 0} />
        </form>
      </div>
      {importState?.message && (
        <p role="alert" className="text-xs text-red-700">
          {importState.message}
        </p>
      )}
      {toggleState?.message && (
        <p role="alert" className="text-xs text-red-700">
          {toggleState.message}
        </p>
      )}
      {testimonials.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No Google reviews imported yet.</p>
      ) : (
        <ul className="space-y-3">
          {testimonials.map((t) => (
            <li
              key={t.googleReviewId ?? t.author}
              className={`flex items-start gap-3 rounded-lg border border-gray-200 p-3 ${t.hidden ? 'opacity-50' : ''}`}
            >
              <TestimonialAvatar name={t.author} photoUrl={t.authorPhotoUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-800">{t.author}</p>
                  {t.rating !== undefined && <span className="text-xs text-amber-500">{'★'.repeat(Math.round(t.rating))}</span>}
                  {t.publishTimeDescription && <span className="text-xs text-gray-400">{t.publishTimeDescription}</span>}
                  {t.hidden && <span className="text-xs text-gray-400 italic">(hidden)</span>}
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.quote}</p>
              </div>
              <form action={toggleAction}>
                <input type="hidden" name="googleReviewId" value={t.googleReviewId ?? ''} />
                <ToggleButton />
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
