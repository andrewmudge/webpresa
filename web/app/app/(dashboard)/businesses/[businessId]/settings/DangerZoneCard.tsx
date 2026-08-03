'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DeleteWebsiteModal } from './DeleteWebsiteModal';
import { DeleteAccountModal } from './DeleteAccountModal';

interface Props {
  businessId: string;
  businessName: string;
  hasActiveSubscription: boolean;
  email: string;
  businessCount: number;
  isReadOnly: boolean;
}

/**
 * Visually distinct but not dominant. Delete Website and Delete Account are
 * both real, fully-implemented actions; Export Website Data is still
 * deliberately not shown — no export generator exists anywhere in this
 * codebase, and implementation.md's MVP rule is against exposing an unsafe
 * or placeholder destructive action.
 */
export function DangerZoneCard({ businessId, businessName, hasActiveSubscription, email, businessCount, isReadOnly }: Props) {
  const [deleteWebsiteOpen, setDeleteWebsiteOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={16} className="text-red-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">Irreversible actions — proceed with caution.</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Website</p>
              <p className="text-xs text-gray-500">Permanently delete this website and all its data.</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteWebsiteOpen(true)}
              disabled={isReadOnly}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-700 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Delete Account</p>
              <p className="text-xs text-gray-500">
                Permanently delete your account and every website you own ({businessCount}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteAccountOpen(true)}
              disabled={isReadOnly}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-700 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <DeleteWebsiteModal
        businessId={businessId}
        businessName={businessName}
        hasActiveSubscription={hasActiveSubscription}
        isOpen={deleteWebsiteOpen}
        onClose={() => setDeleteWebsiteOpen(false)}
      />
      <DeleteAccountModal
        businessId={businessId}
        email={email}
        businessCount={businessCount}
        isOpen={deleteAccountOpen}
        onClose={() => setDeleteAccountOpen(false)}
      />
    </>
  );
}
