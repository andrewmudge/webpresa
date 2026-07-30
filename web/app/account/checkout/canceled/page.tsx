import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Checkout canceled return page (Stage 18) — no charge was made. No
 * business/session lookup needed here; `?business=` is present for
 * consistency with the success URL shape but unused.
 */
export default function CheckoutCanceledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-(--color-border) p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Checkout canceled</h1>
        <p className="mt-2 text-sm text-gray-600">No payment was made. You can pick a plan and try again anytime.</p>
        <Link
          href="/account/claim-status"
          className="mt-4 inline-block w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium hover:bg-(--color-brand-dark) transition-colors"
        >
          Back to plans
        </Link>
      </div>
    </div>
  );
}
