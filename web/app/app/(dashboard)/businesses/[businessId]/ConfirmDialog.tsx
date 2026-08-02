'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Explains exactly what will be deleted/changed — destructive actions must state this plainly. */
  description: React.ReactNode;
  /** When set, the confirm button stays disabled until the customer types this value exactly. */
  requireTypedConfirmation?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  error?: string;
}

/**
 * Generic destructive-confirmation shell built on `Modal.tsx`. Used by
 * Delete Website today; written generically so any future destructive
 * action (e.g. removing a domain connection) can reuse it without
 * duplicating the focus-management/typed-confirmation logic.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  requireTypedConfirmation,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting…',
  isPending,
  onConfirm,
  error,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const confirmationSatisfied = !requireTypedConfirmation || typedValue === requireTypedConfirmation;

  function handleClose() {
    setTypedValue('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidthClassName="max-w-md">
      <div className="flex gap-3">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
          <AlertTriangle size={20} className="text-red-600" aria-hidden="true" />
        </div>
        <div className="text-sm text-gray-600 space-y-3 pt-1.5">{description}</div>
      </div>

      {requireTypedConfirmation && (
        <div className="mt-4">
          <label htmlFor="typed-confirmation" className="block text-sm font-medium text-gray-700 mb-1">
            Type <span className="font-semibold text-gray-900">{requireTypedConfirmation}</span> to confirm
          </label>
          <input
            id="typed-confirmation"
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-(--color-border) px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!confirmationSatisfied || isPending}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
