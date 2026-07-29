'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { publishPreviewAction, type PublishPreviewState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Publishing…' : 'Publish'}
    </button>
  );
}

interface Props {
  businessId: string;
  previewId: string;
  /** The version number shown in the confirmation copy only. */
  version: number;
}

export function PublishPreviewButton({ businessId, previewId, version }: Props) {
  const boundAction = publishPreviewAction.bind(null, businessId, previewId);
  const [state, formAction] = useActionState<PublishPreviewState, FormData>(boundAction, undefined);

  return (
    <form action={formAction}>
      <SubmitButton />
      <p className="mt-1 text-xs text-gray-400">Makes v{version} publicly visible at this business&apos;s live URL.</p>
      {state?.error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
