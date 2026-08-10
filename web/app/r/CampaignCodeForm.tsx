'use client';
import { useActionState } from 'react';
import { Lock, Tag, ArrowRight } from 'lucide-react';
import { submitCampaignCodeAction } from './actions';

export function CampaignCodeForm({ accentColor }: { accentColor: string }) {
  const [state, formAction, pending] = useActionState(submitCampaignCodeAction, undefined);

  return (
    <div>
      <div className="mb-6 flex flex-col items-center text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
        >
          <Lock size={24} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Enter your access code</h2>
        <p className="mt-1.5 text-sm text-gray-500">You&apos;ll be able to preview, customize, and make it yours.</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}
        <div className="relative">
          <Tag size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <label htmlFor="code" className="sr-only">
            Access code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: accentColor }}
        >
          {pending ? 'Checking…' : 'Continue'}
          {!pending && <ArrowRight size={16} />}
        </button>
      </form>
    </div>
  );
}
