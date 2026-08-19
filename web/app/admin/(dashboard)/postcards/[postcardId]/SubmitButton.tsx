'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitPostcardToLobAction } from '../actions';
import type { PostcardStatus } from '@/domain/models/postcard';

export interface SubmitButtonProps {
  postcardId: string;
  status: PostcardStatus;
  reviewedAt?: string;
  providerPostcardId?: string;
  failureReason?: string;
  /** Whether the currently-configured Lob key is live (`isLobLiveMode()`, `lib/lob/client.ts`) — determines which copy renders below the button. */
  isLiveMode: boolean;
}

/**
 * Stage 22 Phase 4 — the one action that actually hands a postcard to
 * Lob. Only rendered by the parent page once `reviewedAt` is set (see
 * `[postcardId]/page.tsx`) — approval and submission are deliberately
 * separate, explicit admin steps (implementation.md, Stage 22).
 */
export default function SubmitButton({ postcardId, status, reviewedAt, providerPostcardId, failureReason, isLiveMode }: SubmitButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitPostcardToLobAction(postcardId);
      if (result.status !== 'submitted') {
        setError(result.message ?? 'Submission failed.');
        return;
      }
      router.refresh();
    });
  }

  if (status === 'submitted' || status === 'mailed' || status === 'delivered') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Submitted to Lob — provider postcard ID <code className="font-mono">{providerPostcardId}</code>.
      </div>
    );
  }

  if (status === 'submitting') {
    return <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Submission in progress…</div>;
  }

  if (status === 'failed') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Submission failed: {failureReason ?? 'Unknown error.'} A new postcard must be generated to retry — there is no retry path for a failed
        submission yet.
      </div>
    );
  }

  if (!reviewedAt) {
    return <p className="text-xs text-gray-400">Approve this postcard above before it can be submitted to Lob.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark) disabled:opacity-60"
      >
        {isPending ? 'Submitting…' : 'Submit to Lob'}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {isLiveMode ? (
        <p className="mt-2 text-xs font-medium text-red-600">
          Uses the Lob live API key — this mails a real postcard and charges a real cost. There is no undo.
        </p>
      ) : (
        <p className="mt-2 text-xs text-gray-400">
          Uses the Lob test-mode API key currently on file — no real mail is sent. A production send requires an explicit, separate decision to
          swap in a live key.
        </p>
      )}
    </div>
  );
}
