'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { deleteAccountActionCustomer } from '../actions';

interface Props {
  businessId: string;
  email: string;
  businessCount: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Whole-account delete — distinct from `DeleteWebsiteModal`, which only
 * removes one business. Typed confirmation is the customer's email (they
 * know it by heart, and it's meaningfully different from any one
 * business's name — this deletes every business they own, not just the
 * one Settings happened to be opened from).
 */
export function DeleteAccountModal({ businessId, email, businessCount, isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleConfirm() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('confirmEmail', email);
      const result = await deleteAccountActionCustomer(businessId, formData);
      // Only reached on failure — success signs out and redirects away.
      if (result?.message) setError(result.message);
    });
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Account"
      confirmLabel="Delete Account"
      pendingLabel="Deleting…"
      isPending={isPending}
      error={error}
      requireTypedConfirmation={email}
      onConfirm={handleConfirm}
      description={
        <>
          <p>
            This permanently deletes your Webpresa account and{' '}
            <span className="font-medium text-gray-900">
              all {businessCount} website{businessCount === 1 ? '' : 's'} you own
            </span>{' '}
            — including domains, photos, and history. You will be signed out immediately. This cannot be undone.
          </p>
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            You must cancel every active subscription first, from each business&apos;s Subscription page — account
            deletion is blocked while any subscription is still active, since you would otherwise lose the only way
            to stop future charges.
          </p>
        </>
      }
    />
  );
}
