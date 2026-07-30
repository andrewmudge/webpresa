import Link from 'next/link';
import { requireCustomerSession, requireBusinessOwnership } from '@/lib/auth/customer-authorization';
import { AutoRefresh } from './AutoRefresh';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ business?: string }>;
}

/**
 * Checkout success return page (Stage 18). Never activates anything —
 * `?business=` is read for display/lookup only. Entitlement is granted
 * exclusively by the verified webhook handler; this page just re-reads
 * `business.subscriptionStatus` from DynamoDB and polls (bounded) until it
 * flips to `active`, or shows a "still processing" message after the
 * timeout — never a false failure state. See implementation.md, Stage 18,
 * "Checkout success behavior".
 */
export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const { business: businessId } = await searchParams;
  const session = await requireCustomerSession();

  if (!businessId) {
    return (
      <StatusShell title="Payment received">
        <p className="text-sm text-gray-600">
          Head back to your <Link href="/account/claim-status" className="underline">account</Link> to see your website status.
        </p>
      </StatusShell>
    );
  }

  // 404s if this businessId doesn't belong to the signed-in customer — a
  // Checkout Session URL guessed for another business/customer never
  // discloses anything here.
  const business = await requireBusinessOwnership(session.sub, businessId);

  if (business.subscriptionStatus === 'active') {
    return (
      <StatusShell title="Payment confirmed">
        <p className="text-sm text-gray-600">
          {business.name} is now active on the {business.plan ?? ''} plan.
        </p>
        <Link
          href="/account/claim-status"
          className="mt-4 inline-block w-full rounded-lg bg-(--color-brand) text-white py-2.5 text-sm font-medium text-center hover:bg-(--color-brand-dark) transition-colors"
        >
          Continue
        </Link>
      </StatusShell>
    );
  }

  return (
    <StatusShell title="Payment processing">
      <AutoRefresh />
      <p className="text-sm text-gray-600">
        We&apos;re confirming your payment with Stripe — this usually takes just a few seconds. This page will update
        automatically.
      </p>
      <Link href="/account/claim-status" className="mt-4 inline-block text-sm underline text-gray-500">
        Check status later
      </Link>
    </StatusShell>
  );
}

function StatusShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-(--color-border) p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
