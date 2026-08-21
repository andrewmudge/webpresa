import type { CancellationReasonsResult } from '@/lib/analytics/dashboard-types';

/**
 * Always renders the "not tracked" empty state today — `reasons.collected`
 * is always `false` (see `lib/analytics/attribution.ts`'s
 * `getCancellationReasons()` doc comment for how real capture would be
 * added later). The prop is still threaded through, rather than hard-coding
 * the copy, so this component doesn't need to change shape once capture
 * exists — only `getCancellationReasons()` and this conditional would.
 */
export function CancellationReasonsCard({ reasons }: { reasons: CancellationReasonsResult }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 h-full">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Cancellation Reasons</h2>
      {reasons.collected ? null : (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Not currently tracked — Webpresa doesn&apos;t collect a cancellation reason today.
        </div>
      )}
    </div>
  );
}
