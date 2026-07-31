'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ClaimBannerState } from '@/lib/claim/banner-state';

interface Props {
  businessName: string;
  businessSlug: string;
  /** Never rendered at all for `'active'` — callers only mount this for `'unclaimed'`/`'claimed_pending'`. */
  state: Exclude<ClaimBannerState, 'active'>;
  /** Whether this browser holds a validated claim-intent cookie for this specific business (Stage 17). */
  hasMatchingClaimIntent: boolean;
}

/**
 * Redesigned 2026-07-31 (bigger, Webpresa-branded, blue theme instead of
 * amber, a real button instead of an inline text link) — same three
 * states/copy as before, presentation only.
 */
export function ClaimBanner({ businessName, businessSlug, state, hasMatchingClaimIntent }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const claimHref = hasMatchingClaimIntent ? '/claim/continue' : `/claim?business=${businessSlug}`;

  return (
    <div className="sticky top-0 z-[60] border-b border-(--color-brand-light)/30 bg-(--color-brand-muted) px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <Image
            src="/webpresa_w.png"
            alt=""
            width={692}
            height={394}
            className="hidden h-7 w-auto shrink-0 sm:block"
          />
          <p className="text-sm text-(--color-brand-dark) sm:text-base">
            {state === 'claimed_pending' ? (
              <>
                <span className="font-semibold">{businessName}</span> — this business has been claimed. Activation
                pending.
              </>
            ) : hasMatchingClaimIntent ? (
              <>
                Your website preview is ready. This site was prepared for{' '}
                <span className="font-semibold">{businessName}</span>. Explore it, then claim your website below.
              </>
            ) : (
              <>
                <span className="font-semibold">{businessName}</span> — is this your business?
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {state !== 'claimed_pending' && (
            <Link
              href={claimHref}
              className="rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--color-brand-dark)"
            >
              Claim My Website
            </Link>
          )}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-(--color-brand)/60 hover:text-(--color-brand-dark) transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
