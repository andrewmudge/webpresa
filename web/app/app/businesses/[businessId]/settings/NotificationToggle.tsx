'use client';

import { useState, useTransition } from 'react';
import { updateDraftNoticePreferenceActionCustomer } from '../actions';

interface Props {
  businessId: string;
  defaultEnabled: boolean;
  disabled: boolean;
}

/**
 * The only place to turn the "draft changes" toast back **on** once it's
 * been permanently dismissed from inside the toast itself
 * (`DraftChangesNotice.tsx`, on `/website`) — both read and write the same
 * `Business.draftChangesNoticeEnabled` field via the same action.
 */
export function NotificationToggle({ businessId, defaultEnabled, disabled }: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle(checked: boolean) {
    setEnabled(checked);
    startTransition(() => {
      updateDraftNoticePreferenceActionCustomer(businessId, checked);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled || isPending}
        onChange={(e) => toggle(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand) disabled:opacity-50"
      />
      Notify me about unpublished draft changes
    </label>
  );
}
