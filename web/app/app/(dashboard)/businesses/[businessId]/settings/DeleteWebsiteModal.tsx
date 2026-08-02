'use client';

import { useState, useTransition } from 'react';
import { ConfirmDialog } from '../ConfirmDialog';
import { deleteWebsiteActionCustomer } from '../actions';

interface Props {
  businessId: string;
  businessName: string;
  hasActiveSubscription: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteWebsiteModal({ businessId, businessName, hasActiveSubscription, isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleConfirm() {
    setError(undefined);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('confirmName', businessName);
      const result = await deleteWebsiteActionCustomer(businessId, formData);
      // Only reached on failure — success redirects away via `redirect()`
      // inside the action, which navigates the browser before this line.
      if (result?.message) setError(result.message);
    });
  }

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Website"
      confirmLabel="Delete Website"
      pendingLabel="Deleting…"
      isPending={isPending}
      error={error}
      requireTypedConfirmation={businessName}
      onConfirm={handleConfirm}
      description={
        <>
          <p>
            This permanently deletes <span className="font-medium text-gray-900">{businessName}</span>&apos;s website,
            domain connection, uploaded photos, and history. This cannot be undone.
          </p>
          {hasActiveSubscription && (
            <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Your subscription will not be automatically canceled. To stop future charges, cancel it separately from{' '}
              <span className="font-medium">Subscription → Manage Payment &amp; Subscription</span>.
            </p>
          )}
        </>
      }
    />
  );
}
