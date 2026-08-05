'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approvePostcardAction } from '../actions';

export default function ApproveButton({ postcardId, reviewedAt, reviewedBy }: { postcardId: string; reviewedAt?: string; reviewedBy?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approvePostcardAction(postcardId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (reviewedAt) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Approved {new Date(reviewedAt).toLocaleString()} by {reviewedBy}. Submission (Phase 4) is not yet built.
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-brand-dark) disabled:opacity-60"
      >
        {isPending ? 'Approving…' : 'Approve for submission'}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">No postcard is submitted or mailed automatically. Approval only records that an admin reviewed it.</p>
    </div>
  );
}
