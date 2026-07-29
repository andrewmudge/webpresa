import Link from 'next/link';
import { ClaimTokenForm } from './ClaimTokenForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ error?: string; business?: string }>;
}

/**
 * Manual claim-code entry — for someone who typed a printed code rather
 * than scanning the QR (Stage 17), or a visitor on `/b/[slug]` who doesn't
 * yet have a validated claim-intent cookie for that business. `?error=1`
 * (set by the `/claim/[claimToken]` Route Handler on any invalid/expired/
 * revoked/consumed-by-another-account token) renders the same generic
 * message this form's own submission produces — never distinguished, per
 * implementation.md, Stage 17, "Security requirements".
 *
 * `?business={slug}` is purely contextual (page copy + a "back to preview"
 * link) — it is never trusted as a redirect target. After a successful
 * validation, `submitClaimTokenAction` always redirects to the *token's own*
 * business slug, never this query param, so a visitor can't be redirected
 * somewhere the token doesn't actually authorize.
 */
export default async function ClaimPage({ searchParams }: Props) {
  const { error, business } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-6 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">
              {business ? `Enter the claim code from your postcard for ${business}` : 'Claim your business'}
            </p>
          </div>
          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              This claim link is invalid or has expired.
            </div>
          )}
          <ClaimTokenForm />
          {business && (
            <p className="mt-4 text-center text-xs text-gray-500">
              <Link href={`/b/${business}`} className="underline hover:text-gray-700">
                Back to preview
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
