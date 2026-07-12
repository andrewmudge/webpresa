'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Props {
  businessName: string;
}

export function ClaimBanner({ businessName }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-800 text-center flex-1">
        <span className="font-semibold">{businessName}</span> — this is a preview website.{' '}
        <Link
          href="/#contact"
          className="underline font-medium hover:text-amber-900 transition-colors"
        >
          Claim it for free →
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-amber-600 hover:text-amber-900 flex-shrink-0 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
