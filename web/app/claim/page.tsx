import { ClaimTokenForm } from './ClaimTokenForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

/**
 * Manual claim-code entry — for someone who typed a printed code rather
 * than scanning the QR (Stage 17). `?error=1` (set by the
 * `/claim/[claimToken]` Route Handler on any invalid/expired/revoked/
 * consumed-by-another-account token) renders the same generic message this
 * form's own submission produces — never distinguished, per
 * implementation.md, Stage 17, "Security requirements".
 */
export default async function ClaimPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-(--color-border) p-8">
          <div className="mb-6 text-center">
            <span className="text-2xl font-bold text-(--color-brand)">Webpresa</span>
            <p className="text-sm text-gray-500 mt-1">Claim your business</p>
          </div>
          {error && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              This claim link is invalid or has expired.
            </div>
          )}
          <ClaimTokenForm />
        </div>
      </div>
    </div>
  );
}
