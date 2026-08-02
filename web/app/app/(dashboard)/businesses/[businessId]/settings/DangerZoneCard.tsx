'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DeleteWebsiteModal } from './DeleteWebsiteModal';

interface Props {
  businessId: string;
  businessName: string;
  hasActiveSubscription: boolean;
  isReadOnly: boolean;
}

/**
 * Visually distinct but not dominant — a single real action (Delete
 * Website). Delete Account and Export Website Data are deliberately not
 * shown at all this round: neither is safely buildable yet (no Cognito
 * user deletion path or cross-business handling for account deletion, no
 * export generator anywhere in this codebase) — see implementation.md's
 * MVP rule against exposing an unsafe or placeholder destructive action.
 */
export function DangerZoneCard({ businessId, businessName, hasActiveSubscription, isReadOnly }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={16} className="text-red-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">Irreversible actions — proceed with caution.</p>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Delete Website</p>
            <p className="text-xs text-gray-500">Permanently delete this website and all its data.</p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={isReadOnly}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-700 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>

      <DeleteWebsiteModal
        businessId={businessId}
        businessName={businessName}
        hasActiveSubscription={hasActiveSubscription}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
