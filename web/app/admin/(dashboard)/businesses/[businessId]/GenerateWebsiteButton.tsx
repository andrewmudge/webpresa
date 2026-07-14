'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateWebsiteAction, type GenerateWebsiteState } from './actions';

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Generating…' : 'Generate Website'}
    </button>
  );
}

interface Props {
  businessId: string;
  /** True once the business has hit the AI-generation cap — see MAX_AI_GENERATIONS in actions.ts. */
  capReached: boolean;
}

export function GenerateWebsiteButton({ businessId, capReached }: Props) {
  const boundAction = generateWebsiteAction.bind(null, businessId);
  const [state, formAction] = useActionState<GenerateWebsiteState, FormData>(boundAction, undefined);

  return (
    <div>
      <form action={formAction}>
        <SubmitButton disabled={capReached} />
      </form>
      {capReached && (
        <p className="mt-2 text-xs text-gray-400">
          This business has reached the AI generation limit.
        </p>
      )}
      {state?.message && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
