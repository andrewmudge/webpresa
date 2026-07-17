'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateWebsiteAction, type GenerateWebsiteState } from './actions';

function SubmitButton({ disabled, label }: { disabled?: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Generating…' : label}
    </button>
  );
}

interface Props {
  businessId: string;
  /** The version number the next generation would create — used only for the confirmation copy. */
  nextVersion: number;
  /** Whether a preview already exists — gates the confirmation dialog (nothing to lose on the very first generation). */
  hasExistingPreview: boolean;
  /** True once the business has hit the AI-generation cap — see MAX_AI_GENERATIONS in actions.ts. */
  capReached: boolean;
}

export function GenerateWebsiteButton({ businessId, nextVersion, hasExistingPreview, capReached }: Props) {
  const boundAction = generateWebsiteAction.bind(null, businessId);
  const [state, formAction] = useActionState<GenerateWebsiteState, FormData>(boundAction, undefined);
  const [showDialog, setShowDialog] = useState(false);

  const label = hasExistingPreview ? `Generate New Draft (v${nextVersion})` : 'Generate Website';

  return (
    <div>
      {hasExistingPreview ? (
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          disabled={capReached}
          className="rounded-lg border border-amber-300 bg-white text-amber-800 px-4 py-2 text-sm font-medium hover:bg-amber-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {label}
        </button>
      ) : (
        <form action={formAction}>
          <SubmitButton disabled={capReached} label={label} />
        </form>
      )}

      {capReached && (
        <p className="mt-2 text-xs text-gray-400">This business has reached the AI generation limit.</p>
      )}
      {state?.message && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {state.message}
        </p>
      )}

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDialog(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Generate a new draft (v{nextVersion})?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This creates a brand-new AI-written draft. Text edits, gallery/service-area changes, and
                  component reordering made since the last generation will <strong>not</strong> be included.
                  Theme, CTA, and photo assignments are preserved.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <form action={formAction} onSubmit={() => setShowDialog(false)}>
                <SubmitButton disabled={capReached} label="Generate new draft" />
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
