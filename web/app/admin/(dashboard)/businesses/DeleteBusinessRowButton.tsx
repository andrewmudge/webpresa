'use client';
import { useState, useTransition } from 'react';
import { deleteBusinessAction } from './[businessId]/actions';

interface Props {
  businessId: string;
  businessName: string;
}

/**
 * List-page delete button. Unlike the business detail page's
 * `DeleteBusinessButton`, this doesn't show exact preview/scan/postcard
 * counts — fetching those for every row on the list page would mean 3
 * extra queries per business, per page load. The underlying cascade delete
 * (`deleteBusinessAction`) is identical either way; only the confirmation
 * copy differs.
 */
export function DeleteBusinessRowButton({ businessId, businessName }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        onClick={(e) => {
          e.stopPropagation();
          setShowDialog(true);
        }}
        aria-label={`Delete ${businessName}`}
        className="rounded-lg border border-red-200 bg-white text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 transition-colors"
      >
        Delete
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDialog(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Delete &ldquo;{businessName}&rdquo;?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This also permanently deletes all of its site previews, scan events, and postcards. This
                  action cannot be undone.
                </p>
              </div>
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
