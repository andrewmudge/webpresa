'use client';
import { useActionState } from 'react';
import { submitCampaignCodeAction } from './actions';

export function CampaignCodeForm() {
  const [state, formAction, pending] = useActionState(submitCampaignCodeAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          placeholder="XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--color-brand) focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Checking…' : 'Continue'}
      </button>
    </form>
  );
}
