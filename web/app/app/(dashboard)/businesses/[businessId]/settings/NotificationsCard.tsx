'use client';

import { useState, useTransition } from 'react';
import { Bell } from 'lucide-react';
import { Card } from '../FormBits';
import { updateDraftNoticePreferenceActionCustomer, updateLeadNotificationEmailActionCustomer } from '../actions';

interface Props {
  businessId: string;
  defaultEnabled: boolean;
  defaultLeadNotificationEmail?: string;
  isReadOnly: boolean;
}

/**
 * Only preferences with something real behind them are shown here — a
 * toggle/field with no backing notification system would be a fake
 * control. `draftChangesNoticeEnabled` drives the "unpublished draft"
 * toast (`DraftChangesNotice.tsx`); `leadNotificationEmail` is the actual
 * send target `lib/leads/notify.ts` uses for new-lead emails. Every other
 * preference implementation.md lists (published notifications, domain
 * renewal reminders, security alerts) has no backing system anywhere in
 * this app; billing receipts are Stripe's own (see the Billing page's
 * Customer Portal delegation) — none of those are shown here.
 *
 * There is no way to clear the lead-notification email back to empty from
 * here — `updateCustomerLeadNotificationEmail` always requires a real
 * address (see its own doc comment for why). An empty field is simply left
 * unsaved on Save, not submitted as a removal.
 */
export function NotificationsCard({ businessId, defaultEnabled, defaultLeadNotificationEmail, isReadOnly }: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [leadEmail, setLeadEmail] = useState(defaultLeadNotificationEmail ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSaveState('idle');
    setErrorMessage(undefined);
    startTransition(async () => {
      const trimmedEmail = leadEmail.trim();
      const [draftResult, leadEmailResult] = await Promise.all([
        updateDraftNoticePreferenceActionCustomer(businessId, enabled),
        trimmedEmail ? updateLeadNotificationEmailActionCustomer(businessId, trimmedEmail) : Promise.resolve(undefined),
      ]);
      const failureMessage = draftResult?.message ?? leadEmailResult?.message;
      if (failureMessage) {
        setErrorMessage(failureMessage);
        setSaveState('error');
      } else {
        setSaveState('saved');
      }
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

      <label className="block mb-4">
        <span className="block text-sm font-medium text-gray-700 mb-1">New-lead notification email</span>
        <input
          type="email"
          value={leadEmail}
          disabled={isReadOnly || isPending}
          onChange={(e) => {
            setLeadEmail(e.target.value);
            setSaveState('idle');
          }}
          className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-base sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-(--color-brand) disabled:bg-gray-50 disabled:text-gray-400"
        />
        <span className="mt-1 block text-xs text-gray-400">Where we email you when someone submits your website&apos;s Request Service form.</span>
      </label>

      {saveState === 'saved' && (
        <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
          Preferences saved.
        </p>
      )}
      {saveState === 'error' && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {errorMessage ?? 'Failed to save preferences. Please try again.'}
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
