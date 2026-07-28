'use client';
import { useState, useTransition } from 'react';
import type { Claim } from '@/domain/models/claim';
import { generateClaimLinkAction, revokeClaimAction, releaseOwnershipAction } from './actions';

interface Props {
  businessId: string;
  ownerUserId?: string;
  ownerEmail?: string;
  claimedAt?: string;
  claims: Claim[];
}

/**
 * Admin claim-link generation/revocation and ownership recovery (Stage 17).
 * The raw claim token is shown exactly once, immediately after generation —
 * it is never persisted, and there is no "reveal again" capability, by
 * design (see implementation.md, Stage 17, "Claim-token requirements").
 */
export function ClaimSection({ businessId, ownerUserId, ownerEmail, claimedAt, claims }: Props) {
  const [generated, setGenerated] = useState<{ rawToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateClaimLinkAction(businessId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.rawToken) setGenerated({ rawToken: result.rawToken });
    });
  }

  function handleRevoke(claimId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokeClaimAction(claimId);
      if (result.error) setError(result.error);
    });
  }

  function handleRelease() {
    setError(null);
    if (!confirm('Release ownership of this business? This does not delete claim history — issue a new claim link afterward if you want a legitimate owner to try again.')) {
      return;
    }
    startTransition(async () => {
      const result = await releaseOwnershipAction(businessId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-(--color-border) bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Claim</h3>

      {error && (
        <div role="alert" className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {ownerUserId ? (
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">
            Claimed by <span className="font-medium">{ownerEmail ?? ownerUserId}</span>
            {claimedAt && <span className="text-gray-400"> · {new Date(claimedAt).toLocaleString()}</span>}
          </p>
          <button
            type="button"
            onClick={handleRelease}
            disabled={isPending}
            className="rounded-lg border border-red-200 bg-white text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            Release ownership
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Not claimed.</p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="rounded-lg bg-(--color-brand) text-white px-3 py-1.5 text-xs font-medium hover:bg-(--color-brand-dark) transition-colors disabled:opacity-60"
          >
            {isPending ? 'Generating…' : 'Generate claim link'}
          </button>
        </div>
      )}

      {generated && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">
            Copy this code now — it will not be shown again.
          </p>
          <code className="block text-sm font-mono text-amber-900 break-all">{generated.rawToken}</code>
        </div>
      )}

      {claims.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">History</p>
          <ul className="space-y-1.5">
            {claims.map((claim) => (
              <li key={claim.claimId} className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  {claim.status} · {new Date(claim.createdAt).toLocaleDateString()}
                </span>
                {claim.status === 'issued' && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(claim.claimId)}
                    disabled={isPending}
                    className="text-red-600 hover:text-red-700 underline disabled:opacity-60"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
