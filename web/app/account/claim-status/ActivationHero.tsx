import { CheckCircle2, Store } from 'lucide-react';

interface Props {
  businessName: string;
  claimedAt?: string;
  /** `false` for the `canceled`-reactivation case — same shell, no "just claimed" framing. */
  justClaimed: boolean;
}

/**
 * Top-of-page celebratory content for the "no active subscription yet"
 * branch of `/account/claim-status` — success pill, headline, supporting
 * copy, and the business identity rendered as a subtle badge/card rather
 * than the primary heading (implementation.md, Stage 17/18 activation UX
 * polish, 2026-07-31).
 */
export function ActivationHero({ businessName, claimedAt, justClaimed }: Props) {
  const claimedOn = claimedAt
    ? new Date(claimedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div>
      {justClaimed && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-(--color-brand-muted) px-3 py-1 text-xs font-semibold text-(--color-brand-dark)">
          <CheckCircle2 size={14} />
          Claim successful
        </div>
      )}

      <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
        {justClaimed ? 'Your Website Is Ready' : 'Reactivate Your Website'}
      </h1>
      <p className="mt-3 text-base text-gray-600 max-w-md">
        {justClaimed
          ? "We've already built your new website. Activate your plan to go live instantly and start growing your business online."
          : 'Your website is still here, exactly as you left it. Choose a plan to bring it back online.'}
      </p>

      <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-(--color-border) bg-white px-4 py-3 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-brand-muted) text-(--color-brand)">
          <Store size={18} />
        </span>
        <span>
          <span className="block text-sm font-semibold text-gray-900">{businessName}</span>
          {claimedOn && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              Claimed on {claimedOn}
              <CheckCircle2 size={12} className="text-(--color-brand)" />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
