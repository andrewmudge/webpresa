'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { updateDraftNoticePreferenceActionCustomer } from '../actions';

interface Props {
  businessId: string;
  /** The current draft's previewId, if a draft actually exists right now. */
  draftPreviewId?: string;
  /** `business.draftChangesNoticeEnabled !== false` — the durable opt-out. */
  noticeEnabled: boolean;
}

const STORAGE_PREFIX = 'webpresa:draft-notice-shown:';

/** Nothing external mutates this after mount — the only writer is this
 *  component's own `dismiss()`, tracked via local `dismissed` state below
 *  rather than a real subscription, so there's nothing to notify on. */
function subscribe() {
  return () => {};
}

/**
 * One-time-per-draft toast: "you have unpublished changes, go review them."
 * Shown at most once per draft (tracked in `localStorage`, keyed by
 * `previewId` — resets naturally once published, since the next edit lands
 * on a brand-new draft with a new ID) unless permanently disabled via
 * `Business.draftChangesNoticeEnabled`. Non-blocking — the customer can keep
 * editing with it open.
 *
 * Reads `localStorage` via `useSyncExternalStore` rather than
 * `useEffect`+`setState` — the value differs between server and client (the
 * server has no `localStorage` at all), which is exactly the case this hook
 * exists for: a distinct server snapshot (always "already shown," so SSR
 * output is deterministic) versus the real client-side answer computed
 * synchronously on the client's own first render, with no extra render pass.
 */
export function DraftChangesNotice({ businessId, draftPreviewId, noticeEnabled }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const alreadyShown = useSyncExternalStore(
    subscribe,
    () => (draftPreviewId ? window.localStorage.getItem(STORAGE_PREFIX + draftPreviewId) !== null : true),
    () => true,
  );

  const visible = !!draftPreviewId && noticeEnabled && !alreadyShown && !dismissed;

  function dismiss() {
    if (draftPreviewId) {
      window.localStorage.setItem(STORAGE_PREFIX + draftPreviewId, '1');
    }
    setDismissed(true);
  }

  function disablePermanently() {
    dismiss();
    startTransition(() => {
      updateDraftNoticePreferenceActionCustomer(businessId, false);
    });
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-40 sm:w-96 rounded-xl bg-white border border-gray-200 shadow-lg p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-800">Your site has unpublished changes — review them before you publish.</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="shrink-0 -mt-1 -mr-1 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <Link
        href={`/app/businesses/${businessId}`}
        onClick={dismiss}
        className="mt-3 inline-block text-sm font-medium text-(--color-brand) hover:underline"
      >
        Review changes →
      </Link>
      <label className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <input
          type="checkbox"
          disabled={isPending}
          onChange={(e) => {
            if (e.target.checked) disablePermanently();
          }}
          className="h-3.5 w-3.5 rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand)"
        />
        Don&apos;t show this again
      </label>
    </div>
  );
}
