'use client';
import { useState, useTransition } from 'react';
import { deleteBusinessAction } from './actions';

interface Props {
  businessId: string;
  businessName: string;
  previewCount: number;
  scanCount: number;
  postcardCount: number;
}

export function DeleteBusinessButton({
  businessId,
  businessName,
  previewCount,
  scanCount,
  postcardCount,
}: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const downstreamCount = previewCount + scanCount + postcardCount;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteBusinessAction(businessId);
      if (result && 'error' in result) {
        setError(result.error);
      }
      // On success the action redirects — no further client handling needed.
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center rounded-lg border border-red-200 bg-white text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Delete
      </button>

      {showDialog && (
        /* Backdrop */
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDialog(false); }}
        >
          {/* Dialog */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Delete &ldquo;{businessName}&rdquo;?</h2>
                <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
              </div>
            </div>

            {/* Cascade summary */}
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-5 text-sm text-red-800">
              <p className="font-semibold mb-2">The following will also be permanently deleted:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-200 text-red-800 text-xs flex items-center justify-center font-bold">{previewCount}</span>
                  site preview{previewCount !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-200 text-red-800 text-xs flex items-center justify-center font-bold">{scanCount}</span>
                  scan event{scanCount !== 1 ? 's' : ''}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-200 text-red-800 text-xs flex items-center justify-center font-bold">{postcardCount}</span>
                  postcard{postcardCount !== 1 ? 's' : ''}
                </li>
              </ul>
              {downstreamCount === 0 && (
                <p className="text-red-700 mt-2">No downstream records to remove.</p>
              )}
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-red-100 text-red-700 text-sm px-3 py-2 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                disabled={isPending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isPending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
