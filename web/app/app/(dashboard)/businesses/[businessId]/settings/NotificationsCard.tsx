'use client';

import { useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import { Card } from '../FormBits';
import { updateDraftNoticePreferenceActionCustomer } from '../actions';

interface Props {
  businessId: string;
  defaultEnabled: boolean;
  isReadOnly: boolean;
}

/**
 * Only `draftChangesNoticeEnabled` is real and wired to an actual
 * notification (the "unpublished draft" toast — `DraftChangesNotice.tsx`).
 * Every other preference implementation.md lists (published notifications,
 * domain renewal reminders, security alerts) has no backing notification
 * system anywhere in this app; billing receipts are Stripe's own (see the
 * Billing page's Customer Portal delegation) — none of them are shown
 * here, since a toggle with nothing behind it would be a fake control.
 */
export function NotificationsCard({ businessId, defaultEnabled, isReadOnly }: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSaveState('idle');
    startTransition(async () => {
      const result = await updateDraftNoticePreferenceActionCustomer(businessId, enabled);
      setSaveState(result?.message ? 'error' : 'saved');
    });
  }

  return (
    <Card title="Notifications" description="Choose what we notify you about.">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-(--color-brand-muted) flex items-center justify-center shrink-0">
          <Bell size={18} className="text-(--color-brand)" aria-hidden="true" />
        </div>
        <p className="text-sm text-gray-500">Website updates</p>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700 mb-4">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isReadOnly || isPending}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaveState('idle');
          }}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-(--color-brand) focus:ring-(--color-brand) disabled:opacity-50"
        />
        <span>Notify me about unpublished draft changes</span>
      </label>

      {saveState === 'saved' && (
        <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
          Preferences saved.
        </p>
      )}
      {saveState === 'error' && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          Failed to save preferences. Please try again.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isReadOnly || isPending}
        className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-(--color-brand) text-white hover:bg-(--color-brand-dark) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving…' : 'Save Preferences'}
      </button>
    </Card>
  );
}
